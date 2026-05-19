import { relations } from "drizzle-orm";
import {
  bigint,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider"),
  authProviderUserId: text("auth_provider_user_id"),
  ...timestamps
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  status: text("status").default("active").notNull(),
  ...timestamps
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    role: text("role").notNull(),
    ...timestamps
  },
  (table) => ({
    workspaceUserUnique: unique("workspace_members_workspace_user_unique").on(table.workspaceId, table.userId)
  })
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
    name: text("name").notNull(),
    slug: text("slug"),
    websiteUrl: text("website_url"),
    defaultLanguage: text("default_language"),
    status: text("status").default("active").notNull(),
    ...timestamps
  },
  (table) => ({
    workspaceSlugUnique: unique("brands_workspace_slug_unique").on(table.workspaceId, table.slug)
  })
);

export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").references(() => brands.id).notNull().unique(),
  description: text("description"),
  targetAudience: text("target_audience"),
  productsServices: text("products_services"),
  toneOfVoice: text("tone_of_voice"),
  preferredStyle: text("preferred_style"),
  forbiddenPhrases: text("forbidden_phrases").array(),
  contentPillars: text("content_pillars").array(),
  ctaPreferences: jsonb("cta_preferences").$type<Record<string, unknown>>(),
  languagePreferences: jsonb("language_preferences").$type<Record<string, unknown>>(),
  approvalRules: jsonb("approval_rules").$type<Record<string, unknown>>(),
  publishingFrequency: jsonb("publishing_frequency").$type<Record<string, unknown>>(),
  platformRules: jsonb("platform_rules").$type<Record<string, unknown>>(),
  ...timestamps
});

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  brandId: uuid("brand_id").references(() => brands.id).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  title: text("title"),
  masterContent: text("master_content"),
  brief: text("brief"),
  contentType: text("content_type").default("post").notNull(),
  status: text("status").default("draft").notNull(),
  source: text("source").default("manual").notNull(),
  language: text("language"),
  targetAudience: text("target_audience"),
  contentPillars: text("content_pillars").array(),
  generationContext: jsonb("generation_context").$type<Record<string, unknown>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true })
});

export const platformVariants = pgTable(
  "platform_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id").references(() => contentItems.id).notNull(),
    platform: text("platform").notNull(),
    status: text("status").default("draft").notNull(),
    caption: text("caption"),
    headline: text("headline"),
    credits: text("credits"),
    hashtags: text("hashtags").array(),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    language: text("language"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    platformOptions: jsonb("platform_options").$type<Record<string, unknown>>(),
    aiModel: text("ai_model"),
    generationPromptVersion: text("generation_prompt_version"),
    ...timestamps
  },
  (table) => ({
    contentPlatformUnique: unique("platform_variants_content_platform_unique").on(table.contentItemId, table.platform)
  })
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  source: text("source").notNull(),
  mediaType: text("media_type").notNull(),
  storageProvider: text("storage_provider").notNull(),
  storageBucket: text("storage_bucket"),
  storagePath: text("storage_path"),
  publicUrl: text("public_url"),
  externalUrl: text("external_url"),
  filename: text("filename"),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: numeric("duration_seconds"),
  altText: text("alt_text"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ...timestamps
});

export const contentMedia = pgTable("content_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id).notNull(),
  platformVariantId: uuid("platform_variant_id").references(() => platformVariants.id),
  mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id).notNull(),
  platform: text("platform"),
  role: text("role"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id).notNull(),
  platformVariantId: uuid("platform_variant_id").references(() => platformVariants.id),
  requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  status: text("status").default("pending").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true })
});

export const publicationJobs = pgTable("publication_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id).notNull(),
  platformVariantId: uuid("platform_variant_id").references(() => platformVariants.id).notNull(),
  platform: text("platform").notNull(),
  status: text("status").default("draft").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  queuedAt: timestamp("queued_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  idempotencyKey: text("idempotency_key").unique(),
  lastError: text("last_error"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  ...timestamps
});

export const publicationResults = pgTable("publication_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicationJobId: uuid("publication_job_id").references(() => publicationJobs.id).notNull(),
  platform: text("platform").notNull(),
  externalPostId: text("external_post_id"),
  externalUrl: text("external_url"),
  rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
  status: text("status").notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const automationRuns = pgTable("automation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  contentItemId: uuid("content_item_id").references(() => contentItems.id),
  platformVariantId: uuid("platform_variant_id").references(() => platformVariants.id),
  publicationJobId: uuid("publication_job_id").references(() => publicationJobs.id),
  runType: text("run_type").notNull(),
  provider: text("provider").notNull(),
  externalRunId: text("external_run_id"),
  status: text("status").notNull(),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  message: text("message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers)
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  brands: many(brands),
  contentItems: many(contentItems)
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [brands.workspaceId],
    references: [workspaces.id]
  }),
  profile: one(brandProfiles),
  contentItems: many(contentItems)
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [contentItems.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [contentItems.brandId],
    references: [brands.id]
  }),
  variants: many(platformVariants),
  media: many(contentMedia),
  approvals: many(approvals),
  automationRuns: many(automationRuns)
}));
