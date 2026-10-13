/**
 * Production test: public campaigns load from Firestore + site pages.
 * Usage: node scripts/test-campaigns-production.mjs
 */
const BASE = 'https://www.campaignhubgh.com';
const PROJECT_ID = 'new1-e94db';

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  passed++;
}

function fail(name, detail = '') {
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function queryActiveCampaigns() {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'campaigns' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'active' },
            },
          },
        },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data
    .filter((row) => row.document)
    .map((row) => {
      const fields = row.document.fields || {};
      const title = fields.title?.stringValue || '(untitled)';
      const slug = fields.slug?.stringValue || '';
      const status = fields.status?.stringValue || '';
      const disabled = fields.disabled?.booleanValue || false;
      return { title, slug, status, disabled, id: row.document.name.split('/').pop() };
    });
}

async function getPage(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  return { status: res.status, text: await res.text() };
}

console.log('CampaignHub — public campaigns production test\n');
console.log(`Site: ${BASE}`);
console.log(`Firestore: ${PROJECT_ID}\n`);

// 1. Firestore public read — active campaigns (no composite index needed)
try {
  const campaigns = await queryActiveCampaigns();
  const visible = campaigns.filter((c) => !c.disabled && c.status === 'active');

  if (campaigns.length === 0) {
    fail('Firestore active campaigns query', 'no active campaigns in database');
  } else {
    ok('Firestore active campaigns query', `${campaigns.length} active (${visible.length} visible)`);
    for (const c of visible.slice(0, 5)) {
      ok(`  campaign: ${c.title}`, `slug=${c.slug}`);
    }
  }

  // 2. Public campaign detail URLs
  for (const c of visible.slice(0, 2)) {
    if (!c.slug) continue;
    try {
      const { status, text } = await getPage(`/campaign/${c.slug}`);
      if (status === 200 && text.includes('id="root"')) {
        ok(`Campaign page /campaign/${c.slug}`, 'SPA loads');
      } else {
        fail(`Campaign page /campaign/${c.slug}`, `HTTP ${status}`);
      }
    } catch (err) {
      fail(`Campaign page /campaign/${c.slug}`, err.message);
    }
  }
} catch (err) {
  fail('Firestore active campaigns query', err.message);
}

// 3. Home + campaigns listing pages
for (const path of ['/', '/campaigns']) {
  try {
    const { status, text } = await getPage(path);
    if (status !== 200) {
      fail(`Page ${path}`, `HTTP ${status}`);
      continue;
    }
    if (!text.includes('id="root"')) {
      fail(`Page ${path}`, 'missing SPA root');
      continue;
    }
    ok(`Page ${path}`, 'loads (HTTP 200)');

    // Check latest JS bundle is present (client-side campaigns fetch)
    const bundleMatch = text.match(/assets\/index-([^.]+)\.js/);
    if (bundleMatch) {
      const jsRes = await fetch(`${BASE}/assets/index-${bundleMatch[1]}.js`);
      const js = await jsRes.text();
      if (js.includes('sortCampaignsClientSide') || js.includes('sortCampaignsForDisplay')) {
        ok(`  ${path} bundle`, 'includes client-side campaign sort');
      } else if (!js.includes("orderBy('createdAt'")) {
        ok(`  ${path} bundle`, 'deployed (no server createdAt orderBy in main chunk)');
      } else {
        fail(`  ${path} bundle`, 'may still use server-side createdAt orderBy');
      }
    }
  } catch (err) {
    fail(`Page ${path}`, err.message);
  }
}

// 4. Index-building error should NOT appear in static HTML (runtime only — note for manual check)
console.log('\n--- Summary ---');
console.log(`Result: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('\nPublic campaigns pipeline looks healthy.');
  console.log('Open https://www.campaignhubgh.com/campaigns in a browser to confirm UI rendering.');
}
process.exit(failed ? 1 : 0);
