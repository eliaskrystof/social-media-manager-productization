"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@orchard/database";
import { getCurrentWorkspaceContext, slugify } from "@/lib/workspace-context";
import { requireCurrentUser } from "@/lib/current-user";

export async function completeOnboardingAction(formData: FormData) {
  const user = await requireCurrentUser();
  const existingContext = await getCurrentWorkspaceContext();
  const workspaceName = readFormValue(formData, "workspaceName") || `${user.displayName ?? user.email}'s workspace`;
  const brandName = readFormValue(formData, "brandName");

  if (!brandName) {
    redirectWithNotice("error", "Brand required", "Create at least one brand to use the content workflow.");
  }

  const brandId = await db.transaction(async (tx) => {
    let workspaceId = existingContext?.workspace.id;

    if (!workspaceId) {
      const [workspace] = await tx
        .insert(schema.workspaces)
        .values({
          name: workspaceName,
          slug: `${slugify(workspaceName)}-${Date.now().toString(36)}`
        })
        .returning({ id: schema.workspaces.id });

      if (!workspace) {
        throw new Error("Workspace could not be created.");
      }

      workspaceId = workspace.id;

      await tx.insert(schema.workspaceMembers).values({
        role: "owner",
        userId: user.id,
        workspaceId
      });
    }

    const [brand] = await tx
      .insert(schema.brands)
      .values({
        defaultLanguage: readFormValue(formData, "defaultLanguage") || "en",
        name: brandName,
        slug: `${slugify(brandName)}-${Date.now().toString(36)}`,
        websiteUrl: readFormValue(formData, "websiteUrl") || null,
        workspaceId
      })
      .returning({ id: schema.brands.id });

    if (!brand) {
      throw new Error("Brand could not be created.");
    }

    await tx.insert(schema.brandProfiles).values({
      brandId: brand.id,
      contentPillars: parseList(readFormValue(formData, "contentPillars")),
      description: readFormValue(formData, "description") || null,
      forbiddenPhrases: parseList(readFormValue(formData, "forbiddenPhrases")),
      platformRules: createPlatformRules(formData),
      preferredStyle: readFormValue(formData, "preferredStyle") || null,
      productsServices: readFormValue(formData, "productsServices") || null,
      targetAudience: readFormValue(formData, "targetAudience") || null,
      toneOfVoice: readFormValue(formData, "toneOfVoice") || null
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId,
      brandId: brand.id,
      actorUserId: user.id,
      entityType: "brand",
      entityId: brand.id,
      action: "brand_onboarded",
      message: `Created brand profile for ${brandName}.`,
      metadata: { source: "onboarding" }
    });

    return brand.id;
  });

  redirect(`/brands/${brandId}/settings`);
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseList(value: string) {
  const items = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

function createPlatformRules(formData: FormData) {
  return {
    facebook: {
      enabled: formData.get("facebookEnabled") === "on",
      guidance: readFormValue(formData, "facebookRules") || null
    },
    instagram: {
      enabled: formData.get("instagramEnabled") === "on",
      guidance: readFormValue(formData, "instagramRules") || null
    },
    linkedin: {
      enabled: formData.get("linkedinEnabled") === "on",
      guidance: readFormValue(formData, "linkedinRules") || null
    }
  };
}

function redirectWithNotice(kind: "error" | "success", title: string, message: string): never {
  const params = new URLSearchParams({
    actionMessage: message,
    actionNotice: kind,
    actionTitle: title
  });

  redirect(`/onboarding?${params.toString()}`);
}
