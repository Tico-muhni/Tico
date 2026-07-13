import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tico | מערכת שיווק אוטומטית",
  description: "יצירת תוכן שיווקי, אישור, ופרסום אוטומטי לרשתות חברתיות ומייל",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
