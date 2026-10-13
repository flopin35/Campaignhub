import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Sparkles, Rocket, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Button, Input, Select, Textarea, Alert } from '../components/ui';
import { CheckoutDialog } from '../components/billing/Checkout';
import { createCampaign } from '../services/campaignFirestoreService';
import { GHANA_REGIONS, getConstituenciesForRegion } from '../data/ghanaRegions';
import { OFFICE_LEVELS } from '../utils/campaignHelpers';
import { canStartTrial } from '../utils/billing';
import { sectionPath } from '../data/workspaceNav';
import { cn } from '../utils/format';

const STEPS = ['Candidate', 'Message', 'Photos', 'Launch'];

export default function NewCampaign() {
  const { user, userProfile, setUserProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    candidateName: userProfile?.name || user?.displayName || '',
    campaignType: 'Parliamentary',
    party: '',
    region: '',
    constituency: '',
    title: '',
    slogan: '',
    description: '',
    electionDate: '',
    priorities: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }],
    contactPhone: '',
  });
  const [banner, setBanner] = useState(null);
  const [logo, setLogo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [created, setCreated] = useState(null);
  const trial = canStartTrial(userProfile);

  const suggestedTitle = useMemo(() => {
    if (!form.candidateName) return '';
    const place = form.constituency || form.region;
    return place ? `${form.candidateName} for ${place}` : `${form.candidateName} ${form.campaignType === 'Presidential' ? 'for President' : 'Campaign'}`;
  }, [form.candidateName, form.constituency, form.region, form.campaignType]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const title = form.title || suggestedTitle;

  const canNext = [
    form.candidateName.trim().length > 1 && !!form.campaignType,
    true,
    true,
    true,
  ][step];

  const launch = async () => {
    setProgress({ pct: 2, label: 'Starting…' });
    try {
      const c = await createCampaign({
        form: { ...form, title },
        bannerFile: banner,
        logoFile: logo,
        owner: { uid: user.uid, name: userProfile?.name || user.displayName || form.candidateName, email: user.email },
        useTrial: trial,
        onUploadProgress: (pct, label) => setProgress({ pct, label }),
      });
      if (trial) {
        setUserProfile?.((p) => ({ ...(p || {}), trialCampaignId: c.id }));
        toast('Your campaign is live and your 7-day Pro trial has started!', 'success');
        navigate(sectionPath(c.id), { replace: true });
      } else {
        toast('Campaign saved. Choose a plan to publish it.', 'success');
        setCreated(c);
      }
    } catch (err) {
      toast(err.message || 'Could not create campaign', 'error');
    } finally {
      setProgress(null);
    }
  };

  const preview = (file) => (file ? URL.createObjectURL(file) : null);
  const bannerUrl = useMemo(() => preview(banner), [banner]);
  const logoUrl = useMemo(() => preview(logo), [logo]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      <p className="eyebrow">New campaign page</p>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">Set up your campaign</h1>
      <p className="text-ink-3 mt-1.5">You can change everything later in Campaign page settings.</p>

      <ol className="mt-6 mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-surface-3')} />
            <p className={cn('mt-2 text-xs font-medium', i === step ? 'text-ink' : 'text-ink-3')}>{i + 1}. {s}</p>
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Input className="sm:col-span-2" label="Candidate name" required value={form.candidateName} onChange={set('candidateName')} placeholder="e.g. Hon. Ama Mensah" autoFocus />
            <Select label="Office you're running for" value={form.campaignType} onChange={set('campaignType')} options={OFFICE_LEVELS} />
            <Input label="Party" value={form.party} onChange={set('party')} placeholder="Party name or Independent" />
            <Select label="Region" value={form.region} onChange={set('region')} options={GHANA_REGIONS} placeholder="Select region" />
            <div>
              <Input label="Constituency / area" value={form.constituency} onChange={set('constituency')} list="new-constituencies" placeholder="e.g. Madina" />
              <datalist id="new-constituencies">
                {getConstituenciesForRegion(form.region).map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <Input className="sm:col-span-2" label="Campaign name" value={form.title} onChange={set('title')} placeholder={suggestedTitle || 'e.g. Ama Mensah for Madina'} hint="Shown as the title of your public page." />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <Input label="Slogan" value={form.slogan} onChange={set('slogan')} placeholder="e.g. Madina deserves better" maxLength={80} />
            <Textarea label="Your message to voters" rows={5} value={form.description} onChange={set('description')} placeholder="Who you are, why you're running, and what you'll change." />
            <div>
              <p className="label">Top priorities <span className="text-ink-3 font-normal text-xs ml-1">Optional</span></p>
              <div className="space-y-2">
                {form.priorities.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      value={p.title}
                      placeholder={['Jobs for the youth', 'Good roads & drainage', 'Water in every home'][i] || 'Priority'}
                      onChange={(e) => setForm((f) => ({ ...f, priorities: f.priorities.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) }))}
                    />
                    {form.priorities.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-icon h-11 w-11" onClick={() => setForm((f) => ({ ...f, priorities: f.priorities.filter((_, j) => j !== i) }))} aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {form.priorities.length < 6 && (
                <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setForm((f) => ({ ...f, priorities: [...f.priorities, { title: '', text: '' }] }))}>Add priority</Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Election date" type="date" value={form.electionDate} onChange={set('electionDate')} optional />
              <Input label="Campaign phone / WhatsApp" value={form.contactPhone} onChange={set('contactPhone')} optional />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p className="text-sm text-ink-2">A strong banner and a clear portrait make your page look official. You can skip this and add them later.</p>
            <label className="block">
              <span className="label">Banner (wide, 1600×600)</span>
              <span className="relative block aspect-[8/3] rounded-xl border border-dashed border-line-strong bg-surface-2 overflow-hidden cursor-pointer">
                {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-surface/90 px-3 py-2 text-sm font-medium text-ink shadow-xs">
                    <ImagePlus className="w-4 h-4" /> {banner ? 'Change banner' : 'Choose banner'}
                  </span>
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setBanner(e.target.files?.[0] || null)} />
              </span>
            </label>
            <label className="block w-40">
              <span className="label">Portrait or logo</span>
              <span className="relative block aspect-square rounded-xl border border-dashed border-line-strong bg-surface-2 overflow-hidden cursor-pointer">
                {logoUrl && <img src={logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs font-medium text-ink shadow-xs">
                    <ImagePlus className="w-4 h-4" /> {logo ? 'Change' : 'Choose'}
                  </span>
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
              </span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="rounded-xl border border-line overflow-hidden">
              <div className="h-24 relative" style={{ background: bannerUrl ? undefined : '#0f2747' }}>
                {bannerUrl && <img src={bannerUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <p className="font-bold text-ink">{title || 'Your campaign'}</p>
                <p className="text-sm text-ink-3">{[form.campaignType, form.party, form.constituency || form.region].filter(Boolean).join(' · ')}</p>
                {form.slogan && <p className="text-sm text-ink-2 mt-2 italic">“{form.slogan}”</p>}
              </div>
            </div>
            {trial ? (
              <Alert className="mt-5" tone="gold" icon={Sparkles} title="7-day free trial included">
                Your page goes live immediately and every Pro tool is unlocked for 7 days. No payment needed now — after the trial it&apos;s ₵120/month or ₵1,200/year.
              </Alert>
            ) : (
              <Alert className="mt-5" tone="info" icon={Rocket} title="Choose a plan to publish">
                Your account has already used its free trial. We&apos;ll save this page, then you can pay ₵120/month or ₵1,200/year with MoMo or card to publish it.
              </Alert>
            )}
            {progress && (
              <div className="mt-5">
                <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
                </div>
                <p className="text-xs text-ink-3 mt-2">{progress.label}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => (step ? setStep(step - 1) : navigate(-1))} disabled={!!progress}>
            Back
          </Button>
          {step < 3 ? (
            <Button iconRight={ArrowRight} onClick={() => setStep(step + 1)} disabled={!canNext}>
              {step === 2 && !banner && !logo ? 'Skip for now' : 'Continue'}
            </Button>
          ) : (
            <Button variant={trial ? 'gold' : 'primary'} icon={trial ? Rocket : Check} onClick={launch} loading={!!progress}>
              {trial ? 'Launch & start free trial' : 'Save & choose plan'}
            </Button>
          )}
        </div>
      </Card>

      <CheckoutDialog
        open={!!created}
        campaign={created}
        onClose={() => navigate(sectionPath(created.id, 'billing'), { replace: true })}
      />
    </div>
  );
}
