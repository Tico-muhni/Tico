export type RtmSource = "ynet" | "globes" | "calcalist";

export type RtmFeed = {
  source: RtmSource;
  label: string;
  url: string;
};

// Best-effort public RSS endpoints for the three sites. These were not
// verified against the live sites from this environment (outbound network
// to Israeli news domains is blocked in the dev/build sandbox) - if a feed
// stops returning items, check the site's current RSS URL and update it
// here. Nothing else in the pipeline needs to change.
export const RTM_NEWS_FEEDS: RtmFeed[] = [
  {
    source: "ynet",
    label: "Ynet - כלכלה",
    url: "https://www.ynet.co.il/Integration/StoryRss2.xml",
  },
  {
    source: "globes",
    label: "גלובס - נדל״ן",
    url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2",
  },
  {
    source: "calcalist",
    label: "כלכליסט - כל החדשות",
    url: "https://www.calcalist.co.il/GeneralRSS/0,16335,L-3674,00.xml",
  },
];

export const RTM_SOURCE_LABEL: Record<RtmSource, string> = {
  ynet: "Ynet",
  globes: "גלובס",
  calcalist: "כלכליסט",
};

// A news item is considered relevant if its title+description contains at
// least one of these. Keep this list focused on mortgages / interest rates
// / housing so the AI briefing step only runs on on-topic items.
export const RTM_KEYWORDS: string[] = [
  "משכנתא",
  "משכנתאות",
  "ריבית",
  "בנק ישראל",
  "הריבית במשק",
  "ריבית הפריים",
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
  "מ״מ",
];

export function textMatchesKeywords(text: string): string[] {
  return RTM_KEYWORDS.filter((keyword) => text.includes(keyword));
}
