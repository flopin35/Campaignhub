import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { registerSupporter } from '../services/supporterService';
import { registerVolunteer } from '../services/volunteerService';
import {
  GHANA_REGIONS,
  getConstituenciesForRegion,
  SUPPORTER_INTERESTS,
} from '../data/ghanaRegions';
import { Users, HandHeart } from 'lucide-react';

export default function SupporterSignupModal({ campaign, onClose, defaultVolunteer = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.displayName || '',
    phone: '',
    email: user?.email || '',
    region: '',
    constituency: '',
    interests: [],
    isVolunteer: defaultVolunteer,
  });

  const constituencies = getConstituenciesForRegion(form.region);

  const toggleInterest = (interest) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast('Name and phone are required', 'warning');
      return;
    }

    setLoading(true);
    try {
      await registerSupporter({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        ownerId: campaign.ownerId,
        userId: user?.uid || null,
        ...form,
      });

      if (form.isVolunteer) {
        await registerVolunteer({
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          ownerId: campaign.ownerId,
          userId: user?.uid || null,
          name: form.name,
          phone: form.phone,
          email: form.email,
          region: form.region,
          constituency: form.constituency,
          skills: form.interests,
        });
      }

      toast(
        form.isVolunteer
          ? 'You\'re signed up for updates and to help this campaign page.'
          : 'You\'re signed up for official campaign updates.',
        'success'
      );
      onClose();
    } catch (err) {
      toast(err.message || 'Could not register. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="modal-sheet glass-card"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
              {defaultVolunteer ? (
                <HandHeart className="w-5 h-5 text-brand-400" />
              ) : (
                <Users className="w-5 h-5 text-brand-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {defaultVolunteer ? 'Offer to help this campaign' : 'Get campaign updates'}
              </h2>
              <p className="text-xs text-gray-500">Official page: {campaign.title}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Full name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone (MoMo) *</label>
              <input
                className="input-field"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                placeholder="024XXXXXXX"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Region</label>
                <select
                  className="input-field text-sm"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value, constituency: '' })}
                >
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Constituency</label>
                <select
                  className="input-field text-sm"
                  value={form.constituency}
                  onChange={(e) => setForm({ ...form, constituency: e.target.value })}
                  disabled={!form.region}
                >
                  <option value="">Select</option>
                  {constituencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {SUPPORTER_INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      form.interests.includes(interest)
                        ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                        : 'border-surface-border text-gray-500'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? 'Signing up…' : 'Sign up for updates'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
