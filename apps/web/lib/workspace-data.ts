import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import { assertBrandAccess, getCurrentWorkspaceContext, requireWorkspaceContext } from "@/lib/workspace-context";

export type AppSummary =
  | {
      ok: true;
      message: string;
      user: Awaited<ReturnType<typeof getCurrentUser>>;
      workspace: typeof schema.workspaces.$inferSelect;
      brands: BrandListItem[];
      brandCount: number;
      contentCount: number;
      latestActivity: typeof schema.activityLogs.$inferSelect | undefined;
      latestAutomationRun: typeof schema.automationRuns.$inferSelect | undefined;
      latestContentItem: ContinueContentItem | undefined;
    }
  | {
      ok: false;
      message: string;
    };

export type BrandListItem = typeof schema.brands.$inferSelect & {
  profile: typeof schema.brandProfiles.$inferSelect | undefined;
  contentCount: number;
};

export type ContinueContentItem = {
  brand: typeof schema.brands.$inferSelect;
  contentItem: typeof schema.contentItems.$inferSelect;
  activity: typeof schema.activityLogs.$inferSelect | undefined;
};

export type BrandDetail =
  | {
      ok: true;
      brand: typeof schema.brands.$inferSelect;
      integrationAccounts: Array<typeof schema.integrationAccounts.$inferSelect>;
      profile: typeof schema.brandProfiles.$inferSelect | undefined;
      contentItems: Array<typeof schema.contentItems.$inferSelect>;
    }
  | {
      ok: false;
      message: string;
    };

export type BrandContentItem = typeof schema.contentItems.$inferSelect & {
  variants: Array<typeof schema.platformVariants.$inferSelect>;
  latestActivity: typeof schema.activityLogs.$inferSelect | undefined;
  latestAutomationRun: typeof schema.automationRuns.$inferSelect | undefined;
  publicationJobCount: number;
};

export type BrandContentList =
  | {
      ok: true;
      brand: typeof schema.brands.$inferSelect;
      contentItems: BrandContentItem[];
    }
  | {
      ok: false;
      message: string;
    };

export type ContentDetail =
  | {
      ok: true;
      brand: typeof schema.brands.$inferSelect;
      integrationAccounts: Array<typeof schema.integrationAccounts.$inferSelect>;
      profile: typeof schema.brandProfiles.$inferSelect | undefined;
      contentItem: typeof schema.contentItems.$inferSelect;
      variants: Array<typeof schema.platformVariants.$inferSelect>;
      media: Array<typeof schema.contentMedia.$inferSelect & { asset: typeof schema.mediaAssets.$inferSelect }>;
      outputMedia: Array<typeof schema.contentMedia.$inferSelect & { asset: typeof schema.mediaAssets.$inferSelect }>;
      approvals: Array<typeof schema.approvals.$inferSelect>;
      publicationJobs: Array<typeof schema.publicationJobs.$inferSelect>;
      publishedPosts: Array<typeof schema.publishedPosts.$inferSelect>;
      outputRevisions: Array<typeof schema.platformVariantRevisions.$inferSelect>;
      automationRuns: Array<typeof schema.automationRuns.$inferSelect>;
      activityLogs: Array<typeof schema.activityLogs.$inferSelect>;
    }
  | {
      ok: false;
      message: string;
    };

export async function getAppSummary(): Promise<AppSummary> {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return { ok: false, message: "Log in or finish onboarding to create a local workspace." };
    }

    const { user: currentUser, workspace } = context;

    const [brandCountRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(schema.brands)
      .where(eq(schema.brands.workspaceId, workspace.id));

    const [contentCountRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.workspaceId, workspace.id));

    const [latestActivity] = await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.workspaceId, workspace.id))
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(1);

    const [latestAutomationRun] = await db
      .select()
      .from(schema.automationRuns)
      .where(eq(schema.automationRuns.workspaceId, workspace.id))
      .orderBy(desc(schema.automationRuns.createdAt))
      .limit(1);

    return {
      ok: true,
      message: "The local workspace is ready.",
      user: currentUser,
      workspace,
      brands: await getBrands(),
      brandCount: brandCountRow?.value ?? 0,
      contentCount: contentCountRow?.value ?? 0,
      latestActivity,
      latestAutomationRun,
      latestContentItem: await getLatestContentItem(workspace.id, currentUser?.id)
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown database error."
    };
  }
}

async function getLatestContentItem(workspaceId: string, userId: string | undefined): Promise<ContinueContentItem | undefined> {
  if (userId) {
    const [activity] = await db
      .select()
      .from(schema.activityLogs)
      .where(
        and(
          eq(schema.activityLogs.workspaceId, workspaceId),
          eq(schema.activityLogs.actorUserId, userId),
          eq(schema.activityLogs.entityType, "content_item")
        )
      )
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(1);

    if (activity?.entityId) {
      const [row] = await db
        .select({
          contentItem: schema.contentItems,
          brand: schema.brands
        })
        .from(schema.contentItems)
        .innerJoin(schema.brands, eq(schema.contentItems.brandId, schema.brands.id))
        .where(and(eq(schema.contentItems.workspaceId, workspaceId), eq(schema.contentItems.id, activity.entityId)))
        .limit(1);

      if (row) {
        return { ...row, activity };
      }
    }
  }

  const [row] = await db
    .select({
      contentItem: schema.contentItems,
      brand: schema.brands
    })
    .from(schema.contentItems)
    .innerJoin(schema.brands, eq(schema.contentItems.brandId, schema.brands.id))
    .where(eq(schema.contentItems.workspaceId, workspaceId))
    .orderBy(desc(schema.contentItems.updatedAt))
    .limit(1);

  return row ? { ...row, activity: undefined } : undefined;
}

export async function getBrands(): Promise<BrandListItem[]> {
  const { workspace } = await requireWorkspaceContext();
  const brands = await db
    .select()
    .from(schema.brands)
    .where(eq(schema.brands.workspaceId, workspace.id))
    .orderBy(schema.brands.name);

  return Promise.all(
    brands.map(async (brand) => {
      const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id));
      const [contentCountRow] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(schema.contentItems)
        .where(eq(schema.contentItems.brandId, brand.id));

      return {
        ...brand,
        profile,
        contentCount: contentCountRow?.value ?? 0
      };
    })
  );
}

export async function getBrandDetail(brandId: string): Promise<BrandDetail> {
  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    return { ok: false, message: "Brand not found." };
  }

  const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id)).limit(1);
  const integrationAccounts = await db
    .select()
    .from(schema.integrationAccounts)
    .where(eq(schema.integrationAccounts.brandId, brand.id))
    .orderBy(asc(schema.integrationAccounts.platform), asc(schema.integrationAccounts.externalAccountName));
  const contentItems = await db
    .select()
    .from(schema.contentItems)
    .where(eq(schema.contentItems.brandId, brand.id))
    .orderBy(desc(schema.contentItems.updatedAt));

  return {
    ok: true,
    brand,
    integrationAccounts,
    profile,
    contentItems
  };
}

export async function getBrandContentList(brandId: string): Promise<BrandContentList> {
  const detail = await getBrandDetail(brandId);
  if (!detail.ok) {
    return detail;
  }

  const contentItems = await Promise.all(
    detail.contentItems.map(async (contentItem) => {
      const variants = await db
        .select()
        .from(schema.platformVariants)
        .where(eq(schema.platformVariants.contentItemId, contentItem.id))
        .orderBy(asc(schema.platformVariants.sortOrder), asc(schema.platformVariants.platform));

      const [latestActivity] = await db
        .select()
        .from(schema.activityLogs)
        .where(and(eq(schema.activityLogs.entityType, "content_item"), eq(schema.activityLogs.entityId, contentItem.id)))
        .orderBy(desc(schema.activityLogs.createdAt))
        .limit(1);

      const [latestAutomationRun] = await db
        .select()
        .from(schema.automationRuns)
        .where(eq(schema.automationRuns.contentItemId, contentItem.id))
        .orderBy(desc(schema.automationRuns.createdAt))
        .limit(1);

      const [publicationJobCountRow] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(schema.publicationJobs)
        .where(eq(schema.publicationJobs.contentItemId, contentItem.id));

      return {
        ...contentItem,
        variants,
        latestActivity,
        latestAutomationRun,
        publicationJobCount: publicationJobCountRow?.value ?? 0
      };
    })
  );

  return {
    ok: true,
    brand: detail.brand,
    contentItems
  };
}

export async function getContentDetail(brandId: string, contentId: string): Promise<ContentDetail> {
  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    return { ok: false, message: "Brand not found." };
  }

  const [contentItem] = await db
    .select()
    .from(schema.contentItems)
    .where(and(eq(schema.contentItems.id, contentId), eq(schema.contentItems.brandId, brand.id)))
    .limit(1);

  if (!contentItem) {
    return { ok: false, message: "Content item not found." };
  }

  const variants = await db
    .select()
    .from(schema.platformVariants)
    .where(eq(schema.platformVariants.contentItemId, contentItem.id))
    .orderBy(asc(schema.platformVariants.sortOrder), asc(schema.platformVariants.platform));

  const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id)).limit(1);
  const integrationAccounts = await db
    .select()
    .from(schema.integrationAccounts)
    .where(eq(schema.integrationAccounts.brandId, brand.id))
    .orderBy(asc(schema.integrationAccounts.platform), asc(schema.integrationAccounts.externalAccountName));

  const mediaRows = await db
    .select({
      relation: schema.contentMedia,
      asset: schema.mediaAssets
    })
    .from(schema.contentMedia)
    .innerJoin(schema.mediaAssets, eq(schema.contentMedia.mediaAssetId, schema.mediaAssets.id))
    .where(and(eq(schema.contentMedia.contentItemId, contentItem.id), isNull(schema.contentMedia.platformVariantId)))
    .orderBy(schema.contentMedia.sortOrder);

  const outputMediaRows = await db
    .select({
      relation: schema.contentMedia,
      asset: schema.mediaAssets
    })
    .from(schema.contentMedia)
    .innerJoin(schema.mediaAssets, eq(schema.contentMedia.mediaAssetId, schema.mediaAssets.id))
    .where(and(eq(schema.contentMedia.contentItemId, contentItem.id), isNotNull(schema.contentMedia.platformVariantId)))
    .orderBy(schema.contentMedia.sortOrder);

  const approvals = await db
    .select()
    .from(schema.approvals)
    .where(eq(schema.approvals.contentItemId, contentItem.id))
    .orderBy(desc(schema.approvals.createdAt));

  const publicationJobs = await db
    .select()
    .from(schema.publicationJobs)
    .where(eq(schema.publicationJobs.contentItemId, contentItem.id))
    .orderBy(asc(schema.publicationJobs.scheduledFor), desc(schema.publicationJobs.createdAt));

  const publishedPosts = await db
    .select()
    .from(schema.publishedPosts)
    .where(eq(schema.publishedPosts.contentItemId, contentItem.id))
    .orderBy(desc(schema.publishedPosts.createdAt));

  const outputRevisions = await db
    .select()
    .from(schema.platformVariantRevisions)
    .where(eq(schema.platformVariantRevisions.contentItemId, contentItem.id))
    .orderBy(desc(schema.platformVariantRevisions.createdAt))
    .limit(30);

  const automationRuns = await db
    .select()
    .from(schema.automationRuns)
    .where(eq(schema.automationRuns.contentItemId, contentItem.id))
    .orderBy(desc(schema.automationRuns.createdAt))
    .limit(10);

  const activityLogs = await db
    .select()
    .from(schema.activityLogs)
    .where(and(eq(schema.activityLogs.entityType, "content_item"), eq(schema.activityLogs.entityId, contentItem.id)))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(10);

  return {
    ok: true,
    brand,
    integrationAccounts,
    profile,
    contentItem,
    variants,
    media: mediaRows.map((row) => ({ ...row.relation, asset: row.asset })),
    outputMedia: outputMediaRows.map((row) => ({ ...row.relation, asset: row.asset })),
    approvals,
    publicationJobs,
    publishedPosts,
    outputRevisions,
    automationRuns,
    activityLogs
  };
}
