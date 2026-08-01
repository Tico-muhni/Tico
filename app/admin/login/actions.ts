"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  // Only honor a callbackUrl that points at the RTM tool; anything else
  // (e.g. a stale /admin/drafts link to the unprovisioned marketing pages)
  // falls back to /admin/rtm so login never lands on a broken page.
  const requested = String(formData.get("callbackUrl") ?? "");
  const callbackUrl = requested.startsWith("/admin/rtm")
    ? requested
    : "/admin/rtm";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "אימייל או סיסמה שגויים" };
    }
    throw err;
  }
}
