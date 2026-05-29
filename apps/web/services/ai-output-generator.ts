import { schema } from "@orchard/database";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadRootEnv();

type ContentItem = typeof schema.contentItems.$inferSelect;
type PlatformVariant = typeof schema.platformVariants.$inferSelect;
type BrandProfile = typeof schema.brandProfiles.$inferSelect;

type AiOperation = "generate" | "regenerate" | "edit";

type ManualHints = {
  caption: string | null;
  hashtags: string[] | null;
  headline: string | null;
  purpose: string;
  title: string | null;
};

export type PublishingOutputAiInput = {
  contentItem: ContentItem;
  generationInstruction?: string;
  manualHints?: ManualHints;
  operation: AiOperation;
  profile?: BrandProfile;
  variant: PlatformVariant;
};

export type PublishingOutputAiResult = {
  caption: string;
  hashtags: string[] | null;
  headline: string | null;
  model: string | null;
  provider: "app_server_dummy" | "openai_responses";
  raw?: Record<string, unknown>;
  title: string | null;
};

export async function generatePublishingOutput(input: PublishingOutputAiInput) {
  return generateOutput({ ...input, operation: "generate" });
}

export async function regeneratePublishingOutput(input: PublishingOutputAiInput) {
  return generateOutput({ ...input, operation: "regenerate" });
}

export async function editPublishingOutput(input: PublishingOutputAiInput) {
  return generateOutput({ ...input, operation: "edit" });
}

export function getBrandGenerationContext(profile: BrandProfile | undefined) {
  if (!profile) {
    return null;
  }

  return {
    contentPillars: profile.contentPillars,
    ctaPreferences: profile.ctaPreferences,
    description: profile.description,
    forbiddenPhrases: profile.forbiddenPhrases,
    languagePreferences: profile.languagePreferences,
    platformRules: profile.platformRules,
    preferredStyle: profile.preferredStyle,
    productsServices: profile.productsServices,
    targetAudience: profile.targetAudience,
    toneOfVoice: profile.toneOfVoice
  };
}

export function createAiRunInput(input: PublishingOutputAiInput) {
  return {
    brandProfile: getBrandGenerationContext(input.profile),
    generationInstruction: input.generationInstruction || null,
    instructionPolicy: {
      priority: ["brandProfile", "platformRules", "generationInstruction", "manualHints", "source"],
      summary: "Brand profile defines voice, style, length, emoji, hashtag, and platform behavior. Source content defines facts and topic."
    },
    manualHints: input.manualHints ?? null,
    operation: input.operation,
    output: {
      caption: input.variant.caption,
      hashtags: input.variant.hashtags,
      headline: input.variant.headline,
      platform: input.variant.platform,
      postType: input.variant.postType,
      purpose: input.variant.purpose,
      title: input.variant.title
    },
    source: {
      brief: input.contentItem.brief,
      contentType: input.contentItem.contentType,
      language: input.contentItem.language,
      masterContent: input.contentItem.masterContent,
      title: input.contentItem.title
    }
  };
}

async function generateOutput(input: PublishingOutputAiInput): Promise<PublishingOutputAiResult> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "dummy";

  if (provider === "openai") {
    return generateWithOpenAi(input);
  }

  return generateWithDummy(input);
}

async function generateWithOpenAi(input: PublishingOutputAiInput): Promise<PublishingOutputAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: createSystemPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: createUserPrompt(input)
            }
          ]
        }
      ],
      model,
      text: {
        format: {
          type: "json_schema",
          name: "publishing_output",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "headline", "caption", "hashtags"],
            properties: {
              title: {
                type: ["string", "null"],
                description: "Short internal working title for identifying this publishing output in workflow UI."
              },
              headline: {
                type: ["string", "null"],
                description: "Optional visible headline for the final post. Use null when the platform format does not need one."
              },
              caption: {
                type: "string",
                description: "Platform-ready post caption."
              },
              hashtags: {
                type: "array",
                description: "Hashtags without the leading # character.",
                items: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    })
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(getOpenAiErrorMessage(payload, response.status));
  }

  const parsed = parseOpenAiOutput(payload);

  return {
    ...parsed,
    model,
    provider: "openai_responses",
    raw: {
      id: typeof payload.id === "string" ? payload.id : null,
      model: typeof payload.model === "string" ? payload.model : model,
      status: typeof payload.status === "string" ? payload.status : null
    }
  };
}

function createSystemPrompt() {
  return [
    "You prepare social media publishing outputs for a brand.",
    "Instruction priority:",
    "1. Brand profile is the authoritative source for voice, audience, positioning, preferred style, forbidden phrases, emoji usage, hashtag rules, CTA behavior, length, and platform-specific behavior.",
    "2. Platform, post type, and purpose define the final format.",
    "3. User generation instruction defines the angle for this specific output, but must stay within the brand profile.",
    "4. Manual hints and existing output should be considered when present.",
    "5. Source content provides facts, topic, and raw material, but it must be rewritten into the brand identity instead of copied mechanically.",
    "Do not use forbidden phrases.",
    "Do not invent concrete facts, offers, prices, dates, claims, or metrics that are not present in the source or brand profile.",
    "Create a short internal title that helps a user identify the output in a list. The title is not necessarily shown in the published post.",
    "Use headline only when a visible post headline is useful for the requested platform and format. Otherwise return null for headline.",
    "Follow hashtag guidance. Return hashtags without the leading # character.",
    "Return only the requested structured output."
  ].join("\n");
}

function createUserPrompt(input: PublishingOutputAiInput) {
  return JSON.stringify(
    {
      task: getOperationInstruction(input.operation),
      ...createAiRunInput(input)
    },
    null,
    2
  );
}

function getOperationInstruction(operation: AiOperation) {
  if (operation === "regenerate") {
    return "Rebuild the output from the brand profile and source content. Do not lightly polish the old version unless manual hints explicitly ask for that.";
  }

  if (operation === "edit") {
    return "Edit the existing output according to the instruction while preserving factual accuracy and brand identity.";
  }

  return "Create a new platform-ready publishing output from the brand profile and source content.";
}

function generateWithDummy(input: PublishingOutputAiInput): PublishingOutputAiResult {
  if (input.operation === "regenerate") {
    return createDummyRegeneratedOutput(input);
  }

  if (input.operation === "edit") {
    return createDummyAiEdit(input);
  }

  return createDummyOutputDraft(input);
}

function parseOpenAiOutput(payload: Record<string, unknown>) {
  const outputText = typeof payload.output_text === "string" ? payload.output_text : extractOutputText(payload.output);

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  const parsed = JSON.parse(outputText) as Partial<Pick<PublishingOutputAiResult, "caption" | "hashtags" | "headline" | "title">>;

  if (typeof parsed.caption !== "string") {
    throw new Error("OpenAI response did not include a caption.");
  }

  return {
    caption: parsed.caption,
    hashtags: normalizeHashtags(parsed.hashtags),
    headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : null,
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : null
  };
}

function extractOutputText(output: unknown): string | null {
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function getOpenAiErrorMessage(payload: Record<string, unknown>, status: number) {
  const error = isRecord(payload.error) ? payload.error : null;
  const message = error && typeof error.message === "string" ? error.message : `OpenAI request failed with status ${status}.`;

  return message;
}

function createDummyOutputDraft(input: PublishingOutputAiInput): PublishingOutputAiResult {
  const title = input.contentItem.title || "Untitled update";
  const source = [input.contentItem.masterContent || input.contentItem.brief || title, input.variant.caption, input.generationInstruction]
    .filter(Boolean)
    .join("\n\n");
  const platformLabel = titleCase(input.variant.platform);
  const headline = `${platformLabel}: ${title}`;
  const caption = getPlatformCaption(input.variant.platform, source, title, input.profile);

  return {
    caption,
    hashtags: getPlatformTags(input.variant.platform),
    headline,
    model: null,
    provider: "app_server_dummy",
    title: createOutputTitle(input, title)
  };
}

function createDummyRegeneratedOutput(input: PublishingOutputAiInput): PublishingOutputAiResult {
  const title = input.contentItem.title || "Untitled update";
  const source = input.contentItem.masterContent || input.contentItem.brief || title;
  const angle = input.generationInstruction || "fresh platform-specific angle";
  const platformLabel = titleCase(input.variant.platform);
  const tone = input.profile?.toneOfVoice ? ` Tone of voice: ${input.profile.toneOfVoice}.` : "";

  return {
    caption: `${title}\n\n${source}\n\nRegenerated with a ${angle}.${tone} This version is intentionally rebuilt from the master instead of lightly edited.`,
    hashtags: getPlatformTags(input.variant.platform),
    headline: `${platformLabel}: ${title} refreshed`,
    model: null,
    provider: "app_server_dummy",
    title: createOutputTitle(input, `${title} refresh`)
  };
}

function createDummyAiEdit(input: PublishingOutputAiInput): PublishingOutputAiResult {
  const base =
    input.variant.caption || input.contentItem.masterContent || input.contentItem.brief || input.contentItem.title || "Prepared post";
  const instruction = input.generationInstruction || "Make this clearer and ready for review.";
  const normalizedInstruction = instruction.toLowerCase();
  const headline = input.variant.headline || `${titleCase(input.variant.platform)} update`;
  const tone = input.profile?.toneOfVoice ? ` Tone: ${input.profile.toneOfVoice}.` : "";
  let caption = base.trim();

  if (normalizedInstruction.includes("short")) {
    caption = caption.split(/[.!?]/)[0]?.trim() || caption.slice(0, 160).trim();
  } else if (normalizedInstruction.includes("cta") || normalizedInstruction.includes("call")) {
    caption = `${caption}\n\nTell us what you want to prepare next.`;
  } else if (normalizedInstruction.includes("formal") || normalizedInstruction.includes("professional")) {
    caption = `${caption}\n\nPrepared for a clear professional audience.`;
  } else {
    caption = `${caption}\n\nPolished draft: clear message, platform-ready structure, and review-ready wording.${tone}`;
  }

  return {
    caption,
    hashtags: input.variant.hashtags?.length ? input.variant.hashtags : getPlatformTags(input.variant.platform),
    headline,
    model: null,
    provider: "app_server_dummy",
    title: input.variant.title || createOutputTitle(input, headline)
  };
}

function getPlatformCaption(platform: string, source: string, title: string, profile?: BrandProfile) {
  const tone = profile?.toneOfVoice ? `\n\nTone guide: ${profile.toneOfVoice}.` : "";
  const audience = profile?.targetAudience ? `\nAudience: ${profile.targetAudience}.` : "";

  if (platform === "instagram") {
    return `${title}\n\n${source}${tone}${audience}\n\nA visual-first draft ready for image selection and review.`;
  }

  if (platform === "facebook") {
    return `${source}${tone}${audience}\n\nA community-focused version with enough context for discussion.`;
  }

  if (platform === "linkedin") {
    return `${title}\n\n${source}${tone}${audience}\n\nPrepared as a concise professional update with a clear takeaway.`;
  }

  return source;
}

function getPlatformTags(platform: string) {
  const tags: Record<string, string[]> = {
    facebook: ["community", "update"],
    instagram: ["socialmedia", "content", "brand"],
    linkedin: ["contentops", "marketing", "workflow"]
  };

  return tags[platform] ?? ["content"];
}

function createOutputTitle(input: PublishingOutputAiInput, fallback: string) {
  if (input.variant.title) {
    return input.variant.title;
  }

  const platform = titleCase(input.variant.platform);
  const postType = input.variant.postType.replaceAll("_", " ");
  const title = fallback.trim() || input.contentItem.title || "Output";

  return `${platform} ${postType}: ${title}`.slice(0, 90);
}

function normalizeHashtags(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const tags = value
    .map((tag) => (typeof tag === "string" ? tag.trim().replace(/^#/, "") : ""))
    .filter(Boolean);

  return tags.length > 0 ? tags : null;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function loadRootEnv() {
  const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.INIT_CWD,
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(serviceDirectory, "../../..")
  ].filter(Boolean) as string[];

  const rootDirectories = [...new Set(candidates.map((candidate) => path.resolve(candidate)))];

  for (const rootDirectory of rootDirectories) {
    loadEnvFile(path.join(rootDirectory, ".env"));
    loadEnvFile(path.join(rootDirectory, ".env.local"));
  }
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const file = fs.readFileSync(filePath, "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim());

    if (key) {
      process.env[key] = value;
    }
  }
}

function unquoteEnvValue(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
