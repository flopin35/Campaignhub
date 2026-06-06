import {
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '../services/firebaseService.js';
import { calculateExpiryDate } from '../services/expiryService.js';
import {
  notifyCampaignApproved,
  notifyCampaignRejected,
} from '../services/notificationService.js';

export async function getDashboardStats(req, res) {
  const campaigns = await getAllCampaigns();
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    pending: campaigns.filter((c) => c.status === 'pending').length,
    expired: campaigns.filter((c) => c.status === 'expired').length,
  };
  res.json({ success: true, data: stats });
}

export async function getAllCampaignsAdmin(req, res) {
  const { status } = req.query;
  const campaigns = await getAllCampaigns({ status });
  res.json({ success: true, data: campaigns, count: campaigns.length });
}

export async function approveCampaign(req, res) {
  const { id } = req.params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.status === 'active') {
    return res.status(400).json({ success: false, message: 'Campaign is already active' });
  }

  const startDate = new Date().toISOString();
  const expiryDate = calculateExpiryDate(startDate, campaign.durationDays);

  const updated = await updateCampaign(id, {
    status: 'active',
    startDate,
    expiryDate,
    paymentConfirmed: true,
    approvedAt: startDate,
  });

  await notifyCampaignApproved(updated);

  res.json({
    success: true,
    message: 'Campaign approved and activated',
    data: updated,
  });
}

export async function rejectCampaign(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const campaign = await getCampaignById(id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const updated = await updateCampaign(id, {
    status: 'rejected',
    rejectionReason: reason || 'Does not meet guidelines',
    rejectedAt: new Date().toISOString(),
  });

  await notifyCampaignRejected(updated, reason);

  res.json({
    success: true,
    message: 'Campaign rejected',
    data: updated,
  });
}

export async function extendCampaign(req, res) {
  const { id } = req.params;
  const { additionalDays } = req.body;

  if (!additionalDays || additionalDays < 1) {
    return res.status(400).json({
      success: false,
      message: 'additionalDays must be a positive number',
    });
  }

  const campaign = await getCampaignById(id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const baseDate = campaign.expiryDate ? new Date(campaign.expiryDate) : new Date();
  baseDate.setDate(baseDate.getDate() + parseInt(additionalDays, 10));

  const updated = await updateCampaign(id, {
    expiryDate: baseDate.toISOString(),
    durationDays: campaign.durationDays + parseInt(additionalDays, 10),
    status: 'active',
  });

  res.json({
    success: true,
    message: `Campaign extended by ${additionalDays} days`,
    data: updated,
  });
}

export async function removeCampaign(req, res) {
  const { id } = req.params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  await deleteCampaign(id);

  res.json({ success: true, message: 'Campaign removed successfully' });
}

export async function confirmPayment(req, res) {
  const { id } = req.params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const updated = await updateCampaign(id, {
    paymentConfirmed: true,
    paymentConfirmedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Payment confirmed. You can now approve the campaign.',
    data: updated,
  });
}
