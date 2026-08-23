"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tikiaCases, tikiaDocuments } from "@/drizzle/schema";
import { currentUserId } from "@/lib/auth";
import { uploadTikiaDocument } from "@/lib/blob";
import { analyzeDocument, DOC_TYPE_REGISTRY } from "@/lib/doc-analyzer";
import * as snpv from "@/lib/smart-npv";

type ActionResult = { error: string | null; success: string | null };

export async function createCaseAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "לא מחובר", success: null };

  const clientName = String(formData.get("clientName") ?? "").trim();
  if (!clientName) return { error: "יש להזין שם לקוח", success: null };

  const clientPhone = String(formData.get("clientPhone") ?? "").trim() || null;
  const smartNpvClientId =
    String(formData.get("smartNpvClientId") ?? "").trim() || null;
  const caseType = String(formData.get("caseType") ?? "").trim() || null;

  const requiredDocTypes = DOC_TYPE_REGISTRY.map((d) => d.key).filter(
    (key) => formData.get(`doc_${key}`) === "on"
  );

  if (requiredDocTypes.length === 0) {
    return { error: "יש לבחור לפחות סוג מסמך אחד", success: null };
  }

  await db.insert(tikiaCases).values({
    userId,
    clientName,
    clientPhone,
    smartNpvClientId,
    caseType,
    requiredDocTypes,
  });

  revalidatePath("/admin/tikia");
  return { error: null, success: `תיק "${clientName}" נוצר בהצלחה` };
}

export async function uploadDocumentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "לא מחובר", success: null };

  const caseId = String(formData.get("caseId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "יש לבחור קובץ", success: null };
  }

  const caseRow = await db.query.tikiaCases.findFirst({
    where: and(eq(tikiaCases.id, caseId), eq(tikiaCases.userId, userId)),
  });
  if (!caseRow) return { error: "תיק לא נמצא", success: null };

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";

  const fileUrl = await uploadTikiaDocument(buffer, file.name, mimeType);

  const [docRow] = await db
    .insert(tikiaDocuments)
    .values({
      caseId,
      source: "manual",
      status: "analyzing",
      fileUrl,
    })
    .returning({ id: tikiaDocuments.id });

  let analysis;
  try {
    const user = await db.query.users.findFirst({
      where: eq(
        (await import("@/drizzle/schema")).users.id,
        userId
      ),
      columns: { geminiApiKey: true },
    });
    analysis = await analyzeDocument(buffer, mimeType, user?.geminiApiKey);
  } catch (err) {
    await db
      .update(tikiaDocuments)
      .set({
        status: "rejected",
        errorMessage:
          err instanceof Error ? err.message : "שגיאה בזיהוי המסמך",
        processedAt: new Date(),
      })
      .where(eq(tikiaDocuments.id, docRow.id));

    revalidatePath(`/admin/tikia/${caseId}`);
    return { error: `שגיאה בזיהוי: ${err instanceof Error ? err.message : "unknown"}`, success: null };
  }

  await db
    .update(tikiaDocuments)
    .set({
      status: "identified",
      docType: analysis.docType,
      docTypeLabel: analysis.docTypeLabel,
      extractedData: JSON.stringify(analysis.extractedFields),
      processedAt: new Date(),
    })
    .where(eq(tikiaDocuments.id, docRow.id));

  if (caseRow.smartNpvClientId && analysis.docType !== "unknown") {
    try {
      const result = await snpv.saveDocument(caseRow.smartNpvClientId, {
        name: analysis.docTypeLabel,
        fileUrl,
        type: analysis.docType,
      });
      await db
        .update(tikiaDocuments)
        .set({ status: "pushed", smartNpvDocId: result.id })
        .where(eq(tikiaDocuments.id, docRow.id));
    } catch (err) {
      await db
        .update(tikiaDocuments)
        .set({
          status: "push_failed",
          errorMessage:
            err instanceof Error ? err.message : "שגיאה בדחיפה ל-Smart NPV",
        })
        .where(eq(tikiaDocuments.id, docRow.id));
    }
  }

  const allDocs = await db
    .select({ docType: tikiaDocuments.docType })
    .from(tikiaDocuments)
    .where(
      and(
        eq(tikiaDocuments.caseId, caseId),
        eq(tikiaDocuments.status, "identified")
      )
    );
  const receivedTypes = new Set(allDocs.map((d) => d.docType).filter(Boolean));
  const allReceived = caseRow.requiredDocTypes.every((t) =>
    receivedTypes.has(t)
  );
  if (allReceived) {
    await db
      .update(tikiaCases)
      .set({ status: "complete", updatedAt: new Date() })
      .where(eq(tikiaCases.id, caseId));
  }

  revalidatePath(`/admin/tikia/${caseId}`);
  revalidatePath("/admin/tikia");

  const label = analysis.docTypeLabel || "מסמך";
  return {
    error: null,
    success: `${label} זוהה בהצלחה (ביטחון: ${Math.round(analysis.confidence * 100)}%)`,
  };
}

export async function archiveCaseAction(caseId: string) {
  const userId = await currentUserId();
  if (!userId) return;

  await db
    .update(tikiaCases)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(tikiaCases.id, caseId), eq(tikiaCases.userId, userId)));

  revalidatePath("/admin/tikia");
}

export async function retryPushAction(docId: string) {
  const userId = await currentUserId();
  if (!userId) return;

  const doc = await db.query.tikiaDocuments.findFirst({
    where: eq(tikiaDocuments.id, docId),
  });
  if (!doc || doc.status !== "push_failed" || !doc.fileUrl) return;

  const caseRow = await db.query.tikiaCases.findFirst({
    where: and(eq(tikiaCases.id, doc.caseId), eq(tikiaCases.userId, userId)),
  });
  if (!caseRow?.smartNpvClientId) return;

  try {
    const result = await snpv.saveDocument(caseRow.smartNpvClientId, {
      name: doc.docTypeLabel || "מסמך",
      fileUrl: doc.fileUrl,
      type: doc.docType || undefined,
    });
    await db
      .update(tikiaDocuments)
      .set({ status: "pushed", smartNpvDocId: result.id, errorMessage: null })
      .where(eq(tikiaDocuments.id, docId));
  } catch (err) {
    await db
      .update(tikiaDocuments)
      .set({
        errorMessage:
          err instanceof Error ? err.message : "שגיאה בדחיפה ל-Smart NPV",
      })
      .where(eq(tikiaDocuments.id, docId));
  }

  revalidatePath(`/admin/tikia/${doc.caseId}`);
}
