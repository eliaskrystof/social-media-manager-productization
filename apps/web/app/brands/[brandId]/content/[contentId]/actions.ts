"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";

export async function updateContentItemAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const title = readFormValue(formData, "title") || "Untitled content";
  const brief = readFormValue(formData, "brief");
  const masterContent = readFormValue(formData, "masterContent");
  const language = readFormValue(formData, "language");

  const detail = await getEditableContent(brandId, contentId);
  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.contentItems)
      .set({
        title,
        brief: brief || null,
        masterContent: masterContent || null,
        language: language || null,
        updatedAt: new Date()
      })
      .where(and(eq(schema.contentItems.id, contentId), eq(schema.contentItems.brandId, brandId)));

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "content_updated",
      message: "Master content updated.",
      metadata: { title, language: language || null }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function updatePlatformVariantAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const status = readFormValue(formData, "status") || "draft";
  const headline = readFormValue(formData, "headline");
  const caption = readFormValue(formData, "caption");
  const hashtags = parseTags(readFormValue(formData, "hashtags"));

  const detail = await getEditableContent(brandId, contentId);
  const [variant] = await db
    .select()
    .from(schema.platformVariants)
    .where(and(eq(schema.platformVariants.id, variantId), eq(schema.platformVariants.contentItemId, contentId)))
    .limit(1);

  if (!variant) {
    throw new Error("Platform variant not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.platformVariants)
      .set({
        status,
        headline: headline || null,
        caption: caption || null,
        hashtags,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.contentItems)
      .set({ updatedAt: new Date() })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "platform_variant_updated",
      message: `${variant.platform} variant updated.`,
      metadata: { platform: variant.platform, status }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

async function getEditableContent(brandId: string, contentId: string) {
  if (!brandId || !contentId) {
    throw new Error("Brand and content item are required.");
  }

  const [row] = await db
    .select({
      contentItem: schema.contentItems,
      brand: schema.brands
    })
    .from(schema.contentItems)
    .innerJoin(schema.brands, eq(schema.contentItems.brandId, schema.brands.id))
    .where(and(eq(schema.contentItems.id, contentId), eq(schema.contentItems.brandId, brandId)))
    .limit(1);

  if (!row) {
    throw new Error("Content item not found.");
  }

  return row;
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

  return tags.length > 0 ? tags : null;
}

function revalidateContentPaths(brandId: string, contentId: string) {
  revalidatePath("/");
  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${contentId}`);
}
