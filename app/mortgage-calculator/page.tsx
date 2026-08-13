import type { CSSProperties } from "react";
import type { Metadata } from "next";
import SmartMortgageCalculator from "./smart-mortgage-calculator";

export const metadata: Metadata = {
  title: "מחשבון משכנתה חכם | Tico",
  description:
    "הזינו נתוני הכנסות, התחייבויות וסוג עסקה, וקבלו חישוב אוטומטי של יחס החזר, סך הכנסות, הכנסה פנויה ומשכנתה מקסימלית.",
  // manifest ייעודי לעמוד הזה (לא זה של האפליקציה הראשית) - כדי
  // שאפשר יהיה "להוריד" (להוסיף למסך הבית) את מחשבון המשכנתה בפני
  // עצמו, עם הלוגו של Tico.
  manifest: "/mortgage-calculator-manifest.webmanifest",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "מחשבון משכנתה",
  },
};

// הצבע הירוק של המותג (#2E8B57) - כמו בכל שאר האתר (login/register/admin/rtm) -
// מוגדר כאן במקום ה-primary/button הישנים (כחול/אדום) שהגיעו מהמחשבון
// הישן ואינם צבעי המותג בפועל.
const BRAND_STYLE = {
  "--brand-primary": "#2E8B57",
  "--brand-button": "#2E8B57",
} as CSSProperties;

export default function MortgageCalculatorPage() {
  return (
    <div
      className="flex flex-1 justify-center bg-background px-4 py-10"
      style={BRAND_STYLE}
    >
      <main className="flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-primary">
            מחשבון משכנתה חכם
          </h1>
          <p className="text-foreground/80">
            הזינו את פרטי העסקה, ההכנסות וההתחייבויות, והמחשבון יחשב עבורכם
            אוטומטית יחס החזר, סך הכנסות, הכנסה פנויה ומשכנתה מקסימלית -
            בהתאם לכללי המימון של בנק ישראל.
          </p>
        </header>
        <SmartMortgageCalculator />
      </main>
    </div>
  );
}
