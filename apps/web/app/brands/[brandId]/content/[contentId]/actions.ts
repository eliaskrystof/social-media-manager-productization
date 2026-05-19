"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import { getMediaTypeFromMime, storeLocalMediaFile } from "@/services/local-filesystem-storage";

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
  const postType = readFormValue(formData, "postType") || "post";
  const purpose = readFormValue(formData, "purpose") || "main";
  const sortOrder = parseSortOrder(readFormValue(formData, "sortOrder"));
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
    throw new Error("Publishing output not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.platformVariants)
      .set({
        status,
        postType,
        purpose,
        sortOrder,
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
      action: "publishing_output_updated",
      message: `${variant.platform} ${postType} output updated.`,
      metadata: { platform: variant.platform, postType, purpose, status }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function uploadContentMediaAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const altText = readFormValue(formData, "altText");
  const file = formData.get("media");

  if (!(file instanceof File)) {
    throw new Error("Media file is required.");
  }

  const detail = await getEditableContent(brandId, contentId);
  const currentUser = await getCurrentUser();
  const stored = await storeLocalMediaFile(file, `${detail.brand.workspaceId}/${brandId}/${contentId}`);

  await db.transaction(async (tx) => {
    const [asset] = await tx
      .insert(schema.mediaAssets)
      .values({
        workspaceId: detail.brand.workspaceId,
        brandId,
        uploadedByUserId: currentUser?.id,
        source: "uploaded",
        mediaType: getMediaTypeFromMime(stored.mimeType),
        storageProvider: stored.provider,
        storagePath: stored.relativePath,
        publicUrl: stored.publicUrl,
        filename: stored.filename,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        altText: altText || null,
        metadata: { root: stored.root }
      })
      .returning({ id: schema.mediaAssets.id });

    if (!asset) {
      throw new Error("Media asset could not be created.");
    }

    await tx.insert(schema.contentMedia).values({
      contentItemId: contentId,
      mediaAssetId: asset.id,
      role: "primary",
      sortOrder: 0
    });

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
      action: "media_uploaded",
      message: `${stored.filename} uploaded.`,
      metadata: {
        filename: stored.filename,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.provider
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function assignMediaToOutputAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const mediaAssetId = readFormValue(formData, "mediaAssetId");

  const detail = await getEditableContent(brandId, contentId);
  const [variant] = await db
    .select()
    .from(schema.platformVariants)
    .where(and(eq(schema.platformVariants.id, variantId), eq(schema.platformVariants.contentItemId, contentId)))
    .limit(1);

  if (!variant) {
    throw new Error("Publishing output not found.");
  }

  const [mediaAsset] = await db
    .select()
    .from(schema.mediaAssets)
    .where(and(eq(schema.mediaAssets.id, mediaAssetId), eq(schema.mediaAssets.brandId, brandId)))
    .limit(1);

  if (!mediaAsset) {
    throw new Error("Media asset not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.contentMedia)
      .where(
        and(
          eq(schema.contentMedia.contentItemId, contentId),
          eq(schema.contentMedia.platformVariantId, variant.id),
          eq(schema.contentMedia.role, "primary")
        )
      );

    await tx.insert(schema.contentMedia).values({
      contentItemId: contentId,
      platformVariantId: variant.id,
      mediaAssetId: mediaAsset.id,
      platform: variant.platform,
      role: "primary",
      sortOrder: 0
    });

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
      action: "media_assigned_to_output",
      message: `${mediaAsset.filename ?? "Media"} assigned to ${variant.platform} ${variant.postType}.`,
      metadata: {
        mediaAssetId: mediaAsset.id,
        platformVariantId: variant.id,
        platform: variant.platform,
        postType: variant.postType
      }
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

function parseSortOrder(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function revalidateContentPaths(brandId: string, contentId: string) {
  revalidatePath("/");
  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${contentId}`);
}
