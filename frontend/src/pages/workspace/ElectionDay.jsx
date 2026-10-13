import { useMemo, useRef, useState } from 'react';
import {
  Vote,
  Plus,
  Upload,
  Download,
  Link2,
  Phone,
  CircleCheck,
  Clock,
  Pencil,
  Trash2,
  Radio,
  Users,
  MessageCircle,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Modal, Badge, EmptyState, Tabs, Alert, Textarea } from '../../components/ui';
import { ResultBars, Meter, StatTile } from '../../components/charts';
import ProGate from '../../components/billing/ProGate';
import { CreateLinkDialog, agentWhatsApp } from './FieldTeam';
import {
  saveStation,
  deleteStation,
  importStations,
  submitResult,
  latestResultsByStation,
} from '../../services/workspaceService';
import { updateCampaignContent } from '../../services/campaignFirestoreService';
import { parseCsv, pick, downloadCsv } from '../../utils/csv';
import { formatNumber, timeAgo, percent } from '../../utils/format';

export default function ElectionDay() {
  return (
    <ProGate
      title="Collate results live on election day"
      description="Every polling agent gets a private link. They type in the pink-sheet figures the moment counting ends, and you watch the constituency tally build in real time — before anyone else."
      bullets={[
        'Import your polling stations and assign agents',
        'Agents submit results from any phone — no login',
        'Live totals, vote share, turnout and stations still missing',
        'Export a full results sheet for your lawyers and party',
      ]}
    >
      <ElectionWorkspace />
    </ProGate>
  );
}

function ElectionWorkspace() {
  const { campaign } = useWorkspace();
  const { rows: stations } = useWorkspaceData('stations');
  const { rows: results } = useWorkspaceData('results');
  const { rows: links } = useWorkspaceData('fieldLinks');
  const [tab, setTab] = useState('live');
  const [stationForm, setStationForm] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [linkFor, setLinkFor] = useState(null);
  const [manualFor, setManualFor] = useState(null);
  const [candidatesOpen, setCandidatesOpen] = useState(false);

  const candidates = campaign.electionCandidates?.length
    ? campaign.electionCandidates
    : [campaign.candidateName || campaign.title || 'Our candidate'];
  const ours = candidates[0];

  const latest = useMemo(() => latestResultsByStation(results), [results]);
  const linkByStation = useMemo(() => {
    const m = {};
    links.filter((l) => l.mode === 'results').forEach((l) => {
      m[l.stationId] = l;
    });
    return m;
  }, [links]);

  const tally = useMemo(() => {
    const totals = {};
    candidates.forEach((c) => {
      totals[c] = 0;
    });
    let rejected = 0;
    let cast = 0;
    let registeredReported = 0;
    latest.forEach((r) => {
      Object.entries(r.votes || {}).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + (Number(v) || 0);
      });
      rejected += r.rejected || 0;
      const valid = Object.values(r.votes || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      cast += r.totalCast || valid + (r.rejected || 0);
      const st = stations.find((s) => s.id === r.stationId);
      registeredReported += st?.registeredVoters || 0;
    });
    const rows = Object.entries(totals)
      .map(([label, votes]) => ({ key: label, label, votes }))
      .sort((a, b) => b.votes - a.votes);
    const valid = rows.reduce((s, r) => s + r.votes, 0);
    return { rows, rejected, cast, valid, registeredReported };
  }, [latest, candidates, stations]);

  const reported = stations.filter((s) => latest.has(s.id));
  const pending = stations.filter((s) => !latest.has(s.id));
  const leader = tally.rows[0];
  const oursRow = tally.rows.find((r) => r.key === ours);
  const margin = leader && oursRow ? (leader.key === ours ? (oursRow.votes - (tally.rows[1]?.votes || 0)) : oursRow.votes - leader.votes) : 0;

  const exportResults = () => {
    const rows = stations.map((s) => {
      const r = latest.get(s.id);
      const base = {
        code: s.code,
        name: s.name,
        electoralArea: s.electoralArea,
        registered: s.registeredVoters,
        agent: s.agentName,
        status: r ? 'Reported' : 'Pending',
        rejected: r?.rejected ?? '',
        totalCast: r?.totalCast ?? '',
        submittedBy: r?.submittedBy ?? '',
      };
      candidates.forEach((c) => {
        base[c] = r?.votes?.[c] ?? '';
      });
      return base;
    });
    downloadCsv(`${campaign.slug}-results`, rows, [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Polling station' },
      { key: 'electoralArea', label: 'Electoral area' },
      { key: 'registered', label: 'Registered voters' },
      ...candidates.map((c) => ({ key: c, label: c })),
      { key: 'rejected', label: 'Rejected ballots' },
      { key: 'totalCast', label: 'Total votes cast' },
      { key: 'status', label: 'Status' },
      { key: 'agent', label: 'Agent' },
      { key: 'submittedBy', label: 'Submitted by' },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'live', label: 'Live collation', icon: Radio },
            { value: 'stations', label: 'Polling stations & agents', icon: Users, count: stations.length },
          ]}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCandidatesOpen(true)}>Candidates on ballot ({candidates.length})</Button>
          <Button size="sm" variant="secondary" icon={Download} onClick={exportResults} disabled={!stations.length}>Export</Button>
        </div>
      </div>

      {candidates.length < 2 && (
        <Alert tone="info" icon={Vote} title="Add the other candidates on the ballot" action={<Button size="sm" variant="secondary" onClick={() => setCandidatesOpen(true)}>Add candidates</Button>}>
          Agents record votes for every candidate, so you can see who is leading at each station.
        </Alert>
      )}

      {tab === 'live' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Stations reported" value={`${formatNumber(reported.length)}/${formatNumber(stations.length)}`} sub={stations.length ? percent(reported.length, stations.length) : 'Add stations'} />
            <StatTile label={`${ours} votes`} value={formatNumber(oursRow?.votes || 0)} sub={tally.valid ? `${percent(oursRow?.votes || 0, tally.valid, 1)} of valid votes` : 'Awaiting results'} accent />
            <StatTile label={leader?.key === ours ? 'Lead' : 'Behind by'} value={formatNumber(Math.abs(margin))} sub={leader ? (leader.key === ours ? 'You are leading' : `${leader.label} leading`) : '—'} />
            <StatTile label="Turnout (reported)" value={tally.registeredReported ? percent(tally.cast, tally.registeredReported, 1) : '—'} sub={`${formatNumber(tally.rejected)} rejected ballots`} />
          </div>

          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
            <Card>
              <CardHeader title="Provisional tally" subtitle={`From ${formatNumber(reported.length)} reporting station${reported.length === 1 ? '' : 's'} · updates live`} />
              {tally.valid ? (
                <ResultBars rows={tally.rows} ourKey={ours} />
              ) : (
                <EmptyState compact icon={Radio} text="Results appear here as soon as your first polling agent submits." />
              )}
              {stations.length > 0 && (
                <div className="mt-6">
                  <Meter value={reported.length} max={stations.length} label="Collation progress" valueLabel={percent(reported.length, stations.length)} />
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Still waiting on" subtitle="Call agents who haven't reported" icon={Clock} />
              {pending.length === 0 ? (
                <p className="text-sm text-ink-3">{stations.length ? 'All stations have reported.' : 'Add your polling stations first.'}</p>
              ) : (
                <ul className="divide-y divide-line -my-2 max-h-[360px] overflow-y-auto">
                  {pending.map((s) => (
                    <li key={s.id} className="py-2.5 flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink truncate">{s.name}</span>
                        <span className="block text-xs text-ink-3 truncate">{s.agentName || 'No agent assigned'}</span>
                      </span>
                      {s.agentPhone && (
                        <a href={`tel:${s.agentPhone}`} className="btn btn-ghost btn-icon h-8 w-8" aria-label={`Call ${s.agentName}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setManualFor(s)}>Enter</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {reported.length > 0 && (
            <Card pad={false} className="overflow-hidden">
              <div className="px-5 sm:px-6 pt-5"><CardHeader title="Results by polling station" /></div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Station</th>
                      {candidates.map((c) => <th key={c} className="text-right">{c}</th>)}
                      <th className="text-right">Rejected</th>
                      <th>Reported</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {reported.map((s) => {
                      const r = latest.get(s.id);
                      const top = Object.entries(r.votes || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
                      return (
                        <tr key={s.id}>
                          <td>
                            <span className="font-medium text-ink">{s.name}</span>
                            <span className="block text-xs text-ink-3">{s.code}</span>
                          </td>
                          {candidates.map((c) => (
                            <td key={c} className={`text-right num ${top === c ? 'font-semibold text-ink' : ''}`}>{formatNumber(r.votes?.[c] || 0)}</td>
                          ))}
                          <td className="text-right num">{formatNumber(r.rejected || 0)}</td>
                          <td className="text-xs text-ink-3 whitespace-nowrap">{timeAgo(r.createdAt)}<span className="block">{r.submittedBy}</span></td>
                          <td><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setManualFor(s)}>Correct</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card pad={false} className="overflow-hidden">
          <div className="p-5 sm:p-6 pb-0">
            <CardHeader
              title="Polling stations"
              subtitle="Add each station, assign an agent, and send them their results link."
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
                  <Button size="sm" icon={Plus} onClick={() => setStationForm({})}>Add station</Button>
                </div>
              }
            />
          </div>
          {stations.length === 0 ? (
            <EmptyState
              icon={Vote}
              title="No polling stations yet"
              text="Import the EC polling station list for your constituency (CSV), or add them one by one."
              action={<Button icon={Upload} onClick={() => setImportOpen(true)}>Import stations</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th className="text-right">Registered</th>
                    <th>Agent</th>
                    <th>Results link</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s) => {
                    const link = linkByStation[s.id];
                    const done = latest.has(s.id);
                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="font-medium text-ink">{s.name}</span>
                          <span className="block text-xs text-ink-3">{[s.code, s.electoralArea].filter(Boolean).join(' · ')}</span>
                        </td>
                        <td className="text-right num">{formatNumber(s.registeredVoters || 0)}</td>
                        <td>
                          {s.agentName || <span className="text-ink-3">—</span>}
                          {s.agentPhone && <span className="block text-xs text-ink-3 num">{s.agentPhone}</span>}
                        </td>
                        <td>
                          {link ? (
                            <Button size="sm" variant="secondary" icon={MessageCircle} href={agentWhatsApp(link, campaign)} target="_blank" rel="noopener noreferrer">
                              Send
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" icon={Link2} onClick={() => setLinkFor(s)}>Create</Button>
                          )}
                        </td>
                        <td>
                          {done ? <Badge tone="success" icon={CircleCheck}>Reported</Badge> : <Badge tone="neutral">Pending</Badge>}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button type="button" className="btn btn-ghost btn-icon h-8 w-8" onClick={() => setStationForm(s)} aria-label="Edit station">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <StationDelete station={s} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <StationDialog station={stationForm} onClose={() => setStationForm(null)} campaign={campaign} />
      <StationImport open={importOpen} onClose={() => setImportOpen(false)} campaign={campaign} />
      <CreateLinkDialog open={!!linkFor} onClose={() => setLinkFor(null)} campaign={campaign} mode="results" station={linkFor} />
      <ManualResult station={manualFor} onClose={() => setManualFor(null)} campaign={campaign} candidates={candidates} existing={manualFor ? latest.get(manualFor.id) : null} />
      <CandidatesDialog open={candidatesOpen} onClose={() => setCandidatesOpen(false)} campaign={campaign} candidates={candidates} />
    </div>
  );
}

function StationDelete({ station }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      className="btn btn-danger-ghost btn-icon h-8 w-8"
      aria-label="Delete station"
      onClick={async () => {
        if (!window.confirm(`Delete ${station.name}?`)) return;
        try {
          await deleteStation(station.id);
        } catch (err) {
          toast(err.message, 'error');
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

function StationDialog({ station, onClose, campaign }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);
  if (!station) return null;
  const save = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(formRef.current).entries());
    setSaving(true);
    try {
      await saveStation(campaign.id, { constituency: campaign.constituency, ...fd }, station.id);
      toast('Polling station saved', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={station.id ? 'Edit polling station' : 'Add polling station'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="station-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="station-form" ref={formRef} onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Input className="sm:col-span-2" name="name" label="Polling station name" required defaultValue={station.name} placeholder="e.g. Methodist JHS 'A'" />
        <Input name="code" label="EC code" defaultValue={station.code} placeholder="C123401A" optional />
        <Input name="registeredVoters" label="Registered voters" type="number" min="0" defaultValue={station.registeredVoters} optional />
        <Input className="sm:col-span-2" name="electoralArea" label="Electoral area" defaultValue={station.electoralArea} optional />
        <Input name="agentName" label="Polling agent" defaultValue={station.agentName} optional />
        <Input name="agentPhone" label="Agent phone" inputMode="tel" defaultValue={station.agentPhone} optional />
      </form>
    </Modal>
  );
}

const STATION_SAMPLE = 'code,name,electoral area,registered voters,agent,agent phone\nC123401A,Methodist JHS A,Zongo,812,Yaw Asante,0245556677\nC123401B,Methodist JHS B,Zongo,790,,';

function StationImport({ open, onClose, campaign }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    if (!text.trim()) return [];
    return parseCsv(text).records.map((r) => ({
      code: pick(r, 'code', 'ps code', 'station code', 'ec code'),
      name: pick(r, 'name', 'polling station', 'station', 'station name'),
      electoralArea: pick(r, 'electoral area', 'area', 'ward'),
      registeredVoters: pick(r, 'registered voters', 'registered', 'voters'),
      agentName: pick(r, 'agent', 'agent name', 'polling agent'),
      agentPhone: pick(r, 'agent phone', 'phone'),
      constituency: pick(r, 'constituency') || campaign.constituency,
    })).filter((r) => r.name);
  }, [text, campaign.constituency]);
  const run = async () => {
    setBusy(true);
    try {
      const n = await importStations(campaign.id, rows);
      toast(`Imported ${n} polling stations`, 'success');
      setText('');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Import polling stations"
      subtitle="Paste CSV rows (or open the file in Notepad and copy)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={run} loading={busy} disabled={!rows.length}>Import {rows.length} stations</Button>
        </>
      }
    >
      <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={STATION_SAMPLE} className="font-mono" />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-ink-3">Columns: code, name, electoral area, registered voters, agent, agent phone.</p>
        <Button size="sm" variant="ghost" onClick={() => setText(STATION_SAMPLE)}>Sample</Button>
      </div>
    </Modal>
  );
}

function ManualResult({ station, onClose, campaign, candidates, existing }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);
  if (!station) return null;
  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(formRef.current);
    const votes = {};
    candidates.forEach((c, i) => {
      votes[c] = fd.get(`c${i}`);
    });
    setSaving(true);
    try {
      await submitResult({
        campaignId: campaign.id,
        station,
        votes,
        rejected: fd.get('rejected'),
        totalCast: fd.get('totalCast'),
        note: fd.get('note'),
        submittedBy: 'Campaign HQ',
      });
      toast('Result recorded', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Results — ${station.name}`}
      subtitle="Enter the figures exactly as on the pink sheet."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="manual-result" loading={saving}>Save result</Button>
        </>
      }
    >
      <form id="manual-result" ref={formRef} onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        {candidates.map((c, i) => (
          <Input key={c} name={`c${i}`} label={c} type="number" min="0" inputMode="numeric" required defaultValue={existing?.votes?.[c] ?? ''} />
        ))}
        <Input name="rejected" label="Rejected ballots" type="number" min="0" inputMode="numeric" defaultValue={existing?.rejected ?? ''} />
        <Input name="totalCast" label="Total votes cast" type="number" min="0" inputMode="numeric" defaultValue={existing?.totalCast ?? ''} optional />
        <Input className="sm:col-span-2" name="note" label="Note" defaultValue="" optional />
      </form>
    </Modal>
  );
}

function CandidatesDialog({ open, onClose, campaign, candidates }) {
  const { toast } = useToast();
  const [list, setList] = useState(candidates);
  const [saving, setSaving] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setList(candidates.length ? candidates : ['']);
    setLastOpen(true);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }
  const save = async () => {
    const clean = [...new Set(list.map((c) => c.trim()).filter(Boolean))].slice(0, 12);
    if (!clean.length) return;
    setSaving(true);
    try {
      await updateCampaignContent(campaign.id, { electionCandidates: clean });
      toast('Ballot updated', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Candidates on the ballot"
      subtitle="Put your candidate first. Agents will enter votes for each name."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-2.5">
        {list.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="w-6 text-sm text-ink-3 text-right">{i + 1}.</span>
            <input
              className="input"
              value={c}
              placeholder={i === 0 ? 'Your candidate' : 'Candidate name (party)'}
              onChange={(e) => setList((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {i > 0 && (
              <button type="button" className="btn btn-ghost btn-icon h-10 w-10" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {list.length < 12 && (
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setList((l) => [...l, ''])}>Add candidate</Button>
        )}
      </div>
    </Modal>
  );
}
