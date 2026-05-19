import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";

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
    }
  | {
      ok: false;
      message: string;
    };

export type BrandListItem = typeof schema.brands.$inferSelect & {
  profile: typeof schema.brandProfiles.$inferSelect | undefined;
  contentCount: number;
};

export type BrandDetail =
  | {
      ok: true;
      brand: typeof schema.brands.$inferSelect;
      profile: typeof schema.brandProfiles.$inferSelect | undefined;
      contentItems: Array<typeof schema.contentItems.$inferSelect>;
    }
  | {
      ok: false;
      message: string;
    };

export type BrandContentItem = typeof schema.contentItems.$inferSelect & {
  variants: Array<typeof schema.platformVariants.$inferSelect>;
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

export async function getAppSummary(): Promise<AppSummary> {
  try {
    const [workspace] = await db.select().from(schema.workspaces).limit(1);
    if (!workspace) {
      return { ok: false, message: "No seeded workspace found." };
    }

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
      user: await getCurrentUser(),
      workspace,
      brands: await getBrands(),
      brandCount: brandCountRow?.value ?? 0,
      contentCount: contentCountRow?.value ?? 0,
      latestActivity,
      latestAutomationRun
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown database error."
    };
  }
}

export async function getBrands(): Promise<BrandListItem[]> {
  const brands = await db.select().from(schema.brands).orderBy(schema.brands.name);

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
  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.id, brandId)).limit(1);
  if (!brand) {
    return { ok: false, message: "Brand not found." };
  }

  const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id)).limit(1);
  const contentItems = await db
    .select()
    .from(schema.contentItems)
    .where(eq(schema.contentItems.brandId, brand.id))
    .orderBy(desc(schema.contentItems.updatedAt));

  return {
    ok: true,
    brand,
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
        .where(eq(schema.platformVariants.contentItemId, contentItem.id));

      return {
        ...contentItem,
        variants
      };
    })
  );

  return {
    ok: true,
    brand: detail.brand,
    contentItems
  };
}
