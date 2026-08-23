import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tikiaCases,
  tikiaDocuments,
  tikiaScanRuns,
} from "@/drizzle/schema";
import * as snpv from "@/lib/smart-npv";

export async function scanAllActiveCases(): Promise<{
  casesScanned: number;
  newDocsDetected: number;
}> {
  const [runRow] = await db
    .insert(tikiaScanRuns)
    .values({ status: "running" })
    .returning({ id: tikiaScanRuns.id });

  let casesScanned = 0;
  let newDocsDetected = 0;

  try {
    const activeCases = await db
      .select()
      .from(tikiaCases)
      .where(eq(tikiaCases.status, "active"));

    for (const c of activeCases) {
      if (!c.smartNpvClientId) continue;
      casesScanned++;

      try {
        const snpvDocs = await snpv.getClientDocumentations(c.smartNpvClientId);

        const existingDocs = await db
          .select({ smartNpvDocId: tikiaDocuments.smartNpvDocId })
          .from(tikiaDocuments)
          .where(eq(tikiaDocuments.caseId, c.id));

        const knownIds = new Set(
          existingDocs.map((d) => d.smartNpvDocId).filter(Boolean)
        );

        for (const sd of snpvDocs) {
          const docId = sd.id ?? sd.documentId;
          if (!docId || knownIds.has(String(docId))) continue;

          await db.insert(tikiaDocuments).values({
            caseId: c.id,
            source: "smart_npv",
            status: "identified",
            docType: sd.type ?? null,
            docTypeLabel: sd.name ?? sd.type ?? null,
            smartNpvDocId: String(docId),
          });
          newDocsDetected++;
        }

        // Retry push_failed documents
        const failedDocs = await db
          .select()
          .from(tikiaDocuments)
          .where(
            and(
              eq(tikiaDocuments.caseId, c.id),
              eq(tikiaDocuments.status, "push_failed")
            )
          );

        for (const fd of failedDocs) {
          if (!fd.fileUrl) continue;
          try {
            const result = await snpv.saveDocument(c.smartNpvClientId, {
              name: fd.docTypeLabel || "מסמך",
              fileUrl: fd.fileUrl,
              type: fd.docType || undefined,
            });
            await db
              .update(tikiaDocuments)
              .set({
                status: "pushed",
                smartNpvDocId: result.id,
                errorMessage: null,
              })
              .where(eq(tikiaDocuments.id, fd.id));
          } catch {
            // leave as push_failed, will retry next scan
          }
        }

        // Check completeness
        const allCaseDocs = await db
          .select({ docType: tikiaDocuments.docType })
          .from(tikiaDocuments)
          .where(
            and(
              eq(tikiaDocuments.caseId, c.id),
              inArray(tikiaDocuments.status, ["identified", "pushed"])
            )
          );
        const receivedTypes = new Set(
          allCaseDocs.map((d) => d.docType).filter(Boolean)
        );
        const allReceived = c.requiredDocTypes.every((t) =>
          receivedTypes.has(t)
        );
        if (allReceived && c.requiredDocTypes.length > 0) {
          await db
            .update(tikiaCases)
            .set({ status: "complete", updatedAt: new Date() })
            .where(eq(tikiaCases.id, c.id));
        }
      } catch {
        // individual case failure — continue scanning others
      }
    }

    await db
      .update(tikiaScanRuns)
      .set({
        status: "success",
        casesScanned,
        newDocsDetected,
      })
      .where(eq(tikiaScanRuns.id, runRow.id));
  } catch (err) {
    await db
      .update(tikiaScanRuns)
      .set({
        status: "failed",
        casesScanned,
        newDocsDetected,
        error: err instanceof Error ? err.message : "Unknown error",
      })
      .where(eq(tikiaScanRuns.id, runRow.id));
    throw err;
  }

  return { casesScanned, newDocsDetected };
}
