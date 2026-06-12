import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";

export async function resolveIntegrationAccountForJob(brandId: string, variant: typeof schema.platformVariants.$inferSelect) {
  if (variant.integrationAccountId) {
    const [account] = await db
      .select()
      .from(schema.integrationAccounts)
      .where(
        and(
          eq(schema.integrationAccounts.id, variant.integrationAccountId),
          eq(schema.integrationAccounts.brandId, brandId),
          eq(schema.integrationAccounts.platform, variant.platform)
        )
      )
      .limit(1);

    if (account && account.status === "connected") {
      return account;
    }
  }

  const [account] = await db
    .select()
    .from(schema.integrationAccounts)
    .where(
      and(
        eq(schema.integrationAccounts.brandId, brandId),
        eq(schema.integrationAccounts.platform, variant.platform),
        eq(schema.integrationAccounts.status, "connected")
      )
    )
    .orderBy(asc(schema.integrationAccounts.connectedAt), asc(schema.integrationAccounts.createdAt))
    .limit(1);

  return account ?? null;
}
