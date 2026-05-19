CREATE TABLE "published_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"platform_variant_id" uuid,
	"publication_job_id" uuid,
	"platform" text NOT NULL,
	"post_type" text DEFAULT 'post' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"external_post_id" text,
	"external_url" text,
	"published_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"metrics" jsonb,
	"raw_response" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "published_posts_platform_external_post_unique" UNIQUE("platform","external_post_id")
);
--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_platform_variant_id_platform_variants_id_fk" FOREIGN KEY ("platform_variant_id") REFERENCES "public"."platform_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_publication_job_id_publication_jobs_id_fk" FOREIGN KEY ("publication_job_id") REFERENCES "public"."publication_jobs"("id") ON DELETE no action ON UPDATE no action;