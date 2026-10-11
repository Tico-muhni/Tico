CREATE TYPE "public"."lead_stage" AS ENUM('found', 'replied', 'conversation', 'meeting', 'client', 'lost');--> statement-breakpoint
CREATE TYPE "public"."lead_type" AS ENUM('upgrader', 'investor', 'refinance', 'purchase', 'lecture', 'other');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
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
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;