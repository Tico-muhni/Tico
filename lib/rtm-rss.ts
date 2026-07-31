export type RssItem = {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
  source: string | null;
};

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  const value = decodeEntities(match[1]);
  return value.length > 0 ? value : null;
}

export function parseRssItems(xml: string): RssItem[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const items: RssItem[] = [];

  for (const block of itemBlocks) {
    let title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;

    // Google News items carry the publisher in a <source> tag and append
    // " - Publisher" to the title. Extract the publisher and strip the suffix
    // so the stored title is clean.
    const source = extractTag(block, "source");
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, title.length - source.length - 3).trim();
    }

    items.push({
      title,
      link,
      pubDate: extractTag(block, "pubDate"),
      description: extractTag(block, "description"),
      source,
    });
  }

  return items;
}

export async function fetchRssItems(url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TicoRTMBot/1.0; +https://tico)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} מ-${url}`);
  }

  const xml = await res.text();
  return parseRssItems(xml);
}
