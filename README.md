# Social Media Manager Productization

This repository is the working base for turning an existing internal social media automation system into a product.

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
- `docs/audit-completion-checklist.md`
- `docs/project-foundation.md`

## Current Direction

- Build the product from scratch.
- Use the current implementation as a knowledge source, not as the target architecture.
- Keep new project databases fully separate from legacy databases.
- Keep new n8n workflows/instances separate from legacy automation.
- Start local-first for testing.
- Preserve the option to move n8n and database infrastructure to a remote server later.

## Git Status

Git is expected to track all project documentation, architecture decisions, workflow references, schemas, and future application code.

The repository is initialized and connected to GitHub:

- `https://github.com/eliaskrystof/social-media-manager-productization.git`
