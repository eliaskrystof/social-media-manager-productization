import { desc, eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";

type Overview =
  | {
      ok: true;
      message: string;
      workspace: typeof schema.workspaces.$inferSelect;
      brand: typeof schema.brands.$inferSelect;
      profile: typeof schema.brandProfiles.$inferSelect | undefined;
      content: typeof schema.contentItems.$inferSelect;
      variants: Array<typeof schema.platformVariants.$inferSelect>;
      latestRun: typeof schema.automationRuns.$inferSelect | undefined;
    }
  | {
      ok: false;
      message: string;
    };

export async function getLocalOverview(): Promise<Overview> {
  try {
    const [workspace] = await db.select().from(schema.workspaces).limit(1);
    if (!workspace) {
      return { ok: false, message: "No seeded workspace found." };
    }

    const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.workspaceId, workspace.id)).limit(1);
    if (!brand) {
      return { ok: false, message: "No seeded brand found." };
    }

    const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id)).limit(1);
    const [content] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.brandId, brand.id))
      .limit(1);

    if (!content) {
      return { ok: false, message: "No seeded content item found." };
    }

    const variants = await db
      .select()
      .from(schema.platformVariants)
      .where(eq(schema.platformVariants.contentItemId, content.id));

    const [latestRun] = await db
      .select()
      .from(schema.automationRuns)
      .where(eq(schema.automationRuns.contentItemId, content.id))
      .orderBy(desc(schema.automationRuns.createdAt))
      .limit(1);

    return {
      ok: true,
      message: "The app can read seeded workspace and content data.",
      workspace,
      brand,
      profile,
      content,
      variants,
      latestRun
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown database error."
    };
  }
}
