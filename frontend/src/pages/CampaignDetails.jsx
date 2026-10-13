import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  MapPin,
  CalendarDays,
  Share2,
  MessageCircle,
  Globe,
  Phone,
  Mail,
  HandHeart,
  Users,
  Check,
  Copy,
  Vote,
  HandCoins,
  LayoutDashboard,
  Flag,
  QrCode as QrIcon,
} from 'lucide-react';
import { useCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select, Modal, Spinner, useCopy } from '../components/ui';
import BrandMark from '../components/BrandMark';
import QrCode from '../components/QrCode';
import { FacebookIcon, XIcon, InstagramIcon, YoutubeIcon, TiktokIcon } from '../components/BrandIcons';
import { trackVisit, getAdCode, trackPlatformShare } from '../services/analyticsService';
import { getReferralSource } from '../utils/sharing';
import { registerSupporter } from '../services/supporterService';
import { registerVolunteer } from '../services/volunteerService';
import { rsvpEvent } from '../services/eventService';
import { getPublicEvents, submitPollResponse } from '../services/workspaceService';
import { createDonation, submitDonationTxn } from '../services/donationService';
import { GHANA_REGIONS, DONATION_TIERS } from '../data/ghanaRegions';
import { isCampaignVisible, normalizeExternalUrl } from '../utils/campaignHelpers';
import { daysToElection } from '../utils/projection';
import { cedis, initials, formatNumber } from '../utils/format';

function readableOn(hex = '#0f2747') {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#0b1526' : '#ffffff';
}

function useOnce(key) {
  const storageKey = `ch-once-${key}`;
  const [done, setDone] = useState(() => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  const mark = () => {
    setDone(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
  };
  return [done, mark];
}

export default function CampaignDetails() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { campaign, loading, error } = useCampaign(slug, { ownerId: user?.uid });
  const tracked = useRef(false);
  const adCode = getAdCode(params);

  const visible = campaign && isCampaignVisible(campaign);
  const isOwner = !!campaign && user?.uid === campaign.ownerId;

  useEffect(() => {
    if (!visible || tracked.current || isOwner) return;
    tracked.current = true;
    trackVisit(campaign.id, getReferralSource(params), adCode).catch(() => {});
  }, [visible, isOwner, campaign, params, adCode]);

  useEffect(() => {
    if (campaign?.title) document.title = `${campaign.title} — Official campaign page`;
    return () => {
      document.title = 'CampaignHub Pro — Run a winning campaign in Ghana';
    };
  }, [campaign?.title]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner label="Loading campaign…" />
      </div>
    );
  }

  if (error || !campaign || (!visible && !isOwner)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <BrandMark size={44} />
        <h1 className="mt-6 text-2xl font-extrabold text-ink">This campaign page isn&apos;t available</h1>
        <p className="mt-2 text-ink-2 max-w-md">It may be paused, renewing or no longer active. Check back soon or browse other campaigns.</p>
        <div className="mt-6 flex gap-2">
          <Button to="/campaigns">Browse campaigns</Button>
          <Button variant="secondary" to="/">CampaignHub home</Button>
        </div>
      </div>
    );
  }

  return <PublicPage campaign={campaign} isOwner={isOwner} visible={visible} adCode={adCode} />;
}

function PublicPage({ campaign: c, isOwner, visible, adCode }) {
  const brand = c.themeColor || '#0f2747';
  const onBrand = readableOn(brand);
  const sections = { volunteer: true, events: true, poll: false, donate: false, ...(c.sections || {}) };
  const days = daysToElection(c);
  const [events, setEvents] = useState([]);
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const url = `${window.location.origin}/campaign/${c.slug}`;
  const priorities = (c.priorities || []).filter((p) => p.title);
  const social = c.socialLinks || {};
  const canDonate = sections.donate && c.donation?.number;

  useEffect(() => {
    if (!sections.events) return;
    getPublicEvents(c.id).then(setEvents).catch(() => setEvents([]));
  }, [c.id, sections.events]);

  const style = { '--brand': brand, '--on-brand': onBrand };

  return (
    <div className="min-h-screen bg-canvas" style={style}>
      {isOwner && (
        <div className="bg-primary text-primary-fg text-sm">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <span>{visible ? 'You are viewing your live campaign page.' : 'Preview — this page is not public right now (plan inactive or hidden).'}</span>
            <Link to={`/dashboard/${c.id}`} className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
              <LayoutDashboard className="w-4 h-4" /> Open dashboard
            </Link>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5 min-w-0">
            <Portrait campaign={c} size={32} brand={brand} onBrand={onBrand} />
            <span className="font-bold text-ink truncate">{c.candidateName || c.title}</span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShareOpen(true)} className="btn btn-ghost btn-sm" aria-label="Share">
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
            </button>
            <a
              href="#join"
              className="btn btn-sm"
              style={{ background: brand, color: onBrand }}
              onClick={(e) => {
                const target = [...document.querySelectorAll('[data-join]')].find((el) => el.offsetParent !== null);
                if (target) {
                  e.preventDefault();
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              Join the campaign
            </a>
          </div>
        </div>
      </header>

      <section id="top" className="relative">
        <div className="relative h-[220px] sm:h-[340px] overflow-hidden" style={{ background: brand }}>
          {c.bannerImage ? (
            <img src={c.bannerImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-grid opacity-20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="-mt-14 sm:-mt-20 rounded-3xl border-4 border-surface shadow-lift overflow-hidden w-28 h-28 sm:w-36 sm:h-36 bg-surface shrink-0">
              <Portrait campaign={c} size="100%" brand={brand} onBrand={onBrand} square />
            </div>
            <div className="pb-1 min-w-0 sm:pt-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
                {c.campaignType && <span className="font-medium text-ink-2">{c.campaignType}</span>}
                {c.party && <span>· {c.party}</span>}
                {c.verified && (
                  <span className="inline-flex items-center gap-1 text-link font-medium"><BadgeCheck className="w-4 h-4" /> Verified</span>
                )}
              </div>
              <h1 className="mt-1 text-3xl sm:text-5xl font-extrabold text-ink leading-tight text-balance">{c.title}</h1>
              {(c.constituency || c.region) && (
                <p className="mt-2 text-ink-2 inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {[c.constituency, c.region].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          {c.slogan && (
            <blockquote className="text-2xl sm:text-3xl font-display font-extrabold text-ink leading-snug border-l-4 pl-5" style={{ borderColor: brand }}>
              “{c.slogan}”
            </blockquote>
          )}

          {days != null && days >= 0 && (
            <div className="card p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: brand, color: onBrand }}>
                <Vote className="w-6 h-6" />
              </span>
              <div>
                <p className="text-2xl font-extrabold text-ink">{days === 0 ? 'Election day is today' : `${formatNumber(days)} day${days === 1 ? '' : 's'} to election day`}</p>
                <p className="text-sm text-ink-3">{new Date(`${c.electionDate}T07:00:00`).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Polls open 7am</p>
              </div>
            </div>
          )}

          <div className="lg:hidden">
            <JoinCard campaign={c} brand={brand} onBrand={onBrand} adCode={adCode} />
          </div>

          {c.description && (
            <section>
              <h2 className="text-xl font-bold text-ink mb-3">Our message</h2>
              <div className="prose-campaign text-[17px] text-ink-2">
                {c.description.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </div>
            </section>
          )}

          {priorities.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-ink mb-4">Our priorities</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {priorities.map((p, i) => (
                  <div key={i} className="card p-5">
                    <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-sm font-bold" style={{ background: brand, color: onBrand }}>{i + 1}</span>
                    <h3 className="mt-3 font-bold text-ink">{p.title}</h3>
                    {p.text && <p className="mt-1.5 text-[15px] text-ink-2 leading-relaxed">{p.text}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {sections.events && events.length > 0 && (
            <section id="events" className="scroll-mt-20">
              <h2 className="text-xl font-bold text-ink mb-4">Upcoming events</h2>
              <div className="space-y-3">
                {events.slice(0, 6).map((e) => <EventRow key={e.id} event={e} brand={brand} onBrand={onBrand} />)}
              </div>
            </section>
          )}

          {sections.poll && c.poll?.options?.length > 0 && <PollCard campaign={c} brand={brand} onBrand={onBrand} />}

          {c.galleryImages?.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-ink mb-4">On the campaign trail</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {c.galleryImages.slice(0, 9).map((img) => (
                  <img key={img} src={img} alt="" className="rounded-xl aspect-square object-cover border border-line" loading="lazy" />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <div className="hidden lg:block">
            <JoinCard campaign={c} brand={brand} onBrand={onBrand} adCode={adCode} />
          </div>

          {canDonate && (
            <div className="card p-5">
              <p className="font-bold text-ink flex items-center gap-2"><HandCoins className="w-5 h-5" /> Support with MoMo</p>
              <p className="text-sm text-ink-2 mt-1.5">{c.donation.note || 'Every cedi helps us reach more voters.'}</p>
              <Button block className="mt-4" variant="secondary" onClick={() => setDonateOpen(true)}>Donate</Button>
            </div>
          )}

          {sections.volunteer && <VolunteerCard campaign={c} />}

          <div className="card p-5">
            <p className="font-bold text-ink">Spread the word</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <a className="btn btn-secondary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${c.slogan || c.title}\n${url}?ref=whatsapp`)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackPlatformShare(c.id, 'whatsapp')} aria-label="Share on WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a className="btn btn-secondary btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${url}?ref=facebook`)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackPlatformShare(c.id, 'facebook')} aria-label="Share on Facebook">
                <FacebookIcon className="w-4 h-4" />
              </a>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShareOpen(true)} aria-label="More sharing options">
                <QrIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {(c.contactPhone || c.contactEmail || Object.values(social).some(Boolean)) && (
            <div className="card p-5 space-y-3 text-sm">
              <p className="font-bold text-ink">Contact</p>
              {c.contactPhone && <a href={`tel:${c.contactPhone}`} className="flex items-center gap-2 text-ink-2 hover:text-ink"><Phone className="w-4 h-4" /> {c.contactPhone}</a>}
              {c.contactEmail && <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-2 text-ink-2 hover:text-ink break-all"><Mail className="w-4 h-4" /> {c.contactEmail}</a>}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  ['facebook', FacebookIcon],
                  ['twitter', XIcon],
                  ['instagram', InstagramIcon],
                  ['youtube', YoutubeIcon],
                  ['tiktok', TiktokIcon],
                  ['website', Globe],
                ].map(([k, Icon]) => social[k] ? (
                  <a key={k} href={normalizeExternalUrl(social[k])} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-icon h-9 w-9" aria-label={k}>
                    <Icon className="w-4 h-4" />
                  </a>
                ) : null)}
              </div>
            </div>
          )}
        </aside>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-3">
          <Link to="/" className="inline-flex items-center gap-2 hover:text-ink">
            <BrandMark size={20} /> Powered by CampaignHub — run your campaign like a pro
          </Link>
          <Link to={`/support?report=${c.slug}`} className="inline-flex items-center gap-1 hover:text-ink"><Flag className="w-3.5 h-3.5" /> Report this page</Link>
        </div>
      </footer>

      {canDonate && <DonateSheet open={donateOpen} onClose={() => setDonateOpen(false)} campaign={c} />}
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} campaign={c} url={url} />
    </div>
  );
}

function Portrait({ campaign: c, size, brand, onBrand, square }) {
  const s = typeof size === 'number' ? { width: size, height: size } : { width: '100%', height: '100%' };
  if (c.logoUrl) return <img src={c.logoUrl} alt={c.candidateName || ''} className={square ? 'w-full h-full object-cover' : 'rounded-lg object-cover'} style={s} />;
  return (
    <span className={`flex items-center justify-center font-bold ${square ? 'text-4xl' : 'rounded-lg text-xs'}`} style={{ ...s, background: brand, color: onBrand }}>
      {initials(c.candidateName || c.title)}
    </span>
  );
}

function JoinCard({ campaign: c, brand, onBrand, adCode }) {
  const { toast } = useToast();
  const [done, markDone] = useOnce(`join-${c.id}`);
  const [form, setForm] = useState({ name: '', phone: '', pollingStation: '', region: c.region || '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.phone.replace(/\D/g, '').length < 9) {
      toast('Enter a valid phone number', 'warning');
      return;
    }
    setBusy(true);
    try {
      await registerSupporter({
        campaignId: c.id,
        campaignTitle: c.title,
        ownerId: c.ownerId,
        name: form.name,
        phone: form.phone,
        region: form.region,
        constituency: c.constituency || '',
        pollingStation: form.pollingStation,
        adCode,
        source: 'campaign_page',
      });
      markDone();
    } catch (err) {
      toast(err.message || 'Could not sign you up. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-join className="card overflow-hidden scroll-mt-20">
      <div className="px-5 py-4" style={{ background: brand, color: onBrand }}>
        <p className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Join the campaign</p>
        <p className="text-sm opacity-85">Get updates and be counted as a supporter.</p>
      </div>
      {done ? (
        <div className="p-5 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center"><Check className="w-6 h-6" /></span>
          <p className="mt-3 font-bold text-ink">Thank you for joining!</p>
          <p className="text-sm text-ink-2 mt-1">You&apos;re on the team. Invite three friends to join too.</p>
          <a
            className="btn btn-secondary btn-sm mt-4"
            href={`https://wa.me/?text=${encodeURIComponent(`I just joined ${c.candidateName || c.title}'s campaign. Join me: ${window.location.origin}/campaign/${c.slug}?ref=whatsapp`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-4 h-4" /> Invite on WhatsApp
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5 space-y-3">
          <Input label="Full name" required value={form.name} onChange={set('name')} autoComplete="name" />
          <Input label="Phone number" required inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="024 123 4567" />
          <Input label="Polling station" value={form.pollingStation} onChange={set('pollingStation')} optional />
          <Select label="Region" value={form.region} onChange={set('region')} options={GHANA_REGIONS} placeholder="Select region" />
          <button type="submit" disabled={busy} className="btn btn-lg w-full" style={{ background: brand, color: onBrand }}>
            {busy ? 'Joining…' : 'Count me in'}
          </button>
          <p className="text-[11px] text-ink-3 leading-snug">Your details go only to this campaign and are never sold. By joining you agree to receive campaign messages.</p>
        </form>
      )}
    </div>
  );
}

function VolunteerCard({ campaign: c }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [done, markDone] = useOnce(`vol-${c.id}`);
  const [busy, setBusy] = useState(false);
  const skills = ['Door-to-door', 'Polling agent', 'Social media', 'Driving', 'Events', 'Graphics & video'];
  const [picked, setPicked] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      await registerVolunteer({
        campaignId: c.id,
        campaignTitle: c.title,
        ownerId: c.ownerId,
        name: fd.name,
        phone: fd.phone,
        region: fd.region,
        constituency: c.constituency || '',
        skills: picked,
        availability: fd.availability,
      });
      markDone();
      setOpen(false);
      toast('Thank you! The campaign team will contact you.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <p className="font-bold text-ink flex items-center gap-2"><HandHeart className="w-5 h-5" /> Volunteer</p>
      <p className="text-sm text-ink-2 mt-1.5">{done ? 'Thanks — your application is in.' : 'Give a few hours a week. Every door counts.'}</p>
      {!done && <Button block className="mt-4" variant="secondary" onClick={() => setOpen(true)}>Sign up to volunteer</Button>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Volunteer with us"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="vol-form" loading={busy}>Submit</Button></>}
      >
        <form id="vol-form" onSubmit={submit} className="grid gap-4">
          <Input name="name" label="Full name" required />
          <Input name="phone" label="Phone" required inputMode="tel" />
          <Select name="region" label="Region" options={GHANA_REGIONS} placeholder="Select region" defaultValue={c.region || ''} />
          <div>
            <p className="label">How can you help?</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
                  className={`h-8 px-3 rounded-full border text-sm ${picked.includes(s) ? 'bg-primary text-primary-fg border-primary' : 'border-line-strong text-ink-2'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Input name="availability" label="When are you available?" placeholder="e.g. Weekends" optional />
        </form>
      </Modal>
    </div>
  );
}

function EventRow({ event: e, brand, onBrand }) {
  const [rsvped, mark] = useOnce(`rsvp-${e.id}`);
  const [count, setCount] = useState(e.rsvpCount || 0);
  const d = new Date(e.eventDate);
  const rsvp = async () => {
    if (rsvped) return;
    mark();
    setCount((n) => n + 1);
    rsvpEvent(e.id).catch(() => {});
  };
  return (
    <div className="card p-4 flex gap-4 items-center">
      <div className="w-14 shrink-0 rounded-xl text-center py-2" style={{ background: brand, color: onBrand }}>
        <p className="text-[11px] uppercase opacity-85">{d.toLocaleDateString('en-GH', { month: 'short' })}</p>
        <p className="text-xl font-extrabold leading-tight">{d.getDate()}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{e.title}</p>
        <p className="text-sm text-ink-3 truncate">
          <CalendarDays className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
          {d.toLocaleString('en-GH', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {e.venue || 'Venue TBC'}
        </p>
        {count > 0 && <p className="text-xs text-ink-3 mt-0.5">{formatNumber(count)} going</p>}
      </div>
      <Button size="sm" variant={rsvped ? 'secondary' : 'primary'} onClick={rsvp} icon={rsvped ? Check : undefined}>
        {rsvped ? 'Going' : 'RSVP'}
      </Button>
    </div>
  );
}

function PollCard({ campaign: c, brand, onBrand }) {
  const [done, mark] = useOnce(`poll-${c.id}-${c.poll.question}`);
  const [region, setRegion] = useState(c.region || '');
  const [busy, setBusy] = useState(false);
  const vote = async (option) => {
    setBusy(true);
    try {
      await submitPollResponse({ campaignId: c.id, option, region });
      mark();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Have your say</p>
      <h2 className="mt-2 text-xl font-bold text-ink">{c.poll.question}</h2>
      {done ? (
        <p className="mt-4 text-ink-2 flex items-center gap-2"><Check className="w-5 h-5 text-success" /> Thank you — your voice has been counted.</p>
      ) : (
        <>
          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            {c.poll.options.map((o) => (
              <button
                key={o}
                type="button"
                disabled={busy}
                onClick={() => vote(o)}
                className="text-left rounded-xl border border-line-strong px-4 py-3 text-[15px] font-medium text-ink hover:border-transparent transition-colors disabled:opacity-60"
                onMouseEnter={(e) => { e.currentTarget.style.background = brand; e.currentTarget.style.color = onBrand; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; }}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <Select value={region} onChange={(e) => setRegion(e.target.value)} options={GHANA_REGIONS} placeholder="Your region (optional)" aria-label="Your region" />
          </div>
        </>
      )}
    </section>
  );
}

function DonateSheet({ open, onClose, campaign: c }) {
  const { toast } = useToast();
  const { copy, copied } = useCopy();
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState(50);
  const [form, setForm] = useState({ name: '', phone: '', anonymous: false });
  const [donation, setDonation] = useState(null);
  const [txn, setTxn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('amount');
      setDonation(null);
      setTxn('');
    }
  }, [open]);

  const create = async (e) => {
    e.preventDefault();
    if (Number(amount) < 5) {
      toast('Minimum donation is ₵5', 'warning');
      return;
    }
    setBusy(true);
    try {
      const d = await createDonation({
        campaignId: c.id,
        campaignTitle: c.title,
        ownerId: c.ownerId,
        amount: Number(amount),
        donorName: form.name,
        donorPhone: form.phone,
        anonymous: form.anonymous,
      });
      setDonation(d);
      setStep('pay');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await submitDonationTxn({ donationId: donation.id, momoTxnId: txn });
      setStep('done');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const momo = c.donation || {};
  return (
    <Modal open={open} onClose={onClose} title={step === 'done' ? 'Thank you!' : `Support ${c.candidateName || c.title}`}>
      {step === 'amount' && (
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {DONATION_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAmount(t)}
                className={`h-12 rounded-xl border text-base font-bold ${Number(amount) === t ? 'bg-primary text-primary-fg border-primary' : 'border-line-strong text-ink'}`}
              >
                {cedis(t)}
              </button>
            ))}
          </div>
          <Input label="Or enter amount (₵)" type="number" min="5" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Your name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Your MoMo number" required inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))} /> Keep my name private
          </label>
          <Button type="submit" block size="lg" loading={busy}>Continue</Button>
        </form>
      )}
      {step === 'pay' && donation && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">Send <strong className="text-ink">{cedis(donation.amount)}</strong> by MoMo to the campaign account below and use the reference.</p>
          <div className="rounded-xl border border-line bg-surface-2 divide-y divide-line">
            {[
              ['Network', momo.network],
              ['Number', momo.number],
              ['Account name', momo.name],
              ['Reference', donation.paymentReference],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-ink-3">{k}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-ink num">{v}</span>
                  {(k === 'Number' || k === 'Reference') && (
                    <button type="button" className="btn btn-ghost btn-icon h-7 w-7" onClick={() => copy(v, k)} aria-label={`Copy ${k}`}>
                      {copied === k ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <Input label="MoMo transaction ID (from your SMS)" value={txn} onChange={(e) => setTxn(e.target.value)} optional hint="Helps the campaign confirm your gift faster." />
          <Button block size="lg" onClick={confirm} loading={busy}>I&apos;ve sent it</Button>
        </div>
      )}
      {step === 'done' && (
        <div className="text-center py-4">
          <span className="mx-auto w-14 h-14 rounded-full bg-success-soft text-success flex items-center justify-center"><Check className="w-7 h-7" /></span>
          <p className="mt-4 text-ink-2">The campaign will confirm your gift shortly. Thank you for investing in change.</p>
          <Button className="mt-6" onClick={onClose}>Close</Button>
        </div>
      )}
    </Modal>
  );
}

function ShareSheet({ open, onClose, campaign: c, url }) {
  const { copy, copied } = useCopy();
  const text = c.slogan || c.title;
  const links = useMemo(() => [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}?ref=whatsapp`)}` },
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${url}?ref=facebook`)}` },
    { id: 'twitter', label: 'X', icon: XIcon, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${url}?ref=twitter`)}` },
  ], [text, url]);
  return (
    <Modal open={open} onClose={onClose} title="Share this campaign">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {links.map((l) => (
            <a key={l.id} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => trackPlatformShare(c.id, l.id)} className="btn btn-secondary btn-md flex-col h-auto py-3 gap-1">
              <l.icon className="w-5 h-5" /> <span className="text-xs">{l.label}</span>
            </a>
          ))}
        </div>
        <button type="button" onClick={() => copy(url, 'url')} className="btn btn-secondary btn-md w-full">
          {copied === 'url' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />} {copied === 'url' ? 'Link copied' : 'Copy link'}
        </button>
        <div className="flex justify-center">
          <QrCode value={`${url}?ref=qr`} size={180} filename={`${c.slug}-qr`} title={c.candidateName || c.title} />
        </div>
      </div>
    </Modal>
  );
}

export function LegacyCampaignRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/campaign/${slug}`} replace />;
}
