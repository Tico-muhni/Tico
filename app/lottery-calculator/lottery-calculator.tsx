"use client";

import { useMemo, useState, type ReactNode } from "react";

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
const VAT_PERCENT = 18;
const BALCONY_SQM = 12;
const BALCONY_FACTOR = 0.5;
const STORAGE_SQM = 6;
const STORAGE_FACTOR = 0.25;
const PARKING_PRICE = 70000;
const PARKING_COUNT = 1;

// כללי המימון של מחיר למשתכן: עד 75% מ-2.1 מיליון ₪, ובכפוף למינימום
// 100,000 ₪ הון עצמי. מעל 2.1 מיליון ₪ מחיר חוזה - 75% מהמחיר בפועל.
const MORTGAGE_PRICE_CAP = 2_100_000;
const MORTGAGE_LTV = 0.75;
const MIN_EQUITY = 100_000;

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

function calculateEquityAndMortgage(contractPrice: number) {
  if (contractPrice <= MORTGAGE_PRICE_CAP) {
    const mortgage = Math.max(
      Math.min(MORTGAGE_LTV * MORTGAGE_PRICE_CAP, contractPrice - MIN_EQUITY),
      0
    );
    return { mortgage, equity: contractPrice - mortgage };
  }
  const mortgage = MORTGAGE_LTV * contractPrice;
  return { mortgage, equity: contractPrice - mortgage };
}

export default function LotteryCalculator() {
  // נתוני ההגרלה - משתנים מהגרלה להגרלה
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(25);
  const [discountCap, setDiscountCap] = useState<number>(500000);
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [grant, setGrant] = useState<number>(0);

  // גדלי דירות
  const [sizes, setSizes] = useState<ApartmentSize[]>(DEFAULT_SIZES);
  const [nextId, setNextId] = useState(DEFAULT_SIZES.length + 1);

  function updateSize(id: number, patch: Partial<ApartmentSize>) {
    setSizes((prev) =>
      prev.map((size) => (size.id === id ? { ...size, ...patch } : size))
    );
  }

  function addSize() {
    setSizes((prev) => [
      ...prev,
      { id: nextId, label: `דירה ${prev.length + 1}`, mainSqm: 90 },
    ]);
    setNextId((id) => id + 1);
  }

  function removeSize(id: number) {
    setSizes((prev) => prev.filter((size) => size.id !== id));
  }

  const results = useMemo(() => {
    const parkingCost = PARKING_PRICE * PARKING_COUNT;
    const balconySqmEquivalent = BALCONY_SQM * BALCONY_FACTOR;
    const storageSqmEquivalent = STORAGE_SQM * STORAGE_FACTOR;

    return sizes.map((size) => {
      const calcSqm = size.mainSqm + balconySqmEquivalent + storageSqmEquivalent;

      const preDiscountExVat = calcSqm * pricePerSqm;
      const preDiscountIncVat = preDiscountExVat * (1 + VAT_PERCENT / 100);

      const trackA = (discountPercent / 100) * preDiscountIncVat;
      const trackB = discountCap;
      const discount = Math.min(trackA, trackB, preDiscountIncVat);
      const boundBy = trackA <= trackB ? "א׳ (אחוז)" : "ב׳ (תקרה)";

      const finalIncVat = preDiscountIncVat - discount;
      const contractPrice = finalIncVat + parkingCost;

      const { mortgage, equity } = calculateEquityAndMortgage(contractPrice);
      const netEquityAfterGrant = Math.max(equity - grant, 0);

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
        netEquityAfterGrant,
      };
    });
  }, [sizes, pricePerSqm, discountPercent, discountCap, grant]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">נתוני ההגרלה</h2>
          <p className="text-xs text-foreground/50">משתנים מהגרלה להגרלה - יש למלא לפי הפרטים באתר.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="מחיר מוצג למ״ר (ללא מע״מ, ללא הצמדה)" suffix="₪">
            <NumberInput
              value={pricePerSqm}
              onChange={setPricePerSqm}
              min={0}
            />
          </Field>
          <Field label="אחוז הנחה (מסלול א׳)" suffix="%">
            <NumberInput
              value={discountPercent}
              onChange={setDiscountPercent}
              min={0}
            />
          </Field>
          <Field label="תקרת הנחה מקסימלית (מסלול ב׳)" suffix="₪">
            <NumberInput value={discountCap} onChange={setDiscountCap} min={0} />
          </Field>
          <Field label="מחיר ייחוס בהערות (מידע בלבד, לא נכנס לחישוב)" suffix="₪">
            <NumberInput
              value={referencePrice}
              onChange={setReferencePrice}
              min={0}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            הנחות קבועות של המחשבון
          </h2>
          <p className="text-xs text-foreground/50">
            ערכים קבועים שאינם משתנים בין הגרלות, ולכן נעולים לעריכה.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ConstantItem label="מע״מ" value={`${VAT_PERCENT}%`} />
          <ConstantItem
            label="מרפסת"
            value={`${BALCONY_SQM} מ״ר × ${BALCONY_FACTOR * 100}% ממחיר מ״ר`}
          />
          <ConstantItem
            label="מחסן"
            value={`${STORAGE_SQM} מ״ר × ${STORAGE_FACTOR * 100}% ממחיר מ״ר`}
          />
          <ConstantItem
            label="חניה"
            value={`${currency.format(PARKING_PRICE)} ₪ (${PARKING_COUNT}, מחיר מלא ללא הנחה)`}
          />
        </dl>
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">גדלי דירות</h2>
          <button
            type="button"
            onClick={addSize}
            className="rounded-full border border-primary/30 px-4 py-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            + הוספת גודל
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sizes.map((size) => (
            <div
              key={size.id}
              className="grid grid-cols-[1fr_1fr_auto] items-center gap-3"
            >
              <input
                type="text"
                value={size.label}
                onChange={(e) =>
                  updateSize(size.id, { label: e.target.value })
                }
                className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2">
                <NumberInput
                  value={size.mainSqm}
                  onChange={(v) => updateSize(size.id, { mainSqm: v })}
                  min={0}
                />
                <span className="text-sm text-foreground/60">מ״ר עיקרי</span>
              </div>
              <button
                type="button"
                onClick={() => removeSize(size.id)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-button transition-opacity hover:opacity-80"
                aria-label={`הסרת ${size.label}`}
              >
                הסרה
              </button>
            </div>
          ))}
          {sizes.length === 0 && (
            <p className="text-sm text-foreground/60">
              אין גדלי דירות. הוסיפו גודל כדי לראות תוצאות.
            </p>
          )}
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
            עד 2.1 מיליון ₪ מחיר חוזה: משכנתא של עד 75% מ-2.1 מיליון ₪,
            בכפוף למינימום {currency.format(MIN_EQUITY)} ₪ הון עצמי. מעל 2.1
            מיליון ₪ מחיר חוזה: משכנתא של 75% מהמחיר בפועל.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-right text-foreground/70">
                <th className="py-2 pr-2">גודל</th>
                <th className="py-2">מחיר חוזה</th>
                <th className="py-2">הון עצמי נדרש</th>
                <th className="py-2">מענק מקום</th>
                <th className="py-2">הון עצמי מהכיס (נטו)</th>
                <th className="py-2">גובה משכנתא</th>
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
                  <td className="py-2">{currency.format(row.equity)} ₪</td>
                  <td className="py-2">{currency.format(grant)} ₪</td>
                  <td className="py-2 font-semibold text-primary">
                    {currency.format(row.netEquityAfterGrant)} ₪
                  </td>
                  <td className="py-2">{currency.format(row.mortgage)} ₪</td>
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

function ConstantItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-black/5 bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground/60">{label}</span>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-foreground/50">
          קבוע
        </span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
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
      {label}
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
