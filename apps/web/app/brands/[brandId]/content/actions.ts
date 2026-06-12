"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import { assertBrandAccess } from "@/lib/workspace-context";

export async function createContentItemAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const title = readFormValue(formData, "title") || "Untitled content";
  const brief = readFormValue(formData, "brief");
  const masterContent = readFormValue(formData, "masterContent");
  const requestedLanguage = readFormValue(formData, "language");

  if (!brandId) {
    throw new Error("Brand is required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();
  const language = requestedLanguage || brand.defaultLanguage || "en";

  const contentItemId = await db.transaction(async (tx) => {
    const [contentItem] = await tx
      .insert(schema.contentItems)
      .values({
        workspaceId: brand.workspaceId,
        brandId: brand.id,
        createdByUserId: currentUser?.id,
        title,
        brief: brief || null,
        masterContent: masterContent || null,
        contentType: "post",
        status: "draft",
        source: "manual",
        language
      })
      .returning({ id: schema.contentItems.id });

    if (!contentItem) {
      throw new Error("Content item could not be created.");
    }

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentItem.id,
      action: "content_created",
      message: `Draft content created for ${brand.name}.`,
      metadata: { title, source: "manual", publishingOutputs: 0 }
    });

    return contentItem.id;
  });

  revalidatePath("/");
  revalidatePath(`/brands/${brand.id}`);
  revalidatePath(`/brands/${brand.id}/content`);
  redirect(`/brands/${brand.id}/content/${contentItemId}`);
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
