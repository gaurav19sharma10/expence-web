import React from 'react';
import { VectorIcon } from '../vector/VectorIcons';

/**
 * A labelled form control.
 *
 * The same three shapes appear on every screen — a label in small caps, a
 * rounded input that highlights on focus, and an optional inline error — so they
 * live here once. Repeating that markup by hand is how the focus ring ended up
 * blue on one form and grey on the next.
 */
export function Field({
  label,
  icon,
  error,
  hint,
  children,
}: {
  label: string;
  icon?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</label>
      <div
        className={`flex items-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2.5 transition-colors focus-within:border-brand focus-within:bg-surface ${
          error ? 'border-negative' : ''
        }`}
      >
        {icon && (
          <span className="shrink-0 text-faint">
            <VectorIcon name={icon} size={16} />
          </span>
        )}
        {children}
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-negative">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/** Bare input, for use inside `Field`. Transparent so the field owns the frame. */
export const inputClass =
  'w-full bg-transparent text-sm text-body outline-none placeholder:text-faint';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} cursor-pointer ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputClass} resize-none leading-relaxed ${props.className ?? ''}`}
    />
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  busy,
  children,
  className,
  ...rest
}: {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger';
  size?: 'sm' | 'md';
  busy?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary:
      'bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-hover disabled:opacity-50',
    ghost: 'bg-surface text-body border border-line hover:bg-surface-sunken',
    subtle: 'bg-brand-light text-brand hover:brightness-95',
    danger: 'bg-negative text-white hover:brightness-95 disabled:opacity-50',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className ?? ''}`}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ''}`}
    />
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'error' | 'info';
  children: React.ReactNode;
}) {
  const tones = {
    error: 'bg-negative/10 border-negative/30 text-negative',
    info: 'bg-positive/10 border-positive/30 text-positive',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </div>
  );
}
