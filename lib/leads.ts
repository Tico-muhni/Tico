import { z } from "zod";

// Shared definitions for the leads funnel (used by the admin UI, server actions and the API).

export const LEAD_STAGES = ["found", "replied", "conversation", "meeting", "client", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const STAGE_LABELS: Record<LeadStage, string> = {
  found: "נמצא",
  replied: "נענה",
  conversation: "בשיחה",
  meeting: "פגישה",
  client: "לקוח",
  lost: "לא רלוונטי",
};

export const LEAD_TYPES = ["upgrader", "investor", "refinance", "purchase", "lecture", "other"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const TYPE_LABELS: Record<LeadType, string> = {
  upgrader: "משפר דיור",
  investor: "משקיע",
  refinance: "מיחזור",
  purchase: "רכישה",
  lecture: "הרצאה",
  other: "אחר",
};

export const SOURCES = [
  { v: "facebook", label: "פייסבוק" },
  { v: "instagram", label: "אינסטגרם" },
  { v: "site", label: "האתר" },
  { v: "lecture", label: "הרצאה" },
  { v: "partner", label: "שותף" },
  { v: "referral", label: "המלצה" },
  { v: "podcast", label: "פודקאסט" },
  { v: "manual", label: "אחר" },
] as const;

export const SITE_URL = "https://ticofinance.co.il";

// One offer per lead type, and the page on the site that serves it.
export const OFFERS: Partial<Record<LeadType, { label: string; path: string }>> = {
  refinance: { label: "בדיקת כדאיות חינם", path: "/check" },
  upgrader: { label: "שיחה קצרה", path: "/upgraders" },
  investor: { label: "שיחה קצרה", path: "/investors" },
  lecture: { label: "דף הרשמה להרצאה", path: "/lecture/" },
};

export function offerLink(type: LeadType, utm: { source?: string; medium?: string; campaign?: string }): string | null {
  const offer = OFFERS[type];
  if (!offer) return null;
  const q = new URLSearchParams();
  if (utm.source) q.set("utm_source", utm.source);
  if (utm.medium) q.set("utm_medium", utm.medium);
  if (utm.campaign) q.set("utm_campaign", utm.campaign);
  const qs = q.toString();
  return `${SITE_URL}${offer.path}${qs ? `?${qs}` : ""}`;
}

/** wa.me link for an Israeli phone number, or null if it does not look like one. */
export function whatsappLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "972" + d.slice(1);
  return d.length >= 11 && d.length <= 13 ? `https://wa.me/${d}` : null;
}

const short = (max: number) => z.string().trim().max(max);

export const leadInputSchema = z.object({
  name: short(120).min(1),
  phone: short(40).optional().nullable(),
  source: short(40).optional(),
  medium: short(60).optional().nullable(),
  campaign: short(80).optional().nullable(),
  groupName: short(160).optional().nullable(),
  postUrl: short(500).optional().nullable(),
  topic: short(300).optional().nullable(),
  type: z.enum(LEAD_TYPES).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  nextStep: short(200).optional().nullable(),
  nextAt: z.string().datetime({ offset: true }).optional().nullable(),
  value: z.number().int().min(0).max(10_000_000).optional().nullable(),
  notes: short(4000).optional(),
  externalKey: short(200).optional().nullable(),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadPatchSchema = leadInputSchema.partial();
