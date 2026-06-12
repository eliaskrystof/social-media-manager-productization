"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@orchard/database";
import { clearSessionCookie, hashPassword, normalizeEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { slugify } from "@/lib/workspace-context";

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(readFormValue(formData, "email"));
  const password = readFormValue(formData, "password");

  if (!email || !password) {
    redirectWithNotice("error", "Login failed", "Email and password are required.");
  }

  const [row] = await db
    .select({
      credential: schema.userLoginCredentials,
      user: schema.users
    })
    .from(schema.users)
    .innerJoin(schema.userLoginCredentials, eq(schema.userLoginCredentials.userId, schema.users.id))
    .where(eq(schema.users.email, email))
    .limit(1);

  if (
    !row ||
    !verifyPassword(password, row.credential.passwordSalt, row.credential.passwordIterations, row.credential.passwordHash)
  ) {
    redirectWithNotice("error", "Login failed", "The email or password did not match a local account.");
  }

  await setSessionCookie(row.user.id);
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = normalizeEmail(readFormValue(formData, "email"));
  const displayName = readFormValue(formData, "displayName");
  const password = readFormValue(formData, "password");
  const workspaceName = readFormValue(formData, "workspaceName") || `${displayName || email}'s workspace`;
  const brandName = readFormValue(formData, "brandName");

  if (!email || !password || password.length < 8) {
    redirectWithNotice("error", "Account not created", "Use an email and a password with at least 8 characters.");
  }

  const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

  if (existingUser) {
    redirectWithNotice("error", "Account not created", "A local account already exists for that email.");
  }

  const passwordFields = hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(schema.users)
      .values({
        authProvider: "local",
        authProviderUserId: email,
        displayName: displayName || null,
        email
      })
      .returning({ id: schema.users.id });

    if (!user) {
      throw new Error("The local account could not be created.");
    }

    await tx.insert(schema.userLoginCredentials).values({
      userId: user.id,
      ...passwordFields
    });

    const [workspace] = await tx
      .insert(schema.workspaces)
      .values({
        name: workspaceName,
        slug: `${slugify(workspaceName)}-${Date.now().toString(36)}`
      })
      .returning({ id: schema.workspaces.id });

    if (!workspace) {
      throw new Error("The workspace could not be created.");
    }

    await tx.insert(schema.workspaceMembers).values({
      role: "owner",
      userId: user.id,
      workspaceId: workspace.id
    });

    await tx.insert(schema.activityLogs).values({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "workspace",
      entityId: workspace.id,
      action: "workspace_created",
      message: `Created workspace ${workspaceName}.`,
      metadata: { source: "signup", role: "owner" }
    });

    if (brandName) {
      const [brand] = await tx
        .insert(schema.brands)
        .values({
          defaultLanguage: "en",
          name: brandName,
          slug: `${slugify(brandName)}-${Date.now().toString(36)}`,
          workspaceId: workspace.id
        })
        .returning({ id: schema.brands.id });

      if (brand) {
        await tx.insert(schema.brandProfiles).values({
          brandId: brand.id,
          description: null,
          platformRules: {
            facebook: { enabled: true },
            instagram: { enabled: true },
            linkedin: { enabled: true }
          }
        });

        await tx.insert(schema.activityLogs).values({
          workspaceId: workspace.id,
          brandId: brand.id,
          actorUserId: user.id,
          entityType: "brand",
          entityId: brand.id,
          action: "brand_created",
          message: `Created brand ${brandName}.`,
          metadata: { source: "signup" }
        });
      }
    }

    return user.id;
  });

  await setSessionCookie(userId);
  redirect(brandName ? "/" : "/onboarding");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/login");
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithNotice(kind: "error" | "success", title: string, message: string): never {
  const params = new URLSearchParams({
    actionMessage: message,
    actionNotice: kind,
    actionTitle: title
  });

  redirect(`/login?${params.toString()}`);
}
