import { eq } from "drizzle-orm";
import { db, schema } from "@orchard/database";

const seededLocalAdminEmail = "admin@orchard.local";

export async function getCurrentUser() {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, seededLocalAdminEmail)).limit(1);
  return user ?? null;
}
