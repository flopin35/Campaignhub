import { toMs } from './billing';

export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

export function formatNumber(n) {
  const v = Number(n || 0);
  return v.toLocaleString('en-GH');
}

export function compactNumber(n) {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(0)}K`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return v.toLocaleString('en-GH');
}

export function cedis(n, { decimals = 0 } = {}) {
  const v = Number(n || 0);
  return `₵${v.toLocaleString('en-GH', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
}

export function percent(part, whole, digits = 0) {
  if (!whole) return '0%';
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export function formatDate(value, opts = {}) {
  const ms = toMs(value);
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(value) {
  const ms = toMs(value);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  const ms = toMs(value);
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(ms);
}

export function daysUntilDate(value) {
  const ms = toMs(value);
  if (!ms) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

/** Normalise Ghana phone numbers to 0XXXXXXXXX where possible. */
export function normalizePhone(raw = '') {
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+233')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('233') && digits.length === 12) digits = `0${digits.slice(3)}`;
  digits = digits.replace(/\D/g, '');
  if (digits.length === 9) digits = `0${digits}`;
  return digits;
}

/** International format for wa.me links (233XXXXXXXXX). */
export function toWhatsAppNumber(raw = '') {
  const local = normalizePhone(raw);
  if (local.startsWith('0') && local.length === 10) return `233${local.slice(1)}`;
  return local;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '•';
}

export function firstName(name = '') {
  return String(name).trim().split(/\s+/)[0] || '';
}

export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function randomToken(length = 20) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function shortCode(length = 6) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function pluralize(n, one, many = `${one}s`) {
  return `${formatNumber(n)} ${Number(n) === 1 ? one : many}`;
}
