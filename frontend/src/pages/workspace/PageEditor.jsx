import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Save,
  ImagePlus,
  Plus,
  Trash2,
  Target,
  Share2,
  MessageCircle,
  EyeOff,
  Eye,
  TriangleAlert,
  Palette,
  Calculator,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Select, Textarea, Toggle, CopyField, Badge } from '../../components/ui';
import QrCode from '../../components/QrCode';
import { FacebookIcon } from '../../components/BrandIcons';
import { updateCampaignContent, hideCampaignFromPublic, relaunchCampaign, deleteCampaign } from '../../services/campaignFirestoreService';
import { uploadBanner, uploadLogo } from '../../services/storageService';
import { GHANA_REGIONS, getConstituenciesForRegion } from '../../data/ghanaRegions';
import { OFFICE_LEVELS, isCampaignVisible } from '../../utils/campaignHelpers';
import { formatNumber, cn } from '../../utils/format';

export const THEME_COLORS = [
  { value: '#0f2747', label: 'Navy' },
  { value: '#0b6b3a', label: 'Green' },
  { value: '#b4232c', label: 'Red' },
  { value: '#1d4ed8', label: 'Blue' },
  { value: '#a16207', label: 'Gold' },
  { value: '#6d28d9', label: 'Purple' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#111827', label: 'Black' },
];

function pickForm(c) {
  return {
    title: c.title || '',
    candidateName: c.candidateName || c.ownerName || '',
    campaignType: c.campaignType || 'Parliamentary',
    party: c.party || '',
    region: c.region || '',
    constituency: c.constituency || '',
    slogan: c.slogan || '',
    description: c.description || '',
    priorities: (c.priorities || []).length ? c.priorities : [{ title: '', text: '' }],
    electionDate: c.electionDate || '',
    voteTarget: c.voteTarget || '',
    registeredVoters: c.registeredVoters || '',
    themeColor: c.themeColor || '#0f2747',
    contactEmail: c.contactEmail || '',
    contactPhone: c.contactPhone || '',
    socialLinks: { facebook: '', twitter: '', instagram: '', tiktok: '', youtube: '', website: '', ...(c.socialLinks || {}) },
    sections: { volunteer: true, donate: false, events: true, poll: false, ...(c.sections || {}) },
  };
}

export default function PageEditor() {
  const { campaign } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [form, setForm] = useState(() => pickForm(campaign));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [turnout, setTurnout] = useState(65);
  const bannerRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    if (!dirty) setForm(pickForm(campaign));
  }, [campaign, dirty]);

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  }, [hash]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const on = (k) => (e) => set(k, e.target.value);
  const setSocial = (k) => (e) => set('socialLinks', { ...form.socialLinks, [k]: e.target.value });
  const setSection = (k) => (v) => set('sections', { ...form.sections, [k]: v });

  const save = async () => {
    if (!form.title.trim()) {
      toast('Your campaign needs a name', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateCampaignContent(campaign.id, {
        ...form,
        sections: { ...form.sections, donate: form.sections.donate && !!campaign.donation?.number },
      });
      setDirty(false);
      toast('Campaign page updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const url = kind === 'banner' ? await uploadBanner(file) : await uploadLogo(file);
      await updateCampaignContent(campaign.id, kind === 'banner' ? { bannerImage: url } : { logoUrl: url });
      toast(kind === 'banner' ? 'Banner updated' : 'Photo updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(null);
    }
  };

  const suggestedTarget = useMemo(() => {
    const reg = Number(form.registeredVoters) || 0;
    if (!reg) return 0;
    return Math.ceil(reg * (turnout / 100) * 0.5) + 1;
  }, [form.registeredVoters, turnout]);

  const url = `${window.location.origin}/campaign/${campaign.slug}`;
  const live = isCampaignVisible(campaign);
  const constituencies = getConstituenciesForRegion(form.region);

  const toggleVisibility = async () => {
    try {
      if (campaign.status === 'disabled' || campaign.disabled) {
        await relaunchCampaign(campaign.id);
        toast('Your page is public again', 'success');
      } else {
        await hideCampaignFromPublic(campaign.id);
        toast('Page hidden from the public', 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async () => {
    const typed = window.prompt(`This permanently deletes "${campaign.title}" and its page. Type DELETE to confirm.`);
    if (typed !== 'DELETE') return;
    try {
      await deleteCampaign(campaign.id);
      toast('Campaign deleted', 'info');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start pb-24">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Candidate & campaign" subtitle="Shown at the top of your public page." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input className="sm:col-span-2" label="Campaign name" required value={form.title} onChange={on('title')} placeholder="e.g. Ama Mensah for Madina 2028" />
            <Input label="Candidate name" value={form.candidateName} onChange={on('candidateName')} />
            <Select label="Office" value={form.campaignType} onChange={on('campaignType')} options={OFFICE_LEVELS} />
            <Input label="Party" value={form.party} onChange={on('party')} placeholder="Party or Independent" />
            <Input label="Slogan" value={form.slogan} onChange={on('slogan')} placeholder="e.g. Madina deserves better" maxLength={80} />
            <Select label="Region" value={form.region} onChange={(e) => { set('region', e.target.value); }} options={GHANA_REGIONS} placeholder="Select region" />
            <div>
              <Input label="Constituency / area" value={form.constituency} onChange={on('constituency')} list="constituency-options" />
              <datalist id="constituency-options">
                {constituencies.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div className="mt-5">
            <p className="label flex items-center gap-1.5"><Palette className="w-4 h-4" /> Page colour</p>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('themeColor', c.value)}
                  className={cn('w-9 h-9 rounded-full border-2 transition-transform', form.themeColor === c.value ? 'border-ink scale-110' : 'border-transparent')}
                  style={{ background: c.value }}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
              <label className="relative w-9 h-9 rounded-full border border-dashed border-line-strong flex items-center justify-center cursor-pointer overflow-hidden" title="Custom colour">
                <input type="color" value={form.themeColor} onChange={(e) => set('themeColor', e.target.value)} className="w-12 h-12 cursor-pointer opacity-0 absolute" />
                <Plus className="w-4 h-4 text-ink-3" />
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Photos" subtitle="A wide banner (1600×600) and a square portrait or party logo." />
          <div className="grid sm:grid-cols-[1fr_160px] gap-4">
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              className="relative aspect-[8/3] rounded-xl border border-dashed border-line-strong overflow-hidden bg-surface-2 flex items-center justify-center group"
            >
              {campaign.bannerImage ? (
                <img src={campaign.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <span className="relative inline-flex items-center gap-2 rounded-lg bg-surface/90 px-3 py-2 text-sm font-medium text-ink shadow-xs">
                <ImagePlus className="w-4 h-4" /> {uploading === 'banner' ? 'Uploading…' : campaign.bannerImage ? 'Replace banner' : 'Upload banner'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="relative aspect-square rounded-xl border border-dashed border-line-strong overflow-hidden bg-surface-2 flex items-center justify-center"
            >
              {campaign.logoUrl ? <img src={campaign.logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
              <span className="relative inline-flex items-center gap-1.5 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs">
                <ImagePlus className="w-4 h-4" /> {uploading === 'logo' ? 'Uploading…' : 'Portrait'}
              </span>
            </button>
          </div>
          <input ref={bannerRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { upload('banner', e.target.files?.[0]); e.target.value = ''; }} />
          <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { upload('logo', e.target.files?.[0]); e.target.value = ''; }} />
        </Card>

        <Card>
          <CardHeader title="Your message" subtitle="Tell voters who you are and why you're running." />
          <Textarea label="Campaign message" rows={6} value={form.description} onChange={on('description')} maxLength={3000} hint={`${form.description.length}/3000`} />
          <div className="mt-5">
            <p className="label">Priorities (up to 6)</p>
            <div className="space-y-3">
              {form.priorities.map((p, i) => (
                <div key={i} className="rounded-xl border border-line p-3 grid gap-2">
                  <div className="flex gap-2">
                    <input
                      className="input"
                      placeholder={`Priority ${i + 1} — e.g. Jobs for the youth`}
                      value={p.title}
                      maxLength={80}
                      onChange={(e) => set('priorities', form.priorities.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    />
                    <button type="button" className="btn btn-ghost btn-icon h-11 w-11" aria-label="Remove priority" onClick={() => set('priorities', form.priorities.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    maxLength={400}
                    placeholder="One or two sentences on what you will do."
                    value={p.text}
                    onChange={(e) => set('priorities', form.priorities.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  />
                </div>
              ))}
            </div>
            {form.priorities.length < 6 && (
              <Button className="mt-3" size="sm" variant="ghost" icon={Plus} onClick={() => set('priorities', [...form.priorities, { title: '', text: '' }])}>
                Add priority
              </Button>
            )}
          </div>
        </Card>

        <Card id="strategy" className="scroll-mt-24">
          <CardHeader title="Election & win number" icon={Target} subtitle="Powers your countdown and path-to-victory projection." />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Election date" type="date" value={form.electionDate} onChange={on('electionDate')} />
            <Input label="Registered voters" type="number" min="0" value={form.registeredVoters} onChange={on('registeredVoters')} hint="In your constituency / area" />
            <Input label="Win number" type="number" min="0" value={form.voteTarget} onChange={on('voteTarget')} hint="Votes you need to win" />
          </div>
          {Number(form.registeredVoters) > 0 && (
            <div className="mt-4 rounded-xl bg-surface-2 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Calculator className="w-5 h-5 text-ink-3 shrink-0" />
              <p className="text-sm text-ink-2 flex-1">
                At{' '}
                <select className="input input-sm inline w-20 h-8 mx-1" value={turnout} onChange={(e) => setTurnout(Number(e.target.value))} aria-label="Expected turnout">
                  {[50, 55, 60, 65, 70, 75, 80].map((t) => <option key={t} value={t}>{t}%</option>)}
                </select>
                turnout, a two-way race needs about <strong className="text-ink">{formatNumber(suggestedTarget)}</strong> votes.
              </p>
              <Button size="sm" variant="secondary" onClick={() => set('voteTarget', suggestedTarget)}>Use this</Button>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Contact & social" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Public email" type="email" value={form.contactEmail} onChange={on('contactEmail')} />
            <Input label="Public phone / WhatsApp" value={form.contactPhone} onChange={on('contactPhone')} />
            <Input label="Facebook" value={form.socialLinks.facebook} onChange={setSocial('facebook')} placeholder="facebook.com/…" />
            <Input label="X (Twitter)" value={form.socialLinks.twitter} onChange={setSocial('twitter')} placeholder="x.com/…" />
            <Input label="Instagram" value={form.socialLinks.instagram} onChange={setSocial('instagram')} placeholder="instagram.com/…" />
            <Input label="TikTok" value={form.socialLinks.tiktok} onChange={setSocial('tiktok')} placeholder="tiktok.com/@…" />
            <Input label="YouTube" value={form.socialLinks.youtube} onChange={setSocial('youtube')} placeholder="youtube.com/@…" />
            <Input label="Website" value={form.socialLinks.website} onChange={setSocial('website')} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Page sections" subtitle="Choose what supporters can do on your page." />
          <div className="space-y-4">
            <Toggle checked={form.sections.volunteer} onChange={setSection('volunteer')} label="Volunteer sign-up" description="Applicants appear in Field team." />
            <Toggle checked={form.sections.events} onChange={setSection('events')} label="Upcoming events with RSVP" />
            <Toggle checked={form.sections.poll} onChange={setSection('poll')} label="Issue poll" description="Set the question in Insights." />
            <Toggle
              checked={form.sections.donate && !!campaign.donation?.number}
              onChange={setSection('donate')}
              disabled={!campaign.donation?.number}
              label="Donate with MoMo"
              description={campaign.donation?.number ? `To ${campaign.donation.network} ${campaign.donation.number}` : 'Add your MoMo number in Fundraising first.'}
            />
          </div>
        </Card>

        <Card className="border-danger/30">
          <CardHeader title="Visibility" icon={TriangleAlert} />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              {campaign.status === 'disabled' || campaign.disabled
                ? 'Your page is hidden. Supporters see “page unavailable”.'
                : 'Hide your page temporarily without losing any data.'}
            </p>
            <Button variant="secondary" icon={campaign.status === 'disabled' || campaign.disabled ? Eye : EyeOff} onClick={toggleVisibility}>
              {campaign.status === 'disabled' || campaign.disabled ? 'Make public again' : 'Hide page'}
            </Button>
          </div>
          <div className="divider my-5" />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">Delete this campaign page permanently.</p>
            <Button variant="danger-ghost" icon={Trash2} onClick={remove}>Delete campaign</Button>
          </div>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader title="Share kit" icon={Share2} action={live ? <Badge tone="success">Live</Badge> : <Badge>Offline</Badge>} />
          <CopyField value={url} />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button size="sm" variant="secondary" icon={MessageCircle} href={`https://wa.me/?text=${encodeURIComponent(`${form.slogan || form.title}\n${url}?ref=whatsapp`)}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </Button>
            <Button size="sm" variant="secondary" icon={FacebookIcon} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${url}?ref=facebook`)}`} target="_blank" rel="noopener noreferrer">
              Facebook
            </Button>
          </div>
          <div className="mt-5 flex justify-center">
            <QrCode value={`${url}?ref=qr`} size={176} filename={`${campaign.slug}-qr`} title={form.candidateName || form.title} caption="For posters, flyers and T-shirts. Scans are tracked in Insights." />
          </div>
        </Card>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[272px] z-30 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-2">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setForm(pickForm(campaign)); setDirty(false); }}>Discard</Button>
              <Button icon={Save} onClick={save} loading={saving}>Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
