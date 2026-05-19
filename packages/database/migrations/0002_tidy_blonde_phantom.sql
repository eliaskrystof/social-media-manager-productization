ALTER TABLE "platform_variants" DROP CONSTRAINT "platform_variants_content_platform_unique";--> statement-breakpoint
ALTER TABLE "platform_variants" ADD COLUMN "post_type" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_variants" ADD COLUMN "purpose" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_variants" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;