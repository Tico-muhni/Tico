"use client";

import { useMemo, useState, type ReactNode } from "react";

type TransactionType = {
  id: string;
  label: string;
  ltv: number;
  note: string;
};

const TRANSACTION_TYPES: TransactionType[] = [
  {
    id: "single",
    label: "דירה יחידה / דירה ראשונה",
    ltv: 0.75,
    note: "מימון של עד 75% משווי הנכס.",
  },
  {
    id: "replacement",
    label: "דירה חלופית (משפרי דיור שטרם מכרו את הדירה הקיימת)",
    ltv: 0.7,
    note: "מימון של עד 70% משווי הנכס.",
  },
  {
    id: "investment",
    label: "דירה נוספת / להשקעה",
    ltv: 0.5,
    note: "מימון של עד 50% משווי הנכס.",
  },
];

// כללי המימון וההחזר לפי הוראת ניהול בנקאי תקין 329 של בנק ישראל:
// (1) אחוז המימון המקסימלי (LTV) תלוי בסוג העסקה - ר' TRANSACTION_TYPES.
// (2) יחס ההחזר מהכנסה (סך כל ההחזרים החודשיים, כולל המשכנתה החדשה,
//     חלקי ההכנסה הפנויה נטו) - עד 40% נחשב מקובל על הבנקים ללא הגבלות
//     מיוחדות; בין 40% ל-50% מותר בכפוף למגבלות נוספות; מעל 50% אסור.
const PRUDENT_PTI_PERCENT = 40;
const MAX_PTI_PERCENT = 50;

const DEFAULT_INTEREST_RATE_PERCENT = 5.3;
const DEFAULT_RECOGNITION_PERCENT = 70;
const MIN_TERM_YEARS = 4;
const MAX_TERM_YEARS = 30;
const RETIREMENT_AGE_CAP = 75;

const currency = new Intl.NumberFormat("he-IL", {
  maximumFractionDigits: 0,
});

function numberInputValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// ההחזר החודשי (שיטת שפיצר) עבור קרן נתונה.
function monthlyPaymentForPrincipal(
  principal: number,
  annualRatePercent: number,
  years: number
) {
  if (principal <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments))
  );
}

// הקרן המקסימלית שניתן לקבל עבור החזר חודשי נתון (היפוך שיטת שפיצר).
function principalForMonthlyPayment(
  payment: number,
  annualRatePercent: number,
  years: number
) {
  if (payment <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return payment * numPayments;
  return (payment * (1 - Math.pow(1 + monthlyRate, -numPayments))) / monthlyRate;
}

function ptiStatus(percent: number) {
  if (percent <= PRUDENT_PTI_PERCENT) {
    return {
      label: "בטווח המקובל על הבנקים",
      className: "text-emerald-600",
    };
  }
  if (percent <= MAX_PTI_PERCENT) {
    return {
      label: "מותר בכפוף למגבלות נוספות (הוראה 329)",
      className: "text-amber-600",
    };
  }
  return {
    label: "חורג מהתקרה המותרת לפי הוראה 329",
    className: "text-red-600",
  };
}

export default function SmartMortgageCalculator() {
  // פרטי לקוח וסוג עסקה
  const [clientName, setClientName] = useState("");
  const [age, setAge] = useState<number>(35);
  const [transactionTypeId, setTransactionTypeId] = useState(
    TRANSACTION_TYPES[0].id
  );

  // הכנסות
  const [income1, setIncome1] = useState<number>(0);
  const [hasSecondBorrower, setHasSecondBorrower] = useState(false);
  const [income2, setIncome2] = useState<number>(0);
  const [additionalIncomeGross, setAdditionalIncomeGross] = useState<number>(0);
  const [recognitionPercent, setRecognitionPercent] = useState<number>(
    DEFAULT_RECOGNITION_PERCENT
  );

  // התחייבויות
  const [existingObligations, setExistingObligations] = useState<number>(0);

  // פרטי העסקה והמשכנתה
  const [propertyValue, setPropertyValue] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(
    DEFAULT_INTEREST_RATE_PERCENT
  );
  const [termYears, setTermYears] = useState<number>(MAX_TERM_YEARS);
  const [targetPtiPercent, setTargetPtiPercent] = useState<number>(35);

  const transactionType =
    TRANSACTION_TYPES.find((type) => type.id === transactionTypeId) ??
    TRANSACTION_TYPES[0];

  const recommendedMaxTerm = clamp(
    RETIREMENT_AGE_CAP - age,
    MIN_TERM_YEARS,
    MAX_TERM_YEARS
  );

  const results = useMemo(() => {
    const totalIncome =
      income1 +
      (hasSecondBorrower ? income2 : 0) +
      additionalIncomeGross * (recognitionPercent / 100);
    const totalObligations = existingObligations;
    const disposableIncomeBeforeMortgage = totalIncome - totalObligations;

    const ltvCapAmount = propertyValue * transactionType.ltv;

    const maxPaymentAtTarget = Math.max(
      totalIncome * (targetPtiPercent / 100) - totalObligations,
      0
    );
    const capacityCapAmount = principalForMonthlyPayment(
      maxPaymentAtTarget,
      interestRate,
      termYears
    );

    const maxMortgage = Math.max(
      Math.min(ltvCapAmount, capacityCapAmount),
      0
    );
    const bindingConstraint =
      capacityCapAmount < ltvCapAmount
        ? "יכולת ההחזר לפי ההכנסה"
        : "אחוז המימון המקסימלי (LTV) לפי סוג העסקה";

    const requiredEquity = Math.max(propertyValue - maxMortgage, 0);
    const monthlyPaymentForMax = monthlyPaymentForPrincipal(
      maxMortgage,
      interestRate,
      termYears
    );
    const actualPtiPercent =
      totalIncome > 0
        ? ((monthlyPaymentForMax + totalObligations) / totalIncome) * 100
        : 0;
    const disposableIncomeAfterMortgage =
      disposableIncomeBeforeMortgage - monthlyPaymentForMax;

    return {
      totalIncome,
      totalObligations,
      disposableIncomeBeforeMortgage,
      ltvCapAmount,
      capacityCapAmount,
      maxMortgage,
      bindingConstraint,
      requiredEquity,
      monthlyPaymentForMax,
      actualPtiPercent,
      disposableIncomeAfterMortgage,
    };
  }, [
    income1,
    hasSecondBorrower,
    income2,
    additionalIncomeGross,
    recognitionPercent,
    existingObligations,
    propertyValue,
    transactionType,
    targetPtiPercent,
    interestRate,
    termYears,
  ]);

  const status = ptiStatus(results.actualPtiPercent);
  const hasEnoughData = propertyValue > 0 && results.totalIncome > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            פרטי לקוח וסוג עסקה
          </h2>
          <p className="text-xs text-foreground/50">
            הפרטים משמשים לחישוב בלבד ואינם נשמרים במערכת.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שם הלקוח (אופציונלי)">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-primary"
            />
          </Field>
          <Field label="גיל הלווה הבכיר" suffix="שנים">
            <NumberInput value={age} onChange={setAge} min={18} max={90} />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground/80">
            סוג העסקה
          </span>
          <div className="flex flex-col gap-2">
            {TRANSACTION_TYPES.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <input
                  type="radio"
                  name="transactionType"
                  checked={transactionTypeId === type.id}
                  onChange={() => setTransactionTypeId(type.id)}
                  className="h-4 w-4"
                />
                <span>
                  {type.label}{" "}
                  <span className="text-foreground/50">({type.note})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">הכנסות</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="הכנסה חודשית נטו - לווה 1" suffix="₪">
            <NumberInput value={income1} onChange={setIncome1} min={0} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={hasSecondBorrower}
              onChange={(e) => setHasSecondBorrower(e.target.checked)}
              className="h-4 w-4"
            />
            יש לווה נוסף
          </label>
          {hasSecondBorrower && (
            <Field label="הכנסה חודשית נטו - לווה 2" suffix="₪">
              <NumberInput value={income2} onChange={setIncome2} min={0} />
            </Field>
          )}
          <Field label="הכנסות נוספות (ברוטו - שכירות, בונוס וכו')" suffix="₪">
            <NumberInput
              value={additionalIncomeGross}
              onChange={setAdditionalIncomeGross}
              min={0}
            />
          </Field>
          <Field label="אחוז הכרה בהכנסות הנוספות" suffix="%">
            <NumberInput
              value={recognitionPercent}
              onChange={setRecognitionPercent}
              min={0}
              max={100}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          התחייבויות חודשיות קיימות
        </h2>
        <Field
          label="סך החזרים חודשיים (הלוואות, כרטיסי אשראי, מזונות וכו')"
          suffix="₪"
        >
          <NumberInput
            value={existingObligations}
            onChange={setExistingObligations}
            min={0}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          פרטי העסקה והמשכנתה
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שווי הנכס / מחיר הרכישה" suffix="₪">
            <NumberInput
              value={propertyValue}
              onChange={setPropertyValue}
              min={0}
            />
          </Field>
          <Field label="ריבית שנתית משוערת" suffix="%">
            <NumberInput
              value={interestRate}
              onChange={setInterestRate}
              min={0}
              max={15}
              step={0.1}
            />
          </Field>
          <Field label="תקופת הלוואה" suffix="שנים">
            <NumberInput
              value={termYears}
              onChange={setTermYears}
              min={MIN_TERM_YEARS}
              max={MAX_TERM_YEARS}
            />
          </Field>
        </div>
        <p className="text-xs text-foreground/50">
          לפי הגיל שהוזן, משך ההלוואה המומלץ עד גיל {RETIREMENT_AGE_CAP} הוא{" "}
          {recommendedMaxTerm} שנים.
        </p>
        <Field
          label={`יחס החזר מהכנסה יעד: ${targetPtiPercent}%`}
        >
          <input
            type="range"
            min={10}
            max={MAX_PTI_PERCENT}
            step={1}
            value={targetPtiPercent}
            onChange={(e) => setTargetPtiPercent(Number(e.target.value))}
            className="w-full accent-[var(--brand-primary)]"
            dir="ltr"
          />
        </Field>
        <p className="text-xs text-foreground/50">
          עד {PRUDENT_PTI_PERCENT}% - מקובל על רוב הבנקים. בין{" "}
          {PRUDENT_PTI_PERCENT}% ל-{MAX_PTI_PERCENT}% - מותר בכפוף למגבלות
          נוספות. מעל {MAX_PTI_PERCENT}% - אסור לפי הוראת בנק ישראל 329.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          תוצאות{clientName ? ` עבור ${clientName}` : ""}
        </h2>
        {!hasEnoughData ? (
          <p className="text-sm text-foreground/60">
            הזינו שווי נכס והכנסות כדי לראות תוצאות.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ResultCard label="סך הכנסות מוכרות" value={results.totalIncome} />
              <ResultCard
                label="סך התחייבויות חודשיות"
                value={results.totalObligations}
              />
              <ResultCard
                label="הכנסה פנויה (לפני משכנתה חדשה)"
                value={results.disposableIncomeBeforeMortgage}
              />
              <ResultCard
                label="הכנסה פנויה (אחרי החזר המשכנתה)"
                value={results.disposableIncomeAfterMortgage}
                warn={results.disposableIncomeAfterMortgage < 0}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-right text-foreground/70">
                    <th className="py-2 pr-2">מגבלה</th>
                    <th className="py-2">משכנתה מקסימלית לפיה</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      אחוז מימון (LTV) - {transactionType.label} (
                      {Math.round(transactionType.ltv * 100)}%)
                    </td>
                    <td className="py-2">
                      {currency.format(results.ltvCapAmount)} ₪
                    </td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      יכולת החזר (יעד {targetPtiPercent}% מההכנסה)
                    </td>
                    <td className="py-2">
                      {currency.format(results.capacityCapAmount)} ₪
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-background px-4 py-4">
              <p className="text-xs text-foreground/50">
                הגורם הקובע: {results.bindingConstraint}
              </p>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {currency.format(results.maxMortgage)} ₪
              </p>
              <p className="text-xs text-foreground/50">משכנתה מקסימלית</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ResultCard
                label="הון עצמי נדרש"
                value={results.requiredEquity}
              />
              <ResultCard
                label="החזר חודשי משוער"
                value={results.monthlyPaymentForMax}
              />
              <div className="flex flex-col gap-1 rounded-xl bg-background px-4 py-3">
                <span className="text-xs text-foreground/50">
                  יחס החזר מהכנסה בפועל
                </span>
                <span className={`text-lg font-semibold ${status.className}`}>
                  {results.actualPtiPercent.toFixed(1)}%
                </span>
                <span className={`text-xs ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background px-4 py-3">
              <p className="text-sm text-foreground/80">
                רוצים לוודא שהנתונים והחישוב מתאימים למקרה הספציפי שלכם? זה
                בדיוק מה שאני בודק בשיחה.
              </p>
              <a
                href={`https://wa.me/972507700322?text=${encodeURIComponent(
                  "היי צ'יקו! חישבתי במחשבון המשכנתה החכם, רוצה לבדוק את זה מולך."
                )}`}
                target="_blank"
                rel="noopener"
                className="whitespace-nowrap rounded-full bg-button px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                בדיקה מול היועץ ב-WhatsApp
              </a>
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-foreground/50">
        המחשבון הוא כלי עזר להערכה בלבד ואינו מהווה ייעוץ פיננסי או התחייבות
        למתן אשראי. אישור המשכנתה בפועל, אחוז המימון וההחזר החודשי נתונים
        לשיקול דעת הבנק ולבדיקת יכולת ההחזר בפועל מול תלוש השכר.
      </p>
    </div>
  );
}

function ResultCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background px-4 py-3">
      <span className="text-xs text-foreground/50">{label}</span>
      <span
        className={`text-lg font-semibold ${
          warn ? "text-red-600" : "text-primary"
        }`}
      >
        {currency.format(value)} ₪
      </span>
    </div>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {children}
        {suffix && <span className="text-foreground/50">{suffix}</span>}
      </div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={numberInputValue(value)}
      onChange={(e) => onChange(e.target.valueAsNumber || 0)}
      min={min}
      max={max}
      step={step ?? 1}
      dir="ltr"
      className="w-full rounded-lg border border-black/10 px-3 py-2 text-left outline-none focus:border-primary"
    />
  );
}
