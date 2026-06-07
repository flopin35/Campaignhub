import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, CAMPAIGN_TYPES } from '../utils/campaignHelpers';
import { validateCampaignContent, CONTENT_LIMITS } from '../utils/contentQuality';
import AIUploadHelper from './AIUploadHelper';
import ImageDropzone, { GalleryDropzone } from './ImageDropzone';

export default function UploadForm({ onComplete, defaultEmail = '' }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    campaignType: 'Awareness',
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
    if (type === 'title') setForm((f) => ({ ...f, title: text.split('\n')[0].replace(/^\d+\.\s*/, '').slice(0, 120) }));
    else if (type === 'slogan') setForm((f) => ({ ...f, title: f.title || text.slice(0, 80) }));
    else if (type === 'description') setForm((f) => ({ ...f, description: text }));
    else if (type === 'tips') setForm((f) => ({ ...f, description: f.description ? `${f.description}\n\n${text}` : text }));
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="glass-card space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Campaign Details</h2>
        <p className="text-sm text-gray-500">Fill in your campaign info — takes about 2 minutes.</p>
      </div>

      <AIUploadHelper form={form} onApply={handleAiApply} />

      <ImageDropzone
        label="Campaign Banner *"
        hint="Main image shown on your campaign page"
        value={banner}
        previewUrl={bannerPreview}
        onChange={handleBannerChange}
        onRemove={handleBannerRemove}
        error={errors.banner}
      />

      <ImageDropzone
        label="Logo (optional)"
        hint="Square logo — shown on campaign page"
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

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Title *</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} className={`input-field ${errors.title ? 'border-red-500/50' : ''}`} placeholder="e.g. Vote for Change 2026" />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={`input-field resize-none ${errors.description ? 'border-red-500/50' : ''}`} placeholder="Tell people about your campaign..." />
        {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        <p className="text-[10px] text-gray-600 mt-1">Min {CONTENT_LIMITS.descriptionMin} characters · reviewed before approval</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Type</label>
          <select name="campaignType" value={form.campaignType} onChange={handleChange} className="input-field">
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select name="category" value={form.category} onChange={handleChange} className="input-field">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
        <label className="block text-sm font-medium text-gray-300 mb-3">Social Links (optional)</label>
        <div className="grid sm:grid-cols-2 gap-3">
          <input type="url" name="socialFacebook" value={form.socialFacebook} onChange={handleChange} className="input-field text-sm" placeholder="Facebook URL" />
          <input type="url" name="socialTwitter" value={form.socialTwitter} onChange={handleChange} className="input-field text-sm" placeholder="X / Twitter URL" />
          <input type="url" name="socialInstagram" value={form.socialInstagram} onChange={handleChange} className="input-field text-sm" placeholder="Instagram URL" />
          <input type="url" name="socialWebsite" value={form.socialWebsite} onChange={handleChange} className="input-field text-sm" placeholder="Website URL" />
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-3.5 text-base">Continue to Packages →</button>
    </motion.form>
  );
}
