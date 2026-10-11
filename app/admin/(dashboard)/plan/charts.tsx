"use client";

import { useEffect, useRef, useState } from "react";

// Small dependency-free SVG charts (line + stacked bar) with a hover tooltip.

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, n: number): number[] {
  const span = max - min || 1;
  const s0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(s0)));
  const f = s0 / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const a = Math.floor(min / step) * step;
  const b = Math.ceil(max / step) * step;
  const t: number[] = [];
  for (let v = a; v <= b + step * 1e-6; v += step) t.push(Math.round(v / step) * step);
  return t;
}

interface Frame {
  W: number; H: number; narrow: boolean;
  M: { l: number; r: number; t: number; b: number };
  pw: number; ph: number;
  ticks: number[]; y0: number; y1: number;
  Y: (v: number) => number;
}

function makeFrame(width: number, lo: number, hi: number, right?: number): Frame {
  const W = Math.max(width, 280);
  const narrow = W < 520;
  const H = narrow ? 270 : 330;
  const M = { l: narrow ? 48 : 60, r: right ?? (narrow ? 62 : 92), t: 20, b: 30 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const ticks = niceTicks(lo, hi, 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  return { W, H, narrow, M, pw, ph, ticks, y0, y1, Y: (v) => M.t + ph * (1 - (v - y0) / (y1 - y0)) };
}

function Axes({ F, yFmt, ticks, X }: { F: Frame; yFmt: (v: number) => string; ticks: { i: number; label: string }[]; X: (i: number) => number }) {
  return (
    <>
      {F.ticks.map((t) => {
        const zero = t === 0 && F.y0 < 0;
        return (
          <g key={t}>
            <line x1={F.M.l} x2={F.W - F.M.r} y1={F.Y(t)} y2={F.Y(t)} style={{ stroke: zero ? "var(--pl-line)" : "var(--pl-grid)", strokeWidth: zero ? 1.5 : 1 }} />
            <text x={F.M.l - 8} y={F.Y(t) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.55}>{yFmt(t)}</text>
          </g>
        );
      })}
      {ticks.map((t, j) =>
        F.narrow && j % 2 && ticks.length > 6 ? null : (
          <text key={t.i} x={X(t.i)} y={F.H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.55}>{t.label}</text>
        )
      )}
    </>
  );
}

function Tip({ left, W, width, children }: { left: number; W: number; width: number; children: React.ReactNode }) {
  const px = left * (width / W);
  const flip = px > width / 2;
  return (
    <div className="pl-tooltip" style={{ top: 6, [flip ? "right" : "left"]: flip ? width - px + 12 : px + 12 } as React.CSSProperties}>
      {children}
    </div>
  );
}

export interface LineSeries {
  name: string;
  color: string;
  v: (number | null)[];
  w?: number;
  dash?: string;
  label?: string;
  tip?: boolean;
}

export function LineChart({
  count, series, ticks, yFmt, tipFmt, tipTitle, cur, aria,
}: {
  count: number;
  series: LineSeries[];
  ticks: { i: number; label: string }[];
  yFmt: (v: number) => string;
  tipFmt: (v: number) => string;
  tipTitle: (i: number) => string;
  cur?: number;
  aria: string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  let lo = 0, hi = 0;
  series.forEach((s) => s.v.forEach((v) => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
  const F = makeFrame(width || 600, lo, hi);
  const X = (i: number) => F.M.l + (F.pw * i) / (count - 1);

  const ends: { y: number; x: number; s: LineSeries; ty: number }[] = [];
  const paths = series.map((s) => {
    let d = "", pen = false, last = -1;
    s.v.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${X(i).toFixed(1)} ${F.Y(v).toFixed(1)}`;
      pen = true; last = i;
    });
    if (s.label && last >= 0) ends.push({ y: F.Y(s.v[last] as number), x: X(last), s, ty: 0 });
    return d;
  });
  ends.sort((a, b) => a.y - b.y);
  ends.forEach((e, i) => { e.ty = i ? Math.max(e.y, ends[i - 1].ty + 14) : e.y; });

  const onMove = (ev: React.PointerEvent<SVGRectElement>) => {
    const r = ev.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((ev.clientX - r.left) * F.W) / r.width;
    setHover(Math.max(0, Math.min(count - 1, Math.round(((px - F.M.l) / F.pw) * (count - 1)))));
  };

  return (
    <div ref={ref} className="relative w-full touch-pan-y" dir="ltr">
      <svg viewBox={`0 0 ${F.W} ${F.H}`} width={F.W} height={F.H} role="img" aria-label={aria} className="block h-auto w-full overflow-visible">
        <Axes F={F} yFmt={yFmt} ticks={ticks} X={X} />
        {cur != null && (
          <>
            <line x1={X(cur)} x2={X(cur)} y1={F.M.t} y2={F.H - F.M.b} stroke="currentColor" opacity={0.5} strokeDasharray="2 3" />
            <text x={X(cur)} y={F.M.t - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor">היום</text>
          </>
        )}
        {series.map((s, i) => (
          <path key={s.name} d={paths[i]} fill="none" style={{ stroke: s.color }} strokeWidth={s.w ?? 2} strokeDasharray={s.dash || undefined} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {ends.map((e) => (
          <g key={e.s.name}>
            <circle cx={e.x} cy={e.y} r={4} style={{ fill: e.s.color, stroke: "var(--surface)" }} strokeWidth={2} />
            <text x={e.x + 9} y={e.ty + 4} fontSize={12} fontWeight={600} fill="currentColor">{e.s.label}</text>
          </g>
        ))}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={F.M.t} y2={F.H - F.M.b} stroke="currentColor" opacity={0.5} />}
        <rect x={F.M.l} y={F.M.t} width={F.pw} height={F.ph} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover != null && (
        <Tip left={X(hover)} W={F.W} width={width || F.W}>
          <b className="mb-1 block">{tipTitle(hover)}</b>
          {series.map((s) =>
            s.tip === false || s.v[hover] == null ? null : (
              <div key={s.name} className="flex items-center justify-between gap-3">
                <span><i className="me-1.5 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <span className="num">{tipFmt(s.v[hover] as number)}</span>
              </div>
            )
          )}
        </Tip>
      )}
    </div>
  );
}

export interface BarSeries { name: string; color: string; v: number[] }

export function BarChart({
  labels, series, yFmt, tipFmt, tipTitle, line, aria,
}: {
  labels: string[];
  series: BarSeries[];
  yFmt: (v: number) => string;
  tipFmt: (v: number) => string;
  tipTitle: (i: number) => string;
  line?: { name: string; v: number[] };
  aria: string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.v[i], 0));
  const F = makeFrame(width || 600, 0, Math.max(...totals, ...(line ? line.v : []), 1), 12);
  const slot = F.pw / n;
  const bw = Math.min(slot * 0.68, 44);
  const X = (i: number) => F.M.l + slot * (i + 0.5);

  const onMove = (ev: React.PointerEvent<SVGRectElement>) => {
    const r = ev.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((ev.clientX - r.left) * F.W) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - F.M.l) / slot))));
  };

  let linePath = "";
  if (line) line.v.forEach((v, i) => { linePath += `${i ? "L" : "M"}${X(i).toFixed(1)} ${F.Y(v).toFixed(1)}`; });

  return (
    <div ref={ref} className="relative w-full touch-pan-y" dir="ltr">
      <svg viewBox={`0 0 ${F.W} ${F.H}`} width={F.W} height={F.H} role="img" aria-label={aria} className="block h-auto w-full overflow-visible">
        <Axes F={F} yFmt={yFmt} ticks={labels.map((label, i) => ({ i, label }))} X={X} />
        {labels.map((_, i) => {
          let acc = 0;
          return series.map((s) => {
            const v = s.v[i];
            if (v <= 0) return null;
            const yT = F.Y(acc + v), yB = F.Y(acc);
            acc += v;
            return <rect key={`${i}-${s.name}`} x={X(i) - bw / 2} y={yT} width={bw} height={Math.max(yB - yT - 1.5, 0)} rx={2} style={{ fill: s.color }} />;
          });
        })}
        {line && (
          <>
            <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
            {line.v.map((v, i) => (
              <circle key={i} cx={X(i)} cy={F.Y(v)} r={3.5} fill="currentColor" style={{ stroke: "var(--surface)" }} strokeWidth={1.5} />
            ))}
          </>
        )}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={F.M.t} y2={F.H - F.M.b} stroke="currentColor" opacity={0.4} strokeDasharray="2 3" />}
        <rect x={F.M.l} y={F.M.t} width={F.pw} height={F.ph} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover != null && (
        <Tip left={X(hover)} W={F.W} width={width || F.W}>
          <b className="mb-1 block">{tipTitle(hover)}</b>
          {series.map((s) =>
            s.v[hover] > 0 ? (
              <div key={s.name} className="flex items-center justify-between gap-3">
                <span><i className="me-1.5 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <span className="num">{tipFmt(s.v[hover])}</span>
              </div>
            ) : null
          )}
          <div className="mt-1 flex justify-between gap-3 border-t border-black/10 pt-1 font-bold">
            <span>סה״כ</span><span className="num">{tipFmt(totals[hover])}</span>
          </div>
          {line && (
            <div className="flex justify-between gap-3"><span>{line.name}</span><span className="num">{tipFmt(line.v[hover])}</span></div>
          )}
        </Tip>
      )}
    </div>
  );
}
