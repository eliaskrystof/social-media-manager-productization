import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/database/src/schema.ts",
  out: "./packages/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://orchard:orchard@localhost:5433/orchard"
  },
  verbose: true,
  strict: true
});
