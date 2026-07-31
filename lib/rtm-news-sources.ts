// Instead of a few hard-coded site RSS feeds (which break when a site changes
// its feed URL), the RTM tool searches Google News for the target topics. This
// covers the whole web - any Israeli publisher that Google News indexes - and
// returns a standard RSS feed we can parse with the existing parser.

export type RtmQuery = {
  label: string;
  query: string;
};

// Each query becomes a Google News RSS search. Hebrew, Israel edition.
export const RTM_SEARCH_QUERIES: RtmQuery[] = [
  { label: "משכנתאות", query: 'משכנתא OR "מיחזור משכנתא" OR "החזר חודשי"' },
  { label: "ריבית", query: '"ריבית בנק ישראל" OR "ריבית הפריים" OR "הריבית במשק"' },
  { label: "נדל״ן ודיור", query: '"מחירי דירות" OR "שוק הנדל\\"ן" OR "שוק הדיור" OR "רוכשי דירה"' },
];

// Restrict each search to recent items so the daily brief stays timely.
const RECENCY = "when:5d";

export function googleNewsRssUrl(query: string): string {
  const q = encodeURIComponent(`${query} ${RECENCY}`);
  return `https://news.google.com/rss/search?q=${q}&hl=he&gl=IL&ceid=IL:he`;
}

// After searching, we still filter titles to on-topic items as a safety net,
// so a broad match doesn't slip through.
export const RTM_KEYWORDS: string[] = [
  "משכנתא",
  "משכנתאות",
  "ריבית",
  "בנק ישראל",
  "פריים",
  "נדל״ן",
  "נדלן",
  "דירות",
  "דירה",
  "שכר דירה",
  "שכירות",
  "מחירי דיור",
  "מחירי דירות",
  "רוכשי דירה",
  "שוק הדיור",
  "מיחזור משכנתא",
  "הלוואה לדיור",
  "קבלנים",
  "דיור",
];

export function textMatchesKeywords(text: string): string[] {
  return RTM_KEYWORDS.filter((keyword) => text.includes(keyword));
}

// Google News indexes the whole web, so a Hebrew-language query can surface
// foreign aggregators that re-publish translated content (e.g. a ".vn" site).
// Keep only genuine Israeli publishers: any ".il" domain, plus a short
// allowlist of well-known Israeli outlets that use ".com".
const ISRAELI_DOTCOM_ALLOWLIST = new Set([
  "themarker.com",
  "globes.com",
  "haaretz.com",
  "calcalistech.com",
]);

export function isIsraeliSource(sourceUrl: string | null): boolean {
  if (!sourceUrl) return false;
  let host: string;
  try {
    host = new URL(sourceUrl).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (host === "il" || host.endsWith(".il")) return true;
  return ISRAELI_DOTCOM_ALLOWLIST.has(host);
}
