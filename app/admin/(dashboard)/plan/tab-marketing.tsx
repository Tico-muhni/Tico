"use client";

import { useState } from "react";
import type { ActionEntry, Channel } from "@/lib/business-plan/types";
import { dec, dec2, money } from "@/lib/business-plan/format";
import { dk, pdt } from "@/lib/business-plan/dates";
import { Btn, Card, Num, NumInput, Pill } from "./ui";

const hdate = (k: string) => pdt(k).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" });

interface Group { name: string; unit: string; n: number; units: number; leads: number; deals: number; cost: number; hours: number }

const fieldCls = "rounded-lg border border-black/10 bg-black/[.04] px-2.5 py-2 font-semibold min-w-0";

export default function TabMarketing({
  actions, chans, today, save, patch, remove, addToPlan, updatePlan,
}: {
  actions: Record<string, ActionEntry>;
  chans: Channel[];
  today: Date;
  save: (a: ActionEntry) => void;
  patch: (id: string, p: Partial<ActionEntry>) => void;
  remove: (id: string) => void;
  addToPlan: (g: { name: string; unit: string; y: number; cost: number; h: number }) => void;
  updatePlan: (g: { name: string; y: number; cost: number; h: number }) => void;
}) {
  const [f, setF] = useState({ name: "", date: dk(today), unit: "", units: "", cost: "", hours: "", leads: "", deals: "" });
  const [toast, setToast] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const num = (s: string) => Math.max(parseFloat(s) || 0, 0);

  const names = new Set<string>(chans.map((c) => c.n.trim()));
  Object.values(actions).forEach((a) => a.name && names.add(a.name.trim()));

  const G: Record<string, Group> = {};
  Object.values(actions).forEach((a) => {
    const k = (a.name || "").trim();
    if (!k) return;
    const g = (G[k] ??= { name: k, unit: a.unit || "פעולה", n: 0, units: 0, leads: 0, deals: 0, cost: 0, hours: 0 });
    g.n++; g.units += a.units || 0; g.leads += a.leads || 0; g.deals += a.deals || 0; g.cost += a.cost || 0; g.hours += a.hours || 0;
    g.unit = a.unit || g.unit;
  });
  const list = Object.values(G).sort((a, b) => b.deals - a.deals || b.leads - a.leads);
  const ids = Object.keys(actions).sort((a, b) => (actions[b].date || "").localeCompare(actions[a].date || "") || b.localeCompare(a)).slice(0, 25);
  const div = (x: number, y: number) => (y > 0 ? x / y : null);

  const submit = () => {
    const name = f.name.trim();
    if (!name) { setToast("כתוב שם לפעולה"); return; }
    save({
      id: crypto.randomUUID(), date: f.date || dk(today), name, unit: f.unit.trim() || "פעולה",
      units: num(f.units), cost: num(f.cost), hours: num(f.hours), leads: num(f.leads), deals: num(f.deals),
    });
    setF((x) => ({ ...x, name: "", units: "", cost: "", hours: "", leads: "", deals: "" }));
    setToast("הפעולה נשמרה ✓");
    setTimeout(() => setToast(""), 2500);
  };

  const field = (label: string, k: keyof typeof f, o: { type?: string; ph?: string; wide?: boolean } = {}) => {
    const { type = "text", ph, wide } = o;
    return (
    <label key={k} className={`flex flex-col gap-1 text-xs text-foreground/70 ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <input type={type} value={f[k]} placeholder={ph} className={fieldCls} list={k === "name" ? "ma-names" : undefined} autoComplete="off"
        inputMode={type === "number" ? "decimal" : undefined} min={type === "number" ? 0 : undefined} onChange={(e) => set(k, e.target.value)} />
    </label>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold text-primary">פעולות שיווק</h2>
        <p className="max-w-prose text-foreground/70">
          עשית משהו כדי להביא לידים? למשל חילקת דוחות חניה על שמשות של רכבים. רשום מה עשית ומה יצא מזה. אפשר לעדכן לידים ועסקאות אחר כך, כשהתוצאות מגיעות.
        </p>
      </div>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {field("מה עשית?", "name", { ph: "למשל: דוח חניה על השמשה", wide: true })}
          <datalist id="ma-names">{[...names].map((n) => <option key={n} value={n} />)}</datalist>
          {field("תאריך", "date", { type: "date" })}
          {field("יחידה", "unit", { ph: "דוחות, פוסטים, פגישות" })}
          {field("כמה (כמות)", "units", { type: "number", ph: "200" })}
          {field("עלות (₪)", "cost", { type: "number", ph: "0" })}
          {field("שעות שהשקעתי", "hours", { type: "number", ph: "2" })}
          {field("לידים שהביאה", "leads", { type: "number", ph: "10" })}
          {field("עסקאות שנסגרו", "deals", { type: "number", ph: "2" })}
        </div>
        <div className="flex items-center gap-3">
          <Btn variant="pri" onClick={submit}>שמור פעולה</Btn>
          {toast && <span className="text-sm font-semibold" role="status">{toast}</span>}
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">מה עובד</h3>
        <Card>
          {list.length === 0 ? (
            <p className="text-sm text-foreground/50">עוד אין פעולות. הוסף את הראשונה למעלה, ואחרי שהתוצאות יגיעו תראה כאן מה עובד.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="pl-table">
                <thead><tr><th>פעולה</th><th>פעמים</th><th>כמות</th><th>לידים</th><th>עסקאות</th><th>לידים ליחידה</th><th>עלות לליד</th><th>עלות לעסקה</th><th /></tr></thead>
                <tbody>
                  {list.map((g) => {
                    const pc = chans.find((c) => c.n.trim() === g.name);
                    const lpu = div(g.leads, g.units), cpl = div(g.cost, g.leads), cpd = div(g.cost, g.deals);
                    const ok = g.units > 0 && g.leads > 0;
                    const per = ok ? { y: Math.round((g.leads / g.units) * 100) / 100, cost: Math.round(g.cost / g.units), h: Math.round((g.hours / g.units) * 100) / 100 } : null;
                    return (
                      <tr key={g.name}>
                        <th scope="row">{g.name} {pc && <Pill tone="good">בתוכנית</Pill>}</th>
                        <td className="v">{g.n}</td>
                        <td className="v"><Num>{dec(g.units)}</Num> {g.unit}</td>
                        <td className="v"><Num>{dec(g.leads)}</Num></td>
                        <td className="v"><Num>{dec(g.deals)}</Num></td>
                        <td className="v">{lpu == null ? "—" : <Num>{dec2(lpu)}</Num>}{pc && <><br /><span className="text-xs font-normal text-foreground/55">בתוכנית: <Num>{dec2(pc.y)}</Num></span></>}</td>
                        <td className="v">{cpl == null ? "—" : <Num>{money(cpl)}</Num>}</td>
                        <td className="v">{cpd == null ? "—" : <Num>{money(cpd)}</Num>}</td>
                        <td>
                          {per && (pc
                            ? <button type="button" className="pl-chip" onClick={() => updatePlan({ name: g.name, ...per })}>עדכן בתוכנית</button>
                            : <button type="button" className="pl-chip" onClick={() => addToPlan({ name: g.name, unit: g.unit, ...per })}>הוסף לתוכנית</button>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">יומן הפעולות</h3>
        <Card>
          {ids.length === 0 ? <p className="text-sm text-foreground/50">עוד אין פעולות.</p> : (
            <div className="overflow-x-auto">
              <table className="pl-table">
                <thead><tr><th>תאריך</th><th>פעולה</th><th>כמות</th><th>לידים</th><th>עסקאות</th><th /></tr></thead>
                <tbody>
                  {ids.map((id) => {
                    const a = actions[id];
                    return (
                      <tr key={id}>
                        <th scope="row">{hdate(a.date)}</th>
                        <td>{a.name}{a.demo && <> <span className="text-xs text-foreground/50">(דוגמה)</span></>}</td>
                        <td className="v"><Num>{dec(a.units)}</Num> {a.unit}</td>
                        <td><NumInput value={a.leads} width={84} label="לידים" onChange={(n) => patch(id, { leads: Math.max(n, 0) })} /></td>
                        <td><NumInput value={a.deals} width={84} label="עסקאות" onChange={(n) => patch(id, { deals: Math.max(n, 0) })} /></td>
                        <td><button type="button" className="pl-link" onClick={() => remove(id)}>מחק</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
