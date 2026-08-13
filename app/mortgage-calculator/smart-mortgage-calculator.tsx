"use client";

import { useMemo, useState, type ReactNode } from "react";

type EmploymentType = "employee" | "self-employed" | "other";
type CreditConduct = "good" | "notes" | "restricted";

type Borrower = {
  name: string;
  profession: string;
  employmentType: EmploymentType;
  netIncome: number;
  obligations: number;
  additionalIncome: number;
  creditConduct: CreditConduct;
};

const EMPTY_BORROWER: Borrower = {
  name: "",
  profession: "",
  employmentType: "employee",
  netIncome: 0,
  obligations: 0,
  additionalIncome: 0,
  creditConduct: "good",
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: "שכיר",
  "self-employed": "עצמאי",
  other: "אחר",
};

const CREDIT_CONDUCT_LABELS: Record<CreditConduct, string> = {
  good: "תקינה",
  notes: "יש הערות בדוח נתוני אשראי",
  restricted: "קיימות הגבלות / עיכולים",
};

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
    return { label: "בטווח המקובל על הבנקים", className: "text-emerald-600" };
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
  const [borrowers, setBorrowers] = useState<[Borrower, Borrower]>([
    { ...EMPTY_BORROWER },
    { ...EMPTY_BORROWER },
  ]);
  const [hasSecondBorrower, setHasSecondBorrower] = useState(false);
  const [recognitionPercent, setRecognitionPercent] = useState<number>(
    DEFAULT_RECOGNITION_PERCENT
  );
  const [age, setAge] = useState<number>(35);

  // פרטי הנכס
  const [transactionTypeId, setTransactionTypeId] = useState(
    TRANSACTION_TYPES[0].id
  );
  const [hasExistingProperty, setHasExistingProperty] = useState(false);
  const [existingPropertyValue, setExistingPropertyValue] = useState<number>(0);
  const [existingMortgageBalance, setExistingMortgageBalance] =
    useState<number>(0);
  const [existingPropertyLocation, setExistingPropertyLocation] =
    useState("");
  const [propertyValue, setPropertyValue] = useState<number>(0);
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyRegistration, setPropertyRegistration] = useState("");
  const [liquidEquity, setLiquidEquity] = useState<number>(0);

  // הוצאות נלוות
  const [lawyerFee, setLawyerFee] = useState<number>(0);
  const [brokerFee, setBrokerFee] = useState<number>(0);
  const [purchaseTax, setPurchaseTax] = useState<number>(0);
  const [mortgageAdvisoryFee, setMortgageAdvisoryFee] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);

  // פרטי המשכנתה
  const [interestRate, setInterestRate] = useState<number>(
    DEFAULT_INTEREST_RATE_PERCENT
  );
  const [termYears, setTermYears] = useState<number>(MAX_TERM_YEARS);
  const [targetPtiPercent, setTargetPtiPercent] = useState<number>(35);

  const [notes, setNotes] = useState("");

  function updateBorrower(index: 0 | 1, patch: Partial<Borrower>) {
    setBorrowers((prev) => {
      const next = [...prev] as [Borrower, Borrower];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  const transactionType =
    TRANSACTION_TYPES.find((type) => type.id === transactionTypeId) ??
    TRANSACTION_TYPES[0];

  const recommendedMaxTerm = clamp(
    RETIREMENT_AGE_CAP - age,
    MIN_TERM_YEARS,
    MAX_TERM_YEARS
  );

  const results = useMemo(() => {
    const active = hasSecondBorrower ? borrowers : [borrowers[0]];
    const totalIncome = active.reduce(
      (sum, b) =>
        sum + b.netIncome + b.additionalIncome * (recognitionPercent / 100),
      0
    );
    const totalObligations = active.reduce(
      (sum, b) => sum + b.obligations,
      0
    );
    const disposableIncomeBeforeMortgage = totalIncome - totalObligations;

    const netEquityFromSale = hasExistingProperty
      ? Math.max(existingPropertyValue - existingMortgageBalance, 0)
      : 0;
    const totalAvailableEquity = liquidEquity + netEquityFromSale;
    const requiredMortgage = Math.max(
      propertyValue - totalAvailableEquity,
      0
    );
    const requiredFinancingPercent =
      propertyValue > 0 ? (requiredMortgage / propertyValue) * 100 : 0;

    const totalAssociatedCosts =
      lawyerFee + brokerFee + purchaseTax + mortgageAdvisoryFee + otherFees;

    const ltvCapAmount = propertyValue * transactionType.ltv;

    const maxPaymentAtCeiling = Math.max(
      totalIncome * (MAX_PTI_PERCENT / 100) - totalObligations,
      0
    );
    const capacityAtCeiling = principalForMonthlyPayment(
      maxPaymentAtCeiling,
      interestRate,
      termYears
    );
    const maxPossibleMortgage = Math.max(
      Math.min(ltvCapAmount, capacityAtCeiling),
      0
    );

    const maxPaymentAtTarget = Math.max(
      totalIncome * (targetPtiPercent / 100) - totalObligations,
      0
    );
    const capacityAtTarget = principalForMonthlyPayment(
      maxPaymentAtTarget,
      interestRate,
      termYears
    );
    const recommendedMortgage = Math.max(
      Math.min(ltvCapAmount, capacityAtTarget),
      0
    );

    const fundingShortfall = Math.max(
      requiredMortgage - maxPossibleMortgage,
      0
    );
    const grantedMortgage = Math.min(requiredMortgage, maxPossibleMortgage);
    const totalCashNeededAtClosing =
      propertyValue - grantedMortgage + totalAssociatedCosts;

    const minMonthlyPayment = monthlyPaymentForPrincipal(
      requiredMortgage,
      interestRate,
      termYears
    );
    const desiredMonthlyPayment = monthlyPaymentForPrincipal(
      recommendedMortgage,
      interestRate,
      termYears
    );
    const maxMonthlyPayment = monthlyPaymentForPrincipal(
      maxPossibleMortgage,
      interestRate,
      termYears
    );

    const actualPtiPercent =
      totalIncome > 0
        ? ((desiredMonthlyPayment + totalObligations) / totalIncome) * 100
        : 0;
    const disposableIncomeAfterMortgage =
      disposableIncomeBeforeMortgage - desiredMonthlyPayment;

    return {
      totalIncome,
      totalObligations,
      disposableIncomeBeforeMortgage,
      netEquityFromSale,
      totalAvailableEquity,
      requiredMortgage,
      requiredFinancingPercent,
      totalAssociatedCosts,
      ltvCapAmount,
      maxPossibleMortgage,
      recommendedMortgage,
      fundingShortfall,
      totalCashNeededAtClosing,
      minMonthlyPayment,
      desiredMonthlyPayment,
      maxMonthlyPayment,
      actualPtiPercent,
      disposableIncomeAfterMortgage,
    };
  }, [
    borrowers,
    hasSecondBorrower,
    recognitionPercent,
    hasExistingProperty,
    existingPropertyValue,
    existingMortgageBalance,
    liquidEquity,
    propertyValue,
    lawyerFee,
    brokerFee,
    purchaseTax,
    mortgageAdvisoryFee,
    otherFees,
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
          <h2 className="text-lg font-semibold text-primary">פרטי לווים</h2>
          <p className="text-xs text-foreground/50">
            הפרטים משמשים לחישוב בלבד ואינם נשמרים במערכת.
          </p>
        </div>
        <Field label="גיל הלווה הבכיר" suffix="שנים">
          <NumberInput value={age} onChange={setAge} min={18} max={90} />
        </Field>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <BorrowerCard
            title="לווה 1"
            borrower={borrowers[0]}
            onChange={(patch) => updateBorrower(0, patch)}
          />
          {hasSecondBorrower ? (
            <BorrowerCard
              title="לווה 2"
              borrower={borrowers[1]}
              onChange={(patch) => updateBorrower(1, patch)}
            />
          ) : (
            <div className="flex items-start">
              <label className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={hasSecondBorrower}
                  onChange={(e) => setHasSecondBorrower(e.target.checked)}
                  className="h-4 w-4"
                />
                יש לווה נוסף
              </label>
            </div>
          )}
        </div>
        {hasSecondBorrower && (
          <button
            type="button"
            onClick={() => setHasSecondBorrower(false)}
            className="self-start text-xs text-foreground/50 underline hover:text-primary"
          >
            הסרת לווה נוסף
          </button>
        )}
        <Field label="אחוז הכרה בהכנסות הנוספות" suffix="%">
          <NumberInput
            value={recognitionPercent}
            onChange={setRecognitionPercent}
            min={0}
            max={100}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">פרטי הנכס</h2>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground/80">
            סיווג לצורך אחוז מימון מקסימלי (LTV)
          </span>
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

        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={hasExistingProperty}
            onChange={(e) => setHasExistingProperty(e.target.checked)}
            className="h-4 w-4"
          />
          יש נכס קיים למכירה (משפרי דיור)
        </label>
        {hasExistingProperty && (
          <div className="grid grid-cols-1 gap-4 rounded-xl bg-background p-4 sm:grid-cols-3">
            <Field label="שווי נכס קיים" suffix="₪">
              <NumberInput
                value={existingPropertyValue}
                onChange={setExistingPropertyValue}
                min={0}
              />
            </Field>
            <Field label="משכנתה קיימת (יתרה)" suffix="₪">
              <NumberInput
                value={existingMortgageBalance}
                onChange={setExistingMortgageBalance}
                min={0}
              />
            </Field>
            <Field label="מיקום הנכס הקיים">
              <TextInput
                value={existingPropertyLocation}
                onChange={setExistingPropertyLocation}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שווי נכס נרכש / מחיר רכישה" suffix="₪">
            <NumberInput
              value={propertyValue}
              onChange={setPropertyValue}
              min={0}
            />
          </Field>
          <Field label="מיקום הנכס הנרכש">
            <TextInput
              value={newPropertyLocation}
              onChange={setNewPropertyLocation}
            />
          </Field>
          <Field label="סוג הנכס">
            <TextInput
              value={propertyType}
              onChange={setPropertyType}
              placeholder="דירה / בית פרטי / מסחרי"
            />
          </Field>
          <Field label="רישום הנכס">
            <TextInput
              value={propertyRegistration}
              onChange={setPropertyRegistration}
              placeholder="טאבו / מנהל / חכירה"
            />
          </Field>
          <Field label="הון עצמי נזיל (חסכונות)" suffix="₪">
            <NumberInput
              value={liquidEquity}
              onChange={setLiquidEquity}
              min={0}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">הוצאות נלוות</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="עו״ד" suffix="₪">
            <NumberInput value={lawyerFee} onChange={setLawyerFee} min={0} />
          </Field>
          <Field label="מתווך" suffix="₪">
            <NumberInput value={brokerFee} onChange={setBrokerFee} min={0} />
          </Field>
          <Field label="מס רכישה" suffix="₪">
            <NumberInput
              value={purchaseTax}
              onChange={setPurchaseTax}
              min={0}
            />
          </Field>
          <Field label="ייעוץ משכנתאות" suffix="₪">
            <NumberInput
              value={mortgageAdvisoryFee}
              onChange={setMortgageAdvisoryFee}
              min={0}
            />
          </Field>
          <Field label="אחר" suffix="₪">
            <NumberInput value={otherFees} onChange={setOtherFees} min={0} />
          </Field>
          <ResultCard
            label="סה״כ הוצאות נלוות"
            value={results.totalAssociatedCosts}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">פרטי המשכנתה</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Field label={`יחס החזר מהכנסה רצוי: ${targetPtiPercent}%`}>
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
        <h2 className="text-lg font-semibold text-primary">תוצאות ותמהיל</h2>
        {!hasEnoughData ? (
          <p className="text-sm text-foreground/60">
            הזינו שווי נכס והכנסות כדי לראות תוצאות.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ResultCard label="סה״כ הכנסה" value={results.totalIncome} />
              <ResultCard
                label="סה״כ התחייבויות"
                value={results.totalObligations}
              />
              <ResultCard
                label="הכנסה פנויה"
                value={results.disposableIncomeBeforeMortgage}
              />
              <div className="flex flex-col gap-1 rounded-xl bg-background px-4 py-3">
                <span className="text-xs text-foreground/50">יחס החזר</span>
                <span className={`text-lg font-semibold ${status.className}`}>
                  {results.actualPtiPercent.toFixed(1)}%
                </span>
                <span className={`text-xs ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ResultCard
                label="החזר חודשי מינימלי (למשכנתה הנדרשת לעסקה)"
                value={results.minMonthlyPayment}
              />
              <ResultCard
                label="החזר חודשי רצוי"
                value={results.desiredMonthlyPayment}
              />
              <ResultCard
                label="החזר חודשי מקסימלי (תקרת 50%)"
                value={results.maxMonthlyPayment}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-right text-foreground/70">
                    <th className="py-2 pr-2">משכנתה</th>
                    <th className="py-2">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      נדרשת לעסקה (מחיר נכס בניכוי הון עצמי זמין)
                    </td>
                    <td className="py-2">
                      {currency.format(results.requiredMortgage)} ₪ (
                      {results.requiredFinancingPercent.toFixed(0)}% מימון)
                    </td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      מומלצת (לפי יחס החזר רצוי {targetPtiPercent}%)
                    </td>
                    <td className="py-2">
                      {currency.format(results.recommendedMortgage)} ₪
                    </td>
                  </tr>
                  <tr className="border-b border-black/5">
                    <td className="py-2 pr-2">
                      מקסימלית אפשרית ({transactionType.label}, תקרת LTV{" "}
                      {Math.round(transactionType.ltv * 100)}% / תקרת החזר{" "}
                      {MAX_PTI_PERCENT}%)
                    </td>
                    <td className="py-2 font-semibold text-primary">
                      {currency.format(results.maxPossibleMortgage)} ₪
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {results.fundingShortfall > 0 ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                ⚠️ חסר מימון של {currency.format(results.fundingShortfall)} ₪
                - המשכנתה הנדרשת חורגת מהתקרה המקסימלית האפשרית. נדרש הון עצמי
                נוסף, הפחתת שווי הנכס, או הארכת תקופת ההלוואה.
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                ✅ הסכום הנדרש לעסקה מכוסה במסגרת תקרת המימון המקסימלית.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ResultCard
                label="הון עצמי זמין (נזיל + ממכירת נכס קיים)"
                value={results.totalAvailableEquity}
              />
              <ResultCard
                label="סה״כ מזומן נדרש בסגירת העסקה"
                value={results.totalCashNeededAtClosing}
              />
              <ResultCard
                label="הכנסה פנויה אחרי ההחזר הרצוי"
                value={results.disposableIncomeAfterMortgage}
                warn={results.disposableIncomeAfterMortgage < 0}
              />
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

      <section className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">הערות</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-primary"
        />
      </section>

      <p className="text-xs text-foreground/50">
        המחשבון הוא כלי עזר להערכה בלבד ואינו מהווה ייעוץ פיננסי או התחייבות
        למתן אשראי. אישור המשכנתה בפועל, אחוז המימון וההחזר החודשי נתונים
        לשיקול דעת הבנק ולבדיקת יכולת ההחזר בפועל מול תלוש השכר.
      </p>
    </div>
  );
}

function BorrowerCard({
  title,
  borrower,
  onChange,
}: {
  title: string;
  borrower: Borrower;
  onChange: (patch: Partial<Borrower>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground/80">{title}</h3>
      <Field label="שם">
        <TextInput
          value={borrower.name}
          onChange={(value) => onChange({ name: value })}
        />
      </Field>
      <Field label="מקצוע">
        <TextInput
          value={borrower.profession}
          onChange={(value) => onChange({ profession: value })}
        />
      </Field>
      <Field label="סוג עיסוק">
        <select
          value={borrower.employmentType}
          onChange={(e) =>
            onChange({ employmentType: e.target.value as EmploymentType })
          }
          className="w-full rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-primary"
        >
          {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {borrower.employmentType === "self-employed" && (
        <p className="text-xs text-foreground/50">
          לעצמאים: יש להזין הכנסה נטו ממוצעת כפי שתוכר על ידי הבנק (בד״כ
          ממוצע 2-3 שנים אחרונות).
        </p>
      )}
      <Field label="הכנסה נטו" suffix="₪">
        <NumberInput
          value={borrower.netIncome}
          onChange={(value) => onChange({ netIncome: value })}
          min={0}
        />
      </Field>
      <Field label="התחייבויות חודשיות" suffix="₪">
        <NumberInput
          value={borrower.obligations}
          onChange={(value) => onChange({ obligations: value })}
          min={0}
        />
      </Field>
      <Field label="הכנסות נוספות (ברוטו)" suffix="₪">
        <NumberInput
          value={borrower.additionalIncome}
          onChange={(value) => onChange({ additionalIncome: value })}
          min={0}
        />
      </Field>
      <Field label="התנהלות אשראית">
        <select
          value={borrower.creditConduct}
          onChange={(e) =>
            onChange({ creditConduct: e.target.value as CreditConduct })
          }
          className="w-full rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-primary"
        >
          {Object.entries(CREDIT_CONDUCT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {borrower.creditConduct !== "good" && (
        <p className="text-xs text-amber-600">
          ⚠️ ייתכן שהדבר ישפיע על אישור העסקה בבנק, מעבר לחישוב המספרי.
        </p>
      )}
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

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-primary"
    />
  );
}
