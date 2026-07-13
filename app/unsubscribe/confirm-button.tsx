"use client";

import { useState, useTransition } from "react";
import { confirmUnsubscribeAction } from "./actions";

export default function ConfirmButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; email?: string } | null>(
    null
  );

  if (result?.ok) {
    return (
      <p className="text-emerald-700">
        {result.email} הוסר/ה בהצלחה מרשימת התפוצה. לא יישלחו אליך עוד מיילים
        שיווקיים.
      </p>
    );
  }
  if (result && !result.ok) {
    return <p className="text-button">הקישור אינו תקין או שכבר נעשה בו שימוש.</p>;
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await confirmUnsubscribeAction(token);
          setResult(res);
        })
      }
      className="rounded-full bg-button px-6 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "מבצע..." : "אישור הסרה מרשימת התפוצה"}
    </button>
  );
}
