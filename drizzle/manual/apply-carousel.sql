-- Safe to run more than once. Adds carousel slides to draft posts (migration 0004).
ALTER TABLE "draft_posts" ADD COLUMN IF NOT EXISTS "image_urls" text[] DEFAULT '{}' NOT NULL;
