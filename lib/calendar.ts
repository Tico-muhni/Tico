import ical, { type VEvent } from "node-ical";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO instants; for all-day events these are UTC midnight of the first/last day. */
  start: string;
  end: string;
  allDay: boolean;
  /** YYYY-MM-DD of the first day, only for all-day events. */
  dayKey: string | null;
  location: string | null;
}

export type CalendarResult =
  | { status: "off" }
  | { status: "error" }
  | { status: "ok"; events: CalendarEvent[] };

const text = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "val" in v ? String((v as { val: unknown }).val) : "");

/**
 * Reads the owner's Google Calendar through its private iCal address
 * (Google Calendar → Settings → Integrate calendar → "Secret address in iCal format").
 * No OAuth: the secret URL lives in GOOGLE_CALENDAR_ICS_URL and never reaches the browser.
 */
export async function getCalendarEvents(): Promise<CalendarResult> {
  // A generous window around now; callers keep only the events of their own local "today".
  const now = Date.now();
  const from = new Date(now - 36 * 36e5);
  const to = new Date(now + 36 * 36e5);
  const url = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!url) return { status: "off" };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!res.ok) return { status: "error" };
    const data = ical.sync.parseICS(await res.text());

    const events: CalendarEvent[] = [];
    for (const item of Object.values(data)) {
      if (!item || item.type !== "VEVENT") continue;
      const ev = item as VEvent;
      if (ev.status === "CANCELLED") continue;
      const instances = ev.rrule
        ? ical.expandRecurringEvent(ev, { from, to, includeOverrides: true, excludeExdates: true })
        : [{ start: ev.start, end: ev.end ?? ev.start, summary: ev.summary, isFullDay: ev.datetype === "date" }];
      for (const i of instances) {
        if (!i.start || i.end < from || i.start > to) continue;
        const allDay = Boolean(i.isFullDay);
        events.push({
          id: `${ev.uid}-${i.start.toISOString()}`,
          title: text(i.summary) || "ללא כותרת",
          start: i.start.toISOString(),
          end: (i.end ?? i.start).toISOString(),
          allDay,
          dayKey: allDay ? i.start.toISOString().slice(0, 10) : null,
          location: text(ev.location) || null,
        });
      }
    }
    events.sort((a, b) => a.start.localeCompare(b.start));
    return { status: "ok", events };
  } catch {
    return { status: "error" };
  }
}
