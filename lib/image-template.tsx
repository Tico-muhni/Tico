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
    readFile(join(process.cwd(), "assets/fonts/NotoSansHebrew-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/NotoSansHebrew-Bold.ttf")),
  ]);
  fontsCache = [
    { name: "Noto Sans Hebrew", data: regular, weight: 400, style: "normal" },
    { name: "Noto Sans Hebrew", data: bold, weight: 700, style: "normal" },
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
  alignItems?: string;
  background?: string;
  maxCharsPerLine: number;
  fontSize: number;
};

function getZoneLayout(zone: TextZone): ZoneLayout {
  switch (zone) {
    case "top":
      return {
        position: { top: 0, left: 0, right: 0 },
        justifyContent: "flex-start",
        background: SCRIM.top,
        maxCharsPerLine: 22,
        fontSize: 56,
      };
    case "left":
      return {
        position: { top: 0, left: 0, bottom: 0, width: "46%" },
        justifyContent: "center",
        maxCharsPerLine: 15,
        fontSize: 46,
      };
    case "right":
      return {
        position: { top: 0, right: 0, bottom: 0, width: "46%" },
        justifyContent: "center",
        maxCharsPerLine: 15,
        fontSize: 46,
      };
    case "bottom":
    default:
      return {
        position: { left: 0, right: 0, bottom: 0 },
        justifyContent: "flex-end",
        background: SCRIM.bottom,
        maxCharsPerLine: 22,
        fontSize: 56,
      };
  }
}

const TEXT_COLORS = {
  light: { headline: "#FFFFFF", subtext: "#A8DADC" },
  dark: { headline: "#1D3557", subtext: "#457B9D" },
} as const;

export async function renderPostImage({
  backgroundUrl,
  overlayText,
  textZone = "bottom",
  textColor = "light",
}: {
  backgroundUrl: string;
  overlayText: string;
  textZone?: TextZone;
  textColor?: TextColor;
}): Promise<Buffer> {
  const [fonts, backgroundDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(backgroundUrl),
  ]);

  const businessName = process.env.BUSINESS_NAME || "";
  const layout = getZoneLayout(textZone);
  const colors = TEXT_COLORS[textColor];
  const headlineLines = wrapAndReverseRTL(overlayText, layout.maxCharsPerLine);
  const businessLines = businessName
    ? wrapAndReverseRTL(businessName, Math.max(layout.maxCharsPerLine, 30))
    : [];

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundDataUri}
          alt=""
          width={WIDTH}
          height={HEIGHT}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${WIDTH}px`,
            height: `${HEIGHT}px`,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            justifyContent: layout.justifyContent,
            padding: "56px 48px",
            ...(layout.background ? { background: layout.background } : {}),
            ...layout.position,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {headlineLines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  fontSize: layout.fontSize,
                  fontWeight: 700,
                  color: colors.headline,
                  lineHeight: 1.35,
                  fontFamily: "Noto Sans Hebrew",
                }}
              >
                {line}
              </div>
            ))}
          </div>
          {businessLines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
              {businessLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: 28,
                    fontWeight: 400,
                    color: colors.subtext,
                    fontFamily: "Noto Sans Hebrew",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}
