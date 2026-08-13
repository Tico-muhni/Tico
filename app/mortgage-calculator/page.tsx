import type { Metadata } from "next";
import SmartMortgageCalculator from "./smart-mortgage-calculator";

export const metadata: Metadata = {
  title: "מחשבון משכנתה חכם | Tico",
  description:
    "הזינו נתוני הכנסות, התחייבויות וסוג עסקה, וקבלו חישוב אוטומטי של יחס החזר, סך הכנסות, הכנסה פנויה ומשכנתה מקסימלית.",
};

export default function MortgageCalculatorPage() {
  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-10">
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
