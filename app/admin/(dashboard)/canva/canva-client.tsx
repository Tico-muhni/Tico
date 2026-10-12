"use client";

import { useEffect, useState, useTransition } from "react";
import type { CanvaItem, CanvaPage } from "@/lib/canva";
import { browseCanvaAction, createCanvaDraftAction, designPagesAction, exportCanvaPageAction } from "./actions";

const NOTICES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "קנבה חובר בהצלחה.", ok: true },
  missing_config: { text: "חסרים CANVA_CLIENT_ID ו-CANVA_CLIENT_SECRET בהגדרות הפרויקט ב-Vercel.", ok: false },
  invalid_state: { text: "האימות נכשל. נסה שוב ללחוץ על \"חבר קנבה\".", ok: false },
  token_exchange: { text: "קנבה לא אישר את החיבור. בדוק שכתובת החזרה רשומה בפורטל המפתחים של קנבה.", ok: false },
  error: { text: "החיבור לקנבה נכשל.", ok: false },
};

const card = "rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5";
const btn = "rounded-xl bg-button px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

export default function CanvaClient({
  configured,
  connected,
  notice,
}: {
  configured: boolean;
  connected: boolean;
  notice: string | null;
}) {
  const note = notice ? (NOTICES[notice] ?? NOTICES.error) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">תוכן מקנבה</h1>
        <p className="text-sm text-foreground/60">
          בוחרים עיצוב ישירות מהחשבון שלך בקנבה. המערכת מייצאת אותו כתמונה, ג׳מיני כותב כיתוב, והפוסט נכנס לטיוטות לאישור.
        </p>
      </div>

      {note && (
        <div className={`rounded-xl p-3 text-sm ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
          {note.text}
        </div>
      )}

      {!connected ? (
        <section className={card}>
          <p className="mb-3 text-sm">
            {configured
              ? "קנבה עוד לא מחובר לחשבון הזה. החיבור נעשה פעם אחת."
              : "כדי לחבר את קנבה צריך להגדיר CANVA_CLIENT_ID ו-CANVA_CLIENT_SECRET ב-Vercel."}
          </p>
          {configured && (
            <a href="/api/canva/authorize" className={`${btn} inline-block`}>
              חבר קנבה
            </a>
          )}
        </section>
      ) : (
        <Library />
      )}
    </div>
  );
}

function Library() {
  const [path, setPath] = useState<{ id: string; name: string }[]>([{ id: "root", name: "כל העיצובים" }]);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CanvaItem[] | null>(null);
  const [more, setMore] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const [selected, setSelected] = useState<CanvaItem | null>(null);

  function load(folderId: string, q: string, continuation?: string) {
    setError("");
    startTransition(async () => {
      const r = await browseCanvaAction({ folderId, query: q, continuation });
      if (!r.ok) return setError(r.error);
      setItems((prev) => (continuation && prev ? [...prev, ...r.items] : r.items));
      setMore(r.continuation);
    });
  }

  const here = path[path.length - 1];
  const enter = (f: CanvaItem) => {
    const next = [...path, { id: f.id, name: f.name }];
    setPath(next);
    setQuery("");
    load(f.id, "");
  };
  const goTo = (i: number) => {
    const next = path.slice(0, i + 1);
    setPath(next);
    setQuery("");
    load(next[next.length - 1].id, "");
  };

  return (
    <>
      <section className={card}>
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(here.id, query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש עיצוב בשם…"
            className="min-w-0 flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
          <button className={btn} disabled={busy}>
            {query ? "חפש" : items ? "רענן" : "הצג עיצובים"}
          </button>
        </form>

        {!query && (
          <nav className="mb-3 flex flex-wrap gap-1 text-sm text-secondary">
            {path.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " ‹ "}
                <button type="button" onClick={() => goTo(i)} className="underline-offset-2 hover:underline">
                  {p.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        {busy && !items && <p className="text-sm text-foreground/50">טוען מקנבה…</p>}

        {items && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => (it.type === "folder" ? enter(it) : setSelected(it))}
                  className={`w-full overflow-hidden rounded-xl text-right ring-1 ${
                    selected?.id === it.id ? "ring-2 ring-button" : "ring-black/10"
                  }`}
                >
                  {it.type === "folder" ? (
                    <div className="flex aspect-square items-center justify-center bg-primary/5 text-4xl">📁</div>
                  ) : it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbnail.url} alt="" className="aspect-square w-full bg-black/5 object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-black/5 text-xs text-foreground/40">
                      אין תצוגה
                    </div>
                  )}
                  <div className="truncate px-2 py-1.5 text-xs font-medium">{it.name}</div>
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="col-span-full text-sm text-foreground/50">לא נמצאו עיצובים.</li>}
          </ul>
        )}
        {more && (
          <button type="button" onClick={() => load(here.id, query, more)} disabled={busy} className="mt-3 text-sm text-secondary">
            טען עוד
          </button>
        )}
      </section>

      {selected && <Composer key={selected.id} design={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Composer({ design, onClose }: { design: CanvaItem; onClose: () => void }) {
  const [pages, setPages] = useState<CanvaPage[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"both" | "instagram" | "facebook">("both");
  const [mode, setMode] = useState<"carousel" | "separate">("carousel");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ ok: number; failed: string[] } | null>(null);
  const [busy, startTransition] = useTransition();

  // The parent re-keys this component per design, so this runs once per design.
  useEffect(() => {
    let live = true;
    void designPagesAction(design.id).then((r) => {
      if (!live) return;
      if (!r.ok) return setError(r.error);
      setPages(r.pages);
      setPicked(r.pages.length === 1 ? [1] : []);
    });
    return () => {
      live = false;
    };
  }, [design.id]);

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  function create() {
    startTransition(async () => {
      const urls: string[] = [];
      const failed: string[] = [];
      for (let n = 0; n < picked.length; n++) {
        setProgress(`מייצא עמוד ${picked[n]} (${n + 1} מתוך ${picked.length})…`);
        const r = await exportCanvaPageAction({ designId: design.id, page: picked[n] });
        if (r.ok) urls.push(r.imageUrl);
        else failed.push(`עמוד ${picked[n]}: ${r.error}`);
      }

      // Carousel: one draft with every slide. Separate: one draft per slide.
      const groups = mode === "carousel" ? (urls.length ? [urls] : []) : urls.map((u) => [u]);
      let ok = 0;
      for (const [g, group] of groups.entries()) {
        setProgress(`כותב כיתוב (${g + 1} מתוך ${groups.length})…`);
        const r = await createCanvaDraftAction({ imageUrls: group, title: design.name, description, platform });
        if (r.ok) ok++;
        else failed.push(r.error);
      }
      setProgress("");
      setResult({ ok, failed });
    });
  }

  return (
    <section className={card}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-semibold text-primary">{design.name}</h2>
        <button type="button" onClick={onClose} className="text-sm text-foreground/50">
          סגור
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {!pages && !error && <p className="text-sm text-foreground/50">טוען עמודים…</p>}

      {pages && pages.length > 1 && (
        <>
          <p className="mb-2 text-sm text-foreground/70">בחר אילו עמודים להכניס (לפי הסדר שבו סימנת אותם):</p>
          <ul className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pages.map((p) => (
              <li key={p.index}>
                <button
                  type="button"
                  onClick={() => toggle(p.index)}
                  className={`relative w-full overflow-hidden rounded-lg ring-1 ${picked.includes(p.index) ? "ring-2 ring-button" : "ring-black/10"}`}
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail.url} alt="" className="aspect-square w-full bg-black/5 object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-black/5 text-xs">עמוד {p.index}</div>
                  )}
                  <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs">{p.index}</span>
                  {picked.includes(p.index) && (
                    <span className="absolute left-1 top-1 rounded bg-button px-1.5 text-xs text-white">
                      {picked.indexOf(p.index) + 1}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {pages && (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/70">על מה הפוסט? (אופציונלי, עוזר לג׳מיני לכתוב)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="למשל: טיפים לבדיקת מיחזור משכנתא"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            />
          </label>
          {picked.length > 1 && (
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "carousel"} onChange={() => setMode("carousel")} />
                קרוסלה אחת עם {picked.length} שקפים (פוסט אחד)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "separate"} onChange={() => setMode("separate")} />
                {picked.length} פוסטים נפרדים, תמונה בכל אחד
              </label>
            </div>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/70">פלטפורמה</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
              className="rounded-xl border border-black/10 px-3 py-2 text-sm"
            >
              <option value="both">אינסטגרם + פייסבוק</option>
              <option value="instagram">אינסטגרם בלבד</option>
              <option value="facebook">פייסבוק בלבד</option>
            </select>
          </label>
          <button type="button" className={btn} disabled={busy || picked.length === 0} onClick={create}>
            {busy
              ? progress || "מעבד…"
              : picked.length > 1 && mode === "carousel"
                ? `צור טיוטת קרוסלה (${picked.length} שקפים)`
                : picked.length > 1
                  ? `צור ${picked.length} טיוטות`
                  : "צור טיוטה"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl bg-primary/5 p-3 text-sm">
          {result.ok > 0 && (
            <p>
              {result.ok === 1 ? "נוצרה טיוטה אחת." : `נוצרו ${result.ok} טיוטות.`}{" "}
              <a href="/admin/drafts" className="font-medium text-secondary underline">
                לאישור הטיוטות
              </a>
            </p>
          )}
          {result.failed.map((f) => (
            <p key={f} className="text-rose-600">
              {f}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
