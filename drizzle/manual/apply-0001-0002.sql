-- Safe to run more than once. Creates the business-plan tables (migration 0001)
-- and the leads table (migration 0002) if they do not exist yet.
-- Use it when the database was created with `db:push` and has no migration history,
-- e.g. paste it into the Neon SQL editor.

DO $$ BEGIN CREATE TYPE "public"."plan_entry_kind" AS ENUM('day', 'action', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "plan_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"kind" "plan_entry_kind" NOT NULL,
	"key" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_entries_user_kind_key_unique" UNIQUE("user_id","kind","key")
);

DO $$ BEGIN CREATE TYPE "public"."lead_stage" AS ENUM('found', 'replied', 'conversation', 'meeting', 'client', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "public"."lead_type" AS ENUM('upgrader', 'investor', 'refinance', 'purchase', 'lecture', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"source" text DEFAULT 'manual' NOT NULL,
	"medium" text,
	"campaign" text,
	"group_name" text,
	"post_url" text,
	"name" text NOT NULL,
	"phone" text,
	"topic" text,
	"type" "lead_type" DEFAULT 'other' NOT NULL,
	"stage" "lead_stage" DEFAULT 'found' NOT NULL,
	"next_step" text,
	"next_at" timestamp with time zone,
	"value" integer,
	"notes" text DEFAULT '' NOT NULL,
	"external_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_user_external_key_unique" UNIQUE("user_id","external_key")
);
