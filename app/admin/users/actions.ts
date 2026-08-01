"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { ownerEmail } from "./owner";

async function assertOwner(): Promise<void> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== ownerEmail()) {
    throw new Error("אין הרשאה");
  }
}

export async function resetPasswordAction(
  _prevState: { error: string | null; ok: string | null },
  formData: FormData
): Promise<{ error: string | null; ok: string | null }> {
  await assertOwner();

  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!userId) return { error: "משתמש לא נמצא", ok: null };
  if (newPassword.length < 6) {
    return { error: "הסיסמה החדשה חייבת להיות לפחות 6 תווים", ok: null };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { error: null, ok: "הסיסמה עודכנה" };
}

export async function deleteUserAction(
  _prevState: { error: string | null; ok: string | null },
  formData: FormData
): Promise<{ error: string | null; ok: string | null }> {
  await assertOwner();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "משתמש לא נמצא", ok: null };

  // Don't let the owner delete their own account by mistake.
  const session = await auth();
  if (session?.user?.id === userId) {
    return { error: "אי אפשר למחוק את החשבון שלך", ok: null };
  }

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { error: null, ok: "המשתמש נמחק" };
}
