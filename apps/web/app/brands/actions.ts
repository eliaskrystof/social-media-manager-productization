"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@orchard/database";
import { requireWorkspaceContext, slugify } from "@/lib/workspace-context";

export async function createBrandAction(formData: FormData) {
  const { user, workspace } = await requireWorkspaceContext();
  const name = readFormValue(formData, "name");

  if (!name) {
    throw new Error("Brand name is required.");
  }

  const brandId = await db.transaction(async (tx) => {
    const [brand] = await tx
      .insert(schema.brands)
      .values({
        defaultLanguage: readFormValue(formData, "defaultLanguage") || "en",
        name,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        websiteUrl: readFormValue(formData, "websiteUrl") || null,
        workspaceId: workspace.id
      })
      .returning({ id: schema.brands.id });

    if (!brand) {
      throw new Error("Brand could not be created.");
    }

    await tx.insert(schema.brandProfiles).values({
      brandId: brand.id,
      description: readFormValue(formData, "description") || null
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: workspace.id,
      brandId: brand.id,
      actorUserId: user.id,
      entityType: "brand",
      entityId: brand.id,
      action: "brand_created",
      message: `Created brand ${name}.`,
      metadata: { source: "brands_page" }
    });

    return brand.id;
  });

  revalidatePath("/");
  revalidatePath("/brands");
  redirect(`/brands/${brandId}/settings`);
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
