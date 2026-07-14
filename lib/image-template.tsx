import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";

const WIDTH = 1080;
const HEIGHT = 1350;

export type TextZone = "bottom" | "top" | "left" | "right";
export type TextColor = "light" | "dark";

type LoadedFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let fontsCache: LoadedFont[] | null = null;
async function loadFonts(): Promise<LoadedFont[]> {
  if (fontsCache) return fontsCache;
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Heebo-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Heebo-Bold.ttf")),
  ]);
  fontsCache = [
    { name: "Heebo", data: regular, weight: 400, style: "normal" },
    { name: "Heebo", data: bold, weight: 700, style: "normal" },
  ];
  return fontsCache;
}

async function fetchAsDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch template background image (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// Satori (the engine behind next/og's ImageResponse) has no bidi support, so
// a Hebrew string handed to it renders as a raw left-to-right character dump
// - individual letters and word order both come out backwards. We work
// around it by pre-wrapping into lines ourselves and, within each line,
// reversing word order and each Hebrew word's characters so the string
// satori draws left-to-right *looks* correct once flipped into place.
// Numeric/Latin runs (e.g. "3", "2026") are left untouched since digits
// already read correctly left-to-right even inside RTL text.
const HEBREW_RE = /[֐-׿]/;

function reverseWordVisual(word: string): string {
  return HEBREW_RE.test(word) ? [...word].reverse().join("") : word;
}

function wrapRTLWords(text: string, maxCharsPerLine: number): string[][] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    const wordLen = word.length + 1;
    if (current.length > 0 && currentLen + wordLen > maxCharsPerLine) {
      lines.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(word);
    currentLen += wordLen;
  }
  if (current.length > 0) lines.push(current);

  return lines.map((line) => line.slice().reverse());
}

function wrapAndReverseRTL(text: string, maxCharsPerLine: number): string[] {
  return wrapRTLWords(text, maxCharsPerLine).map((line) =>
    line.map(reverseWordVisual).join(" ")
  );
}

const PUNCT_RE = /["'"׳״.,!?]/g;

/** Same wrapping as wrapAndReverseRTL, but keeps each word separate (with a
 *  highlight flag) so the caller can render individual words in a
 *  different color - e.g. one emphasized word inside a quote. */
function wrapRTLWithHighlight(
  text: string,
  maxCharsPerLine: number,
  highlightWords: Set<string>
): { text: string; highlight: boolean }[][] {
  return wrapRTLWords(text, maxCharsPerLine).map((line) =>
    line.map((word) => ({
      text: reverseWordVisual(word),
      highlight: highlightWords.has(word.replace(PUNCT_RE, "")),
    }))
  );
}

const SCRIM = {
  bottom: "linear-gradient(to top, rgba(29,53,87,0.94) 0%, rgba(29,53,87,0.6) 45%, rgba(29,53,87,0) 78%)",
  top: "linear-gradient(to bottom, rgba(29,53,87,0.94) 0%, rgba(29,53,87,0.6) 45%, rgba(29,53,87,0) 78%)",
} as const;

type ZoneLayout = {
  position: CSSProperties;
  justifyContent: string;
  background?: string;
  paddingTop: number;
  paddingX: number;
  hookChars: number;
  ctaChars: number;
  hookFontSize: number;
  ctaFontSize: number;
  closingFontSize: number;
  ctaGap: number;
  closingGap: number;
};

// left/right values are calibrated pixel-for-pixel against a real reference
// design (measured font heights/widths and block gaps via sharp), not
// eyeballed - see conversation history for the measurement approach.
function getZoneLayout(zone: TextZone): ZoneLayout {
  switch (zone) {
    case "top":
      return {
        position: { top: 0, left: 0, right: 0 },
        justifyContent: "flex-start",
        background: SCRIM.top,
        paddingTop: 64,
        paddingX: 48,
        hookChars: 24,
        ctaChars: 16,
        hookFontSize: 58,
        ctaFontSize: 72,
        closingFontSize: 48,
        ctaGap: 100,
        closingGap: 90,
      };
    case "left":
      return {
        position: { top: 0, left: 0, bottom: 0, width: "48%" },
        justifyContent: "flex-start",
        paddingTop: 170,
        paddingX: 36,
        hookChars: 11,
        ctaChars: 12,
        hookFontSize: 72,
        ctaFontSize: 88,
        closingFontSize: 60,
        ctaGap: 195,
        closingGap: 190,
      };
    case "right":
      return {
        position: { top: 0, right: 0, bottom: 0, width: "48%" },
        justifyContent: "flex-start",
        paddingTop: 170,
        paddingX: 36,
        hookChars: 11,
        ctaChars: 12,
        hookFontSize: 72,
        ctaFontSize: 88,
        closingFontSize: 60,
        ctaGap: 195,
        closingGap: 190,
      };
    case "bottom":
    default:
      return {
        position: { left: 0, right: 0, bottom: 0 },
        justifyContent: "flex-end",
        background: SCRIM.bottom,
        paddingTop: 64,
        paddingX: 48,
        hookChars: 24,
        ctaChars: 16,
        hookFontSize: 58,
        ctaFontSize: 72,
        closingFontSize: 48,
        ctaGap: 100,
        closingGap: 90,
      };
  }
}

const TEXT_COLORS = {
  light: { headline: "#FFFFFF", accent: "#F5AC32" },
  dark: { headline: "#1D3557", accent: "#E63946" },
} as const;

type LineItem = {
  text: string;
  fontSize: number;
  color: string;
  marginTop: number;
};

function blockLines(
  lines: string[],
  fontSize: number,
  color: string,
  blockMarginTop: number
): LineItem[] {
  return lines.map((text, i) => ({
    text,
    fontSize,
    color,
    marginTop: i === 0 ? blockMarginTop : 0,
  }));
}

export async function renderPostImage({
  backgroundUrl,
  overlayHook,
  overlayCta,
  overlayClosing,
  textZone = "bottom",
  textColor = "light",
  flatBackground = false,
  centerVertically = false,
}: {
  backgroundUrl: string;
  overlayHook: string;
  overlayCta: string;
  overlayClosing: string;
  textZone?: TextZone;
  textColor?: TextColor;
  /** Skip the photo-legibility scrim gradient - use for solid-color
   *  backgrounds (no photo) so the brand color reads as a flat card
   *  instead of blending into the scrim's navy tint. */
  flatBackground?: boolean;
  /** Center the text block in the middle of the frame instead of
   *  anchoring it to the zone's edge - reads better on flat-color cards
   *  that would otherwise leave a lopsided block of empty space. */
  centerVertically?: boolean;
}): Promise<Buffer> {
  const [fonts, backgroundDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(backgroundUrl),
  ]);

  const layout = getZoneLayout(textZone);
  if (flatBackground) layout.background = undefined;
  if (centerVertically) {
    layout.position = { top: 0, left: 0, right: 0, bottom: 0 };
    layout.justifyContent = "center";
  }
  const colors = TEXT_COLORS[textColor];
  const hookLines = wrapAndReverseRTL(overlayHook, layout.hookChars);
  const ctaLines = wrapAndReverseRTL(overlayCta, layout.ctaChars);
  const closingLines = wrapAndReverseRTL(overlayClosing, layout.hookChars);

  // The gaps were calibrated against a 3-line hook. If the AI-generated
  // hook (or closing) wraps to more lines than that, shrink the gaps so a
  // longer post still balances out over the available vertical space
  // instead of pushing the CTA/closing further down every time.
  const REFERENCE_HOOK_LINES = 3;
  const extraLines = Math.max(0, hookLines.length - REFERENCE_HOOK_LINES);
  const ctaGap = Math.max(layout.ctaGap - extraLines * 45, 90);
  const closingGap = Math.max(layout.closingGap - extraLines * 45, 80);

  const items: LineItem[] = [
    ...blockLines(hookLines, layout.hookFontSize, colors.headline, 0),
    ...blockLines(ctaLines, layout.ctaFontSize, colors.accent, ctaGap),
    ...blockLines(closingLines, layout.closingFontSize, colors.headline, closingGap),
  ];

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: `url(${backgroundDataUri})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: layout.justifyContent,
            padding: `${layout.paddingTop}px ${layout.paddingX}px 56px`,
            ...(layout.background ? { background: layout.background } : {}),
            ...layout.position,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: item.fontSize,
                fontWeight: 700,
                color: item.color,
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
                marginTop: item.marginTop,
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}

/**
 * Middle-of-carousel content card: solid brand background, slide number,
 * title, and short body text. Meant to sit between a cover slide and a
 * closing CTA slide (both rendered via renderPostImage on the photo
 * template) in a multi-image carousel post.
 */
export async function renderContentSlide({
  slideNumber,
  totalSlides,
  title,
  body,
  logoUrl,
}: {
  /** 1-based index of this tip/point, independent of its position in the
   *  overall carousel (a 4-tip carousel numbers its content slides 1-4
   *  even though slide 1 of the carousel is the cover). */
  slideNumber: number;
  totalSlides: number;
  title: string;
  body: string;
  /** Optional real logo image (transparent PNG recommended). Falls back
   *  to a text wordmark styled after the brand's navy/green look. */
  logoUrl?: string;
}): Promise<Buffer> {
  const [fonts, logoDataUri] = await Promise.all([
    loadFonts(),
    logoUrl ? fetchAsDataUri(logoUrl) : Promise.resolve(null),
  ]);

  const titleLines = wrapAndReverseRTL(title, 14);
  const bodyLines = wrapAndReverseRTL(body, 26);
  // Purely numeric/Latin, no RTL reordering needed (or wanted).
  const progressText = `${slideNumber} / ${totalSlides}`;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(160deg, #338C5B 0%, #245F3F 100%)",
          padding: "120px 90px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 130,
            fontWeight: 700,
            color: "#F5AC32",
            fontFamily: "Heebo",
          }}
        >
          {String(slideNumber).padStart(2, "0")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 56 }}>
          {titleLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 66,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
          {bodyLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 400,
                color: "#E9F5EE",
                lineHeight: 1.5,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 70,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {logoDataUri ? (
            <div
              style={{
                display: "flex",
                background: "#FFFFFF",
                borderRadius: 18,
                padding: "22px 36px",
                marginBottom: 16,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri} alt="" height={72} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#FFFFFF", fontFamily: "Heebo" }}>
                TICO
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#F5AC32",
                  fontFamily: "Heebo",
                  marginLeft: 8,
                }}
              >
                FINANCE
              </div>
            </div>
          )}
          <div style={{ display: "flex", fontSize: 22, fontWeight: 400, color: "#CFEBDC", fontFamily: "Heebo" }}>
            {progressText}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}

/**
 * "Quote card": logo top-left on a light background, a bold relatable
 * quote in a green highlight box (with one emphasized word in gold), and
 * a photo underneath illustrating the scenario. The photo is the one
 * part meant to change post to post - everything else is fixed branding.
 */
export async function renderQuoteCard({
  quote,
  highlightWord,
  photoUrl,
  logoUrl,
}: {
  quote: string;
  /** The word inside `quote` to render in the gold accent color. */
  highlightWord?: string;
  photoUrl: string;
  logoUrl?: string;
}): Promise<Buffer> {
  const [fonts, photoDataUri, logoDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(photoUrl),
    logoUrl ? fetchAsDataUri(logoUrl) : Promise.resolve(null),
  ]);

  const highlightSet = new Set(highlightWord ? [highlightWord] : []);
  const quoteLines = wrapRTLWithHighlight(`"${quote}"`, 18, highlightSet);

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#F1FAEE",
        }}
      >
        <div style={{ display: "flex", padding: "56px 0 0 64px" }}>
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="" height={58} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#1D3557", fontFamily: "Heebo" }}>
                TICO
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 700,
                  color: "#338C5B",
                  fontFamily: "Heebo",
                  marginLeft: 8,
                }}
              >
                FINANCE
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", padding: "48px 64px 0" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              background: "#338C5B",
              borderRadius: 12,
              padding: "56px 48px",
            }}
          >
            {quoteLines.map((line, i) => (
              <div key={i} style={{ display: "flex", marginTop: i === 0 ? 0 : 8 }}>
                {line.map((word, j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      fontSize: 62,
                      fontWeight: 700,
                      color: word.highlight ? "#F5AC32" : "#FFFFFF",
                      lineHeight: 1.3,
                      fontFamily: "Heebo",
                      marginLeft: j === 0 ? 0 : 18,
                    }}
                  >
                    {word.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, marginTop: 56, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoDataUri}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}

/**
 * "Blob card": a real photo (Tico standing) with a large brand-green
 * circle bleeding in from the top-left, hosting the hook/CTA text. The
 * circle's center/radius were measured pixel-for-pixel against the
 * reference Canva mockup (sharp color-distance scan of the green
 * region, then a 3-point circle fit) rather than eyeballed.
 */
export async function renderBlobPhotoPost({
  photoUrl,
  overlayHook,
  overlayCta,
  logoUrl,
}: {
  photoUrl: string;
  overlayHook: string;
  overlayCta: string;
  logoUrl?: string;
}): Promise<Buffer> {
  const [fonts, photoDataUri, logoDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(photoUrl),
    logoUrl ? fetchAsDataUri(logoUrl) : Promise.resolve(null),
  ]);

  const hookLines = wrapAndReverseRTL(overlayHook, 13);
  const ctaLines = wrapAndReverseRTL(overlayCta, 15);

  // Circle fit (1080x1350 canvas): center (-2, 694), radius 735.
  const CIRCLE_R = 735;
  const CIRCLE_CX = -2;
  const CIRCLE_CY = 694;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: `url(${photoDataUri})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: CIRCLE_R * 2,
            height: CIRCLE_R * 2,
            left: CIRCLE_CX - CIRCLE_R,
            top: CIRCLE_CY - CIRCLE_R,
            borderRadius: "50%",
            background: "#338C5B",
          }}
        />

        <div style={{ display: "flex", position: "absolute", top: 48, right: 48 }}>
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="" height={52} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1D3557", fontFamily: "Heebo" }}>
                TICO
              </div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#338C5B", fontFamily: "Heebo", marginLeft: 8 }}>
                FINANCE
              </div>
            </div>
          )}
        </div>

        {/* Height is deliberately much larger than any realistic text
            block: satori's flex layout will compress (overlap) children
            that overflow a tightly-fitted fixed-height container, so we
            center within a generously oversized box instead of a
            content-sized one. */}
        <div
          style={{
            position: "absolute",
            left: 40,
            top: -180,
            width: 600,
            height: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hookLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
                marginTop: i === 0 ? 0 : 0,
              }}
            >
              {line}
            </div>
          ))}
          {ctaLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 700,
                color: "#F5AC32",
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
                marginTop: i === 0 ? 56 : 0,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}

/**
 * "Box card": a real photo (Tico at his desk) with a brand-green
 * rectangle hosting the hook/CTA text. Rectangle bounds were measured
 * pixel-for-pixel against the reference Canva mockup the same way as
 * the blob card's circle.
 */
export async function renderBoxPhotoPost({
  photoUrl,
  overlayHook,
  overlayCta,
  logoUrl,
}: {
  photoUrl: string;
  overlayHook: string;
  overlayCta: string;
  logoUrl?: string;
}): Promise<Buffer> {
  const [fonts, photoDataUri, logoDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(photoUrl),
    logoUrl ? fetchAsDataUri(logoUrl) : Promise.resolve(null),
  ]);

  const hookLines = wrapAndReverseRTL(overlayHook, 13);
  const ctaLines = wrapAndReverseRTL(overlayCta, 15);

  // Measured (1080x1350 canvas): x 108-978, y 135-576.
  const BOX = { left: 108, top: 135, width: 870, height: 441 };

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundImage: `url(${photoDataUri})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            left: BOX.left,
            top: BOX.top,
            width: BOX.width,
            height: BOX.height,
            borderRadius: 12,
            background: "#338C5B",
          }}
        />

        {/* Text sits in its own generously-tall container centered on the
            box's midpoint - see renderBlobPhotoPost for why this can't be
            height:BOX.height directly (satori overlaps overflowing text
            in a tightly-fitted fixed-height flex column). */}
        <div
          style={{
            position: "absolute",
            left: BOX.left,
            top: BOX.top + BOX.height / 2 - 500,
            width: BOX.width,
            height: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 56px",
          }}
        >
          {hookLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 54,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
          {ctaLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 700,
                color: "#F5AC32",
                lineHeight: 1.3,
                fontFamily: "Heebo",
                whiteSpace: "nowrap",
                marginTop: i === 0 ? 40 : 0,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", position: "absolute", top: 48, right: 48 }}>
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="" height={52} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1D3557", fontFamily: "Heebo" }}>
                TICO
              </div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#338C5B", fontFamily: "Heebo", marginLeft: 8 }}>
                FINANCE
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}
