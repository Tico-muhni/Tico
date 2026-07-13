import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const topicStatusEnum = pgEnum("topic_status", [
  "pending",
  "used",
  "skipped",
]);

export const topicSourceEnum = pgEnum("topic_source", [
  "seed",
  "ai_suggested",
  "manual",
]);

export const postPlatformEnum = pgEnum("post_platform", [
  "facebook",
  "instagram",
  "both",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending_review",
  "approved",
  "rejected",
  "published",
  "sent",
  "failed",
]);

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "active",
  "unsubscribed",
  "bounced",
]);

export const subscriberSourceEnum = pgEnum("subscriber_source", [
  "csv_import",
  "manual",
]);

export const emailSendStatusEnum = pgEnum("email_send_status", [
  "sent",
  "failed",
  "bounced",
]);

export const generationRunStatusEnum = pgEnum("generation_run_status", [
  "running",
  "success",
  "failed",
]);

export const templateTextZoneEnum = pgEnum("template_text_zone", [
  "bottom",
  "top",
  "left",
  "right",
]);

export const templateTextColorEnum = pgEnum("template_text_color", [
  "light",
  "dark",
]);

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  source: topicSourceEnum("source").notNull().default("manual"),
  status: topicStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const draftPosts = pgTable("draft_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  platform: postPlatformEnum("platform").notNull().default("both"),
  aiCaptionFacebook: text("ai_caption_facebook"),
  aiCaptionInstagram: text("ai_caption_instagram"),
  finalCaptionFacebook: text("final_caption_facebook"),
  finalCaptionInstagram: text("final_caption_instagram"),
  hashtags: text("hashtags").array().notNull().default([]),
  overlayHook: text("overlay_hook"),
  overlayCta: text("overlay_cta"),
  overlayClosing: text("overlay_closing"),
  imageUrl: text("image_url"),
  imageSource: text("image_source"),
  status: reviewStatusEnum("status").notNull().default("pending_review"),
  aiModel: text("ai_model"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  disclaimerConfirmed: boolean("disclaimer_confirmed").notNull().default(false),
  noGuaranteeConfirmed: boolean("no_guarantee_confirmed")
    .notNull()
    .default(false),
  facebookPostId: text("facebook_post_id"),
  instagramPostId: text("instagram_post_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishError: text("publish_error"),
});

export const draftEmails = pgTable("draft_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  aiSubject: text("ai_subject"),
  finalSubject: text("final_subject"),
  aiBodyHtml: text("ai_body_html"),
  finalBodyHtml: text("final_body_html"),
  aiBodyText: text("ai_body_text"),
  finalBodyText: text("final_body_text"),
  status: reviewStatusEnum("status").notNull().default("pending_review"),
  aiModel: text("ai_model"),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  disclaimerConfirmed: boolean("disclaimer_confirmed").notNull().default(false),
  noGuaranteeConfirmed: boolean("no_guarantee_confirmed")
    .notNull()
    .default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientsCount: integer("recipients_count"),
  sendError: text("send_error"),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  status: subscriberStatusEnum("status").notNull().default("active"),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  source: subscriberSourceEnum("source").notNull().default("manual"),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

export const emailSends = pgTable("email_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  draftEmailId: uuid("draft_email_id")
    .notNull()
    .references(() => draftEmails.id, { onDelete: "cascade" }),
  subscriberId: uuid("subscriber_id")
    .notNull()
    .references(() => subscribers.id, { onDelete: "cascade" }),
  status: emailSendStatusEnum("status").notNull(),
  providerMessageId: text("provider_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  error: text("error"),
});

export const generationRuns = pgTable("generation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  topicsGenerated: integer("topics_generated").notNull().default(0),
  postsGenerated: integer("posts_generated").notNull().default(0),
  emailsGenerated: integer("emails_generated").notNull().default(0),
  status: generationRunStatusEnum("status").notNull().default("running"),
  error: text("error"),
});

export const imageTemplates = pgTable("image_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull(),
  textZone: templateTextZoneEnum("text_zone").notNull().default("bottom"),
  textColor: templateTextColorEnum("text_color").notNull().default("light"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
