"use client";

import { useMemo, useRef, useState } from "react";
import {
  LEAD_STAGES, LEAD_TYPES, SOURCES, STAGE_LABELS, TYPE_LABELS,
  offerLink, whatsappLink, type LeadStage, type LeadType,
} from "@/lib/leads";
import { createLeadAction, deleteLeadAction, updateLeadAction } from "./actions";

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  source: string;
  medium: string | null;
  campaign: string | null;
  groupName: string | null;
  postUrl: string | null;
  topic: string | null;
  type: LeadType;
  stage: LeadStage;
  nextStep: string | null;
  nextAt: string | null;
  value: number | null;
  notes: string;
  createdAt: string;
}

const STAGE_TONE: Record<LeadStage, string> = {
  found: "bg-slate-100 text-slate-700",
  replied: "bg-sky-100 text-sky-800",
  conversation: "bg-indigo-100 text-indigo-800",
  meeting: "bg-amber-100 text-amber-800",
  client: "bg-emerald-100 text-emerald-800",
  lost: "bg-rose-100 text-rose-700",
};

const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.v, s.label])) as Record<string, string>;
const field = "rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm";
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
// Date-only input -> 09:00 local time, as ISO.
const fromDateInput = (d: string) => {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day, 9).toISOString();
};
const isOpen = (s: LeadStage) => s !== "client" && s !== "lost";
const money = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

export default function LeadsBoard({ initial }: { initial: LeadRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<LeadStage | "open" | "all">("open");
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState("");
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 2800); };

  const [now] = useState(() => Date.now());
  const due = rows.filter((r) => isOpen(r.stage) && r.nextAt && new Date(r.nextAt).getTime() <= now);
  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, all: rows.length };
    LEAD_STAGES.forEach((s) => (c[s] = 0));
    rows.forEach((r) => { c[r.stage]++; if (isOpen(r.stage)) c.open++; });
    return c;
  }, [rows]);
  const shown = rows.filter((r) => (filter === "all" ? true : filter === "open" ? isOpen(r.stage) : r.stage === filter));

  const bySource = useMemo(() => {
    const since = now - 30 * 864e5;
    const m = new Map<string, { total: number; talk: number; meet: number; client: number; value: number }>();
    rows.filter((r) => new Date(r.createdAt).getTime() >= since).forEach((r) => {
      const g = m.get(r.source) ?? { total: 0, talk: 0, meet: 0, client: 0, value: 0 };
      g.total++;
      if (["conversation", "meeting", "client"].includes(r.stage)) g.talk++;
      if (["meeting", "client"].includes(r.stage)) g.meet++;
      if (r.stage === "client") { g.client++; g.value += r.value ?? 0; }
      m.set(r.source, g);
    });
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [rows, now]);

  const patch = async (id: string, p: Partial<LeadRow>, serverPatch: Record<string, unknown>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
    const res = await updateLeadAction(id, serverPatch);
    if (!res.ok) say("השמירה נכשלה: " + res.error);
  };
  const remove = async (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    const res = await deleteLeadAction(id);
    if (!res.ok) say("המחיקה נכשלה: " + res.error);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-primary">לידים</h1>
          <p className="text-sm text-foreground/60">{counts.open} פתוחים, {counts.client} לקוחות</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="rounded-lg bg-button px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          ליד חדש +
        </button>
      </div>

      {adding && (
        <NewLead onCreated={(r) => { setRows((rs) => [r, ...rs]); setAdding(false); }} say={say} />
      )}

      {due.length > 0 && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">לטיפול היום ({due.length})</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {due.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3">
                <b>{r.name}</b>
                <span className="text-foreground/70">{r.nextStep || "לחזור אליו"}</span>
                <span className="text-xs text-foreground/50">{new Date(r.nextAt!).toLocaleDateString("he-IL")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="סינון לפי שלב">
        {([["open", "פתוחים"], ...LEAD_STAGES.map((s) => [s, STAGE_LABELS[s]]), ["all", "הכל"]] as [string, string][]).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k as typeof filter)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${filter === k ? "border-primary bg-primary text-white" : "border-black/10 bg-surface"}`}>
            {label} <span className="opacity-70">{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {shown.length === 0 && <p className="rounded-2xl border border-black/5 bg-surface p-6 text-sm text-foreground/50">אין לידים בשלב הזה.</p>}
        {shown.map((r) => (
          <LeadCard key={r.id} r={r} now={now} patch={patch} remove={remove} say={say} />
        ))}
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-primary">לפי מקור, 30 הימים האחרונים</h2>
        {bySource.length === 0 ? (
          <p className="text-sm text-foreground/50">עוד אין לידים בתקופה הזאת.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-right text-sm">
              <thead><tr className="border-b border-black/5 text-foreground/60"><th className="py-2">מקור</th><th>לידים</th><th>בשיחה</th><th>פגישה</th><th>לקוחות</th><th>שווי</th></tr></thead>
              <tbody>
                {bySource.map(([s, g]) => (
                  <tr key={s} className="border-b border-black/5 last:border-0">
                    <th className="py-2 font-medium">{SOURCE_LABEL[s] ?? s}</th>
                    <td>{g.total}</td><td>{g.talk}</td><td>{g.meet}</td><td>{g.client}</td><td>{g.value ? money(g.value) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {flash && <div role="status" className="fixed inset-x-4 bottom-5 z-20 mx-auto max-w-md rounded-xl bg-foreground px-5 py-3 text-center font-semibold text-background shadow-lg">{flash}</div>}
    </div>
  );
}

function NewLead({ onCreated, say }: { onCreated: (r: LeadRow) => void; say: (m: string) => void }) {
  const [f, setF] = useState({ name: "", phone: "", type: "other" as LeadType, source: "facebook", groupName: "", topic: "", nextStep: "", nextAt: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) { say("כתוב שם"); return; }
    setBusy(true);
    const input = {
      name: f.name.trim(), phone: f.phone || null, type: f.type, source: f.source,
      groupName: f.groupName || null, topic: f.topic || null, nextStep: f.nextStep || null, nextAt: fromDateInput(f.nextAt),
    };
    const res = await createLeadAction(input);
    setBusy(false);
    if (!res.ok) { say(res.error); return; }
    onCreated({
      id: res.id, name: input.name, phone: input.phone, source: input.source, medium: null, campaign: null,
      groupName: input.groupName, postUrl: null, topic: input.topic, type: input.type, stage: "found",
      nextStep: input.nextStep, nextAt: input.nextAt, value: null, notes: "", createdAt: new Date().toISOString(),
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-surface p-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/70">שם<input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">טלפון<input className={field} dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">סוג
          <select className={field} value={f.type} onChange={(e) => set("type", e.target.value)}>{LEAD_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">מקור
          <select className={field} value={f.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">קבוצה או מקום<input className={field} value={f.groupName} onChange={(e) => set("groupName", e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70 sm:col-span-2">במה הוא מתעניין<input className={field} value={f.topic} onChange={(e) => set("topic", e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">הצעד הבא<input className={field} value={f.nextStep} onChange={(e) => set("nextStep", e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">מתי<input type="date" className={field} value={f.nextAt} onChange={(e) => set("nextAt", e.target.value)} /></label>
      </div>
      <button type="button" disabled={busy} onClick={submit} className="self-start rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
        {busy ? "שומר..." : "שמור ליד"}
      </button>
    </section>
  );
}

function LeadCard({
  r, now, patch, remove, say,
}: {
  r: LeadRow;
  now: number;
  patch: (id: string, p: Partial<LeadRow>, serverPatch: Record<string, unknown>) => void;
  remove: (id: string) => void;
  say: (m: string) => void;
}) {
  const [notes, setNotes] = useState(r.notes);
  const notesRef = useRef(r.notes);
  const wa = whatsappLink(r.phone);
  const offer = offerLink(r.type, { source: r.source, medium: r.medium || "dm", campaign: r.campaign || undefined });
  const overdue = isOpen(r.stage) && r.nextAt && new Date(r.nextAt).getTime() <= now;

  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); say("הקישור הועתק"); } catch { say(t); }
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <b className="text-base">{r.name}</b>
        <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold">{TYPE_LABELS[r.type]}</span>
        <span className="text-xs text-foreground/55">{SOURCE_LABEL[r.source] ?? r.source}{r.groupName ? ` · ${r.groupName}` : ""}</span>
        {overdue && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">לטיפול</span>}
        <span className="ms-auto flex items-center gap-3 text-sm">
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="font-medium text-primary underline">וואטסאפ</a>}
          {r.postUrl && <a href={r.postUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline">הפוסט</a>}
          {offer && <button type="button" onClick={() => copy(offer)} className="font-medium text-primary underline">העתק הצעה</button>}
        </span>
      </div>
      {r.topic && <p className="text-sm text-foreground/70">{r.topic}</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/70">שלב
          <select className={`${field} font-semibold ${STAGE_TONE[r.stage]}`} value={r.stage}
            onChange={(e) => patch(r.id, { stage: e.target.value as LeadStage }, { stage: e.target.value })}>
            {LEAD_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">הצעד הבא
          <input className={field} defaultValue={r.nextStep ?? ""} onBlur={(e) => { if (e.target.value !== (r.nextStep ?? "")) patch(r.id, { nextStep: e.target.value || null }, { nextStep: e.target.value }); }} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">מתי
          <input type="date" className={field} value={toDateInput(r.nextAt)} onChange={(e) => patch(r.id, { nextAt: fromDateInput(e.target.value) }, { nextAt: fromDateInput(e.target.value) })} /></label>
        <label className="flex flex-col gap-1 text-xs text-foreground/70">שווי משוער (₪)
          <input type="number" min={0} step={500} className={field} defaultValue={r.value ?? ""}
            onBlur={(e) => { const v = e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value || 0)); if (v !== r.value) patch(r.id, { value: v }, { value: v }); }} /></label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-foreground/70">הערות
        <textarea className={field} rows={2} value={notes} maxLength={4000}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== notesRef.current) { notesRef.current = notes; patch(r.id, { notes }, { notes }); } }} /></label>
      <button type="button" onClick={() => remove(r.id)} className="self-start text-xs text-foreground/50 underline">מחק</button>
    </article>
  );
}
