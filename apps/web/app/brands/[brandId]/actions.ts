"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";

export async function updateBrandProfileAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");

  if (!brandId) {
    throw new Error("Brand is required.");
  }

  const [brand] = await db.select().from(schema.brands).where(eq(schema.brands.id, brandId)).limit(1);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();
  const contentPillars = parseList(readFormValue(formData, "contentPillars"));
  const forbiddenPhrases = parseList(readFormValue(formData, "forbiddenPhrases"));
  const platformRules = createPlatformRules(formData);
  const languagePreferences = createLanguagePreferences(formData);
  const ctaPreferences = createGuidanceObject(readFormValue(formData, "ctaGuidance"));

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.brandProfiles)
      .values({
        brandId,
        description: readFormValue(formData, "description") || null,
        targetAudience: readFormValue(formData, "targetAudience") || null,
        productsServices: readFormValue(formData, "productsServices") || null,
        toneOfVoice: readFormValue(formData, "toneOfVoice") || null,
        preferredStyle: readFormValue(formData, "preferredStyle") || null,
        forbiddenPhrases,
        contentPillars,
        ctaPreferences,
        languagePreferences,
        platformRules
      })
      .onConflictDoUpdate({
        target: schema.brandProfiles.brandId,
        set: {
          description: readFormValue(formData, "description") || null,
          targetAudience: readFormValue(formData, "targetAudience") || null,
          productsServices: readFormValue(formData, "productsServices") || null,
          toneOfVoice: readFormValue(formData, "toneOfVoice") || null,
          preferredStyle: readFormValue(formData, "preferredStyle") || null,
          forbiddenPhrases,
          contentPillars,
          ctaPreferences,
          languagePreferences,
          platformRules,
          updatedAt: new Date()
        }
      });

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "brand",
      entityId: brandId,
      action: "brand_profile_updated",
      message: "Brand profile updated.",
      metadata: {
        contentPillarCount: contentPillars?.length ?? 0,
        hasPlatformRules: Boolean(platformRules),
        toneOfVoice: readFormValue(formData, "toneOfVoice") || null
      }
    });
  });

  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/settings`);
  redirectWithNotice(brandId, "success", "Brand profile saved", "Brand identity is ready for future AI generation.");
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

function createGuidanceObject(guidance: string) {
  return guidance ? { guidance } : null;
}

function createLanguagePreferences(formData: FormData) {
  const preferences = removeEmptyValues({
    emojiUsage: readFormValue(formData, "emojiUsage"),
    hashtagRules: readFormValue(formData, "hashtagRules"),
    typicalPostLength: readFormValue(formData, "typicalPostLength")
  });

  return Object.keys(preferences).length > 0 ? preferences : null;
}

function createPlatformRules(formData: FormData) {
  const rules = removeEmptyValues({
    facebook: createGuidanceObject(readFormValue(formData, "facebookRules")),
    instagram: createGuidanceObject(readFormValue(formData, "instagramRules")),
    linkedin: createGuidanceObject(readFormValue(formData, "linkedinRules"))
  });

  return Object.keys(rules).length > 0 ? rules : null;
}

function removeEmptyValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (!value) {
        return false;
      }

      if (typeof value === "object" && Object.keys(value).length === 0) {
        return false;
      }

      return true;
    })
  );
}

function redirectWithNotice(brandId: string, kind: "error" | "success", title: string, message: string): never {
  const params = new URLSearchParams({
    actionMessage: message,
    actionNotice: kind,
    actionTitle: title
  });

  redirect(`/brands/${brandId}/settings?${params.toString()}`);
}
