import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { OFFICE_LEVELS, POLITICS_CATEGORY } from '../utils/campaignHelpers';
import { CAMPAIGN_TEMPLATES } from '../data/campaignTemplates';
import { validateCampaignContent, CONTENT_LIMITS } from '../utils/contentQuality';
import AIUploadHelper from './AIUploadHelper';
import ImageDropzone, { GalleryDropzone } from './ImageDropzone';

export default function UploadForm({ onComplete, defaultEmail = '', launching = false }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: POLITICS_CATEGORY,
    campaignType: 'Parliamentary',
    contactEmail: defaultEmail,
    contactPhone: '',
    socialFacebook: '',
    socialTwitter: '',
    socialInstagram: '',
    socialWebsite: '',
  });
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSocial, setShowSocial] = useState(false);

  useEffect(() => {
    if (defaultEmail) {
      setForm((f) => (f.contactEmail ? f : { ...f, contactEmail: defaultEmail }));
    }
  }, [defaultEmail]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      galleryPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [bannerPreview, logoPreview, galleryPreviews]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleBannerChange = (file) => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBanner(file);
    setBannerPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, banner: '' }));
  };

  const handleBannerRemove = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBanner(null);
    setBannerPreview(null);
  };

  const handleLogoChange = (file) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoRemove = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogo(null);
    setLogoPreview(null);
  };

  const handleGalleryChange = (files) => {
    galleryPreviews.forEach((url) => URL.revokeObjectURL(url));
    setGallery(files);
    setGalleryPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleGalleryRemoveAt = (index) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGallery((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const next = {};
    if (!banner) next.banner = 'Banner image is required';
    if (!form.contactPhone.trim()) next.contactPhone = 'Contact number is required';

    const content = validateCampaignContent({ title: form.title, description: form.description });
    Object.assign(next, content.errors);

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      toast('Please fill in all required fields', 'warning');
      return;
    }
    onComplete?.({ form, bannerFile: banner, logoFile: logo, galleryFiles: gallery });
  };

  const handleAiApply = (type, text) => {
    const clean = text.trim();
    if (!clean) return;

    if (type === 'title') {
      setForm((f) => ({ ...f, title: clean.split('\n')[0].replace(/^\d+\.\s*/, '').slice(0, 120) }));
    } else if (type === 'slogan') {
      setForm((f) => ({ ...f, title: f.title || clean.split('\n')[0].slice(0, 80) }));
    } else if (type === 'description' || type === 'caption') {
      setForm((f) => ({ ...f, description: clean }));
    } else if (type === 'hashtags') {
      setForm((f) => ({
        ...f,
        description: f.description ? `${f.description.trim()}\n\n${clean}` : clean,
      }));
    } else if (type === 'cta') {
      setForm((f) => ({
        ...f,
        description: f.description ? `${f.description.trim()}\n\n${clean}` : clean,
      }));
    } else if (type === 'tips') {
      setForm((f) => ({
        ...f,
        description: f.description ? `${f.description.trim()}\n\n${clean}` : clean,
      }));
    }
  };

  const applyTemplate = (template) => {
    setForm((f) => ({
      ...f,
      title: template.title,
      description: template.description,
      category: template.category,
      campaignType: template.campaignType,
    }));
    toast(`"${template.label}" template applied`, 'success');
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="glass-card space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Campaign Page Details</h2>
        <p className="text-sm text-gray-500">Pick a political template or start blank — your official page in minutes.</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Political templates</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CAMPAIGN_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="text-left p-3 rounded-xl border border-surface-border bg-surface-elevated/50 hover:border-brand-500/40 hover:bg-surface-elevated transition-colors touch-manipulation min-h-[44px]"
            >
              <span className="text-lg">{t.emoji}</span>
              <p className="text-xs font-medium text-white mt-1">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      <AIUploadHelper form={form} onApply={handleAiApply} />

      <ImageDropzone
        label="Campaign Banner *"
        hint="Main image on your public page — rally photo, candidate portrait, or party graphic"
        value={banner}
        previewUrl={bannerPreview}
        onChange={handleBannerChange}
        onRemove={handleBannerRemove}
        error={errors.banner}
      />

      <details className="group">
        <summary className="text-sm text-gray-400 hover:text-brand-400 cursor-pointer list-none flex items-center gap-1">
          <span className="group-open:hidden">+ Add party logo & gallery (optional)</span>
          <span className="hidden group-open:inline">− Hide party logo & gallery</span>
        </summary>
        <div className="space-y-4 mt-4">
          <ImageDropzone
            label="Party logo (optional)"
            hint="Party or candidate logo — shown on your campaign page"
            value={logo}
            previewUrl={logoPreview}
            onChange={handleLogoChange}
            onRemove={handleLogoRemove}
          />
          <GalleryDropzone
            files={gallery}
            previews={galleryPreviews}
            onChange={handleGalleryChange}
            onRemoveAt={handleGalleryRemoveAt}
          />
        </div>
      </details>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Headline *</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} className={`input-field ${errors.title ? 'border-red-500/50' : ''}`} placeholder="e.g. Vote Kofi Mensah — Accra Central" />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Message *</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={`input-field resize-none ${errors.description ? 'border-red-500/50' : ''}`} placeholder="Your core message to voters — vision, priorities, and why you're running." />
        {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        <p className="text-[10px] text-gray-600 mt-1">Min {CONTENT_LIMITS.descriptionMin} characters · this is your public campaign message</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Office Level</label>
          <select name="campaignType" value={form.campaignType} onChange={handleChange} className="input-field">
            {OFFICE_LEVELS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <input type="text" value={POLITICS_CATEGORY} readOnly className="input-field bg-surface-elevated/50 text-gray-400 cursor-default" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
          <input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Contact Number *</label>
          <input type="tel" name="contactPhone" value={form.contactPhone} onChange={handleChange} className={`input-field ${errors.contactPhone ? 'border-red-500/50' : ''}`} placeholder="024XXXXXXX" />
          {errors.contactPhone && <p className="text-xs text-red-400 mt-1">{errors.contactPhone}</p>}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowSocial((v) => !v)}
          className="text-sm text-gray-400 hover:text-brand-400 transition-colors"
        >
          {showSocial ? '− Hide official campaign links' : '+ Add official campaign links (optional)'}
        </button>
        {showSocial && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <input type="url" name="socialFacebook" value={form.socialFacebook} onChange={handleChange} className="input-field text-sm" placeholder="Facebook URL" />
            <input type="url" name="socialTwitter" value={form.socialTwitter} onChange={handleChange} className="input-field text-sm" placeholder="X / Twitter URL" />
            <input type="url" name="socialInstagram" value={form.socialInstagram} onChange={handleChange} className="input-field text-sm" placeholder="Instagram URL" />
            <input type="url" name="socialWebsite" value={form.socialWebsite} onChange={handleChange} className="input-field text-sm" placeholder="Website URL" />
          </div>
        )}
      </div>

      <button type="submit" disabled={launching} className="btn-primary w-full py-3.5 text-base disabled:opacity-50">
        {launching ? 'Publishing…' : 'Publish Campaign Page →'}
      </button>
    </motion.form>
  );
}
