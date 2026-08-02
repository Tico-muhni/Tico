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

const currency = new Intl.NumberFormat("he-IL", {
  maximumFractionDigits: 0,
});

function numberInputValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export default function LotteryCalculator() {
  // נתוני ההגרלה
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [vatPercent, setVatPercent] = useState<number>(18);
  const [discountPercent, setDiscountPercent] = useState<number>(25);
  const [discountCap, setDiscountCap] = useState<number>(500000);
  const [referencePrice, setReferencePrice] = useState<number>(0);

  // מרפסת / מחסן / חניה
  const [balconySqm, setBalconySqm] = useState<number>(12);
  const [balconyFactor, setBalconyFactor] = useState<number>(0.5);
  const [storageSqm, setStorageSqm] = useState<number>(6);
  const [storageFactor, setStorageFactor] = useState<number>(0.25);
  const [parkingPrice, setParkingPrice] = useState<number>(70000);
  const [parkingCount, setParkingCount] = useState<number>(1);
  const [parkingInDiscount, setParkingInDiscount] = useState(false);

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
    const parkingCost = parkingPrice * parkingCount;

    return sizes.map((size) => {
      const balconySqmEquivalent = balconySqm * balconyFactor;
      const storageSqmEquivalent = storageSqm * storageFactor;
      const parkingSqmEquivalent = parkingInDiscount
        ? parkingCost / (pricePerSqm || 1)
        : 0;

      const calcSqm =
        size.mainSqm +
        balconySqmEquivalent +
        storageSqmEquivalent +
        parkingSqmEquivalent;

      const preDiscountExVat = calcSqm * pricePerSqm;
      const preDiscountIncVat = preDiscountExVat * (1 + vatPercent / 100);

      const trackA = (discountPercent / 100) * preDiscountIncVat;
      const trackB = discountCap;
      const discount = Math.min(trackA, trackB, preDiscountIncVat);
      const boundBy = trackA <= trackB ? "א׳ (אחוז)" : "ב׳ (תקרה)";

      const finalIncVat = preDiscountIncVat - discount;
      const totalWithParking =
        finalIncVat + (parkingInDiscount ? 0 : parkingCost);

      return {
        size,
        calcSqm,
        preDiscountIncVat,
        trackA,
        trackB,
        discount,
        boundBy,
        finalIncVat,
        totalWithParking,
      };
    });
  }, [
    sizes,
    pricePerSqm,
    vatPercent,
    discountPercent,
    discountCap,
    balconySqm,
    balconyFactor,
    storageSqm,
    storageFactor,
    parkingPrice,
    parkingCount,
    parkingInDiscount,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">נתוני ההגרלה</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="מחיר מוצג למ״ר (ללא מע״מ, ללא הצמדה)" suffix="₪">
            <NumberInput
              value={pricePerSqm}
              onChange={setPricePerSqm}
              min={0}
            />
          </Field>
          <Field label="מע״מ" suffix="%">
            <NumberInput value={vatPercent} onChange={setVatPercent} min={0} />
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
        <h2 className="text-lg font-semibold text-primary">
          מרפסת, מחסן וחניה
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="מרפסת - מ״ר">
            <NumberInput value={balconySqm} onChange={setBalconySqm} min={0} />
          </Field>
          <Field label="מרפסת - מכפיל ממחיר מ״ר">
            <NumberInput
              value={balconyFactor}
              onChange={setBalconyFactor}
              min={0}
              max={1}
              step={0.05}
            />
          </Field>
          <Field label="מחסן - מ״ר">
            <NumberInput value={storageSqm} onChange={setStorageSqm} min={0} />
          </Field>
          <Field label="מחסן - מכפיל ממחיר מ״ר">
            <NumberInput
              value={storageFactor}
              onChange={setStorageFactor}
              min={0}
              max={1}
              step={0.05}
            />
          </Field>
          <Field label="מחיר חניה" suffix="₪">
            <NumberInput value={parkingPrice} onChange={setParkingPrice} min={0} />
          </Field>
          <Field label="מספר חניות">
            <NumberInput value={parkingCount} onChange={setParkingCount} min={0} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={parkingInDiscount}
            onChange={(e) => setParkingInDiscount(e.target.checked)}
            className="h-4 w-4"
          />
          לחשב את החניה כחלק מהמחיר שעליו חלה ההנחה (ברירת המחדל: חניה
          נמכרת בנפרד, במחיר מלא, ללא הנחה)
        </label>
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
        <h2 className="text-lg font-semibold text-primary">תוצאות</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-right text-foreground/70">
                <th className="py-2 pr-2">גודל</th>
                <th className="py-2">מ״ר לחישוב</th>
                <th className="py-2">מחיר לפני הנחה (כולל מע״מ)</th>
                <th className="py-2">הנחה בפועל</th>
                <th className="py-2">מסלול קובע</th>
                <th className="py-2">מחיר דירה סופי</th>
                <th className="py-2">סה״כ כולל חניה</th>
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
                    {currency.format(row.totalWithParking)} ₪
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
      <p className="text-xs text-foreground/50">
        המחשבון הוא כלי עזר להערכה בלבד ואינו מהווה ייעוץ פיננסי. יש לבדוק
        את פרטי ההגרלה המדויקים באתר הרשמי לפני קבלת החלטה.
      </p>
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
