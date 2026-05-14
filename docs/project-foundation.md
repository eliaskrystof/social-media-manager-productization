# Project Foundation Notes

Date: 2026-05-14

## Product Starting Point

The project should be treated as a separate product project, not as a direct continuation of the legacy automation.

The existing implementation is valuable because it proves the workflow and contains practical knowledge. Parts that work well can be preserved, adapted, or reused, but they should be pulled into the new product deliberately rather than inherited by accident.

Legacy assets should be used as:

- process documentation,
- behavior reference,
- platform edge-case reference,
- prompt and content-generation reference,
- migration reference for existing clients,
- historical context for architecture decisions.

They should not be used as:

- the final product data model,
- the final product API contract,
- the final frontend architecture,
- the final infrastructure layout,
- the final security model.

In short: separate project, selective reuse.

## Git

The project should be Git-based from the start.

Git should track:

- documentation,
- architecture decisions,
- database schema proposals,
- n8n workflow references and future workflow exports,
- frontend/backend source code,
- infrastructure definitions,
- migration notes.

Git should not track:

- secrets,
- service-role keys,
- local database volumes,
- local n8n runtime data,
- generated build outputs,
- temporary exports,
- local `.env` files.

Legacy exports may be committed as reference material only after secrets are redacted. Hardcoded service-role keys, API keys, and production tokens must be replaced by placeholders before the first commit.

Current repository preparation:

- `.gitignore` has been added.
- `README.md` has been added.
- Git itself is not currently available in the shell PATH, so the repository has not yet been initialized with `git init`.

Once Git is installed or available in PATH, initialize the repository:

```powershell
git init
git add .
git commit -m "Initial project audit and documentation"
```

## Databases

The new project should use new databases that are fully separate from the legacy implementation.

Current options to keep open:

- Supabase project/database.
- Local self-hosted Postgres database.
- Local Postgres first, then remote Postgres later.
- Supabase first, then remote/self-hosted Postgres later if needed.

Architectural preference:

- design the application around standard Postgres-compatible schema and migrations,
- avoid hard-coding Supabase-specific assumptions unless they provide clear product value,
- if Supabase is used, isolate Supabase-specific features behind clear boundaries.

Important future decision:

- whether Supabase Auth/RLS/Storage are core product dependencies,
- or whether the product should use a more portable Postgres + server API model.

## n8n

The new n8n setup should be separate from the legacy automation.

Initial testing phase:

- local self-hosted n8n instance,
- local or test database,
- separate credentials,
- separate webhook URLs,
- separate workflow exports.

Future production phase:

- move n8n to a remote server when needed,
- keep workflow exports in Git,
- keep secrets outside Git,
- use environment variables or secret management,
- keep webhook URLs behind a product API/server boundary where possible.

The product should not rely on direct browser-to-n8n calls as the long-term API model.

## Infrastructure Portability

The project should be local-first but server-movable.

This means:

- local development should work without touching legacy production automation,
- database connection should be configurable through environment variables,
- n8n base URL should be configurable,
- storage provider should be abstracted enough to move later,
- secrets should be environment-based,
- workflow exports should be versioned.

Recommended future local stack:

- Next.js app,
- local n8n,
- local Postgres or Supabase,
- local object storage only if needed,
- `.env.example` for required variables.

Recommended future deployment path:

- frontend on Vercel or similar,
- Postgres/Supabase on managed or self-hosted infrastructure,
- n8n on a remote VM/server,
- storage on Supabase Storage or S3-compatible storage.

## Immediate Next Steps

1. Finish current audit and process documentation.
2. Install or expose Git in PATH.
3. Initialize Git repository.
4. Commit the audit/docs baseline.
5. Define the new product data model.
6. Decide local database direction for the first prototype.
7. Decide local n8n setup approach.
8. Start implementation only after the audit baseline and project foundation are committed.

See also: `docs/owner-inputs-needed.md`.

Current product design documents:

- `docs/legacy-workflow-map.md`
- `docs/target-data-model.md`
