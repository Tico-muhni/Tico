"use client";

import { useMemo, useState, type ReactNode } from "react";
import { downloadExcel } from "./export";

type EmploymentType = "employee" | "self-employed" | "other";
type CreditConduct = "good" | "notes" | "restricted";

type Borrower = {
  name: string;
  age: number;
  profession: string;
  employmentType: EmploymentType;
  netIncome: number;
  obligations: number;
  additionalIncome: number;
  creditConduct: CreditConduct;
};

const EMPTY_BORROWER: Borrower = {
  name: "",
  age: 35,
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

// כללי המימון וההחזר:
// (1) אחוז המימון המקסימלי (LTV) תלוי בסוג העסקה - ר' TRANSACTION_TYPES.
// (2) הכנסה פנויה = הכנסה נטו פחות התחייבויות קיימות (אם יש).
// (3) יחס החזר - מדיניות העבודה: עד 38% מההכנסה הפנויה. התקרה
//     החוקית לפי הוראת ניהול בנקאי תקין 329 של בנק ישראל היא 50%
//     מההכנסה (מוצגת בנפרד, לצורך התייחסות בלבד - לא המדיניות המומלצת).
const WORKING_PTI_CAP_PERCENT = 38;
const LEGAL_MAX_PTI_PERCENT = 50;

// יכולת המימון מחושבת לפי תמהיל בין שני מסלולי ריבית ממוצעים - צמוד
// מדד ולא צמוד מדד - ולפי תקופות הלוואה סטנדרטיות.
const LINKED_RATE_PERCENT = 3;
const UNLINKED_RATE_PERCENT = 4.7;
const TERM_OPTIONS_YEARS = [15, 20, 25, 30] as const;

type MixOption = {
  id: string;
  label: string;
  linkedShare: number;
};

const MIX_OPTIONS: MixOption[] = [
  { id: "linked-100", label: "100% צמוד מדד", linkedShare: 1 },
  { id: "unlinked-100", label: "100% לא צמוד מדד", linkedShare: 0 },
  {
    id: "linked-34",
    label: "34% צמוד מדד + 66% לא צמוד מדד",
    linkedShare: 0.34,
  },
  {
    id: "linked-66",
    label: "34% לא צמוד מדד + 66% צמוד מדד",
    linkedShare: 0.66,
  },
];

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

// ההחזר החודשי הממוצע-משוקלל עבור כל שקל קרן, לפי תמהיל בין מסלול
// צמוד מדד (LINKED_RATE_PERCENT) למסלול לא צמוד מדד (UNLINKED_RATE_PERCENT).
function blendedPaymentFactor(linkedShare: number, years: number) {
  const linkedFactor = monthlyPaymentForPrincipal(1, LINKED_RATE_PERCENT, years);
  const unlinkedFactor = monthlyPaymentForPrincipal(
    1,
    UNLINKED_RATE_PERCENT,
    years
  );
  return linkedShare * linkedFactor + (1 - linkedShare) * unlinkedFactor;
}

function principalForBlendedPayment(
  payment: number,
  linkedShare: number,
  years: number
) {
  const factor = blendedPaymentFactor(linkedShare, years);
  return factor > 0 ? payment / factor : 0;
}

function paymentForBlendedPrincipal(
  principal: number,
  linkedShare: number,
  years: number
) {
  return principal * blendedPaymentFactor(linkedShare, years);
}

function ptiStatus(percent: number) {
  if (percent <= WORKING_PTI_CAP_PERCENT) {
    return {
      label: "בהתאם למדיניות העבודה (38%)",
      className: "text-[var(--tico-good)]",
    };
  }
  if (percent <= LEGAL_MAX_PTI_PERCENT) {
    return {
      label: "מעל מדיניות העבודה, אך בתוך התקרה החוקית (הוראה 329)",
      className: "text-[var(--tico-warn)]",
    };
  }
  return {
    label: "חורג מהתקרה החוקית לפי הוראה 329",
    className: "text-[var(--tico-critical)]",
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
  const [useManualFinancingPercent, setUseManualFinancingPercent] =
    useState(false);
  const [manualFinancingPercent, setManualFinancingPercent] =
    useState<number>(70);

  // הוצאות נלוות
  const [lawyerFee, setLawyerFee] = useState<number>(0);
  const [brokerFee, setBrokerFee] = useState<number>(0);
  const [purchaseTax, setPurchaseTax] = useState<number>(0);
  const [mortgageAdvisoryFee, setMortgageAdvisoryFee] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);

  // פרטי המשכנתה
  const [mixId, setMixId] = useState<string>(MIX_OPTIONS[2].id);
  const [termYears, setTermYears] = useState<number>(30);

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

  const mix = MIX_OPTIONS.find((option) => option.id === mixId) ?? MIX_OPTIONS[0];

  const activeBorrowersForAge = hasSecondBorrower ? borrowers : [borrowers[0]];
  const oldestBorrowerAge = Math.max(
    ...activeBorrowersForAge.map((b) => b.age)
  );
  const recommendedMaxTerm = clamp(
    RETIREMENT_AGE_CAP - oldestBorrowerAge,
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
    const requiredMortgage = useManualFinancingPercent
      ? propertyValue * (manualFinancingPercent / 100)
      : Math.max(propertyValue - totalAvailableEquity, 0);
    const requiredFinancingPercent = useManualFinancingPercent
      ? manualFinancingPercent
      : propertyValue > 0
        ? (requiredMortgage / propertyValue) * 100
        : 0;

    const totalAssociatedCosts =
      lawyerFee + brokerFee + purchaseTax + mortgageAdvisoryFee + otherFees;

    const ltvCapAmount = propertyValue > 0 ? propertyValue * transactionType.ltv : Infinity;

    // הכנסה פנויה * 38% - מדיניות העבודה (סעיף 2).
    const maxPaymentAtWorkingCap = Math.max(
      disposableIncomeBeforeMortgage * (WORKING_PTI_CAP_PERCENT / 100),
      0
    );
    const capacityAtWorkingCap = principalForBlendedPayment(
      maxPaymentAtWorkingCap,
      mix.linkedShare,
      termYears
    );
    const recommendedMortgage = Math.max(
      Math.min(ltvCapAmount, capacityAtWorkingCap),
      0
    );

    // הכנסה פנויה * 50% - התקרה החוקית (הוראה 329), לצורך התייחסות בלבד.
    const maxPaymentAtLegalCap = Math.max(
      disposableIncomeBeforeMortgage * (LEGAL_MAX_PTI_PERCENT / 100),
      0
    );
    const capacityAtLegalCap = principalForBlendedPayment(
      maxPaymentAtLegalCap,
      mix.linkedShare,
      termYears
    );
    const maxPossibleMortgage = Math.max(
      Math.min(ltvCapAmount, capacityAtLegalCap),
      0
    );

    // טבלת יכולת מימון: לכל תמהיל ריבית ולכל תקופת הלוואה, יכולת ההחזר
    // הגולמית לפי ההכנסה בלבד (מדיניות עבודה של 38% מההכנסה הפנויה) -
    // ללא הגבלת LTV, כדי שההשוואה בין תמהילים ותקופות תהיה אמיתית ולא
    // "שטוחה" בגלל תקרת המימון של נכס ספציפי (המוצגת בנפרד למטה).
    const capacityTable = MIX_OPTIONS.map((option) => ({
      mix: option,
      byTerm: TERM_OPTIONS_YEARS.map((years) =>
        Math.max(
          principalForBlendedPayment(maxPaymentAtWorkingCap, option.linkedShare, years),
          0
        )
      ),
    }));

    const fundingShortfall = Math.max(
      requiredMortgage - maxPossibleMortgage,
      0
    );
    const grantedMortgage = Math.min(requiredMortgage, maxPossibleMortgage);
    const totalCashNeededAtClosing =
      propertyValue - grantedMortgage + totalAssociatedCosts;

    const minMonthlyPayment = paymentForBlendedPrincipal(
      requiredMortgage,
      mix.linkedShare,
      termYears
    );
    const desiredMonthlyPayment = paymentForBlendedPrincipal(
      recommendedMortgage,
      mix.linkedShare,
      termYears
    );
    const maxMonthlyPayment = paymentForBlendedPrincipal(
      maxPossibleMortgage,
      mix.linkedShare,
      termYears
    );

    const actualPtiPercent =
      disposableIncomeBeforeMortgage > 0
        ? (desiredMonthlyPayment / disposableIncomeBeforeMortgage) * 100
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
      capacityTable,
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
    useManualFinancingPercent,
    manualFinancingPercent,
    propertyValue,
    lawyerFee,
    brokerFee,
    purchaseTax,
    mortgageAdvisoryFee,
    otherFees,
    transactionType,
    mix,
    termYears,
  ]);

  const status = ptiStatus(results.actualPtiPercent);
  const hasEnoughData = propertyValue > 0 && results.totalIncome > 0;

  function handlePrintPdf() {
    window.print();
  }

  function handleExportExcel() {
    const active = hasSecondBorrower ? borrowers : [borrowers[0]];
    const now = new Date();
    const dateLabel = now.toLocaleDateString("he-IL");
    // שם קובץ באנגלית בלבד - תווים בעברית ב-download attribute לא
    // נתמכים באופן עקבי בדפדפנים ומובילים לשם קובץ גנרי ללא סיומת.
    const fileDate = now.toISOString().slice(0, 10);

    downloadExcel(`mortgage-calculator-${fileDate}.xlsx`, [
      {
        name: "סיכום",
        rows: [
          ["תאריך", dateLabel],
          ["סוג עסקה", transactionType.label],
          ["שווי נכס נרכש (₪)", propertyValue],
          ["הון עצמי זמין (₪)", results.totalAvailableEquity],
          ["תמהיל מסלולי ריבית", mix.label],
          ["תקופת הלוואה (שנים)", termYears],
          ["סה״כ הכנסה (₪)", results.totalIncome],
          ["סה״כ התחייבויות (₪)", results.totalObligations],
          ["הכנסה פנויה (₪)", results.disposableIncomeBeforeMortgage],
          ["יחס החזר בפועל (%)", Number(results.actualPtiPercent.toFixed(1))],
          ["משכנתה נדרשת לעסקה (₪)", results.requiredMortgage],
          ["אחוז מימון נדרש (%)", Number(results.requiredFinancingPercent.toFixed(1))],
          ["משכנתה מומלצת (₪)", results.recommendedMortgage],
          ["משכנתה מקסימלית אפשרית (₪)", results.maxPossibleMortgage],
          ["החזר חודשי מינימלי (₪)", Math.round(results.minMonthlyPayment)],
          ["החזר חודשי רצוי (₪)", Math.round(results.desiredMonthlyPayment)],
          ["החזר חודשי מקסימלי (₪)", Math.round(results.maxMonthlyPayment)],
          ["סה״כ הוצאות נלוות (₪)", results.totalAssociatedCosts],
          ["סה״כ מזומן נדרש בסגירת העסקה (₪)", Math.round(results.totalCashNeededAtClosing)],
          [
            "הכנסה פנויה אחרי ההחזר הרצוי (₪)",
            Math.round(results.disposableIncomeAfterMortgage),
          ],
        ],
      },
      {
        name: "יכולת מימון",
        rows: [
          ["תמהיל", "15 שנה", "20 שנה", "25 שנה", "30 שנה"],
          ...results.capacityTable.map((row) => [
            row.mix.label,
            ...row.byTerm.map((amount) => Math.round(amount)),
          ]),
        ],
      },
      {
        name: "פרטי לווים",
        rows: [
          [
            "לווה",
            "שם",
            "גיל",
            "מקצוע",
            "סוג עיסוק",
            "הכנסה נטו (₪)",
            "התחייבויות (₪)",
            "הכנסות נוספות (₪)",
            "התנהלות אשראית",
          ],
          ...active.map((borrower, index) => [
            `לווה ${index + 1}`,
            borrower.name,
            borrower.age,
            borrower.profession,
            EMPLOYMENT_TYPE_LABELS[borrower.employmentType],
            borrower.netIncome,
            borrower.obligations,
            borrower.additionalIncome,
            CREDIT_CONDUCT_LABELS[borrower.creditConduct],
          ]),
        ],
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <div>
          <h2 className="text-lg font-semibold text-foreground">פרטי לווים</h2>
          <p className="text-xs text-foreground/50">
            הפרטים משמשים לחישוב בלבד ואינם נשמרים במערכת.
          </p>
        </div>
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

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <h2 className="text-lg font-semibold text-foreground">פרטי הנכס</h2>
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
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={useManualFinancingPercent}
            onChange={(e) => setUseManualFinancingPercent(e.target.checked)}
            className="h-4 w-4"
          />
          הגדרת אחוז מימון נדרש באופן ידני (במקום חישוב לפי הון עצמי)
        </label>
        {useManualFinancingPercent && (
          <Field label="אחוז מימון נדרש" suffix="%">
            <NumberInput
              value={manualFinancingPercent}
              onChange={setManualFinancingPercent}
              min={0}
              max={100}
              step={1}
            />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <h2 className="text-lg font-semibold text-foreground">הוצאות נלוות</h2>
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

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <h2 className="text-lg font-semibold text-foreground">פרטי המשכנתה</h2>
        <p className="text-xs text-foreground/50">
          ריביות ממוצעות לחישוב: {LINKED_RATE_PERCENT}% במסלול צמוד מדד,{" "}
          {UNLINKED_RATE_PERCENT}% במסלול לא צמוד מדד - אינן הצעה מחייבת
          מבנק כלשהו.
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground/80">
            תמהיל מסלולי ריבית
          </span>
          {MIX_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 text-sm text-foreground/80"
            >
              <input
                type="radio"
                name="mix"
                checked={mixId === option.id}
                onChange={() => setMixId(option.id)}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          ))}
        </div>
        <Field label="תקופת הלוואה" suffix="שנים">
          <select
            value={termYears}
            onChange={(e) => setTermYears(Number(e.target.value))}
            className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 outline-none focus:border-primary"
          >
            {TERM_OPTIONS_YEARS.map((years) => (
              <option key={years} value={years}>
                {years} שנה
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-foreground/50">
          לפי הגיל שהוזן, משך ההלוואה המומלץ עד גיל {RETIREMENT_AGE_CAP} הוא{" "}
          {recommendedMaxTerm} שנים.
        </p>
        <p className="text-xs text-foreground/50">
          יחס החזר - עד {WORKING_PTI_CAP_PERCENT}% מההכנסה הפנויה (מדיניות
          העבודה). התקרה החוקית לפי הוראת בנק ישראל 329 היא{" "}
          {LEGAL_MAX_PTI_PERCENT}% מההכנסה הפנויה.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <h2 className="text-lg font-semibold text-foreground">תוצאות ותמהיל</h2>
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
                  <tr className="border-b border-[var(--tico-line-strong)] text-right text-foreground/70">
                    <th className="py-2 pr-2">משכנתה</th>
                    <th className="py-2">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--tico-line)]">
                    <td className="py-2 pr-2">
                      {useManualFinancingPercent
                        ? "נדרשת לעסקה (לפי אחוז מימון ידני)"
                        : "נדרשת לעסקה (מחיר נכס בניכוי הון עצמי זמין)"}
                    </td>
                    <td className="py-2">
                      {currency.format(results.requiredMortgage)} ₪ (
                      {results.requiredFinancingPercent.toFixed(0)}% מימון)
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--tico-line)]">
                    <td className="py-2 pr-2">
                      מומלצת (לפי מדיניות עבודה {WORKING_PTI_CAP_PERCENT}%,{" "}
                      {mix.label}, {termYears} שנה)
                    </td>
                    <td className="py-2">
                      {currency.format(results.recommendedMortgage)} ₪
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--tico-line)]">
                    <td className="py-2 pr-2">
                      מקסימלית אפשרית ({transactionType.label}, תקרת LTV{" "}
                      {Math.round(transactionType.ltv * 100)}% / תקרת החזר{" "}
                      {LEGAL_MAX_PTI_PERCENT}%)
                    </td>
                    <td className="py-2 font-semibold text-foreground">
                      {currency.format(results.maxPossibleMortgage)} ₪
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {results.fundingShortfall > 0 ? (
              <div className="rounded-xl bg-[var(--tico-critical-soft)] px-4 py-3 text-sm text-[var(--tico-critical)]">
                ⚠️ חסר מימון של {currency.format(results.fundingShortfall)} ₪
                - המשכנתה הנדרשת חורגת מהתקרה המקסימלית האפשרית. נדרש הון עצמי
                נוסף, הפחתת שווי הנכס, או הארכת תקופת ההלוואה.
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--tico-good-soft)] px-4 py-3 text-sm text-[var(--tico-good)]">
                ✅ הסכום הנדרש לעסקה מכוסה במסגרת תקרת המימון המקסימלית.
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-foreground/80">
                טבלת יכולת מימון - לפי תמהיל ותקופת הלוואה
              </h3>
              <p className="text-xs text-foreground/50">
                יכולת ההחזר לפי ההכנסה בלבד (מדיניות עבודה של{" "}
                {WORKING_PTI_CAP_PERCENT}% מההכנסה הפנויה), לפי{" "}
                {LINKED_RATE_PERCENT}% ריבית במסלול צמוד מדד ו-
                {UNLINKED_RATE_PERCENT}% במסלול לא צמוד מדד - ללא הגבלת תקרת
                המימון (LTV), שמוצגת בנפרד בטבלה שלמעלה.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--tico-line-strong)] text-right text-foreground/70">
                    <th className="py-2 pr-2">תמהיל</th>
                    {TERM_OPTIONS_YEARS.map((years) => (
                      <th key={years} className="py-2">
                        {years} שנה
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.capacityTable.map((row) => (
                    <tr key={row.mix.id} className="border-b border-[var(--tico-line)]">
                      <td className="py-2 pr-2 font-medium">
                        {row.mix.label}
                      </td>
                      {row.byTerm.map((amount, index) => (
                        <td
                          key={TERM_OPTIONS_YEARS[index]}
                          className={
                            row.mix.id === mixId &&
                            TERM_OPTIONS_YEARS[index] === termYears
                              ? "py-2 font-semibold text-foreground"
                              : "py-2"
                          }
                        >
                          {currency.format(amount)} ₪
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="whitespace-nowrap rounded-full border border-[var(--tico-line-strong)] bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
              >
                ייצוא ל-PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="whitespace-nowrap rounded-full border border-[var(--tico-line-strong)] bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
              >
                ייצוא לאקסל
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 print:hidden">
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
                className="whitespace-nowrap rounded-full border border-[var(--tico-line-strong)] bg-surface px-5 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
              >
                בדיקה מול היועץ ב-WhatsApp
              </a>
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-[var(--tico-line)] bg-surface p-6 shadow-[var(--tico-shadow)]">
        <h2 className="text-lg font-semibold text-foreground">הערות</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 outline-none focus:border-primary"
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
      <Field label="גיל" suffix="שנים">
        <NumberInput
          value={borrower.age}
          onChange={(value) => onChange({ age: value })}
          min={18}
          max={90}
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
          className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 outline-none focus:border-primary"
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
          className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 outline-none focus:border-primary"
        >
          {Object.entries(CREDIT_CONDUCT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {borrower.creditConduct !== "good" && (
        <p className="text-xs text-[var(--tico-warn)]">
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
          warn ? "text-[var(--tico-critical)]" : "text-foreground"
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
      className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 text-left outline-none focus:border-primary"
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
      className="w-full rounded-lg border border-[var(--tico-line-strong)] px-3 py-2 outline-none focus:border-primary"
    />
  );
}
