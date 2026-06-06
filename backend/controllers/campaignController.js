import {
  getAllCampaigns,
  getCampaignBySlug,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  uploadBanner,
} from '../services/firebaseService.js';
import { resolveUniqueSlug } from '../services/slugService.js';
import { calculateExpiryDate, getRemainingMs } from '../services/expiryService.js';
import { notifyNewSubmission } from '../services/notificationService.js';

export async function listCampaigns(req, res) {
  const { status, search } = req.query;
  const campaigns = await getAllCampaigns({ status, search });

  // Hide expired/pending from public listing unless admin
  const publicOnly = !req.isAdmin;
  const filtered = publicOnly
    ? campaigns.filter((c) => c.status === 'active')
    : campaigns;

  res.json({ success: true, data: filtered, count: filtered.length });
}

export async function getCampaign(req, res) {
  const { slug } = req.params;
  const campaign = await getCampaignBySlug(slug);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  // Hide non-active campaigns from public
  if (!req.isAdmin && campaign.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const remainingMs = getRemainingMs(campaign.expiryDate);

  res.json({
    success: true,
    data: { ...campaign, remainingMs },
  });
}

export async function submitCampaign(req, res) {
  try {
    const { title, description, contactEmail, contactPhone, durationDays } = req.body;

    if (!title || !description || !contactEmail || !durationDays) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, contact email, and duration are required',
      });
    }

    const slug = await resolveUniqueSlug(title);

    let bannerUrl = req.body.bannerUrl || '';
    if (req.file) {
      bannerUrl = await uploadBanner(req.file);
    }

    const campaign = await createCampaign({
      title,
      slug,
      description,
      contactEmail,
      contactPhone: contactPhone || '',
      bannerUrl,
      durationDays: parseInt(durationDays, 10),
    });

    await notifyNewSubmission(campaign);

    res.status(201).json({
      success: true,
      message: 'Campaign submitted successfully. Awaiting admin approval.',
      data: campaign,
    });
  } catch (error) {
    console.error('Submit campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit campaign' });
  }
}

export async function searchCampaigns(req, res) {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, message: 'Search query required' });
  }

  const campaigns = await getAllCampaigns({ search: q, status: 'active' });
  res.json({ success: true, data: campaigns, count: campaigns.length });
}

export async function getFeaturedCampaigns(req, res) {
  const campaigns = await getAllCampaigns({ status: 'active' });
  const featured = campaigns.slice(0, 3);
  res.json({ success: true, data: featured });
}

export { getCampaignById, updateCampaign, deleteCampaign };
