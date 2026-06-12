"use server";

import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@orchard/database";
import { getCurrentUser } from "@/lib/current-user";
import { resolveIntegrationAccountForJob } from "@/lib/connection-routing";
import { requireWorkspaceContext } from "@/lib/workspace-context";
import { publishPlatformOutput, type PublisherFailure } from "@/services/publisher";

const processableStatuses = ["draft", "queued", "scheduled"] as const;
const retryableStatuses = ["failed", "skipped"] as const;

export async function processDuePublicationJobsAction() {
  const now = new Date();
  const { workspace } = await requireWorkspaceContext();
  const dueJobs = await db
    .select({ id: schema.publicationJobs.id })
    .from(schema.publicationJobs)
    .innerJoin(schema.contentItems, eq(schema.publicationJobs.contentItemId, schema.contentItems.id))
    .where(
      and(
        eq(schema.contentItems.workspaceId, workspace.id),
        inArray(schema.publicationJobs.status, [...processableStatuses]),
        lte(schema.publicationJobs.scheduledFor, now)
      )
    )
    .orderBy(asc(schema.publicationJobs.scheduledFor), asc(schema.publicationJobs.createdAt))
    .limit(25);

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of dueJobs) {
    const result = await processPublicationJob(job.id, now);
    published += result === "published" ? 1 : 0;
    failed += result === "failed" ? 1 : 0;
    skipped += result === "skipped" ? 1 : 0;
  }

  redirectWithNotice("Due jobs processed", `${published} published, ${failed} failed, ${skipped} skipped.`);
}

export async function processPublicationJobAction(formData: FormData) {
  const jobId = readFormValue(formData, "jobId");

  if (!jobId) {
    redirectWithNotice("Process blocked", "Publication job id is missing.", "error");
  }

  const result = await processPublicationJob(jobId, new Date());
  const messages = {
    failed: "The publisher recorded a failure. Check the failure details in the queue.",
    published: "The publisher created a published post record.",
    skipped: "The job was skipped because it already has a published artifact."
  };

  redirectWithNotice("Job processed", messages[result], result === "failed" ? "error" : "success");
}

export async function retryPublicationJobAction(formData: FormData) {
  const jobId = readFormValue(formData, "jobId");
  const currentUser = await getCurrentUser();
  const now = new Date();
  const row = await getPublicationJobContext(jobId);

  if (!row || !retryableStatuses.includes(row.job.status as (typeof retryableStatuses)[number])) {
    redirectWithNotice("Retry blocked", "Only failed or skipped jobs can be retried from the scheduler.", "error");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.publicationJobs)
      .set({
        lastError: null,
        nextRetryAt: null,
        queuedAt: now,
        scheduledFor: row.job.scheduledFor ?? now,
        status: "queued",
        updatedAt: now
      })
      .where(eq(schema.publicationJobs.id, row.job.id));

    await tx
      .update(schema.platformVariants)
      .set({ status: "scheduled", updatedAt: now })
      .where(eq(schema.platformVariants.id, row.variant.id));

    await tx.insert(schema.activityLogs).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: row.contentItem.id,
      action: "publication_job_retry_queued",
      message: `${getOutputDisplayTitle(row.variant)} queued for retry.`,
      metadata: {
        platform: row.job.platform,
        platformVariantId: row.variant.id,
        publicationJobId: row.job.id
      }
    });
  });

  revalidateSchedulerPaths(row.brand.id, row.contentItem.id);
  redirectWithNotice("Retry queued", "The job is queued and will process when due.");
}

export async function cancelPublicationJobAction(formData: FormData) {
  const jobId = readFormValue(formData, "jobId");
  const currentUser = await getCurrentUser();
  const row = await getPublicationJobContext(jobId);

  if (!row || row.job.status === "published") {
    redirectWithNotice("Cancel blocked", "Published jobs cannot be cancelled.", "error");
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.publicationJobs)
      .set({
        status: "cancelled",
        updatedAt: now
      })
      .where(eq(schema.publicationJobs.id, row.job.id));

    await tx
      .update(schema.platformVariants)
      .set({
        scheduledFor: null,
        status: row.variant.status === "published" ? "published" : "cancelled",
        updatedAt: now
      })
      .where(eq(schema.platformVariants.id, row.variant.id));

    await tx.insert(schema.activityLogs).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: row.contentItem.id,
      action: "publication_job_cancelled",
      message: `${getOutputDisplayTitle(row.variant)} publication job cancelled from scheduler.`,
      metadata: {
        platform: row.job.platform,
        platformVariantId: row.variant.id,
        publicationJobId: row.job.id
      }
    });
  });

  revalidateSchedulerPaths(row.brand.id, row.contentItem.id);
  redirectWithNotice("Job cancelled", "The publication job is now cancelled.");
}

async function processPublicationJob(jobId: string, attemptedAt: Date): Promise<"failed" | "published" | "skipped"> {
  const currentUser = await getCurrentUser();
  const row = await getPublicationJobContext(jobId);

  if (!row) {
    return "failed";
  }

  if (!processableStatuses.includes(row.job.status as (typeof processableStatuses)[number])) {
    if (row.job.status === "published") {
      return "skipped";
    }

    return failPublicationJob({
      attemptedAt,
      currentUserId: currentUser?.id,
      errorCode: "job_not_processable",
      errorMessage: `Job status ${row.job.status} cannot be processed by the publisher.`,
      row
    });
  }

  if (!row.job.scheduledFor || row.job.scheduledFor.getTime() > attemptedAt.getTime()) {
    return failPublicationJob({
      attemptedAt,
      currentUserId: currentUser?.id,
      errorCode: "job_not_due",
      errorMessage: "Job is not due yet.",
      row
    });
  }

  const [existingPost] = await db
    .select({ id: schema.publishedPosts.id })
    .from(schema.publishedPosts)
    .where(eq(schema.publishedPosts.publicationJobId, row.job.id))
    .limit(1);

  if (existingPost) {
    await db
      .update(schema.publicationJobs)
      .set({ status: "skipped", lastError: "Published post already exists for this job.", updatedAt: attemptedAt })
      .where(eq(schema.publicationJobs.id, row.job.id));

    return "skipped";
  }

  const publishableCopy = [row.variant.caption, row.variant.headline].filter(Boolean).join("\n").trim();

  if (!publishableCopy) {
    return failPublicationJob({
      attemptedAt,
      currentUserId: currentUser?.id,
      errorCode: "missing_publishable_copy",
      errorMessage: "The output has no caption or headline for the publisher to publish.",
      row
    });
  }

  if (row.variant.status !== "approved" && row.variant.status !== "scheduled") {
    return failPublicationJob({
      attemptedAt,
      currentUserId: currentUser?.id,
      errorCode: "output_not_approved",
      errorMessage: `Output status ${row.variant.status} is not approved for publishing.`,
      row
    });
  }

  const integrationAccount = await resolveIntegrationAccountForJob(row.brand.id, row.variant);
  await db
    .update(schema.publicationJobs)
    .set({
      integrationAccountId: integrationAccount?.id ?? row.job.integrationAccountId,
      lastError: null,
      queuedAt: row.job.queuedAt ?? attemptedAt,
      startedAt: attemptedAt,
      status: "publishing",
      updatedAt: attemptedAt
    })
    .where(eq(schema.publicationJobs.id, row.job.id));

  const publisherResult = await publishPlatformOutput({
    attemptedAt,
    brand: row.brand,
    contentItem: row.contentItem,
    integrationAccount,
    job: row.job,
    variant: row.variant
  });

  if (!publisherResult.ok) {
    return failPublicationJob({
      attemptedAt,
      currentUserId: currentUser?.id,
      errorCode: publisherResult.errorCode,
      errorMessage: publisherResult.errorMessage,
      publisherFailure: publisherResult,
      row
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.publicationJobs)
      .set({
        attemptCount: row.job.attemptCount + 1,
        integrationAccountId: publisherResult.integrationAccountId,
        lastError: null,
        queuedAt: row.job.queuedAt ?? attemptedAt,
        startedAt: attemptedAt,
        status: "publishing",
        updatedAt: attemptedAt
      })
      .where(eq(schema.publicationJobs.id, row.job.id));

    await tx
      .update(schema.publicationJobs)
      .set({
        finishedAt: attemptedAt,
        integrationAccountId: publisherResult.integrationAccountId,
        status: "published",
        updatedAt: attemptedAt
      })
      .where(eq(schema.publicationJobs.id, row.job.id));

    await tx.insert(schema.publicationResults).values({
      publicationJobId: row.job.id,
      platform: row.job.platform,
      externalPostId: publisherResult.externalPostId,
      externalUrl: publisherResult.externalUrl,
      rawResponse: publisherResult.rawResponse,
      status: "succeeded"
    });

    await tx.insert(schema.publishedPosts).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      contentItemId: row.contentItem.id,
      platformVariantId: row.variant.id,
      publicationJobId: row.job.id,
      platform: row.job.platform,
      postType: row.variant.postType,
      status: "published",
      externalPostId: publisherResult.externalPostId,
      externalUrl: publisherResult.externalUrl,
      publishedAt: attemptedAt,
      lastSyncedAt: attemptedAt,
      rawResponse: publisherResult.rawResponse,
      metadata: {
        caption: row.variant.caption,
        hashtags: row.variant.hashtags,
        headline: row.variant.headline,
        integrationAccountId: publisherResult.integrationAccountId,
        mode: publisherResult.mode,
        provider: publisherResult.provider,
        title: getOutputDisplayTitle(row.variant)
      }
    });

    await tx
      .update(schema.platformVariants)
      .set({
        integrationAccountId: publisherResult.integrationAccountId ?? row.variant.integrationAccountId,
        status: "published",
        updatedAt: attemptedAt
      })
      .where(eq(schema.platformVariants.id, row.variant.id));

    await tx
      .update(schema.contentItems)
      .set({ updatedAt: attemptedAt })
      .where(eq(schema.contentItems.id, row.contentItem.id));

    await tx.insert(schema.automationRuns).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      contentItemId: row.contentItem.id,
      platformVariantId: row.variant.id,
      publicationJobId: row.job.id,
      runType: publisherResult.runType,
      provider: publisherResult.provider,
      status: "succeeded",
      input: {
        mode: publisherResult.mode,
        platform: row.job.platform,
        integrationAccountId: publisherResult.integrationAccountId,
        scheduledFor: row.job.scheduledFor?.toISOString() ?? null
      },
      output: {
        externalPostId: publisherResult.externalPostId,
        externalUrl: publisherResult.externalUrl,
        integrationAccountId: publisherResult.integrationAccountId
      },
      startedAt: attemptedAt,
      finishedAt: attemptedAt
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      actorUserId: currentUser?.id,
      entityType: "content_item",
      entityId: row.contentItem.id,
      action: publisherResult.activityAction,
      message: publisherResult.activityMessage,
      metadata: {
        externalPostId: publisherResult.externalPostId,
        externalUrl: publisherResult.externalUrl,
        integrationAccountId: publisherResult.integrationAccountId,
        mode: publisherResult.mode,
        platform: row.job.platform,
        platformVariantId: row.variant.id,
        provider: publisherResult.provider,
        publicationJobId: row.job.id
      }
    });
  });

  revalidateSchedulerPaths(row.brand.id, row.contentItem.id);
  return "published";
}

async function failPublicationJob({
  attemptedAt,
  currentUserId,
  errorCode,
  errorMessage,
  publisherFailure,
  row
}: {
  attemptedAt: Date;
  currentUserId: string | undefined;
  errorCode: string;
  errorMessage: string;
  publisherFailure?: PublisherFailure;
  row: NonNullable<Awaited<ReturnType<typeof getPublicationJobContext>>>;
}): Promise<"failed"> {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.publicationJobs)
      .set({
        attemptCount: row.job.attemptCount + 1,
        finishedAt: attemptedAt,
        lastError: errorMessage,
        nextRetryAt: new Date(attemptedAt.getTime() + 15 * 60 * 1000),
        startedAt: attemptedAt,
        status: "failed",
        updatedAt: attemptedAt
      })
      .where(eq(schema.publicationJobs.id, row.job.id));

    await tx
      .update(schema.platformVariants)
      .set({ status: "failed", updatedAt: attemptedAt })
      .where(eq(schema.platformVariants.id, row.variant.id));

    await tx.insert(schema.publicationResults).values({
      publicationJobId: row.job.id,
      platform: row.job.platform,
      rawResponse: publisherFailure?.rawResponse ?? {
        mode: "local",
        status: "failed"
      },
      status: "failed",
      errorCode,
      errorMessage
    });

    await tx.insert(schema.automationRuns).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      contentItemId: row.contentItem.id,
      platformVariantId: row.variant.id,
      publicationJobId: row.job.id,
      runType: publisherFailure?.runType ?? "local_publish",
      provider: publisherFailure?.provider ?? "orchard_local_publisher",
      status: "failed",
      input: {
        mode: publisherFailure?.mode ?? "local",
        platform: row.job.platform,
        integrationAccountId: publisherFailure?.integrationAccountId ?? row.job.integrationAccountId,
        scheduledFor: row.job.scheduledFor?.toISOString() ?? null
      },
      error: errorMessage,
      startedAt: attemptedAt,
      finishedAt: attemptedAt
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: row.contentItem.workspaceId,
      brandId: row.brand.id,
      actorUserId: currentUserId,
      entityType: "content_item",
      entityId: row.contentItem.id,
      action: "publication_job_publish_failed",
      message: errorMessage,
      metadata: {
        errorCode,
        integrationAccountId: publisherFailure?.integrationAccountId ?? row.job.integrationAccountId,
        mode: publisherFailure?.mode ?? "local",
        platform: row.job.platform,
        platformVariantId: row.variant.id,
        provider: publisherFailure?.provider ?? "orchard_local_publisher",
        publicationJobId: row.job.id
      }
    });
  });

  revalidateSchedulerPaths(row.brand.id, row.contentItem.id);
  return "failed";
}

async function getPublicationJobContext(jobId: string) {
  if (!jobId) {
    return undefined;
  }

  const { workspace } = await requireWorkspaceContext();
  const [row] = await db
    .select({
      brand: schema.brands,
      contentItem: schema.contentItems,
      job: schema.publicationJobs,
      variant: schema.platformVariants
    })
    .from(schema.publicationJobs)
    .innerJoin(schema.contentItems, eq(schema.publicationJobs.contentItemId, schema.contentItems.id))
    .innerJoin(schema.brands, eq(schema.contentItems.brandId, schema.brands.id))
    .innerJoin(schema.platformVariants, eq(schema.publicationJobs.platformVariantId, schema.platformVariants.id))
    .where(and(eq(schema.publicationJobs.id, jobId), eq(schema.contentItems.workspaceId, workspace.id)))
    .limit(1);

  return row;
}

function getOutputDisplayTitle(
  variant: Pick<typeof schema.platformVariants.$inferSelect, "platform" | "postType" | "purpose" | "title">
) {
  const platform = variant.platform.charAt(0).toUpperCase() + variant.platform.slice(1);
  const purpose = variant.purpose && variant.purpose !== "main" ? ` ${variant.purpose.replaceAll("_", " ")}` : "";

  return variant.title || `${platform} ${variant.postType.replaceAll("_", " ")}${purpose}`;
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithNotice(title: string, message: string, kind: "error" | "success" = "success"): never {
  const params = new URLSearchParams({
    notice: kind,
    noticeMessage: message,
    noticeTitle: title
  });

  redirect(`/scheduler?${params.toString()}`);
}

function revalidateSchedulerPaths(brandId: string, contentId: string) {
  revalidatePath("/");
  revalidatePath("/scheduler");
  revalidatePath(`/brands/${brandId}`);
  revalidatePath(`/brands/${brandId}/content`);
  revalidatePath(`/brands/${brandId}/content/${contentId}`);
}
