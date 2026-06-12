CREATE TABLE "integration_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"account_type" text,
	"external_account_id" text,
	"external_account_name" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"scopes" text[],
	"connected_at" timestamp with time zone,
	"last_validated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"secret_ref" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_accounts_brand_platform_external_unique" UNIQUE("brand_id","platform","external_account_id")
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_account_id" uuid NOT NULL,
	"credential_type" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_login_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"password_iterations" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_login_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "platform_variants" ADD COLUMN "integration_account_id" uuid;--> statement-breakpoint
ALTER TABLE "publication_jobs" ADD COLUMN "integration_account_id" uuid;--> statement-breakpoint
ALTER TABLE "integration_accounts" ADD CONSTRAINT "integration_accounts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_login_credentials" ADD CONSTRAINT "user_login_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_variants" ADD CONSTRAINT "platform_variants_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_jobs" ADD CONSTRAINT "publication_jobs_integration_account_id_integration_accounts_id_fk" FOREIGN KEY ("integration_account_id") REFERENCES "public"."integration_accounts"("id") ON DELETE no action ON UPDATE no action;