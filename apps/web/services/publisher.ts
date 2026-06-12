import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";
import { decryptLocalCredential } from "@/lib/integration-credentials";

type PublisherMode = "dry_run" | "live" | "local";
type PublisherProvider = "facebook_graph_api" | "instagram_graph_api" | "linkedin_posts_api" | "orchard_local_publisher";

type PublisherContext = {
  attemptedAt: Date;
  brand: typeof schema.brands.$inferSelect;
  contentItem: typeof schema.contentItems.$inferSelect;
  integrationAccount: typeof schema.integrationAccounts.$inferSelect | null;
  job: typeof schema.publicationJobs.$inferSelect;
  variant: typeof schema.platformVariants.$inferSelect;
};

type PublisherMedia = typeof schema.contentMedia.$inferSelect & {
  asset: typeof schema.mediaAssets.$inferSelect;
};

export type PublisherSuccess = {
  ok: true;
  activityAction: string;
  activityMessage: string;
  externalPostId: string;
  externalUrl: string | null;
  integrationAccountId: string | null;
  mode: PublisherMode;
  provider: PublisherProvider;
  rawResponse: Record<string, unknown>;
  runType: string;
};

export type PublisherFailure = {
  ok: false;
  errorCode: string;
  errorMessage: string;
  integrationAccountId: string | null;
  mode: PublisherMode;
  provider: PublisherProvider;
  rawResponse: Record<string, unknown>;
  runType: string;
};

type PublisherResult = PublisherFailure | PublisherSuccess;

type PlatformPayload = {
  copy: string;
  hasAssignedMedia: boolean;
  imageUrl: string | null;
};

export function getPublisherModeLabel() {
  const mode = getPublisherMode();

  if (mode === "live" && process.env.LIVE_PUBLISHING_ENABLED !== "true") {
    return "live requested, blocked until LIVE_PUBLISHING_ENABLED=true";
  }

  if (mode === "dry_run") {
    return "dry run, validates live publishing inputs without platform API calls";
  }

  if (mode === "live") {
    return "live platform API calls enabled";
  }

  return "local, creates local published artifacts only";
}

export async function publishPlatformOutput(context: PublisherContext): Promise<PublisherResult> {
  try {
    return await publishPlatformOutputInternal(context);
  } catch (error) {
    const mode = getPublisherMode();
    const provider = getProvider(context.job.platform, mode);

    return failPrepared({
      context,
      errorCode: "publisher_exception",
      errorMessage: `Publisher failed before recording a platform result: ${error instanceof Error ? error.message : "Unknown error"}`,
      mode,
      provider,
      rawResponse: {
        mode,
        status: "failed"
      }
    });
  }
}

async function publishPlatformOutputInternal(context: PublisherContext): Promise<PublisherResult> {
  const mode = getPublisherMode();
  const provider = getProvider(context.job.platform, mode);
  const media = await getAssignedMedia(context.contentItem.id, context.variant.id);
  const payload = buildPayload(context.variant, media);

  if (mode === "local") {
    const externalPostId = `local-${context.job.id.slice(0, 8)}-${context.attemptedAt.getTime()}`;

    return {
      ok: true,
      activityAction: "publication_job_local_published",
      activityMessage: `${getOutputDisplayTitle(context.variant)} published by local publisher.`,
      externalPostId,
      externalUrl: `https://example.com/${context.job.platform}/${externalPostId}`,
      integrationAccountId: context.integrationAccount?.id ?? context.job.integrationAccountId,
      mode,
      provider,
      rawResponse: {
        integrationAccountId: context.integrationAccount?.id ?? context.job.integrationAccountId,
        mode,
        status: "published"
      },
      runType: "local_publish"
    };
  }

  const prepared = await prepareLivePublish(context, payload, mode, provider);

  if (!prepared.ok) {
    return prepared;
  }

  if (mode === "dry_run") {
    const externalPostId = `dry-run-${context.job.id.slice(0, 8)}-${context.attemptedAt.getTime()}`;

    return {
      ok: true,
      activityAction: "publication_job_dry_run_published",
      activityMessage: `${getOutputDisplayTitle(context.variant)} passed live publisher dry run.`,
      externalPostId,
      externalUrl: `https://example.com/${context.job.platform}/${externalPostId}`,
      integrationAccountId: prepared.integrationAccount.id,
      mode,
      provider,
      rawResponse: {
        integrationAccountId: prepared.integrationAccount.id,
        mode,
        payload: prepared.safePayload,
        status: "dry_run_succeeded"
      },
      runType: "publisher_dry_run"
    };
  }

  if (process.env.LIVE_PUBLISHING_ENABLED !== "true") {
    return failPrepared({
      context,
      errorCode: "live_publishing_not_enabled",
      errorMessage: "Live publishing is blocked until LIVE_PUBLISHING_ENABLED=true is set.",
      mode,
      provider,
      rawResponse: { mode, status: "blocked" }
    });
  }

  if (context.job.platform === "facebook") {
    return publishFacebook(context, prepared, provider);
  }

  if (context.job.platform === "instagram") {
    return publishInstagram(context, prepared, provider);
  }

  if (context.job.platform === "linkedin") {
    return publishLinkedIn(context, prepared, provider);
  }

  return failPrepared({
    context,
    errorCode: "unsupported_platform",
    errorMessage: `No live publisher adapter exists for ${context.job.platform}.`,
    mode,
    provider,
    rawResponse: { mode, platform: context.job.platform, status: "failed" }
  });
}

async function prepareLivePublish(
  context: PublisherContext,
  payload: PlatformPayload,
  mode: PublisherMode,
  provider: PublisherProvider
) {
  if (!context.integrationAccount) {
    return failPrepared({
      context,
      errorCode: "missing_connected_destination",
      errorMessage: "Live publishing requires a connected destination for this brand and platform.",
      mode,
      provider,
      rawResponse: { mode, status: "failed" }
    });
  }

  if (context.integrationAccount.expiresAt && context.integrationAccount.expiresAt <= context.attemptedAt) {
    return failPrepared({
      context,
      errorCode: "destination_expired",
      errorMessage: "The connected destination is expired and must be refreshed before live publishing.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  if (!context.integrationAccount.externalAccountId) {
    return failPrepared({
      context,
      errorCode: "missing_external_account_id",
      errorMessage: "The connected destination is missing its platform account id.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  const credential = await getCredential(context.integrationAccount.id);

  if (!credential) {
    return failPrepared({
      context,
      errorCode: "missing_publisher_credential",
      errorMessage: "Live publishing requires a stored credential for this destination.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  if (context.job.platform === "instagram" && !payload.imageUrl) {
    return failPrepared({
      context,
      errorCode: "instagram_public_image_required",
      errorMessage: "Instagram publishing requires one assigned image with a public or external URL.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  if (context.job.platform === "facebook" && payload.hasAssignedMedia && !payload.imageUrl) {
    return failPrepared({
      context,
      errorCode: "facebook_public_image_required",
      errorMessage: "Facebook media publishing requires assigned media with a public or external URL.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  if (context.job.platform === "linkedin" && payload.hasAssignedMedia) {
    return failPrepared({
      context,
      errorCode: "linkedin_media_not_supported",
      errorMessage: "The first LinkedIn live adapter supports text posts only. Remove assigned media or publish through local mode.",
      mode,
      provider,
      rawResponse: { integrationAccountId: context.integrationAccount.id, mode, status: "failed" }
    });
  }

  return {
    ok: true as const,
    accessToken: decryptLocalCredential(credential.encryptedValue),
    integrationAccount: context.integrationAccount,
    payload,
    safePayload: getSafePayload(context.job.platform, context.integrationAccount, payload)
  };
}

async function publishFacebook(
  context: PublisherContext,
  prepared: Extract<Awaited<ReturnType<typeof prepareLivePublish>>, { ok: true }>,
  provider: PublisherProvider
): Promise<PublisherResult> {
  const graphVersion = getMetaGraphVersion();
  const hasImage = Boolean(prepared.payload.imageUrl);
  const body = new URLSearchParams(
    hasImage
      ? {
          caption: prepared.payload.copy,
          published: "true",
          url: prepared.payload.imageUrl ?? ""
        }
      : {
          message: prepared.payload.copy,
          published: "true"
        }
  );

  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${prepared.integrationAccount.externalAccountId}/${hasImage ? "photos" : "feed"}`,
    {
      body,
      headers: {
        Authorization: `Bearer ${prepared.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    }
  );
  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    return failPrepared({
      context,
      errorCode: "facebook_publish_failed",
      errorMessage: getApiErrorMessage("Facebook publish failed", response, responseBody),
      mode: "live",
      provider,
      rawResponse: responseBody
    });
  }

  const externalPostId = getStringValue(responseBody, "post_id") ?? getStringValue(responseBody, "id") ?? `facebook-${context.job.id}`;

  return liveSuccess({
    context,
    externalPostId,
    externalUrl: `https://www.facebook.com/${externalPostId}`,
    provider,
    rawResponse: responseBody
  });
}

async function publishInstagram(
  context: PublisherContext,
  prepared: Extract<Awaited<ReturnType<typeof prepareLivePublish>>, { ok: true }>,
  provider: PublisherProvider
): Promise<PublisherResult> {
  const graphVersion = getMetaGraphVersion();
  const containerBody = new URLSearchParams({
    caption: prepared.payload.copy,
    image_url: prepared.payload.imageUrl ?? ""
  });

  const containerResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/${prepared.integrationAccount.externalAccountId}/media`,
    {
      body: containerBody,
      headers: {
        Authorization: `Bearer ${prepared.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    }
  );
  const containerResult = await readJsonResponse(containerResponse);

  if (!containerResponse.ok) {
    return failPrepared({
      context,
      errorCode: "instagram_container_failed",
      errorMessage: getApiErrorMessage("Instagram media container creation failed", containerResponse, containerResult),
      mode: "live",
      provider,
      rawResponse: containerResult
    });
  }

  const creationId = getStringValue(containerResult, "id");

  if (!creationId) {
    return failPrepared({
      context,
      errorCode: "instagram_missing_creation_id",
      errorMessage: "Instagram media container creation did not return a creation id.",
      mode: "live",
      provider,
      rawResponse: containerResult
    });
  }

  const publishBody = new URLSearchParams({ creation_id: creationId });
  const publishResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/${prepared.integrationAccount.externalAccountId}/media_publish`,
    {
      body: publishBody,
      headers: {
        Authorization: `Bearer ${prepared.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST"
    }
  );
  const publishResult = await readJsonResponse(publishResponse);

  if (!publishResponse.ok) {
    return failPrepared({
      context,
      errorCode: "instagram_publish_failed",
      errorMessage: getApiErrorMessage("Instagram publish failed", publishResponse, publishResult),
      mode: "live",
      provider,
      rawResponse: {
        container: containerResult,
        publish: publishResult
      }
    });
  }

  const externalPostId = getStringValue(publishResult, "id") ?? creationId;

  return liveSuccess({
    context,
    externalPostId,
    externalUrl: `https://www.instagram.com/p/${externalPostId}/`,
    provider,
    rawResponse: {
      container: containerResult,
      publish: publishResult
    }
  });
}

async function publishLinkedIn(
  context: PublisherContext,
  prepared: Extract<Awaited<ReturnType<typeof prepareLivePublish>>, { ok: true }>,
  provider: PublisherProvider
): Promise<PublisherResult> {
  const body = {
    author: prepared.integrationAccount.externalAccountId,
    commentary: prepared.payload.copy,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    isReshareDisabledByAuthor: false,
    lifecycleState: "PUBLISHED",
    visibility: "PUBLIC"
  };

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${prepared.accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": process.env.LINKEDIN_API_VERSION ?? "202605",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    method: "POST"
  });
  const responseBody = await readJsonResponse(response);

  if (!response.ok) {
    return failPrepared({
      context,
      errorCode: "linkedin_publish_failed",
      errorMessage: getApiErrorMessage("LinkedIn publish failed", response, responseBody),
      mode: "live",
      provider,
      rawResponse: responseBody
    });
  }

  const externalPostId = response.headers.get("x-restli-id") ?? getStringValue(responseBody, "id") ?? `linkedin-${context.job.id}`;

  return liveSuccess({
    context,
    externalPostId,
    externalUrl: `https://www.linkedin.com/feed/update/${externalPostId}/`,
    provider,
    rawResponse: {
      id: externalPostId,
      response: responseBody
    }
  });
}

function liveSuccess({
  context,
  externalPostId,
  externalUrl,
  provider,
  rawResponse
}: {
  context: PublisherContext;
  externalPostId: string;
  externalUrl: string | null;
  provider: PublisherProvider;
  rawResponse: Record<string, unknown>;
}): PublisherSuccess {
  return {
    ok: true,
    activityAction: "publication_job_live_published",
    activityMessage: `${getOutputDisplayTitle(context.variant)} published through ${context.job.platform}.`,
    externalPostId,
    externalUrl,
    integrationAccountId: context.integrationAccount?.id ?? context.job.integrationAccountId,
    mode: "live",
    provider,
    rawResponse,
    runType: "live_publish"
  };
}

function failPrepared({
  context,
  errorCode,
  errorMessage,
  mode,
  provider,
  rawResponse
}: {
  context: PublisherContext;
  errorCode: string;
  errorMessage: string;
  mode: PublisherMode;
  provider: PublisherProvider;
  rawResponse: Record<string, unknown>;
}): PublisherFailure {
  return {
    ok: false,
    errorCode,
    errorMessage,
    integrationAccountId: context.integrationAccount?.id ?? context.job.integrationAccountId,
    mode,
    provider,
    rawResponse,
    runType: mode === "live" ? "live_publish" : "publisher_dry_run"
  };
}

function buildPayload(variant: typeof schema.platformVariants.$inferSelect, media: PublisherMedia[]): PlatformPayload {
  return {
    copy: [variant.caption, variant.headline, formatHashtags(variant.hashtags)].filter(Boolean).join("\n").trim(),
    hasAssignedMedia: media.length > 0,
    imageUrl: getFirstPublicMediaUrl(media)
  };
}

function getSafePayload(
  platform: string,
  account: typeof schema.integrationAccounts.$inferSelect,
  payload: PlatformPayload
) {
  if (platform === "linkedin") {
    return {
      author: account.externalAccountId,
      commentaryLength: payload.copy.length,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC"
    };
  }

  if (platform === "instagram") {
    return {
      captionLength: payload.copy.length,
      hasImageUrl: Boolean(payload.imageUrl),
      instagramUserId: account.externalAccountId
    };
  }

  return {
    messageLength: payload.copy.length,
    pageId: account.externalAccountId,
    published: true
  };
}

function getFirstPublicMediaUrl(media: PublisherMedia[]) {
  const firstPublicMedia = media.find(({ asset }) => {
    const url = asset.externalUrl || asset.publicUrl;
    return url?.startsWith("https://") || url?.startsWith("http://");
  });

  return firstPublicMedia?.asset.externalUrl ?? firstPublicMedia?.asset.publicUrl ?? null;
}

async function getAssignedMedia(contentItemId: string, platformVariantId: string) {
  const rows = await db
    .select({
      asset: schema.mediaAssets,
      relation: schema.contentMedia
    })
    .from(schema.contentMedia)
    .innerJoin(schema.mediaAssets, eq(schema.contentMedia.mediaAssetId, schema.mediaAssets.id))
    .where(eq(schema.contentMedia.contentItemId, contentItemId))
    .orderBy(schema.contentMedia.sortOrder, schema.contentMedia.createdAt);

  return rows
    .filter((row) => row.relation.platformVariantId === platformVariantId)
    .map((row) => ({ ...row.relation, asset: row.asset }));
}

async function getCredential(integrationAccountId: string) {
  const [credential] = await db
    .select()
    .from(schema.integrationCredentials)
    .where(eq(schema.integrationCredentials.integrationAccountId, integrationAccountId))
    .orderBy(desc(schema.integrationCredentials.createdAt))
    .limit(1);

  return credential ?? null;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { body: text.slice(0, 2000) };
  }
}

function getApiErrorMessage(prefix: string, response: Response, responseBody: Record<string, unknown>) {
  const apiMessage = getNestedStringValue(responseBody, ["error", "message"]) ?? getStringValue(responseBody, "message");
  return `${prefix}: ${response.status} ${response.statusText}${apiMessage ? ` - ${apiMessage}` : ""}`;
}

function getNestedStringValue(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;

  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function getStringValue(value: Record<string, unknown>, key: string) {
  const maybeValue = value[key];
  return typeof maybeValue === "string" ? maybeValue : undefined;
}

function formatHashtags(hashtags: string[] | null) {
  if (!hashtags?.length) {
    return "";
  }

  return hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
}

function getPublisherMode(): PublisherMode {
  const configuredMode = process.env.PUBLISHER_MODE?.trim().toLowerCase();
  return configuredMode === "live" || configuredMode === "dry_run" ? configuredMode : "local";
}

function getProvider(platform: string, mode: PublisherMode): PublisherProvider {
  if (mode === "local") {
    return "orchard_local_publisher";
  }

  if (platform === "instagram") {
    return "instagram_graph_api";
  }

  if (platform === "linkedin") {
    return "linkedin_posts_api";
  }

  return "facebook_graph_api";
}

function getMetaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION ?? "v23.0";
}

function getOutputDisplayTitle(
  variant: Pick<typeof schema.platformVariants.$inferSelect, "platform" | "postType" | "purpose" | "title">
) {
  const platform = variant.platform.charAt(0).toUpperCase() + variant.platform.slice(1);
  const purpose = variant.purpose && variant.purpose !== "main" ? ` ${variant.purpose.replaceAll("_", " ")}` : "";

  return variant.title || `${platform} ${variant.postType.replaceAll("_", " ")}${purpose}`;
}
