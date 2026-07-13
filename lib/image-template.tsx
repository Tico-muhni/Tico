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

function wrapAndReverseRTL(text: string, maxCharsPerLine: number): string[] {
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

  return lines.map((line) =>
    line.slice().reverse().map(reverseWordVisual).join(" ")
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
}: {
  backgroundUrl: string;
  overlayHook: string;
  overlayCta: string;
  overlayClosing: string;
  textZone?: TextZone;
  textColor?: TextColor;
}): Promise<Buffer> {
  const [fonts, backgroundDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(backgroundUrl),
  ]);

  const layout = getZoneLayout(textZone);
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
  businessName,
}: {
  slideNumber: number;
  totalSlides: number;
  title: string;
  body: string;
  businessName?: string;
}): Promise<Buffer> {
  const fonts = await loadFonts();

  const titleLines = wrapAndReverseRTL(title, 14);
  const bodyLines = wrapAndReverseRTL(body, 26);
  // Purely numeric/Latin, no RTL reordering needed (or wanted).
  const progressText = `${slideNumber} / ${totalSlides}`;
  const businessLines = businessName ? wrapAndReverseRTL(businessName, 30) : [];

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
          background: "linear-gradient(160deg, #1D3557 0%, #14243E 100%)",
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
                color: "#A8DADC",
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
          {businessLines.length > 0 && (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 400,
                color: "#457B9D",
                fontFamily: "Heebo",
                marginBottom: 10,
              }}
            >
              {businessLines[0]}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 400, color: "#457B9D", fontFamily: "Heebo" }}>
            {progressText}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}
