"use server";

import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscribers } from "@/drizzle/schema";
import { generateUnsubscribeToken, isValidEmail } from "@/lib/subscribers";

export async function addSubscriberAction(
  _prevState: { error: string | null; success: string | null },
  formData: FormData
): Promise<{ error: string | null; success: string | null }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim() || null;
  const lastName = String(formData.get("lastName") ?? "").trim() || null;

  if (!isValidEmail(email)) {
    return { error: "כתובת אימייל לא תקינה", success: null };
  }

  const existing = await db.query.subscribers.findFirst({
    where: eq(subscribers.email, email),
  });
  if (existing) {
    return { error: "כתובת האימייל כבר קיימת ברשימה", success: null };
  }

  await db.insert(subscribers).values({
    email,
    firstName,
    lastName,
    source: "manual",
    unsubscribeToken: generateUnsubscribeToken(),
  });

  revalidatePath("/admin/subscribers");
  return { error: null, success: `${email} נוסף/ה לרשימה` };
}

export async function deactivateSubscriberAction(id: string) {
  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
}

export async function reactivateSubscriberAction(id: string) {
  await db
    .update(subscribers)
    .set({ status: "active", unsubscribedAt: null })
    .where(eq(subscribers.id, id));
  revalidatePath("/admin/subscribers");
}

type CsvImportResult = {
  error: string | null;
  summary: {
    total: number;
    imported: number;
    duplicates: number;
    invalid: number;
  } | null;
};

export async function importCsvAction(
  _prevState: CsvImportResult,
  formData: FormData
): Promise<CsvImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "יש לבחור קובץ CSV", summary: null };
  }

  const text = await file.text();
  let rows: Record<string, string>[];
  try {
    rows = parse(text, {
      columns: (header: string[]) =>
        header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    return { error: "לא ניתן לקרוא את הקובץ - ודא שזהו קובץ CSV תקין", summary: null };
  }

  const emailKey = Object.keys(rows[0] ?? {}).find((k) =>
    ["email", "אימייל", "mail", "דוא\"ל"].includes(k)
  );
  if (!emailKey) {
    return {
      error: 'לא נמצאה עמודת "email" בקובץ. ודא שיש כותרת עמודה בשם email.',
      summary: null,
    };
  }
  const firstNameKey = Object.keys(rows[0] ?? {}).find((k) =>
    ["first_name", "firstname", "שם פרטי", "שם"].includes(k)
  );
  const lastNameKey = Object.keys(rows[0] ?? {}).find((k) =>
    ["last_name", "lastname", "שם משפחה"].includes(k)
  );

  const existingRows = await db
    .select({ email: subscribers.email })
    .from(subscribers);
  const existingEmails = new Set(existingRows.map((r) => r.email));

  let imported = 0;
  let duplicates = 0;
  let invalid = 0;
  const seenInFile = new Set<string>();

  for (const row of rows) {
    const rawEmail = row[emailKey] ?? "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      invalid += 1;
      continue;
    }
    if (existingEmails.has(email) || seenInFile.has(email)) {
      duplicates += 1;
      continue;
    }
    seenInFile.add(email);

    await db.insert(subscribers).values({
      email,
      firstName: firstNameKey ? row[firstNameKey]?.trim() || null : null,
      lastName: lastNameKey ? row[lastNameKey]?.trim() || null : null,
      source: "csv_import",
      unsubscribeToken: generateUnsubscribeToken(),
    });
    imported += 1;
  }

  revalidatePath("/admin/subscribers");

  return {
    error: null,
    summary: { total: rows.length, imported, duplicates, invalid },
  };
}
