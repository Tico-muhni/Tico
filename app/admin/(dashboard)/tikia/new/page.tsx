import { DOC_TYPE_REGISTRY } from "@/lib/doc-analyzer";
import NewCaseForm from "./new-case-form";

export default function NewCasePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-primary">תיק חדש</h1>
        <p className="text-sm text-foreground/60">
          הגדר תיק חדש ובחר אילו מסמכים נדרשים
        </p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-surface p-5">
        <NewCaseForm docTypes={DOC_TYPE_REGISTRY} />
      </section>
    </div>
  );
}
