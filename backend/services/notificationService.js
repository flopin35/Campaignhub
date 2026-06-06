/**
 * Notification service — MVP stub for future email/push integrations.
 * Logs notifications to console for now.
 */

export async function notifyCampaignApproved(campaign) {
  console.log(`[NOTIFY] Campaign approved: "${campaign.title}" (${campaign.slug})`);
  console.log(`  → Contact: ${campaign.contactEmail}`);
  return { sent: true, type: 'approval' };
}

export async function notifyCampaignRejected(campaign, reason = '') {
  console.log(`[NOTIFY] Campaign rejected: "${campaign.title}"`);
  if (reason) console.log(`  → Reason: ${reason}`);
  return { sent: true, type: 'rejection' };
}

export async function notifyCampaignExpiring(campaign, daysLeft) {
  console.log(`[NOTIFY] Campaign expiring in ${daysLeft} day(s): "${campaign.title}"`);
  return { sent: true, type: 'expiring' };
}

export async function notifyNewSubmission(campaign) {
  console.log(`[NOTIFY] New campaign submission: "${campaign.title}" — pending review`);
  return { sent: true, type: 'new_submission' };
}
