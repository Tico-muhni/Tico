"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { draftPosts, draftEmails } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { uploadDraftImage } from "@/lib/blob";
import { publishToFacebook, publishToInstagram } from "@/lib/meta";
import { sendApprovedDraftEmail } from "@/lib/resend";

type ActionResult = { error: string | null; success: string | null };

async function reviewerEmail() {
  const session = await auth();
  return session?.user?.email ?? "admin";
}

async function applyPostEdits(id: string, formData: FormData) {
  const finalCaptionFacebook = String(formData.get("captionFacebook") ?? "").trim();
  const finalCaptionInstagram = String(formData.get("captionInstagram") ?? "").trim();
  const hashtagsRaw = String(formData.get("hashtags") ?? "").trim();
  const hashtags = hashtagsRaw
    ? hashtagsRaw.split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  const disclaimerConfirmed = formData.get("disclaimerConfirmed") === "on";
  const noGuaranteeConfirmed = formData.get("noGuaranteeConfirmed") === "on";

  let imageUrl: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadDraftImage(file);
  }

  await db
    .update(draftPosts)
    .set({
      finalCaptionFacebook,
      finalCaptionInstagram,
      hashtags,
      disclaimerConfirmed,
      noGuaranteeConfirmed,
      ...(imageUrl ? { imageUrl } : {}),
    })
    .where(eq(draftPosts.id, id));
}

export async function saveDraftPostAction(id: string, formData: FormData) {
  await applyPostEdits(id, formData);
  revalidatePath("/admin/drafts");
}

export async function approveDraftPostAction(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await applyPostEdits(id, formData);

  const post = await db.query.draftPosts.findFirst({
    where: eq(draftPosts.id, id),
  });
  if (!post) return { error: "הטיוטה לא נמצאה", success: null };

  if (!post.disclaimerConfirmed || !post.noGuaranteeConfirmed) {
    return {
      error: "יש לאשר את שני תנאי הציות לפני פרסום",
      success: null,
    };
  }

  const needsImage = post.platform === "instagram" || post.platform === "both";
  if (needsImage && !post.imageUrl) {
    return {
      error: "פרסום לאינסטגרם דורש תמונה - יש להעלות תמונה קודם",
      success: null,
    };
  }

  const reviewer = await reviewerEmail();
  await db
    .update(draftPosts)
    .set({ status: "approved", reviewedBy: reviewer, reviewedAt: new Date() })
    .where(eq(draftPosts.id, id));

  try {
    let facebookPostId: string | undefined;
    let instagramPostId: string | undefined;

    if (post.platform === "facebook" || post.platform === "both") {
      facebookPostId = await publishToFacebook(
        post.finalCaptionFacebook || "",
        post.imageUrl
      );
    }
    if (post.platform === "instagram" || post.platform === "both") {
      instagramPostId = await publishToInstagram(
        post.finalCaptionInstagram || "",
        post.imageUrl!
      );
    }

    await db
      .update(draftPosts)
      .set({
        status: "published",
        publishedAt: new Date(),
        facebookPostId,
        instagramPostId,
        publishError: null,
      })
      .where(eq(draftPosts.id, id));

    revalidatePath("/admin/drafts");
    revalidatePath("/admin/history");
    return { error: null, success: "הפוסט פורסם בהצלחה" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה בפרסום";
    await db
      .update(draftPosts)
      .set({ status: "failed", publishError: message })
      .where(eq(draftPosts.id, id));
    revalidatePath("/admin/drafts");
    revalidatePath("/admin/history");
    return { error: `הפרסום נכשל: ${message}`, success: null };
  }
}

export async function rejectDraftPostAction(id: string, formData: FormData) {
  const reason = String(formData.get("rejectionReason") ?? "").trim() || null;
  const reviewer = await reviewerEmail();
  await db
    .update(draftPosts)
    .set({
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    })
    .where(eq(draftPosts.id, id));
  revalidatePath("/admin/drafts");
}

export async function retryPublishPostAction(id: string) {
  const post = await db.query.draftPosts.findFirst({
    where: eq(draftPosts.id, id),
  });
  if (!post) return;

  try {
    let facebookPostId: string | undefined;
    let instagramPostId: string | undefined;

    if (post.platform === "facebook" || post.platform === "both") {
      facebookPostId = await publishToFacebook(
        post.finalCaptionFacebook || post.aiCaptionFacebook || "",
        post.imageUrl
      );
    }
    if (post.platform === "instagram" || post.platform === "both") {
      instagramPostId = await publishToInstagram(
        post.finalCaptionInstagram || post.aiCaptionInstagram || "",
        post.imageUrl!
      );
    }

    await db
      .update(draftPosts)
      .set({
        status: "published",
        publishedAt: new Date(),
        facebookPostId,
        instagramPostId,
        publishError: null,
      })
      .where(eq(draftPosts.id, id));
  } catch (err) {
    await db
      .update(draftPosts)
      .set({
        status: "failed",
        publishError: err instanceof Error ? err.message : "שגיאה בפרסום",
      })
      .where(eq(draftPosts.id, id));
  }
  revalidatePath("/admin/history");
  revalidatePath("/admin/drafts");
}

async function applyEmailEdits(id: string, formData: FormData) {
  const finalSubject = String(formData.get("subject") ?? "").trim();
  const finalBodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const finalBodyText = String(formData.get("bodyText") ?? "").trim();
  const disclaimerConfirmed = formData.get("disclaimerConfirmed") === "on";
  const noGuaranteeConfirmed = formData.get("noGuaranteeConfirmed") === "on";

  await db
    .update(draftEmails)
    .set({
      finalSubject,
      finalBodyHtml,
      finalBodyText,
      disclaimerConfirmed,
      noGuaranteeConfirmed,
    })
    .where(eq(draftEmails.id, id));
}

export async function saveDraftEmailAction(id: string, formData: FormData) {
  await applyEmailEdits(id, formData);
  revalidatePath("/admin/drafts");
}

export async function approveDraftEmailAction(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await applyEmailEdits(id, formData);

  const email = await db.query.draftEmails.findFirst({
    where: eq(draftEmails.id, id),
  });
  if (!email) return { error: "הטיוטה לא נמצאה", success: null };

  if (!email.disclaimerConfirmed || !email.noGuaranteeConfirmed) {
    return { error: "יש לאשר את שני תנאי הציות לפני שליחה", success: null };
  }

  const reviewer = await reviewerEmail();
  await db
    .update(draftEmails)
    .set({ status: "approved", reviewedBy: reviewer, reviewedAt: new Date() })
    .where(eq(draftEmails.id, id));

  try {
    const result = await sendApprovedDraftEmail(id);
    revalidatePath("/admin/drafts");
    revalidatePath("/admin/history");
    return {
      error: null,
      success: `המייל נשלח ל-${result.recipients} נמענים`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה בשליחה";
    await db
      .update(draftEmails)
      .set({ status: "failed", sendError: message })
      .where(eq(draftEmails.id, id));
    revalidatePath("/admin/drafts");
    revalidatePath("/admin/history");
    return { error: `השליחה נכשלה: ${message}`, success: null };
  }
}

export async function rejectDraftEmailAction(id: string, formData: FormData) {
  const reason = String(formData.get("rejectionReason") ?? "").trim() || null;
  const reviewer = await reviewerEmail();
  await db
    .update(draftEmails)
    .set({
      status: "rejected",
      rejectionReason: reason,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    })
    .where(eq(draftEmails.id, id));
  revalidatePath("/admin/drafts");
}

export async function retrySendEmailAction(id: string) {
  const email = await db.query.draftEmails.findFirst({
    where: eq(draftEmails.id, id),
  });
  if (!email) return;

  try {
    if (email.status === "failed") {
      await db
        .update(draftEmails)
        .set({ status: "approved" })
        .where(eq(draftEmails.id, id));
    }
    await sendApprovedDraftEmail(id);
  } catch (err) {
    await db
      .update(draftEmails)
      .set({
        status: "failed",
        sendError: err instanceof Error ? err.message : "שגיאה בשליחה",
      })
      .where(eq(draftEmails.id, id));
  }
  revalidatePath("/admin/history");
  revalidatePath("/admin/drafts");
}
