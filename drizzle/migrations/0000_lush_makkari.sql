CREATE TYPE "public"."case_status" AS ENUM('active', 'complete', 'archived');--> statement-breakpoint
CREATE TYPE "public"."chatbot_conversation_status" AS ENUM('active', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."chatbot_message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."chatbot_message_source" AS ENUM('comment', 'dm', 'story_reply');--> statement-breakpoint
CREATE TYPE "public"."chatbot_trigger_action" AS ENUM('send_dm', 'reply_comment', 'both');--> statement-breakpoint
CREATE TYPE "public"."doc_source" AS ENUM('manual', 'smart_npv', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('received', 'analyzing', 'identified', 'pushed', 'push_failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."email_send_status" AS ENUM('sent', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."generation_run_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."post_platform" AS ENUM('facebook', 'instagram', 'both');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved', 'rejected', 'published', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rtm_brief_status" AS ENUM('new', 'approved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."rtm_run_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscriber_source" AS ENUM('csv_import', 'manual');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('active', 'unsubscribed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."template_text_color" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."template_text_zone" AS ENUM('bottom', 'top', 'left', 'right');--> statement-breakpoint
CREATE TYPE "public"."topic_source" AS ENUM('seed', 'ai_suggested', 'manual');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('pending', 'used', 'skipped');--> statement-breakpoint
CREATE TABLE "chatbot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ig_user_id" text NOT NULL,
	"ig_username" text,
	"status" "chatbot_conversation_status" DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "chatbot_message_direction" NOT NULL,
	"source" "chatbot_message_source" DEFAULT 'dm' NOT NULL,
	"text" text NOT NULL,
	"trigger_id" uuid,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"ig_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ai_smart_replies_enabled" boolean DEFAULT true NOT NULL,
	"story_auto_reply_enabled" boolean DEFAULT true NOT NULL,
	"story_auto_reply_template" text DEFAULT 'תודה על התגובה! 🙏 אשמח לעזור - שלח/י לי הודעה ואחזור אליך בהקדם' NOT NULL,
	"comment_to_dm_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" text NOT NULL,
	"reply_template" text NOT NULL,
	"action" "chatbot_trigger_action" DEFAULT 'send_dm' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"times_triggered" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_triggers_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "draft_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid,
	"ai_subject" text,
	"final_subject" text,
	"ai_body_html" text,
	"final_body_html" text,
	"ai_body_text" text,
	"final_body_text" text,
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"ai_model" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"disclaimer_confirmed" boolean DEFAULT false NOT NULL,
	"no_guarantee_confirmed" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"recipients_count" integer,
	"send_error" text
);
--> statement-breakpoint
CREATE TABLE "draft_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid,
	"platform" "post_platform" DEFAULT 'both' NOT NULL,
	"ai_caption_facebook" text,
	"ai_caption_instagram" text,
	"final_caption_facebook" text,
	"final_caption_instagram" text,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"overlay_hook" text,
	"overlay_cta" text,
	"overlay_closing" text,
	"image_url" text,
	"image_source" text,
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"ai_model" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"disclaimer_confirmed" boolean DEFAULT false NOT NULL,
	"no_guarantee_confirmed" boolean DEFAULT false NOT NULL,
	"facebook_post_id" text,
	"instagram_post_id" text,
	"published_at" timestamp with time zone,
	"publish_error" text
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_email_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"status" "email_send_status" NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"topics_generated" integer DEFAULT 0 NOT NULL,
	"posts_generated" integer DEFAULT 0 NOT NULL,
	"emails_generated" integer DEFAULT 0 NOT NULL,
	"status" "generation_run_status" DEFAULT 'running' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "image_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"image_url" text NOT NULL,
	"text_zone" "template_text_zone" DEFAULT 'bottom' NOT NULL,
	"text_color" "template_text_color" DEFAULT 'light' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rtm_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"news_item_id" uuid NOT NULL,
	"rank" integer DEFAULT 1 NOT NULL,
	"what_happened" text NOT NULL,
	"meaning_for_mortgage_holders" text NOT NULL,
	"closing_question" text NOT NULL,
	"status" "rtm_brief_status" DEFAULT 'new' NOT NULL,
	"ai_model" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rtm_briefs_news_item_id_unique" UNIQUE("news_item_id")
);
--> statement-breakpoint
CREATE TABLE "rtm_news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"run_id" uuid,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone,
	"matched_keywords" text[] DEFAULT '{}' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rtm_news_items_user_url_unique" UNIQUE("user_id","url")
);
--> statement-breakpoint
CREATE TABLE "rtm_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"items_found" integer DEFAULT 0 NOT NULL,
	"briefs_generated" integer DEFAULT 0 NOT NULL,
	"status" "rtm_run_status" DEFAULT 'running' NOT NULL,
	"feed_errors" text[] DEFAULT '{}' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"status" "subscriber_status" DEFAULT 'active' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"source" "subscriber_source" DEFAULT 'manual' NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "tikia_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text,
	"smart_npv_client_id" text,
	"case_type" text,
	"required_doc_types" text[] DEFAULT '{}' NOT NULL,
	"status" "case_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tikia_cases_user_phone_unique" UNIQUE("user_id","client_phone")
);
--> statement-breakpoint
CREATE TABLE "tikia_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"source" "doc_source" DEFAULT 'manual' NOT NULL,
	"status" "doc_status" DEFAULT 'received' NOT NULL,
	"doc_type" text,
	"doc_type_label" text,
	"extracted_data" text,
	"file_url" text,
	"smart_npv_doc_id" text,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tikia_scan_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cases_scanned" integer DEFAULT 0 NOT NULL,
	"new_docs_detected" integer DEFAULT 0 NOT NULL,
	"status" "rtm_run_status" DEFAULT 'running' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"source" "topic_source" DEFAULT 'manual' NOT NULL,
	"status" "topic_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"gemini_api_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_conversation_id_chatbot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chatbot_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD CONSTRAINT "chatbot_messages_trigger_id_chatbot_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."chatbot_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_emails" ADD CONSTRAINT "draft_emails_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_posts" ADD CONSTRAINT "draft_posts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_draft_email_id_draft_emails_id_fk" FOREIGN KEY ("draft_email_id") REFERENCES "public"."draft_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtm_briefs" ADD CONSTRAINT "rtm_briefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtm_briefs" ADD CONSTRAINT "rtm_briefs_news_item_id_rtm_news_items_id_fk" FOREIGN KEY ("news_item_id") REFERENCES "public"."rtm_news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtm_news_items" ADD CONSTRAINT "rtm_news_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtm_news_items" ADD CONSTRAINT "rtm_news_items_run_id_rtm_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rtm_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtm_runs" ADD CONSTRAINT "rtm_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tikia_cases" ADD CONSTRAINT "tikia_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tikia_documents" ADD CONSTRAINT "tikia_documents_case_id_tikia_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."tikia_cases"("id") ON DELETE cascade ON UPDATE no action;