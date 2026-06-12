import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";
import { getCurrentWorkspaceContext } from "@/lib/workspace-context";

export type SchedulerFilters = {
  brandId?: string;
  endDate?: string;
  ideaId?: string;
  platform?: string;
  startDate?: string;
  status?: string;
};

export type ScheduledPostRow = {
  brand: typeof schema.brands.$inferSelect;
  contentItem: typeof schema.contentItems.$inferSelect;
  displayStatus: string;
  integrationAccount: typeof schema.integrationAccounts.$inferSelect | null;
  isDue: boolean;
  job: typeof schema.publicationJobs.$inferSelect;
  latestResult: typeof schema.publicationResults.$inferSelect | undefined;
  phase: "cancelled" | "done" | "due" | "failed" | "publishing" | "scheduled" | "skipped";
  title: string;
  variant: typeof schema.platformVariants.$inferSelect;
};

export type PublishedLogRow = {
  brand: typeof schema.brands.$inferSelect;
  contentItem: typeof schema.contentItems.$inferSelect;
  job: typeof schema.publicationJobs.$inferSelect | null;
  latestResult: typeof schema.publicationResults.$inferSelect | undefined;
  post: typeof schema.publishedPosts.$inferSelect;
  title: string;
  variant: typeof schema.platformVariants.$inferSelect | null;
};

export type PublishedLogGroup = {
  brand: typeof schema.brands.$inferSelect;
  contentItem: typeof schema.contentItems.$inferSelect;
  platforms: Array<{
    platform: string;
    rows: PublishedLogRow[];
  }>;
};

export type SchedulerControlPlane =
  | {
      ok: true;
      brands: Array<typeof schema.brands.$inferSelect>;
      filters: SchedulerFilters;
      ideas: Array<typeof schema.contentItems.$inferSelect>;
      publishedGroups: PublishedLogGroup[];
      publishedRows: PublishedLogRow[];
      scheduledRows: ScheduledPostRow[];
      summary: {
        due: number;
        failed: number;
        published: number;
        scheduled: number;
        totalJobs: number;
      };
      workspace: typeof schema.workspaces.$inferSelect;
    }
  | {
      ok: false;
      message: string;
    };

const allFilterValue = "all";

export async function getSchedulerControlPlane(filters: SchedulerFilters): Promise<SchedulerControlPlane> {
  try {
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return { ok: false, message: "Log in or finish onboarding to create a local workspace." };
    }

    const { workspace } = context;
    const brands = await db
      .select()
      .from(schema.brands)
      .where(eq(schema.brands.workspaceId, workspace.id))
      .orderBy(asc(schema.brands.name));

    const ideas = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.workspaceId, workspace.id))
      .orderBy(desc(schema.contentItems.updatedAt));

    const jobRows = await db
      .select({
        brand: schema.brands,
        contentItem: schema.contentItems,
        integrationAccount: schema.integrationAccounts,
        job: schema.publicationJobs,
        variant: schema.platformVariants
      })
      .from(schema.publicationJobs)
      .innerJoin(schema.contentItems, eq(schema.publicationJobs.contentItemId, schema.contentItems.id))
      .innerJoin(schema.brands, eq(schema.contentItems.brandId, schema.brands.id))
      .innerJoin(schema.platformVariants, eq(schema.publicationJobs.platformVariantId, schema.platformVariants.id))
      .leftJoin(schema.integrationAccounts, eq(schema.publicationJobs.integrationAccountId, schema.integrationAccounts.id))
      .where(eq(schema.contentItems.workspaceId, workspace.id))
      .orderBy(asc(schema.publicationJobs.scheduledFor), desc(schema.publicationJobs.createdAt));

    const resultRows = await db
      .select()
      .from(schema.publicationResults)
      .orderBy(desc(schema.publicationResults.createdAt));
    const latestResults = new Map<string, typeof schema.publicationResults.$inferSelect>();
    const integrationAccounts = await db
      .select()
      .from(schema.integrationAccounts)
      .innerJoin(schema.brands, eq(schema.integrationAccounts.brandId, schema.brands.id))
      .where(eq(schema.brands.workspaceId, workspace.id))
      .orderBy(asc(schema.integrationAccounts.connectedAt), asc(schema.integrationAccounts.createdAt));
    const brandConnectedAccounts = new Map<string, typeof schema.integrationAccounts.$inferSelect>();

    for (const row of integrationAccounts) {
      if (!connectedAccountStatuses.has(row.integration_accounts.status)) {
        continue;
      }

      const key = `${row.integration_accounts.brandId}:${row.integration_accounts.platform}`;

      if (!brandConnectedAccounts.has(key)) {
        brandConnectedAccounts.set(key, row.integration_accounts);
      }
    }

    for (const result of resultRows) {
      if (!latestResults.has(result.publicationJobId)) {
        latestResults.set(result.publicationJobId, result);
      }
    }

    const scheduledRows = jobRows
      .map((row) => {
        const phase = getJobPhase(row.job);
        const explicitIntegrationAccount = row.integrationAccount?.status === "connected" ? row.integrationAccount : null;
        const integrationAccount =
          explicitIntegrationAccount ??
          brandConnectedAccounts.get(`${row.brand.id}:${row.job.platform}`) ??
          null;

        return {
          ...row,
          displayStatus: phase === "due" ? "due" : row.job.status,
          integrationAccount,
          isDue: phase === "due",
          latestResult: latestResults.get(row.job.id),
          phase,
          title: getOutputTitle(row.variant)
        };
      })
      .filter((row) => matchesOperationalFilters(row, filters));

    const publishedRows = await getPublishedRows(workspace.id, latestResults);
    const filteredPublishedRows = publishedRows.filter((row) => matchesPublishedFilters(row, filters));
    const publishedGroups = groupPublishedRows(filteredPublishedRows);

    return {
      ok: true,
      brands,
      filters,
      ideas,
      publishedGroups,
      publishedRows: filteredPublishedRows,
      scheduledRows,
      summary: {
        due: scheduledRows.filter((row) => row.phase === "due").length,
        failed: scheduledRows.filter((row) => row.phase === "failed").length,
        published: filteredPublishedRows.length,
        scheduled: scheduledRows.filter((row) => row.phase === "scheduled").length,
        totalJobs: scheduledRows.length
      },
      workspace
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown scheduler data error."
    };
  }
}

const connectedAccountStatuses = new Set(["connected"]);

async function getPublishedRows(workspaceId: string, latestResults: Map<string, typeof schema.publicationResults.$inferSelect>) {
  const rows = await db
    .select({
      brand: schema.brands,
      contentItem: schema.contentItems,
      job: schema.publicationJobs,
      post: schema.publishedPosts,
      variant: schema.platformVariants
    })
    .from(schema.publishedPosts)
    .innerJoin(schema.contentItems, eq(schema.publishedPosts.contentItemId, schema.contentItems.id))
    .innerJoin(schema.brands, eq(schema.publishedPosts.brandId, schema.brands.id))
    .leftJoin(schema.platformVariants, eq(schema.publishedPosts.platformVariantId, schema.platformVariants.id))
    .leftJoin(schema.publicationJobs, eq(schema.publishedPosts.publicationJobId, schema.publicationJobs.id))
    .where(eq(schema.publishedPosts.workspaceId, workspaceId))
    .orderBy(desc(schema.publishedPosts.publishedAt), desc(schema.publishedPosts.createdAt));

  return rows.map((row) => ({
    ...row,
    latestResult: row.post.publicationJobId ? latestResults.get(row.post.publicationJobId) : undefined,
    title: getPublishedTitle(row.post, row.variant)
  }));
}

function matchesOperationalFilters(row: ScheduledPostRow, filters: SchedulerFilters) {
  return (
    matchesValue(row.brand.id, filters.brandId) &&
    matchesValue(row.job.platform, filters.platform) &&
    matchesValue(row.displayStatus, filters.status) &&
    matchesValue(row.contentItem.id, filters.ideaId) &&
    matchesDateRange(row.job.scheduledFor, filters.startDate, filters.endDate)
  );
}

function matchesPublishedFilters(row: PublishedLogRow, filters: SchedulerFilters) {
  return (
    matchesValue(row.brand.id, filters.brandId) &&
    matchesValue(row.post.platform, filters.platform) &&
    matchesValue(row.post.status, filters.status) &&
    matchesValue(row.contentItem.id, filters.ideaId) &&
    matchesDateRange(row.post.publishedAt ?? row.post.createdAt, filters.startDate, filters.endDate)
  );
}

function matchesValue(actual: string, expected: string | undefined) {
  return !expected || expected === allFilterValue || actual === expected;
}

function matchesDateRange(value: Date | null, startDate: string | undefined, endDate: string | undefined) {
  if (!value) {
    return !startDate && !endDate;
  }

  const time = value.getTime();
  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  return (start === null || time >= start) && (end === null || time <= end);
}

function groupPublishedRows(rows: PublishedLogRow[]) {
  const groups = new Map<string, PublishedLogGroup>();

  for (const row of rows) {
    const groupKey = row.contentItem.id;
    const existingGroup =
      groups.get(groupKey) ??
      ({
        brand: row.brand,
        contentItem: row.contentItem,
        platforms: []
      } satisfies PublishedLogGroup);
    let platformGroup = existingGroup.platforms.find((item) => item.platform === row.post.platform);

    if (!platformGroup) {
      platformGroup = { platform: row.post.platform, rows: [] };
      existingGroup.platforms.push(platformGroup);
    }

    platformGroup.rows.push(row);
    groups.set(groupKey, existingGroup);
  }

  return Array.from(groups.values());
}

function getJobPhase(job: typeof schema.publicationJobs.$inferSelect): ScheduledPostRow["phase"] {
  if (job.status === "published") {
    return "done";
  }

  if (job.status === "failed") {
    return "failed";
  }

  if (job.status === "cancelled") {
    return "cancelled";
  }

  if (job.status === "skipped") {
    return "skipped";
  }

  if (job.status === "publishing") {
    return "publishing";
  }

  if (job.scheduledFor && job.scheduledFor.getTime() <= Date.now()) {
    return "due";
  }

  return "scheduled";
}

function getOutputTitle(variant: typeof schema.platformVariants.$inferSelect) {
  return variant.title || variant.headline || `${titleCase(variant.platform)} ${variant.postType.replaceAll("_", " ")}`;
}

function getPublishedTitle(
  post: typeof schema.publishedPosts.$inferSelect,
  variant: typeof schema.platformVariants.$inferSelect | null
) {
  const metadataTitle = post.metadata && typeof post.metadata.title === "string" ? post.metadata.title : null;
  const metadataHeadline = post.metadata && typeof post.metadata.headline === "string" ? post.metadata.headline : null;

  return metadataTitle || variant?.title || metadataHeadline || variant?.headline || `${titleCase(post.platform)} ${post.postType}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
