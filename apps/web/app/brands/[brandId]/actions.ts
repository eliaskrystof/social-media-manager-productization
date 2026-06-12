"use server";

import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import { createSecretRef, encryptLocalCredential, hasExplicitCredentialEncryptionKey } from "@/lib/integration-credentials";
import { assertBrandAccess } from "@/lib/workspace-context";

export async function updateBrandProfileAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");

  if (!brandId) {
    throw new Error("Brand is required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();
  const contentPillars = parseList(readFormValue(formData, "contentPillars"));
  const forbiddenPhrases = parseList(readFormValue(formData, "forbiddenPhrases"));
  const platformRules = createPlatformRules(formData);
  const languagePreferences = createLanguagePreferences(formData);
  const ctaPreferences = createGuidanceObject(readFormValue(formData, "ctaGuidance"));
  const publishingFrequency = createPublishingFrequency(formData);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.brands)
      .set({
        defaultLanguage: readFormValue(formData, "defaultLanguage") || brand.defaultLanguage,
        name: readFormValue(formData, "brandName") || brand.name,
        updatedAt: new Date(),
        websiteUrl: readFormValue(formData, "websiteUrl") || null
      })
      .where(eq(schema.brands.id, brandId));

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
        publishingFrequency,
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
          publishingFrequency,
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
        hasScheduleDefaults: Boolean(publishingFrequency),
        toneOfVoice: readFormValue(formData, "toneOfVoice") || null
      }
    });
  });

  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/settings`);
  redirectWithNotice(brandId, "success", "Brand profile saved", "Brand identity is ready for future AI generation.");
}

export async function upsertIntegrationAccountAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const accountId = readFormValue(formData, "accountId");
  const platform = readFormValue(formData, "platform");
  const externalAccountId = readFormValue(formData, "externalAccountId");
  const externalAccountName = readFormValue(formData, "externalAccountName");
  const credentialValue = readFormValue(formData, "credentialValue");

  if (!brandId || !platform || !externalAccountId || !externalAccountName) {
    throw new Error("Brand, platform, external ID, and display name are required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  if (credentialValue && !hasExplicitCredentialEncryptionKey()) {
    redirectWithNotice(
      brandId,
      "error",
      "Credential not saved",
      "Set LOCAL_CREDENTIAL_ENCRYPTION_KEY in .env.local and restart the dev server before storing platform tokens."
    );
  }

  const currentUser = await getCurrentUser();
  const scopes = parseList(readFormValue(formData, "scopes"));
  const expiresAt = parseOptionalDate(readFormValue(formData, "expiresAt"));
  const requestedStatus = normalizeConnectorStatus(readFormValue(formData, "status"));
  const hasStoredCredential = accountId ? await hasCredentialReference(accountId, brand.id) : false;
  const status = getConnectionStatus({ credentialValue, expiresAt, hasStoredCredential, requestedStatus });
  const accountType = getPlatformAccountType(platform);
  const credentialType = getPlatformCredentialType(platform);

  await db.transaction(async (tx) => {
    const secretRef = credentialValue ? createSecretRef(platform, externalAccountId) : undefined;
    const values = {
      accountType,
      connectedAt: status === "connected" ? new Date() : null,
      expiresAt,
      externalAccountId,
      externalAccountName,
      lastValidatedAt: status === "connected" ? new Date() : null,
      metadata: {
        credentialProvenance: credentialValue ? { source: "manual" } : null,
        notes: readFormValue(formData, "notes") || null,
        requiredCredentialType: credentialType,
        safeCredentialHandling: "Credentials are encrypted server-side in integration_credentials or referenced by secret_ref."
      },
      platform,
      scopes,
      secretRef,
      status
    };

    const [existingPlatformAccount] = accountId
      ? []
      : await tx
          .select({ id: schema.integrationAccounts.id })
          .from(schema.integrationAccounts)
          .where(and(eq(schema.integrationAccounts.brandId, brand.id), eq(schema.integrationAccounts.platform, platform)))
          .orderBy(asc(schema.integrationAccounts.createdAt))
          .limit(1);
    const targetAccountId = accountId || existingPlatformAccount?.id;

    const [account] = targetAccountId
      ? await tx
          .update(schema.integrationAccounts)
          .set({
            ...values,
            secretRef: secretRef ?? undefined,
            updatedAt: new Date()
          })
          .where(and(eq(schema.integrationAccounts.id, targetAccountId), eq(schema.integrationAccounts.brandId, brand.id)))
          .returning({ id: schema.integrationAccounts.id })
      : await tx
          .insert(schema.integrationAccounts)
          .values({
            brandId: brand.id,
            ...values
          })
          .returning({ id: schema.integrationAccounts.id });

    if (!account) {
      throw new Error("Integration account could not be saved.");
    }

    if (credentialValue) {
      await tx.insert(schema.integrationCredentials).values({
        credentialType,
        encryptedValue: encryptLocalCredential(credentialValue),
        expiresAt,
        integrationAccountId: account.id
      });
    }

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      actorUserId: currentUser?.id,
      entityType: "integration_account",
      entityId: account.id,
      action: "integration_account_saved",
      message: `${titleCase(platform)} connection record saved for ${externalAccountName}.`,
      metadata: {
        hasCredential: Boolean(credentialValue),
        credentialType,
        platform,
        status
      }
    });

    if (status === "connected") {
      await tx
        .update(schema.integrationAccounts)
        .set({
          connectedAt: null,
          status: "disabled",
          updatedAt: new Date()
        })
        .where(
          and(
            eq(schema.integrationAccounts.brandId, brand.id),
            eq(schema.integrationAccounts.platform, platform),
            ne(schema.integrationAccounts.id, account.id)
          )
        );

      const unresolvedVariants = await tx
        .select({ id: schema.platformVariants.id })
        .from(schema.platformVariants)
        .innerJoin(schema.contentItems, eq(schema.platformVariants.contentItemId, schema.contentItems.id))
        .where(
          and(
            eq(schema.contentItems.brandId, brand.id),
            eq(schema.platformVariants.platform, platform),
            isNull(schema.platformVariants.integrationAccountId)
          )
        );
      const variantIds = unresolvedVariants.map((variant) => variant.id);

      if (variantIds.length > 0) {
        await tx
          .update(schema.platformVariants)
          .set({
            integrationAccountId: account.id,
            updatedAt: new Date()
          })
          .where(inArray(schema.platformVariants.id, variantIds));

        await tx
          .update(schema.publicationJobs)
          .set({
            integrationAccountId: account.id,
            updatedAt: new Date()
          })
          .where(
            and(
              isNull(schema.publicationJobs.integrationAccountId),
              eq(schema.publicationJobs.platform, platform),
              inArray(schema.publicationJobs.platformVariantId, variantIds),
              inArray(schema.publicationJobs.status, ["draft", "scheduled", "queued"])
            )
          );
      }
    }
  });

  revalidatePath(`/brands/${brandId}/settings`);
  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath("/scheduler");
  redirectWithNotice(brandId, "success", "Connection saved", `${titleCase(platform)} can now be used for scheduled job routing.`);
}

export async function disableIntegrationAccountAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const accountId = readFormValue(formData, "accountId");

  if (!brandId || !accountId) {
    throw new Error("Brand and account are required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.integrationAccounts)
      .set({
        status: "disabled",
        updatedAt: new Date()
      })
      .where(and(eq(schema.integrationAccounts.id, accountId), eq(schema.integrationAccounts.brandId, brand.id)));

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      actorUserId: currentUser?.id,
      entityType: "integration_account",
      entityId: accountId,
      action: "integration_account_disabled",
      message: "Connection disabled.",
      metadata: { source: "manual_security_action" }
    });
  });

  revalidatePath(`/brands/${brandId}/settings`);
  redirectWithNotice(brandId, "success", "Connection disabled", "The connection will not be used for live publishing.");
}

export async function removeIntegrationCredentialAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const accountId = readFormValue(formData, "accountId");

  if (!brandId || !accountId) {
    throw new Error("Brand and account are required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx.delete(schema.integrationCredentials).where(eq(schema.integrationCredentials.integrationAccountId, accountId));
    await tx
      .update(schema.integrationAccounts)
      .set({
        lastValidatedAt: new Date(),
        secretRef: null,
        status: "needs_attention",
        updatedAt: new Date()
      })
      .where(and(eq(schema.integrationAccounts.id, accountId), eq(schema.integrationAccounts.brandId, brand.id)));

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      actorUserId: currentUser?.id,
      entityType: "integration_account",
      entityId: accountId,
      action: "integration_credential_removed",
      message: "Stored credential removed from this connection.",
      metadata: { source: "manual_security_action" }
    });
  });

  revalidatePath(`/brands/${brandId}/settings`);
  redirectWithNotice(brandId, "success", "Credential removed", "The account needs a replacement credential before live publishing.");
}

export async function deleteIntegrationAccountAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const accountId = readFormValue(formData, "accountId");

  if (!brandId || !accountId) {
    throw new Error("Brand and account are required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.platformVariants)
      .set({
        integrationAccountId: null,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.integrationAccountId, accountId));

    await tx
      .update(schema.publicationJobs)
      .set({
        integrationAccountId: null,
        updatedAt: new Date()
      })
      .where(eq(schema.publicationJobs.integrationAccountId, accountId));

    await tx.delete(schema.integrationCredentials).where(eq(schema.integrationCredentials.integrationAccountId, accountId));
    await tx
      .delete(schema.integrationAccounts)
      .where(and(eq(schema.integrationAccounts.id, accountId), eq(schema.integrationAccounts.brandId, brand.id)));

    await tx.insert(schema.activityLogs).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      actorUserId: currentUser?.id,
      entityType: "integration_account",
      entityId: accountId,
      action: "integration_account_deleted",
      message: "Connection record and stored credentials removed.",
      metadata: { source: "manual_security_action" }
    });
  });

  revalidatePath(`/brands/${brandId}/settings`);
  revalidatePath("/scheduler");
  redirectWithNotice(brandId, "success", "Connection deleted", "The account record was removed and scheduled jobs will show a missing account until another connection is added.");
}

export async function validateIntegrationAccountAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const accountId = readFormValue(formData, "accountId");

  if (!brandId || !accountId) {
    throw new Error("Brand and account are required.");
  }

  const { brand } = await assertBrandAccess(brandId);

  if (!brand) {
    throw new Error("Brand not found.");
  }

  const [account] = await db
    .select()
    .from(schema.integrationAccounts)
    .where(and(eq(schema.integrationAccounts.id, accountId), eq(schema.integrationAccounts.brandId, brand.id)))
    .limit(1);

  if (!account) {
    throw new Error("Integration account not found.");
  }

  const [credential] = await db
    .select({ id: schema.integrationCredentials.id })
    .from(schema.integrationCredentials)
    .where(eq(schema.integrationCredentials.integrationAccountId, account.id))
    .limit(1);
  const now = new Date();
  const nextStatus = account.status === "disabled" ? "disabled" : account.expiresAt && account.expiresAt <= now ? "expired" : credential || account.secretRef ? "connected" : "needs_attention";

  await db.transaction(async (tx) => {
    await tx
      .update(schema.integrationAccounts)
      .set({
        lastValidatedAt: now,
        status: nextStatus,
        updatedAt: now
      })
      .where(eq(schema.integrationAccounts.id, account.id));

    await tx.insert(schema.automationRuns).values({
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      runType: "validate_credentials",
      provider: "app_server",
      status: nextStatus === "connected" ? "succeeded" : "failed",
      input: {
        accountId: account.id,
        platform: account.platform
      },
      output: {
        status: nextStatus
      },
      error: nextStatus === "connected" ? null : "Local validation requires a credential reference and a non-expired account.",
      startedAt: now,
      finishedAt: now
    });
  });

  revalidatePath(`/brands/${brandId}/settings`);
  redirectWithNotice(brandId, nextStatus === "connected" ? "success" : "error", "Connection validated", `${titleCase(account.platform)} is ${nextStatus}.`);
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

function parseOptionalDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function normalizeConnectorStatus(value: string) {
  return ["connected", "needs_attention", "expired", "disabled"].includes(value) ? value : "needs_attention";
}

async function hasCredentialReference(accountId: string, brandId: string) {
  const [account] = await db
    .select({ secretRef: schema.integrationAccounts.secretRef })
    .from(schema.integrationAccounts)
    .where(and(eq(schema.integrationAccounts.id, accountId), eq(schema.integrationAccounts.brandId, brandId)))
    .limit(1);

  if (account?.secretRef) {
    return true;
  }

  const [credential] = await db
    .select({ id: schema.integrationCredentials.id })
    .from(schema.integrationCredentials)
    .where(eq(schema.integrationCredentials.integrationAccountId, accountId))
    .limit(1);

  return Boolean(credential);
}

function getConnectionStatus({
  credentialValue,
  expiresAt,
  hasStoredCredential,
  requestedStatus
}: {
  credentialValue: string;
  expiresAt: Date | null;
  hasStoredCredential: boolean;
  requestedStatus: string;
}) {
  if (requestedStatus === "disabled") {
    return "disabled";
  }

  if (expiresAt && expiresAt <= new Date()) {
    return "expired";
  }

  if (requestedStatus === "connected" && !credentialValue && !hasStoredCredential) {
    return "needs_attention";
  }

  return requestedStatus;
}

function getPlatformAccountType(platform: string) {
  const accountTypes: Record<string, string> = {
    facebook: "page",
    instagram: "business_account",
    linkedin: "personal_profile"
  };

  return accountTypes[platform] ?? "account";
}

function getPlatformCredentialType(platform: string) {
  const credentialTypes: Record<string, string> = {
    facebook: "page_access_token",
    instagram: "instagram_access_token",
    linkedin: "linkedin_access_token"
  };

  return credentialTypes[platform] ?? "access_token";
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createGuidanceObject(guidance: string) {
  return guidance ? { guidance } : null;
}

function createLanguagePreferences(formData: FormData) {
  const preferences = removeEmptyValues({
    emojiUsage: readFormValue(formData, "emojiUsage"),
    forbiddenSymbols: parseList(readFormValue(formData, "forbiddenSymbols")),
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

function createPublishingFrequency(formData: FormData) {
  const scheduleDefaults = removeEmptyValues({
    facebook: normalizeTime(readFormValue(formData, "facebookDefaultTime")),
    instagram: normalizeTime(readFormValue(formData, "instagramDefaultTime")),
    linkedin: normalizeTime(readFormValue(formData, "linkedinDefaultTime")),
    fallback: normalizeTime(readFormValue(formData, "fallbackDefaultTime"))
  });

  return Object.keys(scheduleDefaults).length > 0 ? { scheduleDefaults } : null;
}

function normalizeTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : "";
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
