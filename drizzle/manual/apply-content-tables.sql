-- Safe to run more than once. Creates the content-module tables (topics, drafts, subscribers,
-- email sends, generation runs, image templates) for databases created without them.

DO $$ BEGIN CREATE TYPE "public"."email_send_status" AS ENUM('sent', 'failed', 'bounced'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."generation_run_status" AS ENUM('running', 'success', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."post_platform" AS ENUM('facebook', 'instagram', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'approved', 'rejected', 'published', 'sent', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."subscriber_source" AS ENUM('csv_import', 'manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."subscriber_status" AS ENUM('active', 'unsubscribed', 'bounced'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."template_text_color" AS ENUM('light', 'dark'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."template_text_zone" AS ENUM('bottom', 'top', 'left', 'right'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."topic_source" AS ENUM('seed', 'ai_suggested', 'manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."topic_status" AS ENUM('pending', 'used', 'skipped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"source" "topic_source" DEFAULT 'manual' NOT NULL,
	"status" "topic_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscribers" (
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

CREATE TABLE IF NOT EXISTS "image_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"image_url" text NOT NULL,
	"text_zone" "template_text_zone" DEFAULT 'bottom' NOT NULL,
	"text_color" "template_text_color" DEFAULT 'light' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"topics_generated" integer DEFAULT 0 NOT NULL,
	"posts_generated" integer DEFAULT 0 NOT NULL,
	"emails_generated" integer DEFAULT 0 NOT NULL,
	"status" "generation_run_status" DEFAULT 'running' NOT NULL,
	"error" text
);

CREATE TABLE IF NOT EXISTS "draft_posts" (
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

CREATE TABLE IF NOT EXISTS "draft_emails" (
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

CREATE TABLE IF NOT EXISTS "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_email_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"status" "email_send_status" NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text
);

DO $$ BEGIN ALTER TABLE "draft_emails" ADD CONSTRAINT "draft_emails_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "draft_posts" ADD CONSTRAINT "draft_posts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_draft_email_id_draft_emails_id_fk" FOREIGN KEY ("draft_email_id") REFERENCES "public"."draft_emails"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
