import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { signInAction, signUpAction } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    actionMessage?: string;
    actionNotice?: string;
    actionTitle?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const notice = await searchParams;

  if (user) {
    redirect("/");
  }

  return (
    <main className="shell auth-shell">
      {notice.actionNotice && notice.actionMessage ? (
        <div className={`action-notice ${notice.actionNotice === "error" ? "error" : "success"}`}>
          <strong>{notice.actionTitle ?? "Local account"}</strong>
          <p>{notice.actionMessage}</p>
        </div>
      ) : null}

      <section className="page-heading">
        <p className="eyebrow">Local account</p>
        <h1>Sign in to Orchard</h1>
        <p className="lede">Use a local account to keep workspace, brand, and publishing connection state separate from seed data.</p>
      </section>

      <section className="auth-grid">
        <article className="panel">
          <p className="label">Existing user</p>
          <h2>Log in</h2>
          <form action={signInAction} className="content-form single-column">
            <label>
              Email
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              Password
              <input autoComplete="current-password" minLength={8} name="password" required type="password" />
            </label>
            <button className="button" type="submit">
              Log in
            </button>
          </form>
        </article>

        <article className="panel">
          <p className="label">New local user</p>
          <h2>Create account</h2>
          <form action={signUpAction} className="content-form single-column">
            <label>
              Name
              <input autoComplete="name" name="displayName" />
            </label>
            <label>
              Email
              <input autoComplete="email" name="email" required type="email" />
            </label>
            <label>
              Password
              <input autoComplete="new-password" minLength={8} name="password" required type="password" />
            </label>
            <label>
              Workspace
              <input name="workspaceName" placeholder="Studio, agency, project..." />
            </label>
            <label>
              First brand
              <input name="brandName" placeholder="Optional, can be added during onboarding" />
            </label>
            <button className="button" type="submit">
              Create local account
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
