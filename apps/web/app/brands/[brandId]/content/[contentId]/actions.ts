"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import {
  createAiRunInput,
  editPublishingOutput,
  generatePublishingOutput,
  regeneratePublishingOutput,
  type PublishingOutputAiInput
} from "@/services/ai-output-generator";
import { getMediaTypeFromMime, storeLocalMediaFile } from "@/services/local-filesystem-storage";

const contentStatuses = [
  "draft",
  "in_progress",
  "on_hold",
  "ready_for_review",
  "changes_requested",
  "approved",
  "active",
  "completed",
  "archived"
] as const;

const outputStatuses = [
  "draft",
  "generating",
  "ready_for_review",
  "changes_requested",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
  "archived"
] as const;

const schedulableJobStatuses = ["draft", "scheduled", "queued"] as const;

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
  const status = assertOutputStatus(readFormValue(formData, "status") || "draft");
  const postType = readFormValue(formData, "postType") || "post";
  const purpose = readFormValue(formData, "purpose") || "main";
  const sortOrder = parseSortOrder(readFormValue(formData, "sortOrder"));
  const title = readFormValue(formData, "title");
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
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: "Manual output edit.",
        revisionType: "manual_edit",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status,
        postType,
        purpose,
        sortOrder,
        title: title || createDefaultOutputTitle({ platform: variant.platform, postType, purpose, sourceTitle: detail.contentItem.title }),
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
      message: `${title || getOutputDisplayTitle({ ...variant, postType, purpose })} updated.`,
      metadata: { platform: variant.platform, postType, purpose, status, title: title || null }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function createPublishingOutputAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const creationMode = readFormValue(formData, "creationMode") || "manual";
  const platform = readFormValue(formData, "platform") || "instagram";
  const postType = readFormValue(formData, "postType") || "post";
  const purpose = readFormValue(formData, "purpose") || "main";
  const generationInstruction = readFormValue(formData, "generationInstruction");
  const title = readFormValue(formData, "title");
  const headline = readFormValue(formData, "headline");
  const caption = readFormValue(formData, "caption");
  const hashtags = parseTags(readFormValue(formData, "hashtags"));

  const detail = await getEditableContent(brandId, contentId);
  const currentUser = await getCurrentUser();
  const [sortRow] = await db
    .select({ value: sqlMaxSortOrder() })
    .from(schema.platformVariants)
    .where(eq(schema.platformVariants.contentItemId, contentId));
  const baseVariant = createUnsavedVariant({
    caption: caption || null,
    contentItemId: contentId,
    hashtags,
    headline: headline || null,
    language: detail.contentItem.language,
    platform,
    postType,
    purpose,
    sortOrder: (sortRow?.value ?? -1) + 1,
    status: caption || headline ? "ready_for_review" : "draft",
    title: title || createDefaultOutputTitle({ platform, postType, purpose, sourceTitle: detail.contentItem.title })
  });
  const aiInput = createPublishingOutputAiInput(detail, baseVariant, {
    generationInstruction,
    manualHints: {
      caption: caption || null,
      hashtags,
      headline: headline || null,
      purpose,
      title: title || null
    },
    operation: "generate"
  });
  let generated = null;

  if (creationMode === "generate") {
    try {
      generated = await generatePublishingOutput(aiInput);
    } catch (error) {
      await recordAiFailure({
        brandId,
        contentId,
        detail,
        error,
        input: createAiRunInput(aiInput),
        runType: "create_output_generate"
      });
      redirectWithActionError(brandId, contentId, "Output generation failed", getActionErrorMessage(error));
    }
  }

  await db.transaction(async (tx) => {
    const [variant] = await tx
      .insert(schema.platformVariants)
      .values({
        contentItemId: contentId,
        platform,
        postType,
        purpose,
        sortOrder: baseVariant.sortOrder,
        status: generated ? "ready_for_review" : baseVariant.status,
        title: generated?.title ?? baseVariant.title,
        headline: generated?.headline ?? baseVariant.headline,
        caption: generated?.caption ?? baseVariant.caption,
        hashtags: generated?.hashtags ?? baseVariant.hashtags,
        language: detail.contentItem.language,
        aiModel: generated?.model ?? null,
        generationPromptVersion: generated?.provider ?? null
      })
      .returning({ id: schema.platformVariants.id });

    if (!variant) {
      throw new Error("Publishing output could not be created.");
    }

    if (generated) {
      await tx.insert(schema.automationRuns).values({
        workspaceId: detail.brand.workspaceId,
        brandId,
        contentItemId: contentId,
        platformVariantId: variant.id,
        runType: "create_output_generate",
        provider: generated.provider,
        status: "succeeded",
        input: createAiRunInput(aiInput),
        output: generated,
        startedAt: new Date(),
        finishedAt: new Date()
      });
    }

    await tx
      .update(schema.contentItems)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "publishing_output_created",
      message: generated ? `${generated.title ?? baseVariant.title} created with AI.` : `${baseVariant.title} created manually.`,
      metadata: {
        creationMode,
        generationInstruction: generationInstruction || null,
        platform,
        postType,
        purpose,
        platformVariantId: variant.id,
        title: generated?.title ?? baseVariant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function generateOutputDraftAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");

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
  const aiInput = createPublishingOutputAiInput(detail, variant, { operation: "generate" });
  let generated;

  try {
    generated = await generatePublishingOutput(aiInput);
  } catch (error) {
    await recordAiFailure({
      brandId,
      contentId,
      detail,
      error,
      input: createAiRunInput(aiInput),
      platformVariantId: variant.id,
      runType: "generate_output"
    });
    redirectWithActionError(brandId, contentId, "Output generation failed", getActionErrorMessage(error));
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: "Before AI generate.",
        revisionType: "ai_generate",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: "ready_for_review",
        title: generated.title ?? getOutputDisplayTitle(variant),
        headline: generated.headline,
        caption: generated.caption,
        hashtags: generated.hashtags,
        platformOptions: {
          ...(variant.platformOptions ?? {}),
          ai: {
            action: "generate_output_draft",
            model: generated.model,
            provider: generated.provider,
            generatedAt: new Date().toISOString()
          }
        },
        aiModel: generated.model,
        generationPromptVersion: generated.provider,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.contentItems)
      .set({
        updatedAt: new Date()
      })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.automationRuns).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      contentItemId: contentId,
      platformVariantId: variant.id,
      runType: "generate_output",
      provider: generated.provider,
      status: "succeeded",
      input: createAiRunInput(aiInput),
      output: generated,
      startedAt: new Date(),
      finishedAt: new Date()
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "ai_output_generated",
      message: `${generated.title ?? getOutputDisplayTitle(variant)} generated.`,
      metadata: {
        provider: generated.provider,
        platform: variant.platform,
        platformVariantId: variant.id,
        title: generated.title ?? variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function regenerateOutputDraftAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const instruction = readFormValue(formData, "instruction");

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
  const aiInput = createPublishingOutputAiInput(detail, variant, {
    generationInstruction: instruction,
    operation: "regenerate"
  });
  let generated;

  try {
    generated = await regeneratePublishingOutput(aiInput);
  } catch (error) {
    await recordAiFailure({
      brandId,
      contentId,
      detail,
      error,
      input: createAiRunInput(aiInput),
      platformVariantId: variant.id,
      runType: "regenerate_output"
    });
    redirectWithActionError(brandId, contentId, "Output regeneration failed", getActionErrorMessage(error));
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: instruction || "Before AI regenerate.",
        revisionType: "ai_regenerate",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: "ready_for_review",
        title: generated.title ?? getOutputDisplayTitle(variant),
        headline: generated.headline,
        caption: generated.caption,
        hashtags: generated.hashtags,
        platformOptions: {
          ...(variant.platformOptions ?? {}),
          ai: {
            action: "regenerate_output",
            instruction: instruction || null,
            model: generated.model,
            provider: generated.provider,
            generatedAt: new Date().toISOString()
          }
        },
        aiModel: generated.model,
        generationPromptVersion: generated.provider,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.contentItems)
      .set({ updatedAt: new Date() })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.automationRuns).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      contentItemId: contentId,
      platformVariantId: variant.id,
      runType: "regenerate_output",
      provider: generated.provider,
      status: "succeeded",
      input: createAiRunInput(aiInput),
      output: generated,
      startedAt: new Date(),
      finishedAt: new Date()
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "ai_output_regenerated",
      message: `${generated.title ?? getOutputDisplayTitle(variant)} regenerated.`,
      metadata: {
        instruction: instruction || null,
        provider: generated.provider,
        platform: variant.platform,
        platformVariantId: variant.id,
        title: generated.title ?? variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function editOutputWithAiAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const instruction = readFormValue(formData, "instruction") || "Make this clearer and ready for review.";

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
  const aiInput = createPublishingOutputAiInput(detail, variant, {
    generationInstruction: instruction,
    operation: "edit"
  });
  let edited;

  try {
    edited = await editPublishingOutput(aiInput);
  } catch (error) {
    await recordAiFailure({
      brandId,
      contentId,
      detail,
      error,
      input: createAiRunInput(aiInput),
      platformVariantId: variant.id,
      runType: "edit_output"
    });
    redirectWithActionError(brandId, contentId, "AI edit failed", getActionErrorMessage(error));
  }

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: instruction,
        revisionType: "ai_edit",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: "ready_for_review",
        title: edited.title ?? getOutputDisplayTitle(variant),
        headline: edited.headline,
        caption: edited.caption,
        hashtags: edited.hashtags,
        platformOptions: {
          ...(variant.platformOptions ?? {}),
          ai: {
            action: "edit_output",
            instruction,
            model: edited.model,
            provider: edited.provider,
            generatedAt: new Date().toISOString()
          }
        },
        aiModel: edited.model,
        generationPromptVersion: edited.provider,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.contentItems)
      .set({ updatedAt: new Date() })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.automationRuns).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      contentItemId: contentId,
      platformVariantId: variant.id,
      runType: "edit_output",
      provider: edited.provider,
      status: "succeeded",
      input: createAiRunInput(aiInput),
      output: edited,
      startedAt: new Date(),
      finishedAt: new Date()
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "ai_output_edited",
      message: `${edited.title ?? getOutputDisplayTitle(variant)} edited by AI.`,
      metadata: {
        instruction,
        provider: edited.provider,
        platform: variant.platform,
        platformVariantId: variant.id,
        title: edited.title ?? variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function restoreOutputRevisionAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const revisionId = readFormValue(formData, "revisionId");

  const detail = await getEditableContent(brandId, contentId);
  const [variant] = await db
    .select()
    .from(schema.platformVariants)
    .where(and(eq(schema.platformVariants.id, variantId), eq(schema.platformVariants.contentItemId, contentId)))
    .limit(1);

  if (!variant) {
    throw new Error("Publishing output not found.");
  }

  const [revision] = await db
    .select()
    .from(schema.platformVariantRevisions)
    .where(
      and(
        eq(schema.platformVariantRevisions.id, revisionId),
        eq(schema.platformVariantRevisions.platformVariantId, variantId),
        eq(schema.platformVariantRevisions.contentItemId, contentId)
      )
    )
    .limit(1);

  if (!revision) {
    throw new Error("Output revision not found.");
  }

  const currentUser = await getCurrentUser();
  const snapshot = revision.snapshot;

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: `Before reverting to ${revision.revisionType}.`,
        revisionType: "revert_checkpoint",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: snapshot.status,
        postType: snapshot.postType,
        purpose: snapshot.purpose,
        sortOrder: snapshot.sortOrder,
        title: snapshot.title,
        caption: snapshot.caption,
        headline: snapshot.headline,
        credits: snapshot.credits,
        hashtags: snapshot.hashtags,
        ctaLabel: snapshot.ctaLabel,
        ctaUrl: snapshot.ctaUrl,
        language: snapshot.language,
        scheduledFor: snapshot.scheduledFor ? new Date(snapshot.scheduledFor) : null,
        platformOptions: snapshot.platformOptions,
        aiModel: snapshot.aiModel,
        generationPromptVersion: snapshot.generationPromptVersion,
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
      action: "publishing_output_reverted",
      message: `${getOutputDisplayTitle(variant)} reverted to a previous revision.`,
      metadata: {
        platform: variant.platform,
        platformVariantId: variant.id,
        title: variant.title,
        revisionId: revision.id,
        revisionType: revision.revisionType
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function updateContentWorkflowAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const nextStatus = assertContentStatus(readFormValue(formData, "nextStatus"));
  const comment = readFormValue(formData, "comment");

  const detail = await getEditableContent(brandId, contentId);
  const currentUser = await getCurrentUser();
  const action = getContentWorkflowAction(nextStatus);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.contentItems)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
        archivedAt: nextStatus === "archived" ? new Date() : null
      })
      .where(and(eq(schema.contentItems.id, contentId), eq(schema.contentItems.brandId, brandId)));

    if (nextStatus === "ready_for_review") {
      await tx.insert(schema.approvals).values({
        contentItemId: contentId,
        requestedByUserId: currentUser?.id,
        status: "pending",
        comment: comment || "Submitted for review."
      });
    }

    if (nextStatus === "approved" || nextStatus === "changes_requested") {
      await tx.insert(schema.approvals).values({
        contentItemId: contentId,
        requestedByUserId: currentUser?.id,
        reviewedByUserId: currentUser?.id,
        status: nextStatus === "approved" ? "approved" : "changes_requested",
        comment: comment || null,
        reviewedAt: new Date()
      });
    }

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action,
      message: getContentWorkflowMessage(nextStatus),
      metadata: { status: nextStatus, comment: comment || null }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function updateOutputReviewAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const nextStatus = assertReviewOutputStatus(readFormValue(formData, "nextStatus"));
  const comment = readFormValue(formData, "comment");

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
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: comment || `Before output ${nextStatus}.`,
        revisionType: `review_${nextStatus}`,
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: nextStatus,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx.insert(schema.approvals).values({
      contentItemId: contentId,
      platformVariantId: variant.id,
      requestedByUserId: currentUser?.id,
      reviewedByUserId: nextStatus === "ready_for_review" ? undefined : currentUser?.id,
      status: getApprovalStatus(nextStatus),
      comment: comment || getOutputReviewMessage(nextStatus),
      reviewedAt: nextStatus === "ready_for_review" ? undefined : new Date()
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
      action: `publishing_output_${nextStatus}`,
      message: `${getOutputDisplayTitle(variant)}: ${getOutputReviewMessage(nextStatus)}`,
      metadata: {
        comment: comment || null,
        platform: variant.platform,
        platformVariantId: variant.id,
        postType: variant.postType,
        status: nextStatus,
        title: variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function scheduleOutputAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");
  const scheduledFor = parseDateTime(readFormValue(formData, "scheduledFor"));

  const detail = await getEditableContent(brandId, contentId);
  const [variant] = await db
    .select()
    .from(schema.platformVariants)
    .where(and(eq(schema.platformVariants.id, variantId), eq(schema.platformVariants.contentItemId, contentId)))
    .limit(1);

  if (!variant) {
    throw new Error("Publishing output not found.");
  }

  if (variant.status !== "approved" && variant.status !== "scheduled") {
    redirectWithActionError(brandId, contentId, "Schedule blocked", "Approve this output before scheduling it.");
  }

  const currentUser = await getCurrentUser();

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: "Before schedule intent update.",
        revisionType: "schedule",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: "scheduled",
        scheduledFor,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    const [existingJob] = await tx
      .select()
      .from(schema.publicationJobs)
      .where(
        and(
          eq(schema.publicationJobs.platformVariantId, variant.id),
          inArray(schema.publicationJobs.status, [...schedulableJobStatuses])
        )
      )
      .limit(1);

    if (existingJob) {
      await tx
        .update(schema.publicationJobs)
        .set({
          status: "scheduled",
          scheduledFor,
          updatedAt: new Date()
        })
        .where(eq(schema.publicationJobs.id, existingJob.id));
    } else {
      await tx.insert(schema.publicationJobs).values({
        contentItemId: contentId,
        platformVariantId: variant.id,
        platform: variant.platform,
        status: "scheduled",
        scheduledFor,
        createdByUserId: currentUser?.id
      });
    }

    await tx
      .update(schema.contentItems)
      .set({
        updatedAt: new Date()
      })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "publishing_output_scheduled",
      message: `${getOutputDisplayTitle(variant)} scheduled.`,
      metadata: {
        platform: variant.platform,
        postType: variant.postType,
        platformVariantId: variant.id,
        scheduledFor: scheduledFor.toISOString(),
        title: variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function cancelOutputScheduleAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");

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
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: "Before schedule cancellation.",
        revisionType: "cancel_schedule",
        variant
      })
    );

    await tx
      .update(schema.platformVariants)
      .set({
        status: "approved",
        scheduledFor: null,
        updatedAt: new Date()
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.publicationJobs)
      .set({
        status: "cancelled",
        finishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(schema.publicationJobs.platformVariantId, variant.id),
          inArray(schema.publicationJobs.status, [...schedulableJobStatuses])
        )
      );

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
      action: "publishing_output_schedule_cancelled",
      message: `${getOutputDisplayTitle(variant)} schedule cancelled.`,
      metadata: {
        platform: variant.platform,
        postType: variant.postType,
        platformVariantId: variant.id,
        title: variant.title
      }
    });
  });

  revalidateContentPaths(brandId, contentId);
  redirect(`/brands/${brandId}/content/${contentId}`);
}

export async function dummyPublishOutputAction(formData: FormData) {
  const brandId = readFormValue(formData, "brandId");
  const contentId = readFormValue(formData, "contentId");
  const variantId = readFormValue(formData, "variantId");

  const detail = await getEditableContent(brandId, contentId);
  const [variant] = await db
    .select()
    .from(schema.platformVariants)
    .where(and(eq(schema.platformVariants.id, variantId), eq(schema.platformVariants.contentItemId, contentId)))
    .limit(1);

  if (!variant) {
    throw new Error("Publishing output not found.");
  }

  if (variant.status !== "approved" && variant.status !== "scheduled") {
    redirectWithActionError(brandId, contentId, "Publish blocked", "Approve or schedule this output before publishing it.");
  }

  const currentUser = await getCurrentUser();
  const publishedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(schema.platformVariantRevisions).values(
      createRevisionValues({
        actorUserId: currentUser?.id,
        contentItemId: contentId,
        reason: "Before dummy publish.",
        revisionType: "dummy_publish",
        variant
      })
    );

    const [existingJob] = await tx
      .select()
      .from(schema.publicationJobs)
      .where(
        and(
          eq(schema.publicationJobs.platformVariantId, variant.id),
          inArray(schema.publicationJobs.status, [...schedulableJobStatuses])
        )
      )
      .limit(1);

    const [job] = existingJob
      ? await tx
          .update(schema.publicationJobs)
          .set({
            status: "published",
            startedAt: existingJob.startedAt ?? publishedAt,
            finishedAt: publishedAt,
            updatedAt: publishedAt
          })
          .where(eq(schema.publicationJobs.id, existingJob.id))
          .returning({ id: schema.publicationJobs.id })
      : await tx
          .insert(schema.publicationJobs)
          .values({
            contentItemId: contentId,
            platformVariantId: variant.id,
            platform: variant.platform,
            status: "published",
            queuedAt: publishedAt,
            startedAt: publishedAt,
            finishedAt: publishedAt,
            createdByUserId: currentUser?.id
          })
          .returning({ id: schema.publicationJobs.id });

    if (!job) {
      throw new Error("Publication job could not be created.");
    }

    const externalPostId = `dummy-${variant.id.slice(0, 8)}-${publishedAt.getTime()}`;
    const externalUrl = `https://example.com/${variant.platform}/${externalPostId}`;

    await tx.insert(schema.publicationResults).values({
      publicationJobId: job.id,
      platform: variant.platform,
      externalPostId,
      externalUrl,
      rawResponse: {
        mode: "dummy_publish",
        status: "published"
      },
      status: "succeeded"
    });

    await tx.insert(schema.publishedPosts).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      contentItemId: contentId,
      platformVariantId: variant.id,
      publicationJobId: job.id,
      platform: variant.platform,
      postType: variant.postType,
      status: "published",
      externalPostId,
      externalUrl,
      publishedAt,
      lastSyncedAt: publishedAt,
      rawResponse: {
        mode: "dummy_publish",
        status: "published"
      },
      metadata: {
        caption: variant.caption,
        hashtags: variant.hashtags,
        headline: variant.headline,
        title: getOutputDisplayTitle(variant)
      }
    });

    await tx
      .update(schema.platformVariants)
      .set({
        status: "published",
        updatedAt: publishedAt
      })
      .where(eq(schema.platformVariants.id, variant.id));

    await tx
      .update(schema.contentItems)
      .set({ updatedAt: publishedAt })
      .where(eq(schema.contentItems.id, contentId));

    await tx.insert(schema.activityLogs).values({
      workspaceId: detail.brand.workspaceId,
      brandId,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: contentId,
      action: "publishing_output_dummy_published",
      message: `${getOutputDisplayTitle(variant)} dummy published.`,
      metadata: {
        externalPostId,
        externalUrl,
        platform: variant.platform,
        platformVariantId: variant.id,
        postType: variant.postType,
        publicationJobId: job.id,
        title: variant.title
      }
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
      message: `${mediaAsset.filename ?? "Media"} assigned to ${getOutputDisplayTitle(variant)}.`,
      metadata: {
        mediaAssetId: mediaAsset.id,
        platformVariantId: variant.id,
        platform: variant.platform,
        postType: variant.postType,
        title: variant.title
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

  const [profile] = await db.select().from(schema.brandProfiles).where(eq(schema.brandProfiles.brandId, brandId)).limit(1);

  return { ...row, profile };
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

function sqlMaxSortOrder() {
  return sql<number>`coalesce(max(${schema.platformVariants.sortOrder}), -1)::int`;
}

function createRevisionValues({
  actorUserId,
  contentItemId,
  reason,
  revisionType,
  variant
}: {
  actorUserId: string | undefined;
  contentItemId: string;
  reason: string;
  revisionType: string;
  variant: typeof schema.platformVariants.$inferSelect;
}) {
  return {
    contentItemId,
    platformVariantId: variant.id,
    actorUserId,
    revisionType,
    reason,
    snapshot: {
      status: variant.status,
      title: variant.title,
      postType: variant.postType,
      purpose: variant.purpose,
      sortOrder: variant.sortOrder,
      caption: variant.caption,
      headline: variant.headline,
      credits: variant.credits,
      hashtags: variant.hashtags,
      ctaLabel: variant.ctaLabel,
      ctaUrl: variant.ctaUrl,
      language: variant.language,
      scheduledFor: variant.scheduledFor?.toISOString() ?? null,
      platformOptions: variant.platformOptions,
      aiModel: variant.aiModel,
      generationPromptVersion: variant.generationPromptVersion
    }
  };
}

function createUnsavedVariant({
  caption,
  contentItemId,
  hashtags,
  headline,
  language,
  platform,
  postType,
  purpose,
  sortOrder,
  status,
  title
}: {
  caption: string | null;
  contentItemId: string;
  hashtags: string[] | null;
  headline: string | null;
  language: string | null;
  platform: string;
  postType: string;
  purpose: string;
  sortOrder: number;
  status: string;
  title: string | null;
}): typeof schema.platformVariants.$inferSelect {
  const now = new Date();

  return {
    id: "unsaved",
    aiModel: null,
    caption,
    contentItemId,
    createdAt: now,
    credits: null,
    ctaLabel: null,
    ctaUrl: null,
    generationPromptVersion: null,
    hashtags,
    headline,
    language,
    platform,
    platformOptions: null,
    postType,
    purpose,
    scheduledFor: null,
    sortOrder,
    status,
    title,
    updatedAt: now
  };
}

function getOutputDisplayTitle(
  variant: Pick<typeof schema.platformVariants.$inferSelect, "platform" | "postType" | "purpose" | "title">
) {
  return variant.title || createDefaultOutputTitle(variant);
}

function createDefaultOutputTitle({
  platform,
  postType,
  purpose,
  sourceTitle
}: Pick<typeof schema.platformVariants.$inferSelect, "platform" | "postType" | "purpose"> & { sourceTitle?: string | null }) {
  const platformLabel = titleCase(platform);
  const typeLabel = postType.replaceAll("_", " ");
  const purposeLabel = purpose && purpose !== "main" ? ` ${purpose.replaceAll("_", " ")}` : "";
  const sourceLabel = sourceTitle ? `: ${sourceTitle}` : "";

  return `${platformLabel} ${typeLabel}${purposeLabel}${sourceLabel}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createPublishingOutputAiInput(
  detail: Awaited<ReturnType<typeof getEditableContent>>,
  variant: typeof schema.platformVariants.$inferSelect,
  options: Pick<PublishingOutputAiInput, "generationInstruction" | "manualHints" | "operation">
): PublishingOutputAiInput {
  return {
    contentItem: detail.contentItem,
    generationInstruction: options.generationInstruction,
    manualHints: options.manualHints,
    operation: options.operation,
    profile: detail.profile,
    variant
  };
}

function parseDateTime(value: string) {
  if (!value) {
    throw new Error("Schedule date and time are required.");
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Schedule date and time are invalid.");
  }

  return parsed;
}

function assertContentStatus(value: string) {
  if (contentStatuses.includes(value as (typeof contentStatuses)[number])) {
    return value as (typeof contentStatuses)[number];
  }

  throw new Error("Unsupported content status.");
}

function assertOutputStatus(value: string) {
  if (outputStatuses.includes(value as (typeof outputStatuses)[number])) {
    return value as (typeof outputStatuses)[number];
  }

  throw new Error("Unsupported publishing output status.");
}

function assertReviewOutputStatus(value: string) {
  const reviewStatuses = ["ready_for_review", "changes_requested", "approved"] as const;

  if (reviewStatuses.includes(value as (typeof reviewStatuses)[number])) {
    return value as (typeof reviewStatuses)[number];
  }

  throw new Error("Unsupported output review status.");
}

function getApprovalStatus(status: "ready_for_review" | "changes_requested" | "approved") {
  if (status === "ready_for_review") {
    return "pending";
  }

  return status;
}

function getOutputReviewMessage(status: "ready_for_review" | "changes_requested" | "approved") {
  const messages = {
    approved: "Output approved.",
    changes_requested: "Changes requested.",
    ready_for_review: "Output submitted for review."
  };

  return messages[status];
}

function getContentWorkflowAction(status: (typeof contentStatuses)[number]) {
  return `content_${status}`;
}

function getContentWorkflowMessage(status: (typeof contentStatuses)[number]) {
  const labels: Record<(typeof contentStatuses)[number], string> = {
    draft: "Content moved back to draft.",
    in_progress: "Content moved into active preparation.",
    on_hold: "Content put on hold.",
    ready_for_review: "Content submitted for review.",
    changes_requested: "Changes requested for this content.",
    approved: "Content approved.",
    active: "Content marked active.",
    completed: "Content workflow completed.",
    archived: "Content archived."
  };

  return labels[status];
}

async function recordAiFailure({
  brandId,
  contentId,
  detail,
  error,
  input,
  platformVariantId,
  runType
}: {
  brandId: string;
  contentId: string;
  detail: Awaited<ReturnType<typeof getEditableContent>>;
  error: unknown;
  input: Record<string, unknown>;
  platformVariantId?: string;
  runType: string;
}) {
  await db.insert(schema.automationRuns).values({
    workspaceId: detail.brand.workspaceId,
    brandId,
    contentItemId: contentId,
    platformVariantId,
    runType,
    provider: getConfiguredAiProvider(),
    status: "failed",
    input,
    error: getActionErrorMessage(error),
    startedAt: new Date(),
    finishedAt: new Date()
  });
}

function getConfiguredAiProvider() {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "openai" ? "openai_responses" : "app_server_dummy";
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The action could not be completed.";
}

function redirectWithActionError(brandId: string, contentId: string, title: string, message: string): never {
  const params = new URLSearchParams({
    actionMessage: message,
    actionNotice: "error",
    actionTitle: title
  });

  redirect(`/brands/${brandId}/content/${contentId}?${params.toString()}`);
}

function revalidateContentPaths(brandId: string, contentId: string) {
  revalidatePath("/");
  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${contentId}`);
}
