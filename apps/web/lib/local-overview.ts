import { desc, eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";
import { getCurrentWorkspaceContext } from "@/lib/workspace-context";

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
    const context = await getCurrentWorkspaceContext();

    if (!context) {
      return { ok: false, message: "Log in or finish onboarding to create a local workspace." };
    }

    const { workspace } = context;
    const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.workspaceId, workspace.id)).limit(1);
    if (!brand) {
      return { ok: false, message: "No brand found for the current workspace." };
    }

    const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brand.id)).limit(1);
    const [content] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.brandId, brand.id))
      .limit(1);

    if (!content) {
      return { ok: false, message: "No content item found for the current workspace." };
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
      message: "The app can read the current workspace and content data.",
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
