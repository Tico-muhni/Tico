import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tico RTM — בריפים יומיים",
    short_name: "Tico RTM",
    description:
      'בריפים יומיים לסרטוני אינסטגרם בנושאי משכנתאות, ריבית ונדל"ן',
    start_url: "/admin/rtm",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2E8B57",
    theme_color: "#2E8B57",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
