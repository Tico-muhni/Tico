export const MONTHS = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

export const nf = (n: number) => Math.round(n).toLocaleString("he-IL");
export const money = (n: number) => (n < 0 ? "−" : "") + "₪" + nf(Math.abs(n));
export const dec = (n: number) => (Math.round(n * 10) / 10).toLocaleString("he-IL");
export const dec2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("he-IL");
export const kfmt = (v: number) => {
  const a = Math.abs(v);
  return (v < 0 ? "-" : "") + "₪" + (a >= 1000 ? Math.round(a / 100) / 10 + "K" : Math.round(a));
};
