CREATE TABLE "platform_variant_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"platform_variant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"revision_type" text NOT NULL,
	"reason" text,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_variant_revisions" ADD CONSTRAINT "platform_variant_revisions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_variant_revisions" ADD CONSTRAINT "platform_variant_revisions_platform_variant_id_platform_variants_id_fk" FOREIGN KEY ("platform_variant_id") REFERENCES "public"."platform_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_variant_revisions" ADD CONSTRAINT "platform_variant_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;