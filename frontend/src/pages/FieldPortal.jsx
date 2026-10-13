import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { CircleCheck, DoorOpen, Vote, TriangleAlert, Send, RotateCcw, Lock } from 'lucide-react';
import { db } from '../firebase/auth';
import { getFieldLink, submitResult } from '../services/workspaceService';
import { registerSupporter } from '../services/supporterService';
import { Button, Input, Textarea, Spinner, Modal } from '../components/ui';
import BrandMark from '../components/BrandMark';
import { SUPPORT_LEVELS } from '../utils/projection';
import { formatNumber, cn } from '../utils/format';

const LEVEL_STYLE = {
  strong: 'rgb(var(--viz-strong))',
  leaning: 'rgb(var(--viz-lean))',
  undecided: 'rgb(var(--viz-neutral))',
  opposed: 'rgb(var(--viz-against))',
};

export default function FieldPortal() {
  const { token } = useParams();
  const [link, setLink] = useState(undefined);

  useEffect(() => {
    let alive = true;
    getFieldLink(token)
      .then(async (l) => {
        if (!l) return alive && setLink(null);
        // Prefer the live ballot from the campaign (owner may have updated candidates).
        if (l.mode === 'results') {
          try {
            const snap = await getDoc(doc(db, 'campaigns', l.campaignId));
            const fresh = snap.exists() ? snap.data().electionCandidates : null;
            if (Array.isArray(fresh) && fresh.length) l.candidates = fresh;
          } catch {
            /* campaign may be private; keep snapshot */
          }
        }
        if (alive) setLink(l);
      })
      .catch(() => alive && setLink(null));
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    document.title = 'CampaignHub field link';
  }, []);

  if (link === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner label="Opening your link…" /></div>;
  }
  if (!link || link.active === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <span className="w-14 h-14 rounded-2xl bg-warning-soft text-warning flex items-center justify-center"><Lock className="w-7 h-7" /></span>
        <h1 className="mt-5 text-xl font-bold text-ink">This link is not active</h1>
        <p className="mt-2 text-ink-2 max-w-sm">It may have been paused or replaced by the campaign. Ask your coordinator for a new link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-primary text-primary-fg">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <BrandMark size={34} />
          <div className="min-w-0">
            <p className="font-bold truncate">{link.campaignTitle}</p>
            <p className="text-xs opacity-80 truncate">
              {link.mode === 'results' ? `Polling agent · ${link.stationName}` : 'Canvassing'}{link.agentName ? ` · ${link.agentName}` : ''}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {link.mode === 'results' ? <ResultsForm link={link} token={token} /> : <CanvassForm link={link} token={token} />}
      </main>
      <p className="text-center text-[11px] text-ink-3 pb-8">Private link · do not share · Powered by CampaignHub</p>
    </div>
  );
}

function CanvassForm({ link, token }) {
  const countKey = `ch-field-count-${token}`;
  const [count, setCount] = useState(() => {
    try {
      return Number(localStorage.getItem(countKey) || 0);
    } catch {
      return 0;
    }
  });
  const [station, setStation] = useState(() => {
    try {
      return localStorage.getItem(`ch-field-station-${token}`) || '';
    } catch {
      return '';
    }
  });
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [level, setLevel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Enter the voter’s name.');
    if (form.phone.replace(/\D/g, '').length < 9) return setError('Enter a valid phone number.');
    if (!level) return setError('Choose how they feel about the candidate.');
    setBusy(true);
    try {
      await registerSupporter({
        campaignId: link.campaignId,
        campaignTitle: link.campaignTitle,
        name: form.name,
        phone: form.phone,
        region: link.region || '',
        constituency: link.constituency || '',
        pollingStation: station,
        supportLevel: level,
        notes: form.notes,
        source: 'field',
        collectedBy: link.agentName || '',
        fieldToken: token,
      });
      const next = count + 1;
      setCount(next);
      try {
        localStorage.setItem(countKey, String(next));
        localStorage.setItem(`ch-field-station-${token}`, station);
      } catch {
        /* ignore */
      }
      setSaved(form.name);
      setForm({ name: '', phone: '', notes: '' });
      setLevel('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Could not save. Check your data connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-ink-2 flex items-center gap-2"><DoorOpen className="w-4 h-4" /> Doors logged on this phone</span>
        <span className="text-2xl font-extrabold text-ink num">{formatNumber(count)}</span>
      </div>
      {saved && (
        <div className="rounded-xl bg-success-soft border border-success/20 px-4 py-3 text-sm text-ink flex items-center gap-2 animate-fade-up">
          <CircleCheck className="w-5 h-5 text-success" /> {saved} saved. Next door!
        </div>
      )}
      <form onSubmit={submit} className="card p-5 space-y-4">
        <Input label="Polling station" value={station} onChange={(e) => setStation(e.target.value)} placeholder="e.g. Methodist JHS A" hint="Kept for the next voter" />
        <Input label="Voter’s name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="off" />
        <Input label="Phone number" required inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="off" />
        <div>
          <p className="label">How do they feel about {link.candidateName || 'our candidate'}?</p>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORT_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={cn(
                  'h-14 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                  level === l.id ? 'border-ink text-ink bg-surface-2' : 'border-line text-ink-2',
                )}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: LEVEL_STYLE[l.id] }} />
                {l.short}
              </button>
            ))}
          </div>
        </div>
        <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Issues they raised, best time to call…" optional />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" block size="lg" loading={busy} icon={Send}>Save voter</Button>
        <p className="text-[11px] text-ink-3">Only collect details from people who agree to share them with the campaign.</p>
      </form>
    </div>
  );
}

function ResultsForm({ link, token }) {
  const candidates = useMemo(() => (link.candidates?.length ? link.candidates : ['Our candidate']), [link.candidates]);
  const doneKey = `ch-result-${token}`;
  const [values, setValues] = useState(() => Object.fromEntries(candidates.map((c) => [c, ''])));
  const [rejected, setRejected] = useState('');
  const [totalCast, setTotalCast] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submittedAt, setSubmittedAt] = useState(() => {
    try {
      return localStorage.getItem(doneKey);
    } catch {
      return null;
    }
  });

  const valid = candidates.reduce((s, c) => s + (Number(values[c]) || 0), 0);
  const complete = candidates.every((c) => values[c] !== '' && Number(values[c]) >= 0);
  const expectedCast = valid + (Number(rejected) || 0);
  const mismatch = totalCast !== '' && Number(totalCast) !== expectedCast;

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      await submitResult({
        campaignId: link.campaignId,
        token,
        station: { id: link.stationId, name: link.stationName, code: link.stationCode },
        votes: values,
        rejected,
        totalCast: totalCast || expectedCast,
        note,
        submittedBy: link.agentName || 'Polling agent',
      });
      const at = new Date().toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
      setSubmittedAt(at);
      try {
        localStorage.setItem(doneKey, at);
      } catch {
        /* ignore */
      }
      setConfirm(false);
    } catch (err) {
      setError(err.code === 'permission-denied' ? 'This link is no longer accepting results. Call your coordinator.' : (err.message || 'Could not submit. Check your data connection.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {submittedAt && (
        <div className="rounded-xl bg-success-soft border border-success/20 px-4 py-3 text-sm text-ink flex items-start gap-2">
          <CircleCheck className="w-5 h-5 text-success shrink-0" />
          <span>Results submitted at {submittedAt}. If you made a mistake, correct the figures and submit again — the latest submission counts.</span>
        </div>
      )}
      <div className="card p-5">
        <p className="text-xs text-ink-3">Polling station</p>
        <p className="text-lg font-bold text-ink">{link.stationName}</p>
        {link.stationCode && <p className="text-sm text-ink-3">{link.stationCode}</p>}
      </div>
      <form
        className="card p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!complete) {
            setError('Enter votes for every candidate (use 0 if none).');
            return;
          }
          setError('');
          setConfirm(true);
        }}
      >
        <p className="text-sm text-ink-2 flex items-center gap-2"><Vote className="w-4 h-4" /> Enter the figures exactly as on the pink sheet.</p>
        {candidates.map((c) => (
          <Input
            key={c}
            label={c}
            type="number"
            min="0"
            inputMode="numeric"
            required
            value={values[c]}
            onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}
            inputClassName="text-lg font-semibold"
          />
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Rejected ballots" type="number" min="0" inputMode="numeric" value={rejected} onChange={(e) => setRejected(e.target.value)} />
          <Input label="Total votes cast" type="number" min="0" inputMode="numeric" value={totalCast} onChange={(e) => setTotalCast(e.target.value)} />
        </div>
        {mismatch && (
          <p className="text-sm text-warning flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> Valid votes + rejected = {formatNumber(expectedCast)}, but total cast is {formatNumber(Number(totalCast))}. Double-check the pink sheet.
          </p>
        )}
        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any incident or irregularity" optional />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" block size="lg" icon={submittedAt ? RotateCcw : Send}>{submittedAt ? 'Submit correction' : 'Review & submit'}</Button>
      </form>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirm results"
        subtitle={link.stationName}
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Edit</Button><Button onClick={send} loading={busy}>Submit results</Button></>}
      >
        <ul className="divide-y divide-line">
          {candidates.map((c) => (
            <li key={c} className="py-2.5 flex justify-between"><span className="text-ink-2">{c}</span><span className="font-bold text-ink num">{formatNumber(Number(values[c]) || 0)}</span></li>
          ))}
          <li className="py-2.5 flex justify-between"><span className="text-ink-2">Rejected</span><span className="font-bold text-ink num">{formatNumber(Number(rejected) || 0)}</span></li>
          <li className="py-2.5 flex justify-between"><span className="text-ink-2">Total cast</span><span className="font-bold text-ink num">{formatNumber(Number(totalCast) || expectedCast)}</span></li>
        </ul>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </Modal>
    </div>
  );
}
