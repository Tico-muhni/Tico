import type { Metadata } from "next";
import LotteryCalculator from "./lottery-calculator";

export const metadata: Metadata = {
  title: "מחשבון הגרלות דיור | Tico",
  description:
    "מחשבון מחיר סופי לדירה בהגרלות מחיר למשתכן / דירה בהנחה / מחיר מטרה, לפי גדלי דירות שונים.",
};

export default function LotteryCalculatorPage() {
  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-10">
      <main className="flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-primary">
            מחשבון הגרלות דיור
          </h1>
          <p className="text-foreground/80">
            הזינו את נתוני ההגרלה כפי שהם מופיעים באתר, והמחשבון יחשב את
            מחיר הדירה הסופי לכל גודל דירה.
          </p>
        </header>
        <LotteryCalculator />
      </main>
    </div>
  );
}
