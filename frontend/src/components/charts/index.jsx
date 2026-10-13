/**
 * CampaignHub chart kit — built on the dataviz method:
 * thin marks, 4px rounded data-ends, hairline grid, text in ink tokens (never series colour),
 * per-mark hover tooltips, crosshair on lines, and a table view for every multi-point chart.
 * Colours come from validated --viz-* tokens (light + dark steps).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Table2, ChartLine } from 'lucide-react';
import { cn, compactNumber, formatNumber } from '../../utils/format';

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

export function StatTile({ label, value, sub, delta, deltaGood = true, icon: Icon, className, accent }) {
  const up = typeof delta === 'number' ? delta >= 0 : null;
  const good = up == null ? null : (up && deltaGood) || (!up && !deltaGood);
  return (
    <div className={cn('card p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-3">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4', accent ? 'text-accent-ink' : 'text-ink-3')} aria-hidden />}
      </div>
      <p className="mt-2 text-[26px] leading-none font-bold font-display text-ink">{value}</p>
      {(sub || delta != null) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta != null && (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-success' : 'text-danger')}>
              {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(delta).toLocaleString('en-GH')}
            </span>
          )}
          {sub && <span className="text-ink-3">{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-lift text-xs whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 8 }}
      role="tooltip"
    >
      <p className="font-semibold text-ink num">{tip.value}</p>
      <p className="text-ink-3">{tip.label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bar list (magnitude, one colour, value at tip)           */
/* ------------------------------------------------------------------ */

export function BarList({ items = [], format = formatNumber, max: maxProp, emptyText = 'No data yet', highlight, limit }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const rows = limit ? items.slice(0, limit) : items;
  const max = maxProp || Math.max(1, ...rows.map((i) => i.value || 0));
  if (!rows.length) return <p className="text-sm text-ink-3 py-6 text-center">{emptyText}</p>;

  const show = (e, item) => {
    const box = ref.current?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, label: item.label, value: format(item.value) });
  };

  return (
    <div ref={ref} className="relative">
      <ul className="space-y-2.5" onMouseLeave={() => setTip(null)}>
        {rows.map((item) => {
          const pct = Math.max(item.value > 0 ? 1.5 : 0, ((item.value || 0) / max) * 100);
          const emph = highlight ? highlight(item) : true;
          return (
            <li key={item.key || item.label} className="grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[minmax(0,11rem)_1fr] items-center gap-3">
              <span className="text-[13px] text-ink-2 truncate" title={item.label}>
                {item.label}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 h-5 flex items-center">
                  <button
                    type="button"
                    className="h-3.5 rounded-r-[4px] rounded-l-none transition-opacity hover:opacity-80 focus:opacity-80"
                    style={{
                      width: `${pct}%`,
                      background: emph ? 'rgb(var(--viz-1))' : 'rgb(var(--viz-muted))',
                    }}
                    aria-label={`${item.label}: ${format(item.value)}`}
                    onMouseEnter={(e) => show(e, item)}
                    onFocus={(e) => show(e, item)}
                    onBlur={() => setTip(null)}
                  />
                </div>
                <span className="text-[13px] font-semibold text-ink num min-w-[3.5rem] text-right shrink-0 whitespace-nowrap">{format(item.value)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <Tip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meter (ratio against a limit, same-ramp track)                      */
/* ------------------------------------------------------------------ */

export function Meter({ value = 0, max = 1, label, valueLabel, tone = 'viz', size = 'md' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = {
    viz: 'rgb(var(--viz-1))',
    success: 'rgb(var(--success))',
    warning: 'rgb(var(--warning))',
    danger: 'rgb(var(--danger))',
    gold: 'rgb(var(--accent))',
  }[tone];
  const track = tone === 'viz' ? 'rgb(var(--viz-track))' : 'rgb(var(--surface-3))';
  return (
    <div>
      {(label || valueLabel) && (
        <div className="flex items-baseline justify-between gap-3 mb-2 text-sm">
          {label && <span className="text-ink-2">{label}</span>}
          {valueLabel && <span className="font-semibold text-ink num">{valueLabel}</span>}
        </div>
      )}
      <div
        className={cn('w-full rounded-full overflow-hidden', size === 'lg' ? 'h-3' : 'h-2')}
        style={{ background: track }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Support bar — diverging ordered scale (strong → opposed)            */
/* ------------------------------------------------------------------ */

const SUPPORT_SEGMENTS = [
  { key: 'strong', label: 'Strong', color: 'rgb(var(--viz-strong))' },
  { key: 'leaning', label: 'Leaning', color: 'rgb(var(--viz-lean))' },
  { key: 'undecided', label: 'Undecided', color: 'rgb(var(--viz-neutral))' },
  { key: 'opposed', label: 'Opposed', color: 'rgb(var(--viz-against))' },
];

export function SupportBar({ counts = {}, showLegend = true, height = 'h-3' }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const assessed = SUPPORT_SEGMENTS.reduce((s, seg) => s + (counts[seg.key] || 0), 0);
  const show = (e, seg) => {
    const box = ref.current?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    if (!box) return;
    const n = counts[seg.key] || 0;
    setTip({
      x: r.left - box.left + r.width / 2,
      y: r.top - box.top,
      label: seg.label,
      value: `${formatNumber(n)} · ${assessed ? Math.round((n / assessed) * 100) : 0}%`,
    });
  };
  return (
    <div ref={ref} className="relative">
      <div className={cn('flex w-full gap-[2px] rounded-[4px] overflow-hidden bg-surface-3', height)} onMouseLeave={() => setTip(null)}>
        {assessed === 0 ? (
          <div className="flex-1" />
        ) : (
          SUPPORT_SEGMENTS.map((seg) => {
            const n = counts[seg.key] || 0;
            if (!n) return null;
            return (
              <button
                key={seg.key}
                type="button"
                className="h-full hover:opacity-80 focus:opacity-80"
                style={{ flexGrow: n, flexBasis: 0, background: seg.color }}
                aria-label={`${seg.label}: ${n}`}
                onMouseEnter={(e) => show(e, seg)}
                onFocus={(e) => show(e, seg)}
                onBlur={() => setTip(null)}
              />
            );
          })
        )}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
          {SUPPORT_SEGMENTS.map((seg) => (
            <li key={seg.key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color }} aria-hidden />
              {seg.label}
              <span className="font-semibold text-ink num">{formatNumber(counts[seg.key] || 0)}</span>
            </li>
          ))}
          {counts.unknown > 0 && (
            <li className="inline-flex items-center gap-1.5 text-ink-3">
              Unassessed <span className="font-semibold text-ink-2 num">{formatNumber(counts.unknown)}</span>
            </li>
          )}
        </ul>
      )}
      <Tip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line / area chart (single series, crosshair + tooltip, table view)  */
/* ------------------------------------------------------------------ */

function useWidth(initial = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export function LineChart({ data = [], height = 220, valueLabel = 'Value', format = formatNumber, xFormat = (x) => x }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const [wrapRef, W] = useWidth();
  const H = height;
  const PAD = { l: 40, r: 12, t: 12, b: 26 };

  const { points, yTicks } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value || 0));
    const nice = niceMax(max);
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const step = data.length > 1 ? iw / (data.length - 1) : 0;
    const pts = data.map((d, i) => ({
      key: d.x,
      value: d.value || 0,
      px: data.length > 1 ? PAD.l + i * step : PAD.l + iw / 2,
      py: PAD.t + ih - ((d.value || 0) / nice) * ih,
    }));
    const ticks = [0, nice / 2, nice].map((v) => ({ v, y: PAD.t + ih - (v / nice) * ih }));
    return { points: pts, yTicks: ticks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, H, W]);

  if (!data.length) return <p className="text-sm text-ink-3 py-10 text-center">No activity yet</p>;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].px.toFixed(1)},${H - PAD.b} L${points[0].px.toFixed(1)},${H - PAD.b} Z`;
  const last = points[points.length - 1];
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(3, Math.floor(W / 110))));

  const onMove = (svg, clientX) => {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let nearest = points[0];
    points.forEach((p) => {
      if (Math.abs(p.px - x) < Math.abs(nearest.px - x)) nearest = p;
    });
    setHover(nearest);
  };

  return (
    <div ref={wrapRef}>
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink px-2 h-7 rounded-md hover:bg-surface-2"
        >
          {asTable ? <ChartLine className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          {asTable ? 'Chart view' : 'Table view'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <td>{xFormat(p.key)}</td>
                  <td className="text-right num text-ink">{format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block overflow-visible touch-none"
            onMouseMove={(e) => onMove(e.currentTarget, e.clientX)}
            onMouseLeave={() => setHover(null)}
            onTouchMove={(e) => onMove(e.currentTarget, e.touches[0].clientX)}
            onTouchEnd={() => setHover(null)}
            role="img"
            aria-label={`${valueLabel} over time`}
          >
            {yTicks.map((t) => (
              <g key={t.v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="rgb(var(--viz-grid))" strokeWidth="1" />
                <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="rgb(var(--ink-3))">
                  {compactNumber(t.v)}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              (i % labelEvery === 0 && points.length - 1 - i >= labelEvery / 2) || i === points.length - 1 ? (
                <text key={p.key} x={p.px} y={H - 6} textAnchor="middle" fontSize="11" fill="rgb(var(--ink-3))">
                  {xFormat(p.key)}
                </text>
              ) : null,
            )}
            <path d={area} fill="rgb(var(--viz-1))" opacity="0.1" />
            <path d={line} fill="none" stroke="rgb(var(--viz-1))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last.px} cy={last.py} r="4" fill="rgb(var(--viz-1))" stroke="rgb(var(--surface))" strokeWidth="2" />
            {hover && (
              <g>
                <line x1={hover.px} x2={hover.px} y1={PAD.t} y2={H - PAD.b} stroke="rgb(var(--line-strong))" strokeWidth="1" />
                <circle cx={hover.px} cy={hover.py} r="4.5" fill="rgb(var(--viz-1))" stroke="rgb(var(--surface))" strokeWidth="2" />
              </g>
            )}
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-lift text-xs whitespace-nowrap"
              style={{ left: `${(hover.px / W) * 100}%`, top: -8 }}
            >
              <p className="font-semibold text-ink num">{format(hover.value)}</p>
              <p className="text-ink-3">{xFormat(hover.key)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function niceMax(v) {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/* ------------------------------------------------------------------ */
/* Results bars — emphasis: our candidate in accent, others grey       */
/* ------------------------------------------------------------------ */

export function ResultBars({ rows = [], ourKey }) {
  const total = rows.reduce((s, r) => s + (r.votes || 0), 0);
  const max = Math.max(1, ...rows.map((r) => r.votes || 0));
  if (!rows.length) return null;
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const ours = r.key === ourKey;
        const share = total ? (r.votes / total) * 100 : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
              <span className={cn('truncate', ours ? 'font-semibold text-ink' : 'text-ink-2')}>{r.label}</span>
              <span className="shrink-0 num">
                <span className="font-semibold text-ink">{formatNumber(r.votes)}</span>
                <span className="text-ink-3 ml-2">{share.toFixed(1)}%</span>
              </span>
            </div>
            <div className="h-3 flex items-center">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${Math.max(r.votes ? 1 : 0, (r.votes / max) * 100)}%`,
                  background: ours ? 'rgb(var(--viz-1))' : 'rgb(var(--viz-muted))',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
