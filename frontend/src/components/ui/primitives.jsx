import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, X, LoaderCircle, ChevronDown } from 'lucide-react';
import { cn, initials } from '../../utils/format';

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({ className, children, pad = true, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('card', pad && 'card-pad', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="mt-0.5 inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
            <Icon className="w-4 h-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="panel-title">{title}</h3>
          {subtitle && <p className="panel-sub">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

/* Literal class names: Tailwind 3 only keeps @layer component classes it can find written out in the source. */
const BADGE_TONES = {
  neutral: 'badge-neutral',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  gold: 'badge-gold',
  navy: 'badge-navy',
};

export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cn('badge', BADGE_TONES[tone] || BADGE_TONES.neutral, className)}>
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function Dot({ className }) {
  return <span className={cn('inline-block w-2 h-2 rounded-full', className)} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({ label, hint, error, required, children, className, htmlFor, optional }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
          {optional && <span className="text-ink-3 font-normal ml-1.5 text-xs">Optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger mt-1.5">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, hint, error, required, optional, className, inputClassName, id, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const input = <input id={fieldId} required={required} className={cn('input', inputClassName)} {...props} />;
  if (!label && !hint && !error) return <div className={className}>{input}</div>;
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className} htmlFor={fieldId}>
      {input}
    </Field>
  );
}

export function Textarea({ label, hint, error, required, optional, className, rows = 4, id, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className} htmlFor={fieldId}>
      <textarea id={fieldId} rows={rows} required={required} className="input" {...props} />
    </Field>
  );
}

export function Select({ label, hint, error, required, optional, className, options = [], placeholder, id, children, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} optional={optional} className={className} htmlFor={fieldId}>
      <select id={fieldId} required={required} className="input" {...props}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
        {children}
      </select>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex items-start justify-between gap-4 cursor-pointer', disabled && 'opacity-60 cursor-not-allowed')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3 mt-0.5">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative shrink-0 w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 text-sm text-ink cursor-pointer', className)}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-4 h-4 rounded border-line-strong accent-[rgb(var(--primary))]"
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control / tabs                                            */
/* ------------------------------------------------------------------ */

export function Segmented({ value, onChange, options, className, size = 'md', full = false }) {
  return (
    <div className={cn(full ? 'grid grid-flow-col auto-cols-fr w-full' : 'inline-flex', 'p-1 rounded-xl bg-surface-3 gap-1', className)} role="tablist">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'bg-surface text-ink shadow-xs' : 'text-ink-2 hover:text-ink',
            )}
          >
            {opt.label}
            {opt.badge != null && (
              <span className={cn('text-[11px] rounded-full px-1.5', active ? 'bg-surface-3' : 'bg-surface-2')}>{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="scroll-x -mx-1 px-1 border-b border-line">
      <div className="flex gap-1 min-w-max">
        {tabs.map((t) => {
          const active = t.value === value;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                'inline-flex items-center gap-2 h-11 px-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                active ? 'border-primary text-ink' : 'border-transparent text-ink-3 hover:text-ink',
              )}
            >
              {Icon && <Icon className="w-4 h-4" aria-hidden />}
              {t.label}
              {t.count != null && <span className="badge badge-neutral h-5 px-1.5 text-[11px]">{t.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal (bottom sheet on mobile)                                      */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);
  // Parents often pass a new onClose on every render — keep it in a ref so typing in a
  // field never re-runs this effect (which would steal focus and close the phone keyboard).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const field = panel.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
      (field || panel).focus?.({ preventScroll: true });
    }, 30);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismissible]);

  if (!open) return null;

  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative w-full bg-surface border border-line shadow-pop animate-fade-up outline-none',
          'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col',
          width,
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-3">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
              {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
            </div>
            {dismissible && (
              <button type="button" onClick={onClose} className="btn btn-ghost btn-icon -mr-2 -mt-1 h-9 w-9" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-wrap justify-end gap-2 safe-bottom">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Spinner({ className, label }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-ink-3', className)} role="status">
      <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, text, action, className, compact = false }) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'py-8 px-4' : 'py-14 px-6', className)}>
      {Icon && (
        <span className="mb-4 inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3 border border-line">
          <Icon className="w-6 h-6" aria-hidden />
        </span>
      )}
      {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
      {text && <p className="text-sm text-ink-3 mt-1.5 max-w-sm leading-relaxed">{text}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-3 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 36, className }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('rounded-full object-cover bg-surface-3 shrink-0', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full bg-primary-soft text-ink font-semibold shrink-0', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function CopyField({ value, label, className, onCopied }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className={className}>
      {label && <p className="label">{label}</p>}
      <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 pl-3.5 pr-1.5 h-11">
        <span className="flex-1 min-w-0 truncate text-sm text-ink num">{value}</span>
        <button type="button" onClick={copy} className="btn btn-secondary btn-sm h-8">
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = async (text, key = 'default') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
      return true;
    } catch {
      return false;
    }
  };
  return { copy, copied };
}

export function Alert({ tone = 'info', icon: Icon, title, children, action, className }) {
  const toneClass = {
    info: 'bg-info-soft border-info/20',
    success: 'bg-success-soft border-success/20',
    warning: 'bg-warning-soft border-warning/25',
    danger: 'bg-danger-soft border-danger/20',
    gold: 'bg-accent-soft border-accent/30',
    neutral: 'bg-surface-2 border-line',
  }[tone];
  const iconClass = {
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    gold: 'text-accent-ink',
    neutral: 'text-ink-2',
  }[tone];
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-3', toneClass, className)}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && <Icon className={cn('w-5 h-5 shrink-0 mt-px', iconClass)} aria-hidden />}
        <div className="min-w-0 text-sm">
          {title && <p className="font-semibold text-ink">{title}</p>}
          {children && <div className="text-ink-2 mt-0.5">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 flex gap-2">{action}</div>}
    </div>
  );
}

/** Simple click-outside dropdown menu. */
export function Menu({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className={cn('relative', className)} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[220px] rounded-xl border border-line bg-surface shadow-pop p-1.5 animate-fade-up',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          onClick={() => setOpen(false)}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger, to, as: As = 'button', ...props }) {
  const cls = cn(
    'w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-left transition-colors',
    danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-2 hover:text-ink hover:bg-surface-2',
  );
  return (
    <As type={As === 'button' ? 'button' : undefined} onClick={onClick} className={cls} role="menuitem" {...props}>
      {Icon && <Icon className="w-4 h-4" aria-hidden />}
      {children}
    </As>
  );
}

export function Disclosure({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-ink">{title}</span>
        <ChevronDown className={cn('w-5 h-5 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-5 text-ink-2 text-[15px] leading-relaxed">{children}</div>}
    </div>
  );
}

export function KeyValue({ label, value, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5 text-sm', className)}>
      <span className="text-ink-3">{label}</span>
      <span className="text-ink font-medium text-right">{value}</span>
    </div>
  );
}
