import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SIZE = 1080;

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

function wrapAndReverseRTL(text: string, maxCharsPerLine = 22): string[] {
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

export async function renderPostImage({
  backgroundUrl,
  overlayText,
}: {
  backgroundUrl: string;
  overlayText: string;
}): Promise<Buffer> {
  const [fonts, backgroundDataUri] = await Promise.all([
    loadFonts(),
    fetchAsDataUri(backgroundUrl),
  ]);

  const businessName = process.env.BUSINESS_NAME || "";
  const headlineLines = wrapAndReverseRTL(overlayText);
  const businessLines = businessName ? wrapAndReverseRTL(businessName, 40) : [];

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backgroundDataUri}
          alt=""
          width={SIZE}
          height={SIZE}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${SIZE}px`,
            height: `${SIZE}px`,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background:
              "linear-gradient(to top, rgba(29,53,87,0.94) 0%, rgba(29,53,87,0.6) 45%, rgba(29,53,87,0) 78%)",
            padding: "64px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {headlineLines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  fontSize: 56,
                  fontWeight: 700,
                  color: "white",
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
                    color: "#A8DADC",
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
    { width: SIZE, height: SIZE, fonts }
  );

  return Buffer.from(await image.arrayBuffer());
}
