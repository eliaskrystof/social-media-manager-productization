# Social Media Manager Productization

This repository is the working base for turning an existing internal social media automation system into a product.

Working codename: `Orchard`.

The new product should be treated as a fresh implementation. The existing n8n workflows, Apps Script files, Google Sheets behavior, and Supabase schemas are preserved here as reference material and process knowledge from a working implementation.

## Current Repository Contents

- `Social_media_manager_workflows/`: main legacy social media n8n workflows.
- `Linkedin_solo_workflows/`: LinkedIn-only branch of the main automation, useful as a reference for LinkedIn publishing behavior.
- `Newsletter_workflows/`: client-specific newsletter workflows, kept as reference/backup.
- `appscripts/`: legacy Google Apps Script UI and integration code.
- `db_schemas/`: legacy database schemas.
- `docs/`: audit, process documentation, and product planning notes.

Some legacy exports/scripts are intentionally redacted before Git tracking. Secret values such as service-role keys must be replaced with placeholders and restored only through safe local environment configuration when needed.

Start with:

- `docs/architecture-audit.md`
- `docs/current-processes.md`
- `docs/legacy-google-sheets-map.md`
- `docs/legacy-workflow-map.md`
- `docs/legacy-status-and-state-map.md`
- `docs/legacy-linkedin-comparison.md`
- `docs/target-data-model.md`
- `docs/mvp-application-scope.md`
- `docs/implementation-readiness-plan.md`
- `docs/implementation-start-plan.md`
- `docs/architecture-decisions.md`
- `docs/audit-completion-checklist.md`
- `docs/project-foundation.md`
- `docs/frontend-implementation-notes.md`
- `docs/product-design-log.md`
- `docs/milestone-1-local-skeleton.md`
- `docs/milestone-2-local-workflow-editor.md`
- `CHANGELOG.md`

## Current Direction

- Build the product from scratch.
- Use the current implementation as a knowledge source, not as the target architecture.
- Keep new project databases fully separate from legacy databases.
- Keep new n8n workflows/instances separate from legacy automation.
- Start local-first for testing.
- Preserve the option to move n8n and database infrastructure to a remote server later.

## Local Development

The first implementation milestone is `Local Orchard Skeleton`.

It uses:

- Next.js app in `apps/web`,
- Drizzle schema and migrations in `packages/database`,
- local Postgres through `DATABASE_URL`,
- local filesystem media root through `LOCAL_MEDIA_ROOT`,
- a stub n8n boundary in `packages/n8n-client`.

Create a local environment file:

```bash
cp .env.example .env
```

Then set `DATABASE_URL` to your local Postgres database. The project Docker Compose uses port `5433` so it can run next to another local Postgres/n8n setup.

Start the Orchard-only Postgres service:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Stop it when needed:

```bash
docker compose -f infra/docker/docker-compose.yml down
```

Install dependencies:

```bash
npm install
```

Run database migrations:

```bash
npm run db:migrate
```

Generate a new Drizzle migration after changing the schema:

```bash
npm run db:generate
```

Seed the local workspace:

```bash
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Local media files should live under `.local-media/`, which is ignored by Git.

`npm run db:migrate` uses the Drizzle runtime migrator. `npm run db:generate`
uses Drizzle Kit to generate SQL migration files from the TypeScript schema.

## Git Status

Git is expected to track all project documentation, architecture decisions, workflow references, schemas, and future application code.

The repository is initialized and connected to GitHub:

- `https://github.com/eliaskrystof/social-media-manager-productization.git`
