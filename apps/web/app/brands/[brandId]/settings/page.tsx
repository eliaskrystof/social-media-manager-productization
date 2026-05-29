import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandDetail } from "@/lib/workspace-data";
import { updateBrandProfileAction } from "../actions";
import { BrandActionNotice, BrandFormFeedback } from "../brand-form-feedback";

export const dynamic = "force-dynamic";

type BrandSettingsPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    actionMessage?: string;
    actionNotice?: string;
    actionTitle?: string;
  }>;
};

export default async function BrandSettingsPage({ params, searchParams }: BrandSettingsPageProps) {
  const { brandId } = await params;
  const notice = await searchParams;
  const detail = await getBrandDetail(brandId);

  if (!detail.ok) {
    notFound();
  }

  const languagePreferences = getRecord(detail.profile?.languagePreferences);
  const platformRules = getRecord(detail.profile?.platformRules);
  const ctaPreferences = getRecord(detail.profile?.ctaPreferences);

  return (
    <main className="shell">
      {notice.actionNotice && notice.actionMessage ? (
        <BrandActionNotice
          kind={notice.actionNotice === "error" ? "error" : "success"}
          message={notice.actionMessage}
          title={notice.actionTitle ?? "Brand settings"}
        />
      ) : null}

      <section className="page-heading">
        <p className="eyebrow">Brand settings</p>
        <h1>{detail.brand.name}</h1>
        <p className="lede">Identity, connected profiles, and generation settings for this brand.</p>
        <div className="actions">
          <Link className="button secondary" href={`/brands/${detail.brand.id}`}>
            Brand workspace
          </Link>
          <Link className="button secondary" href={`/brands/${detail.brand.id}/content`}>
            Content
          </Link>
        </div>
      </section>

      <section className="settings-layout">
        <aside className="settings-side">
          <article className="panel brand-presence-card">
            <p className="label">Profile picture</p>
            <div className="brand-avatar-large" aria-hidden="true">
              {detail.brand.name.slice(0, 1).toUpperCase()}
            </div>
            <h2>{detail.brand.name}</h2>
            <p>Profile image upload and brand visual assets will live here.</p>
            <button className="button secondary" disabled type="button">
              Upload image
            </button>
          </article>

          <article className="panel">
            <p className="label">Connected profiles</p>
            <div className="connected-profile-list">
              <ConnectedProfile label="Instagram" />
              <ConnectedProfile label="Facebook" />
              <ConnectedProfile label="LinkedIn" />
            </div>
          </article>

          <article className="panel">
            <p className="label">Automation</p>
            <h2>Onboarding intelligence</h2>
            <p>Future onboarding can analyze historical posts, score engagement, and draft this profile automatically.</p>
          </article>
        </aside>

        <section className="settings-main">
          <article className="panel brand-profile-panel">
            <div>
              <p className="label">Brand identity</p>
              <h2>Generation profile</h2>
              <p>These settings describe how generated copy should sound before platform-specific output is prepared.</p>
            </div>
            <form action={updateBrandProfileAction} className="content-form brand-profile-form">
              <input name="brandId" type="hidden" value={detail.brand.id} />
              <label className="wide-field">
                Brand description
                <textarea name="description" rows={4} defaultValue={detail.profile?.description ?? ""} />
              </label>
              <label>
                Target audience
                <textarea name="targetAudience" rows={4} defaultValue={detail.profile?.targetAudience ?? ""} />
              </label>
              <label>
                Products and services
                <textarea name="productsServices" rows={4} defaultValue={detail.profile?.productsServices ?? ""} />
              </label>
              <label>
                Tone of voice
                <textarea name="toneOfVoice" rows={3} defaultValue={detail.profile?.toneOfVoice ?? ""} />
              </label>
              <label>
                Preferred style
                <textarea name="preferredStyle" rows={3} defaultValue={detail.profile?.preferredStyle ?? ""} />
              </label>
              <label>
                Typical post length
                <input name="typicalPostLength" defaultValue={getStringValue(languagePreferences, "typicalPostLength")} />
              </label>
              <label>
                Emoji usage
                <input
                  name="emojiUsage"
                  placeholder="No emoji, light emoji, product launches only..."
                  defaultValue={getStringValue(languagePreferences, "emojiUsage")}
                />
              </label>
              <label>
                Hashtag rules
                <input
                  name="hashtagRules"
                  placeholder="3-5 hashtags, Czech only, no generic tags..."
                  defaultValue={getStringValue(languagePreferences, "hashtagRules")}
                />
              </label>
              <label className="wide-field">
                Content pillars
                <textarea name="contentPillars" rows={3} defaultValue={(detail.profile?.contentPillars ?? []).join("\n")} />
              </label>
              <label className="wide-field">
                Forbidden phrases
                <textarea name="forbiddenPhrases" rows={3} defaultValue={(detail.profile?.forbiddenPhrases ?? []).join("\n")} />
              </label>
              <label className="wide-field">
                CTA guidance
                <textarea name="ctaGuidance" rows={3} defaultValue={getStringValue(ctaPreferences, "guidance")} />
              </label>
              <label>
                Instagram rules
                <textarea name="instagramRules" rows={4} defaultValue={getNestedGuidance(platformRules, "instagram")} />
              </label>
              <label>
                Facebook rules
                <textarea name="facebookRules" rows={4} defaultValue={getNestedGuidance(platformRules, "facebook")} />
              </label>
              <label>
                LinkedIn rules
                <textarea name="linkedinRules" rows={4} defaultValue={getNestedGuidance(platformRules, "linkedin")} />
              </label>
              <button className="button" type="submit">
                Save brand profile
              </button>
              <BrandFormFeedback />
            </form>
          </article>
        </section>
      </section>
    </main>
  );
}

function ConnectedProfile({ label }: { label: string }) {
  return (
    <div className="connected-profile-row">
      <span>{label.slice(0, 1)}</span>
      <div>
        <strong>{label}</strong>
        <small>Not connected</small>
      </div>
      <button className="button secondary" disabled type="button">
        Connect
      </button>
    </div>
  );
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getNestedGuidance(record: Record<string, unknown>, key: string) {
  const value = getRecord(record[key]);
  return getStringValue(value, "guidance");
}
