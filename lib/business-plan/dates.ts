export const WPM = 52 / 12;

const pad2 = (n: number) => String(n).padStart(2, "0");
export const dk = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
export const pdt = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addD = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** First day of the plan: the latest `startMonth` 1st that is not in the future. */
export function planStartFor(startMonth: number, today: Date): Date {
  const t = startOfDay(today);
  let d = new Date(t.getFullYear(), startMonth || 0, 1);
  if (d > t) d = new Date(t.getFullYear() - 1, startMonth || 0, 1);
  return d;
}

/** Month offset of `d` from the plan start (0-11 inside the plan year). */
export const monthIndex = (d: Date, ps: Date) =>
  (d.getFullYear() - ps.getFullYear()) * 12 + d.getMonth() - ps.getMonth();
