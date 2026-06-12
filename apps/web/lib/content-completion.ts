import { eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";

type CompleteContentItemIfAllOutputsPublishedInput = {
  actorUserId?: string | null;
  completedAt?: Date;
  contentId: string;
};

export async function completeContentItemIfAllOutputsPublished({
  actorUserId,
  completedAt = new Date(),
  contentId
}: CompleteContentItemIfAllOutputsPublishedInput) {
  const [contentItem] = await db
    .select()
    .from(schema.contentItems)
    .where(eq(schema.contentItems.id, contentId))
    .limit(1);

  if (!contentItem || contentItem.status === "completed" || contentItem.status === "archived") {
    return false;
  }

  const outputs = await db
    .select({ id: schema.platformVariants.id, status: schema.platformVariants.status })
    .from(schema.platformVariants)
    .where(eq(schema.platformVariants.contentItemId, contentId));

  if (outputs.length === 0 || outputs.some((output) => output.status !== "published")) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.contentItems)
      .set({
        status: "completed",
        updatedAt: completedAt
      })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.activityLogs).values({
      workspaceId: contentItem.workspaceId,
      brandId: contentItem.brandId,
      actorUserId: actorUserId ?? null,
      entityType: "content_item",
      entityId: contentId,
      action: "content_auto_completed_after_publish",
      message: "Content workflow completed after all outputs published.",
      metadata: {
        outputCount: outputs.length,
        reason: "all_outputs_published",
        status: "completed"
      }
    });
  });

  return true;
}
