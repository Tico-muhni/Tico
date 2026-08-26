import ImportForm from "./import-form";

export default function ImportPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">ייבוא פוסטים</h1>
        <p className="mt-1 text-sm text-foreground/60">
          העלה תמונות מ-Canva או מכל מקור אחר. ה-AI ייצור כיתובים אנושיים לכל
          תמונה, והפוסטים ייכנסו כטיוטות לאישור.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
