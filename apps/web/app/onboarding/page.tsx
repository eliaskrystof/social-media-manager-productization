import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentWorkspaceContext } from "@/lib/workspace-context";
import { getBrands } from "@/lib/workspace-data";
import { completeOnboardingAction } from "./actions";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<{
    actionMessage?: string;
    actionNotice?: string;
    actionTitle?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await getCurrentUser();
  const notice = await searchParams;

  if (!user) {
    redirect("/login");
  }

  const context = await getCurrentWorkspaceContext();
  const brands = context ? await getBrands() : [];

  if (context && brands.length > 0) {
    redirect("/");
  }

  return (
    <main className="shell">
      {notice.actionNotice && notice.actionMessage ? (
        <div className={`action-notice ${notice.actionNotice === "error" ? "error" : "success"}`}>
          <strong>{notice.actionTitle ?? "Onboarding"}</strong>
          <p>{notice.actionMessage}</p>
        </div>
      ) : null}

      <section className="page-heading">
        <p className="eyebrow">Onboarding</p>
        <h1>Create your workspace and first brand</h1>
        <p className="lede">This replaces the seeded demo assumption with a real local workspace owned by your account.</p>
      </section>

      <section className="panel wide">
        <form action={completeOnboardingAction} className="content-form brand-profile-form">
          {!context ? (
            <label className="wide-field">
              Workspace name
              <input name="workspaceName" placeholder="Studio, agency, or project name" required />
            </label>
          ) : null}

          <label>
            Brand name
            <input name="brandName" required />
          </label>
          <label>
            Website
            <input name="websiteUrl" placeholder="https://example.com" type="url" />
          </label>
          <label>
            Default language
            <input name="defaultLanguage" placeholder="en" />
          </label>
          <label className="wide-field">
            Brand description
            <textarea name="description" rows={4} />
          </label>
          <label>
            Target audience
            <textarea name="targetAudience" rows={3} />
          </label>
          <label>
            Products and services
            <textarea name="productsServices" rows={3} />
          </label>
          <label>
            Tone of voice
            <textarea name="toneOfVoice" rows={3} />
          </label>
          <label>
            Preferred style
            <textarea name="preferredStyle" rows={3} />
          </label>
          <label className="wide-field">
            Content pillars
            <textarea name="contentPillars" rows={3} placeholder="One per line, or comma-separated" />
          </label>
          <label className="wide-field">
            Forbidden phrases
            <textarea name="forbiddenPhrases" rows={3} placeholder="One per line, or comma-separated" />
          </label>

          <fieldset className="settings-fieldset wide-field">
            <legend>Active platforms</legend>
            <label className="checkbox-label">
              <input defaultChecked name="instagramEnabled" type="checkbox" /> Instagram
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="facebookEnabled" type="checkbox" /> Facebook
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="linkedinEnabled" type="checkbox" /> LinkedIn
            </label>
          </fieldset>

          <label>
            Instagram rules
            <textarea name="instagramRules" rows={3} />
          </label>
          <label>
            Facebook rules
            <textarea name="facebookRules" rows={3} />
          </label>
          <label>
            LinkedIn rules
            <textarea name="linkedinRules" rows={3} />
          </label>

          <button className="button" type="submit">
            Finish onboarding
          </button>
        </form>
      </section>
    </main>
  );
}
