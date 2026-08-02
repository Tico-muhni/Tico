"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";

type ApartmentSize = {
  id: number;
  label: string;
  mainSqm: number;
};

const DEFAULT_SIZES: ApartmentSize[] = [
  { id: 1, label: "3 חדרים", mainSqm: 84 },
  { id: 2, label: "4 חדרים", mainSqm: 100 },
  { id: 3, label: "5 חדרים", mainSqm: 115 },
  { id: 4, label: "6 חדרים", mainSqm: 125 },
];

// הנחות קבועות של המחשבון - לא משתנות בין הגרלות, ולכן לא ניתנות לעריכה.
// גודל המרפסת והמחסן כן משתנים בין הגרלות ומוזנים על ידי המשתמש - רק
// אופן החישוב שלהם (המכפיל ממחיר המ״ר) קבוע.
const VAT_PERCENT = 18;
const BALCONY_FACTOR = 0.5;
const STORAGE_FACTOR = 0.25;
const PARKING_PRICE = 70000;
const PARKING_COUNT = 1;

// כללי המימון של מחיר למשתכן (הוראת ניהול בנקאי תקין 329, סעיף 4א):
// אם שווי השוק (המחיר לפני הנחה) עולה על 2.1 מיליון ₪, שווי הנכס לצורך
// המשכנתה הוא הגבוה מבין 2.1 מיליון ₪ לבין מחיר החוזה. המשכנתה עד 75%
// משווי זה, בכפוף למינימום הון עצמי: 60,000 ₪ אם יש מענק מקום, אחרת 100,000 ₪.
const MORTGAGE_PRICE_CAP = 2_100_000;
const MORTGAGE_LTV = 0.75;
const MIN_EQUITY_WITH_GRANT = 60_000;
const MIN_EQUITY_NO_GRANT = 100_000;

// הערכת החזר חודשי - ריבית ממוצעת לדוגמה, לא הצעה מחייבת מבנק כלשהו.
const MORTGAGE_INTEREST_RATE_PERCENT = 4.7;
const MORTGAGE_TERM_YEARS = [20, 25, 30];

const GRANT_OPTIONS = [
  { value: 0, label: "אין מענק (0 ₪)" },
  { value: 40_000, label: "40,000 ₪" },
  { value: 60_000, label: "60,000 ₪" },
];

const currency = new Intl.NumberFormat("he-IL", {
  maximumFractionDigits: 0,
});

function numberInputValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function HelpTip({
  text,
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
}: {
  text: string;
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
}) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pinned) return;
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPinned(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [pinned]);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        aria-label="איפה למצוא את זה באתר ההגרלה"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-foreground/30 text-[10px] font-bold leading-none text-foreground/50 transition-colors hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute top-6 right-0 z-20 w-72 rounded-xl border border-black/10 bg-surface p-3 text-right normal-case shadow-lg"
        >
          <p className="mb-2 text-xs font-normal text-foreground/80">{text}</p>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            className="w-full rounded-lg border border-black/10"
          />
        </div>
      )}
    </span>
  );
}

function calculateEquityAndMortgage(
  contractPrice: number,
  marketValue: number,
  grant: number
) {
  const minEquity = grant > 0 ? MIN_EQUITY_WITH_GRANT : MIN_EQUITY_NO_GRANT;
  const recognizedValue =
    marketValue > MORTGAGE_PRICE_CAP
      ? Math.max(MORTGAGE_PRICE_CAP, contractPrice)
      : marketValue;
  const mortgage = Math.max(
    Math.min(MORTGAGE_LTV * recognizedValue, contractPrice - minEquity),
    0
  );
  return { mortgage, equity: contractPrice - mortgage };
}

function calculateMonthlyPayment(principal: number, years: number) {
  const monthlyRate = MORTGAGE_INTEREST_RATE_PERCENT / 100 / 12;
  const numPayments = years * 12;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
}

export default function LotteryCalculator() {
  // נתוני ההגרלה - משתנים מהגרלה להגרלה
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(25);
  const [discountCap, setDiscountCap] = useState<number>(500000);
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [balconySqm, setBalconySqm] = useState<number>(12);
  const [storageSqm, setStorageSqm] = useState<number>(6);
  const [grant, setGrant] = useState<number>(0);

  const results = useMemo(() => {
    const parkingCost = PARKING_PRICE * PARKING_COUNT;
    const balconySqmEquivalent = balconySqm * BALCONY_FACTOR;
    const storageSqmEquivalent = storageSqm * STORAGE_FACTOR;

    return DEFAULT_SIZES.map((size) => {
      const calcSqm = size.mainSqm + balconySqmEquivalent + storageSqmEquivalent;

      const preDiscountExVat = calcSqm * pricePerSqm;
      const preDiscountIncVat = preDiscountExVat * (1 + VAT_PERCENT / 100);

      const trackA = (discountPercent / 100) * preDiscountIncVat;
      const trackB = discountCap;
      const discount = Math.min(trackA, trackB, preDiscountIncVat);
      const boundBy = trackA <= trackB ? "א׳ (אחוז)" : "ב׳ (תקרה)";

      const finalIncVat = preDiscountIncVat - discount;
      const contractPrice = finalIncVat + parkingCost;

      const { mortgage, equity } = calculateEquityAndMortgage(
        contractPrice,
        preDiscountIncVat,
        grant
      );
      const monthlyPayments = Object.fromEntries(
        MORTGAGE_TERM_YEARS.map((years) => [
          years,
          calculateMonthlyPayment(mortgage, years),
        ])
      ) as Record<number, number>;

      return {
        size,
        calcSqm,
        preDiscountIncVat,
        discount,
        boundBy,
        finalIncVat,
        contractPrice,
        equity,
        mortgage,
        monthlyPayments,
      };
    });
  }, [pricePerSqm, discountPercent, discountCap, balconySqm, storageSqm, grant]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">נתוני ההגרלה</h2>
          <p className="text-xs text-foreground/50">משתנים מהגרלה להגרלה - יש למלא לפי הפרטים באתר.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="מחיר מוצג למ״ר (ללא מע״מ, ללא הצמדה)"
            suffix="₪"
            help={
              <HelpTip
                text={'בעמוד הדירה הספציפית באתר ההגרלה, בכרטיס "מחיר", מופיעה השורה "מחיר למטר" - זה המספר שיש להזין כאן.'}
                imageSrc="/lottery-calculator/price-example.jpg"
                imageAlt="דוגמה לכרטיס מחיר באתר ההגרלה"
                imageWidth={800}
                imageHeight={737}
              />
            }
          >
            <NumberInput
              value={pricePerSqm}
              onChange={setPricePerSqm}
              min={0}
            />
          </Field>
          <Field
            label="אחוז הנחה (מסלול א׳)"
            suffix="%"
            help={
              <HelpTip
                text={'מתחת לכרטיס המחיר, בכרטיס "הערה", כתובה נוסחת ההנחה: הנמוך מבין אחוז מסוים (למשל 25%) לבין תקרה בש״ח. האחוז הוא המספר הזה.'}
                imageSrc="/lottery-calculator/note-example.jpg"
                imageAlt="דוגמה לכרטיס הערה עם נוסחת ההנחה באתר ההגרלה"
                imageWidth={800}
                imageHeight={620}
              />
            }
          >
            <NumberInput
              value={discountPercent}
              onChange={setDiscountPercent}
              min={0}
            />
          </Field>
          <Field
            label="תקרת הנחה מקסימלית (מסלול ב׳)"
            suffix="₪"
            help={
              <HelpTip
                text={'באותו כרטיס "הערה", התקרה בש״ח (למשל 500,000 ₪) היא המספר השני בנוסחת ההנחה - ההנחה בפועל היא הנמוך מבין האחוז לתקרה.'}
                imageSrc="/lottery-calculator/note-example.jpg"
                imageAlt="דוגמה לכרטיס הערה עם נוסחת ההנחה באתר ההגרלה"
                imageWidth={800}
                imageHeight={620}
              />
            }
          >
            <NumberInput value={discountCap} onChange={setDiscountCap} min={0} />
          </Field>
          <Field label="מחיר ייחוס בהערות (מידע בלבד, לא נכנס לחישוב)" suffix="₪">
            <NumberInput
              value={referencePrice}
              onChange={setReferencePrice}
              min={0}
            />
          </Field>
          <Field label="גודל מרפסת" suffix="מ״ר">
            <NumberInput value={balconySqm} onChange={setBalconySqm} min={0} />
          </Field>
          <Field label="גודל מחסן" suffix="מ״ר">
            <NumberInput value={storageSqm} onChange={setStorageSqm} min={0} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">מענק מקום</h2>
        <div className="flex flex-wrap gap-4">
          {GRANT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-foreground/80"
            >
              <input
                type="radio"
                name="grant"
                checked={grant === option.value}
                onChange={() => setGrant(option.value)}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">מחיר דירה</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-right text-foreground/70">
                <th className="py-2 pr-2">גודל</th>
                <th className="py-2">מ״ר לחישוב</th>
                <th className="py-2">מחיר לפני הנחה (כולל מע״מ)</th>
                <th className="py-2">הנחה בפועל</th>
                <th className="py-2">מסלול קובע</th>
                <th className="py-2">מחיר דירה</th>
                <th className="py-2">מחיר חוזה (כולל חניה)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.size.id} className="border-b border-black/5">
                  <td className="py-2 pr-2 font-medium">
                    {row.size.label}
                    <span className="text-foreground/50">
                      {" "}
                      ({row.size.mainSqm} מ״ר)
                    </span>
                  </td>
                  <td className="py-2">{row.calcSqm.toFixed(1)}</td>
                  <td className="py-2">
                    {currency.format(row.preDiscountIncVat)} ₪
                  </td>
                  <td className="py-2">{currency.format(row.discount)} ₪</td>
                  <td className="py-2">{row.boundBy}</td>
                  <td className="py-2">
                    {currency.format(row.finalIncVat)} ₪
                  </td>
                  <td className="py-2 font-semibold text-primary">
                    {currency.format(row.contractPrice)} ₪
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pricePerSqm <= 0 && (
          <p className="text-sm text-foreground/60">
            הזינו מחיר מוצג למ״ר כדי לראות תוצאות.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            הון עצמי ומשכנתא (לפי כללי מחיר למשתכן)
          </h2>
          <p className="text-xs text-foreground/50">
            משכנתא של עד 75% משווי השוק (המחיר לפני הנחה); אם שווי השוק עולה
            על 2.1 מיליון ₪, המשכנתא מבוססת על הגבוה מבין 2.1 מיליון ₪ למחיר
            החוזה. בכפוף למינימום הון עצמי -{" "}
            {currency.format(MIN_EQUITY_WITH_GRANT)} ₪ אם יש מענק מקום,
            אחרת {currency.format(MIN_EQUITY_NO_GRANT)} ₪. ההחזר החודשי
            מוערך לפי ריבית ממוצעת לדוגמה של{" "}
            {MORTGAGE_INTEREST_RATE_PERCENT}% - אינו הצעה מחייבת מבנק כלשהו.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-right text-foreground/70">
                <th className="py-2 pr-2">גודל</th>
                <th className="py-2">מחיר חוזה</th>
                <th className="py-2">הון עצמי נדרש</th>
                <th className="py-2">מענק מקום</th>
                <th className="py-2">גובה משכנתא</th>
                {MORTGAGE_TERM_YEARS.map((years) => (
                  <th key={years} className="py-2">
                    החזר חודשי ל-{years} שנה
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.size.id} className="border-b border-black/5">
                  <td className="py-2 pr-2 font-medium">
                    {row.size.label}
                    <span className="text-foreground/50">
                      {" "}
                      ({row.size.mainSqm} מ״ר)
                    </span>
                  </td>
                  <td className="py-2">{currency.format(row.contractPrice)} ₪</td>
                  <td className="py-2 font-semibold text-primary">
                    {currency.format(row.equity)} ₪
                  </td>
                  <td className="py-2">{currency.format(grant)} ₪</td>
                  <td className="py-2">{currency.format(row.mortgage)} ₪</td>
                  {MORTGAGE_TERM_YEARS.map((years) => (
                    <td key={years} className="py-2">
                      {currency.format(row.monthlyPayments[years])} ₪
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-foreground/50">
        המחשבון הוא כלי עזר להערכה בלבד ואינו מהווה ייעוץ פיננסי. יש לבדוק
        את פרטי ההגרלה המדויקים באתר הרשמי ואת תנאי המימון מול הבנק לפני
        קבלת החלטה.
      </p>
    </div>
  );
}

function Field({
  label,
  suffix,
  help,
  children,
}: {
  label: string;
  suffix?: string;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
      <span className="flex items-center gap-1.5">
        {label}
        {help}
      </span>
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
