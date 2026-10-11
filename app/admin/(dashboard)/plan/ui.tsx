"use client";

import { useEffect, useRef, useState } from "react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 rounded-2xl border border-black/5 bg-surface p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="num">{children}</span>;
}

export function Pill({ tone, children }: { tone: "good" | "bad" | "warn"; children: React.ReactNode }) {
  return <span className={cx("pl-pill", tone)}>{children}</span>;
}

export function Chip({ pressed, onClick, children }: { pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="pl-chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function Seg<T extends string | number>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; label: string }) {
  return (
    <div className="pl-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Btn({
  variant, className, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "pri" }) {
  return <button type="button" {...rest} className={cx("pl-btn", variant, className)} />;
}

/** Number input that keeps its own text while typing, so clearing the field never snaps to 0. */
export function NumInput({
  value, onChange, step = 1, min = 0, max, unit, label, className, width,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  className?: string;
  width?: number | string;
}) {
  const [txt, setTxt] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setTxt(String(value));
  }, [value]);
  return (
    <span className={cx("pl-field", className)} style={width ? { width } : undefined}>
      <input
        type="number"
        inputMode="decimal"
        value={txt}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setTxt(String(value)); }}
        onChange={(e) => {
          setTxt(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {unit && <span className="u">{unit}</span>}
    </span>
  );
}

/** Optional number: empty means "not set". Commits on blur / Enter instead of on every keystroke. */
export function OptNum({
  value, onCommit, step = 100, width, label,
}: { value: number | null; onCommit: (n: number | null) => void; step?: number; width?: number | string; label?: string }) {
  const show = (v: number | null) => (v == null ? "" : String(v));
  const [txt, setTxt] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setTxt(show(value));
  }, [value]);
  const commit = () => {
    focused.current = false;
    const n = parseFloat(txt);
    if (txt.trim() === "") { if (value != null) onCommit(null); }
    else if (Number.isFinite(n) && Math.max(n, 0) !== value) onCommit(Math.max(n, 0));
    else setTxt(show(value));
  };
  return (
    <span className="pl-field" style={width ? { width } : undefined}>
      <input type="number" inputMode="decimal" min={0} step={step} value={txt} placeholder="—" aria-label={label}
        onFocus={() => { focused.current = true; }} onChange={(e) => setTxt(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
    </span>
  );
}

export function TextInput({
  value, onChange, label, placeholder, className, list,
}: { value: string; onChange: (s: string) => void; label?: string; placeholder?: string; className?: string; list?: string }) {
  return (
    <span className={cx("pl-field", className)}>
      <input type="text" value={value} aria-label={label} placeholder={placeholder} list={list}
        onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

export function Select<T extends string | number>({
  value, onChange, options, label, className,
}: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; label?: string; className?: string }) {
  return (
    <span className={cx("pl-field", className)}>
      <select
        value={String(value)}
        aria-label={label}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.v) === raw);
          if (match) onChange(match.v);
        }}
      >
        {options.map((o) => (
          <option key={String(o.v)} value={String(o.v)}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

export function Legend({ items }: { items: { t: string; color: string; kind?: "sq" | "line" | "dash" }[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
      {items.map((i) => (
        <span key={i.t} className="flex items-center gap-1.5">
          {i.kind === "sq" || !i.kind ? (
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          ) : (
            <i className="inline-block w-4 border-t-[3px]" style={{ borderColor: i.color, borderTopStyle: i.kind === "dash" ? "dashed" : "solid" }} />
          )}
          {i.t}
        </span>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/50">{children}</p>;
}
