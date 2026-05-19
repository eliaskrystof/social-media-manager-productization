import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./index";

async function runMigrations() {
  await migrate(db, {
    migrationsFolder: "packages/database/migrations"
  });

  console.log("Orchard database migrations are up to date.");
}

runMigrations()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
