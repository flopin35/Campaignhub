/**
 * One-time data check and clean-up for the CampaignHub Pro upgrade.
 * Used by scripts/upgrade-firestore-data.mjs (your computer) and Admin → Setup (one click).
 * Returns a report; writes only when apply === true.
 */
export async function runUpgrade(db, { apply = false, strip = false } = {}) {
  const { FieldValue, Timestamp } = await import('firebase-admin/firestore');
  const APPLY = !!apply;
  const STRIP = !!strip;
  const DAY = 86400000;
  const now = Date.now();
  const ms = (v) => {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return new Date(v).getTime() || 0;
    if (v._seconds) return v._seconds * 1000;
    return 0;
  };
  const day = (v) => (ms(v) ? new Date(ms(v)).toISOString().slice(0, 10) : '—');


  const [campaignsSnap, paymentsSnap, txSnap, eventsSnap, usersSnap] = await Promise.all([
    db.collection('campaigns').get(),
    db.collection('payments').get(),
    db.collection('billing_transactions').where('status', '==', 'success').get(),
    db.collection('campaign_events').get(),
    db.collection('users').get(),
  ]);

  const users = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));
  const verifiedPaymentsByCampaign = new Map();
  const suspiciousProofs = [];
  paymentsSnap.docs.forEach((d) => {
    const p = d.data();
    if (p.paymentStatus === 'verified') {
      verifiedPaymentsByCampaign.set(p.campaignId, (verifiedPaymentsByCampaign.get(p.campaignId) || 0) + 1);
    }
    if (Number(p.durationDays) > 400) suspiciousProofs.push({ id: d.id, campaignId: p.campaignId, durationDays: p.durationDays, amount: p.amount, status: p.paymentStatus });
  });
  const paidCampaigns = new Set(txSnap.docs.map((d) => d.data().campaignId).filter(Boolean));

  const report = {
    generatedAt: new Date().toISOString(),
    applied: APPLY,
    stripped: STRIP,
    fixes: { suspended: [], eventsMadePublic: 0, createdAtReset: [], ownerEmailRemoved: 0 },
    unbackedLegacyPro: [],
    suspiciousTrials: [],
    unbackedSubscriptions: [],
    manualSubscriptions: [],
    badges: [],
    duplicateSlugs: [],
    endedOldBundles: [],
    suspiciousProofs,
  };

  let writer = db.batch();
  let pending = 0;
  async function queue(ref, data) {
    if (!APPLY) return;
    writer.update(ref, data);
    pending += 1;
    if (pending >= 400) {
      await writer.commit();
      writer = db.batch();
      pending = 0;
    }
  }

  const bySlug = new Map();

  for (const doc of campaignsSnap.docs) {
    const c = doc.data();
    const label = `${c.title || '(untitled)'} [${doc.id}]`;
    const patch = {};

    // 1. old-style admin hide
    if (c.status === 'active' && c.disabled === true) {
      patch.status = 'suspended';
      patch.suspendedFromStatus = 'active';
      report.fixes.suspended.push(label);
    }
    // 3. back-dated createdAt
    if (ms(c.createdAt) > now + DAY) {
      patch.createdAt = Timestamp.now();
      report.fixes.createdAtReset.push(`${label} (was ${day(c.createdAt)})`);
    }
    // 4. owner e-mail on a public document
    if (c.ownerEmail !== undefined) {
      patch.ownerEmail = FieldValue.delete();
      report.fixes.ownerEmailRemoved += 1;
    }

    // A. legacy premium without a verified payment
    const crmEnd = ms(c.premiumFeatures?.['campaign-crm']?.expiresAt);
    if (crmEnd > now && !verifiedPaymentsByCampaign.get(doc.id)) {
      report.unbackedLegacyPro.push(`${label} — Pro until ${day(crmEnd)}`);
      if (STRIP) {
        patch['premiumFeatures.campaign-crm.expiresAt'] = Timestamp.now();
        patch['premiumFeatures.campaign-crm.active'] = false;
      }
    }

    // B. trials that are too long or not claimed on the owner's account
    if (c.packageType === 'trial' && ms(c.trialEndsAt) > now) {
      const owner = users.get(c.ownerId) || {};
      const tooLong = ms(c.trialEndsAt) > now + 8 * DAY;
      const unclaimed = owner.trialCampaignId !== doc.id;
      if (tooLong || unclaimed) {
        report.suspiciousTrials.push(`${label} — trial to ${day(c.trialEndsAt)}${tooLong ? ' (longer than 7 days)' : ''}${unclaimed ? ' (not the account’s registered trial)' : ''}`);
        if (STRIP) {
          patch.trialEndsAt = Timestamp.now();
          if (ms(c.endDate) > now + 3 * DAY) patch.endDate = Timestamp.fromMillis(now + 3 * DAY);
        }
      }
    }

    // C. subscriptions with no successful payment
    const subEnd = ms(c.subscription?.currentPeriodEnd);
    if (subEnd > now && !paidCampaigns.has(doc.id)) {
      if (c.subscription?.provider === 'manual') {
        report.manualSubscriptions.push(`${label} — manual grant until ${day(subEnd)}${c.subscription?.note ? ` (“${c.subscription.note}”)` : ''}`);
      } else {
        report.unbackedSubscriptions.push(`${label} — ${c.subscription?.provider || 'unknown'} until ${day(subEnd)}`);
        if (STRIP) patch.subscription = FieldValue.delete();
      }
    }

    // D. badges to review
    const badges = [
      c.verified && 'verified',
      c.featured && 'featured',
      c.spotlight && 'spotlight',
      c.boostActive && ms(c.boostExpiresAt) > now && `boost to ${day(c.boostExpiresAt)}`,
    ].filter(Boolean);
    if (badges.length) report.badges.push(`${label} — ${badges.join(', ')}`);

    // E. duplicate slugs
    if (c.slug) {
      const list = bySlug.get(c.slug) || [];
      list.push({ id: doc.id, title: c.title, createdAt: day(c.createdAt), status: c.status, ownerId: c.ownerId });
      bySlug.set(c.slug, list);
    }

    // F. old ₵500 bundle customers whose Pro ended
    if (c.premiumFeatures?.['premium-subscription']?.active && crmEnd && crmEnd <= now) {
      report.endedOldBundles.push(`${label} — old bundle; Pro ended ${day(crmEnd)}`);
    }

    if (Object.keys(patch).length) {
      patch.updatedAt = Timestamp.now();
      await queue(doc.ref, patch);
    }
  }

  for (const [slug, list] of bySlug) {
    if (list.length > 1) {
      report.duplicateSlugs.push(`/campaign/${slug}: ${list.map((x) => `${x.title} [${x.id}] created ${x.createdAt} (${x.status})`).join(' | ')} — the oldest live page wins`);
    }
  }

  // 5. tombstones for deleted campaigns whose records are still around
  const liveIds = new Set(campaignsSnap.docs.map((d) => d.id));
  const orphanIds = new Set();
  for (const name of ['supporters', 'donations', 'volunteers', 'campaign_events', 'polling_stations', 'field_links', 'election_results', 'ad_campaigns']) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.collection(name).select('campaignId').get();
    snap.docs.forEach((d) => {
      const id = d.get('campaignId');
      if (typeof id === 'string' && id && !liveIds.has(id)) orphanIds.add(id);
    });
  }
  report.fixes.tombstones = [...orphanIds];
  for (const id of orphanIds) {
    if (!APPLY) continue;
    // eslint-disable-next-line no-await-in-loop
    await db.collection('analytics').doc(id).set({ campaignId: id, deletedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  }

  // 2. events without isPublic
  for (const doc of eventsSnap.docs) {
    if (doc.data().isPublic === undefined) {
      report.fixes.eventsMadePublic += 1;
      await queue(doc.ref, { isPublic: true });
    }
  }

  if (APPLY && pending) await writer.commit();

  report.counts = {
    campaigns: campaignsSnap.size,
    events: eventsSnap.size,
    oldPaymentProofs: paymentsSnap.size,
    onlinePayments: txSnap.size,
  };
  return report;
}
