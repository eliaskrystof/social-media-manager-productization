import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@orchard/database";
import { getCurrentUser, requireCurrentUser } from "@/lib/current-user";

export type WorkspaceContext = {
  membership: typeof schema.workspaceMembers.$inferSelect;
  user: typeof schema.users.$inferSelect;
  workspace: typeof schema.workspaces.$inferSelect;
};

export async function getCurrentWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [row] = await db
    .select({
      membership: schema.workspaceMembers,
      workspace: schema.workspaces
    })
    .from(schema.workspaceMembers)
    .innerJoin(schema.workspaces, eq(schema.workspaceMembers.workspaceId, schema.workspaces.id))
    .where(eq(schema.workspaceMembers.userId, user.id))
    .limit(1);

  return row ? { ...row, user } : null;
}

export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const user = await requireCurrentUser();
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    redirect("/onboarding");
  }

  return { ...context, user };
}

export async function assertBrandAccess(brandId: string) {
  const context = await requireWorkspaceContext();
  const [brand] = await db
    .select()
    .from(schema.brands)
    .where(and(eq(schema.brands.id, brandId), eq(schema.brands.workspaceId, context.workspace.id)))
    .limit(1);

  if (!brand) {
    return { context, brand: null };
  }

  return { context, brand };
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "workspace";
}
