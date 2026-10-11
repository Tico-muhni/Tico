-- Safe to run more than once. Creates the Canva connection table (migration 0003).
CREATE TABLE IF NOT EXISTS "canva_connections" (
	"user_id" uuid PRIMARY KEY NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
