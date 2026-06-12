import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandDetail } from "@/lib/workspace-data";
import {
  deleteIntegrationAccountAction,
  disableIntegrationAccountAction,
  removeIntegrationCredentialAction,
  updateBrandProfileAction,
  upsertIntegrationAccountAction,
  validateIntegrationAccountAction
} from "../actions";
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
  const scheduleDefaults = getRecord(getRecord(detail.profile?.publishingFrequency).scheduleDefaults);
  const platforms = ["instagram", "facebook", "linkedin"];
  const platformsWithoutConnection = platforms.filter(
    (platform) => !detail.integrationAccounts.some((account) => account.platform === platform)
  );

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
              {platforms.map((platform) => (
                <ConnectedProfile
                  account={findPrimaryIntegrationAccount(detail.integrationAccounts, platform)}
                  brandId={detail.brand.id}
                  key={platform}
                  platform={platform}
                />
              ))}
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
              <label>
                Brand name
                <input name="brandName" defaultValue={detail.brand.name} required />
              </label>
              <label>
                Website
                <input name="websiteUrl" defaultValue={detail.brand.websiteUrl ?? ""} type="url" />
              </label>
              <label>
                Default language
                <input name="defaultLanguage" defaultValue={detail.brand.defaultLanguage ?? ""} placeholder="en" />
              </label>
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
                Forbidden symbols
                <textarea
                  name="forbiddenSymbols"
                  rows={3}
                  defaultValue={getStringArrayValue(languagePreferences, "forbiddenSymbols").join("\n")}
                  placeholder="One per line, for example: !, ->, emoji, excessive punctuation"
                />
              </label>
              <label className="wide-field">
                CTA guidance
                <textarea name="ctaGuidance" rows={3} defaultValue={getStringValue(ctaPreferences, "guidance")} />
              </label>
              <fieldset className="settings-fieldset wide-field">
                <legend>Scheduling defaults</legend>
                <label>
                  Instagram time
                  <input name="instagramDefaultTime" type="time" defaultValue={getScheduleDefault(scheduleDefaults, "instagram")} />
                </label>
                <label>
                  Facebook time
                  <input name="facebookDefaultTime" type="time" defaultValue={getScheduleDefault(scheduleDefaults, "facebook")} />
                </label>
                <label>
                  LinkedIn time
                  <input name="linkedinDefaultTime" type="time" defaultValue={getScheduleDefault(scheduleDefaults, "linkedin")} />
                </label>
                <label>
                  Fallback time
                  <input name="fallbackDefaultTime" type="time" defaultValue={getScheduleDefault(scheduleDefaults, "fallback")} />
                </label>
                <p className="form-note">These times prefill scheduling when a date is chosen without a specific time.</p>
              </fieldset>
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

          <article className="panel brand-profile-panel manual-connection-panel" id="manual-connections">
            <div>
              <p className="label">Manual connections</p>
              <h2>Register platform account</h2>
              <p>Save the exact publishing destinations and local tokens needed for manual publishing tests.</p>
            </div>
            {detail.integrationAccounts.length > 0 ? (
              <div className="connection-edit-list wide-field">
                {detail.integrationAccounts.map((account) => (
                  <article className="connection-edit-card" key={account.id}>
                    <form action={upsertIntegrationAccountAction} className="connection-edit-row">
                      <input name="brandId" type="hidden" value={detail.brand.id} />
                      <input name="accountId" type="hidden" value={account.id} />
                      <input name="platform" type="hidden" value={account.platform} />
                      <div>
                        <strong>{titleCase(account.platform)}</strong>
                        <span>{getPlatformAccountLabel(account.platform)}</span>
                        <small>{account.secretRef ? getExpirationLabel(account.expiresAt) : "no credential saved"}</small>
                      </div>
                      <label>
                        {getPlatformIdentifierLabel(account.platform)}
                        <input name="externalAccountId" defaultValue={account.externalAccountId ?? ""} required />
                      </label>
                      <label>
                        Display name
                        <input name="externalAccountName" defaultValue={account.externalAccountName ?? ""} required />
                      </label>
                      <label>
                        Status
                        <select name="status" defaultValue={account.status}>
                          <option value="connected">connected</option>
                          <option value="needs_attention">needs attention</option>
                          <option value="expired">expired</option>
                          <option value="disabled">disabled</option>
                        </select>
                      </label>
                      <label>
                        Expires at
                        <input name="expiresAt" defaultValue={formatDateInput(account.expiresAt)} type="date" />
                      </label>
                      <label>
                        Scopes
                        <input name="scopes" defaultValue={(account.scopes ?? []).join(", ")} />
                      </label>
                      <label>
                        Replace token
                        <input autoComplete="off" name="credentialValue" placeholder={getPlatformCredentialLabel(account.platform)} type="password" />
                      </label>
                      <button className="button secondary" type="submit">
                        Update
                      </button>
                    </form>
                    <div className="connection-security-actions">
                      <span>{account.secretRef ? "Credential reference saved" : "No credential saved"}</span>
                      <form action={validateIntegrationAccountAction}>
                        <input name="brandId" type="hidden" value={detail.brand.id} />
                        <input name="accountId" type="hidden" value={account.id} />
                        <button className="button secondary" type="submit">
                          Validate
                        </button>
                      </form>
                      <form action={removeIntegrationCredentialAction}>
                        <input name="brandId" type="hidden" value={detail.brand.id} />
                        <input name="accountId" type="hidden" value={account.id} />
                        <button className="button secondary" disabled={!account.secretRef} type="submit">
                          Remove credential
                        </button>
                      </form>
                      <form action={disableIntegrationAccountAction}>
                        <input name="brandId" type="hidden" value={detail.brand.id} />
                        <input name="accountId" type="hidden" value={account.id} />
                        <button className="button secondary" disabled={account.status === "disabled"} type="submit">
                          Disable
                        </button>
                      </form>
                      <form action={deleteIntegrationAccountAction}>
                        <input name="brandId" type="hidden" value={detail.brand.id} />
                        <input name="accountId" type="hidden" value={account.id} />
                        <button className="button secondary danger-button" type="submit">
                          Delete connection
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="platform-connection-grid wide-field">
              {platformsWithoutConnection.map((platform) => (
                <PlatformConnectionForm brandId={detail.brand.id} key={platform} platform={platform} />
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function ConnectedProfile({
  account,
  brandId,
  platform
}: {
  account: BrandSettingsIntegrationAccount | undefined;
  brandId: string;
  platform: string;
}) {
  const label = titleCase(platform);

  return (
    <div className="connected-profile-row">
      <span>{label.slice(0, 1)}</span>
      <div>
        <strong>{label}</strong>
        <small>
          {account
            ? `${account.externalAccountName ?? account.externalAccountId} / ${account.status} / ${account.secretRef ? getExpirationLabel(account.expiresAt) : "no credential saved"}`
            : "Not connected"}
        </small>
      </div>
      {account ? (
        <form action={validateIntegrationAccountAction}>
          <input name="brandId" type="hidden" value={brandId} />
          <input name="accountId" type="hidden" value={account.id} />
          <button className="button secondary" type="submit">
            Validate
          </button>
        </form>
      ) : (
        <a className="button secondary" href="#manual-connections">
          Add
        </a>
      )}
    </div>
  );
}

function PlatformConnectionForm({ brandId, platform }: { brandId: string; platform: string }) {
  return (
    <form action={upsertIntegrationAccountAction} className="platform-connection-card">
      <input name="brandId" type="hidden" value={brandId} />
      <input name="platform" type="hidden" value={platform} />
      <input name="status" type="hidden" value="connected" />
      <div>
        <p className="label">{getPlatformAccountLabel(platform)}</p>
        <h3>{titleCase(platform)}</h3>
        <p>{getPlatformHelper(platform)}</p>
      </div>
      <label>
        {getPlatformIdentifierLabel(platform)}
        <input name="externalAccountId" required />
      </label>
      <label>
        Display name
        <input name="externalAccountName" required />
      </label>
      <label>
        Token expires
        <input name="expiresAt" type="date" />
      </label>
      <label>
        {getPlatformCredentialLabel(platform)}
        <input autoComplete="off" name="credentialValue" type="password" />
      </label>
      <label>
        Scopes
        <input name="scopes" placeholder="Optional, comma-separated" />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <p className="form-note">
        Credential type is set automatically. Real manual tokens require LOCAL_CREDENTIAL_ENCRYPTION_KEY.
      </p>
      <button className="button secondary" type="submit">
        Save {titleCase(platform)}
      </button>
    </form>
  );
}

type BrandSettingsIntegrationAccount = Extract<Awaited<ReturnType<typeof getBrandDetail>>, { ok: true }>["integrationAccounts"][number];

function findPrimaryIntegrationAccount(accounts: BrandSettingsIntegrationAccount[], platform: string) {
  return (
    accounts.find((account) => account.platform === platform && account.status === "connected") ??
    accounts.find((account) => account.platform === platform && account.status !== "disabled") ??
    accounts.find((account) => account.platform === platform)
  );
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function getStringArrayValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getNestedGuidance(record: Record<string, unknown>, key: string) {
  const value = getRecord(record[key]);
  return getStringValue(value, "guidance");
}

function getScheduleDefault(record: Record<string, unknown>, platform: string) {
  return getStringValue(record, platform) || getBuiltInScheduleDefault(platform);
}

function getBuiltInScheduleDefault(platform: string) {
  const defaults: Record<string, string> = {
    facebook: "12:00",
    fallback: "10:00",
    instagram: "18:30",
    linkedin: "09:00"
  };

  return defaults[platform] ?? defaults.fallback;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function getPlatformAccountLabel(platform: string) {
  const labels: Record<string, string> = {
    facebook: "Facebook page",
    instagram: "Instagram business account",
    linkedin: "LinkedIn personal profile"
  };

  return labels[platform] ?? "Platform account";
}

function getPlatformIdentifierLabel(platform: string) {
  const labels: Record<string, string> = {
    facebook: "Page ID",
    instagram: "Instagram user ID",
    linkedin: "Personal URN"
  };

  return labels[platform] ?? "External account ID";
}

function getPlatformCredentialLabel(platform: string) {
  const labels: Record<string, string> = {
    facebook: "Page access token",
    instagram: "Instagram publishing token",
    linkedin: "LinkedIn access token"
  };

  return labels[platform] ?? "Access token";
}

function getPlatformHelper(platform: string) {
  const helpers: Record<string, string> = {
    facebook: "Use the Facebook Page ID and a page access token.",
    instagram: "Use the Instagram user ID and a token with publishing access.",
    linkedin: "Use a personal member URN and token. Organization publishing is deferred."
  };

  return helpers[platform] ?? "Use the destination account ID and token.";
}

function getExpirationLabel(value: Date | null) {
  if (!value) {
    return "expiration unknown";
  }

  const days = Math.ceil((value.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return "expired";
  }

  if (days <= 14) {
    return `expires in ${days} day(s)`;
  }

  return "token healthy";
}
