"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction, deleteUserAction } from "./actions";

const TEXT = "#1F2A37";
const HELP = "#5B6B62";
const GREEN = "#2E8B57";

export type UserView = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  hasKey: boolean;
  keyHint: string | null;
  briefs: number;
  scans: number;
  isOwner: boolean;
};

export default function UserRow({ user }: { user: UserView }) {
  const [open, setOpen] = useState(false);
  const [resetState, resetForm, resetPending] = useActionState(
    resetPasswordAction,
    { error: null, ok: null }
  );
  const [deleteState, deleteForm, deletePending] = useActionState(
    deleteUserAction,
    { error: null, ok: null }
  );

  const created = new Date(user.createdAt).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      className="rounded-2xl border p-4 shadow-sm"
      style={{ borderColor: "#D5E5DC", backgroundColor: "#ffffff" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold" style={{ color: TEXT }}>
            {user.name || "—"}
            {user.isOwner && (
              <span
                className="mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: GREEN }}
              >
                בעלים
              </span>
            )}
          </p>
          <p dir="ltr" className="truncate text-right text-sm" style={{ color: HELP }}>
            {user.email}
          </p>
        </div>
        <div className="shrink-0 text-left text-xs" style={{ color: HELP }}>
          <p>נרשם: {created}</p>
          <p>
            בריפים: <b style={{ color: TEXT }}>{user.briefs}</b> · סריקות:{" "}
            <b style={{ color: TEXT }}>{user.scans}</b>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {user.hasKey ? (
          <span
            className="rounded-full px-2 py-1 font-semibold"
            style={{ backgroundColor: "#E7F3EC", color: GREEN }}
          >
            מפתח Gemini ✓ {user.keyHint && <span dir="ltr">({user.keyHint})</span>}
          </span>
        ) : (
          <span
            className="rounded-full px-2 py-1 font-semibold"
            style={{ backgroundColor: "#FDECEC", color: "#B4232A" }}
          >
            חסר מפתח Gemini
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-semibold underline"
          style={{ color: GREEN }}
        >
          {open ? "סגור" : "נהל"}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t pt-4" style={{ borderColor: "#EDF2EF" }}>
          <form action={resetForm} className="flex flex-col gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <label className="text-xs font-medium" style={{ color: TEXT }}>
              איפוס סיסמה — הגדר סיסמה חדשה ליועץ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="newPassword"
                minLength={6}
                required
                placeholder="סיסמה חדשה (6+ תווים)"
                dir="ltr"
                style={{ color: TEXT }}
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-left text-sm outline-none focus:border-[#2E8B57]"
              />
              <button
                type="submit"
                disabled={resetPending}
                className="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                {resetPending ? "..." : "עדכן"}
              </button>
            </div>
            {resetState.ok && (
              <p className="text-xs font-semibold" style={{ color: GREEN }}>
                {resetState.ok}
              </p>
            )}
            {resetState.error && (
              <p className="text-xs text-red-600">{resetState.error}</p>
            )}
          </form>

          {!user.isOwner && (
            <form action={deleteForm} className="flex flex-col gap-1">
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                disabled={deletePending}
                className="self-start text-xs font-semibold text-red-600 underline disabled:opacity-60"
                onClick={(e) => {
                  if (!confirm(`למחוק את ${user.email}? כל הבריפים שלו יימחקו.`)) {
                    e.preventDefault();
                  }
                }}
              >
                {deletePending ? "מוחק..." : "מחיקת משתמש"}
              </button>
              {deleteState.error && (
                <p className="text-xs text-red-600">{deleteState.error}</p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
