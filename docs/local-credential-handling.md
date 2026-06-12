# Local Credential Handling

Date: 2026-06-07

## Purpose

Milestone 4 adds local account sessions and manual platform connection records before live publishing is enabled.

The local MVP must remember which Facebook page, Instagram business account, or LinkedIn profile/page a publishing job should use, while keeping tokens and test credentials behind the server boundary.

## Local User Sessions

- Local users are stored in `users`.
- Password material is stored separately in `user_login_credentials`.
- Passwords are hashed with PBKDF2 and a per-user salt.
- Browser sessions use a signed HTTP-only `orchard_session` cookie.
- The frontend receives only normal user/workspace data, never password hashes.

Set `LOCAL_SESSION_SECRET` in local environments so session cookies remain stable and private outside the source tree.

Current local auth limitations:

- No password reset or password change flow yet.
- No server-side session revocation table yet.
- No workspace switcher yet.
- No invitation flow yet.

## Platform Connection Records

Manual connector setup is stored in `integration_accounts`.

The frontend may display:

- platform,
- account type,
- external account/page/profile ID,
- display name,
- connector status,
- scopes,
- expiration date,
- last validation timestamp,
- whether a secret reference exists.

The frontend must not display credential values.

Connector statuses are:

- `connected`
- `needs_attention`
- `expired`
- `disabled`

## Platform Credentials

Optional local test credentials are written only through server actions.

When a credential is submitted:

1. The server action creates or updates the `integration_accounts` row.
2. The plaintext credential is encrypted in memory.
3. The encrypted value is inserted into `integration_credentials.encrypted_value`.
4. The page redirects without reading the credential back into props.

Set `LOCAL_CREDENTIAL_ENCRYPTION_KEY` locally before storing real test tokens. If it is missing, the local development fallback derives a key from `LOCAL_SESSION_SECRET` or `DATABASE_URL`, which is acceptable only for local prototype data.

Manual credential storage refuses to save credentials unless `LOCAL_CREDENTIAL_ENCRYPTION_KEY` is set explicitly.

Saved credentials must never be displayed after storage. The UI supports:

- replacing a credential,
- disabling a connection,
- removing stored credentials when compromise or breach suspicion is possible.

Credential metadata should record provenance, starting with `source = manual`. Future OAuth credentials should use the same account model with different provenance metadata.

Milestone 5 publisher adapters may decrypt stored credentials only inside server-only publishing code. Decrypted values must not be written to `publication_results`, `automation_runs`, activity logs, frontend props, screenshots, or smoke-test output.

Publisher runtime modes:

- `PUBLISHER_MODE=local`: default local artifact publishing, no platform API call.
- `PUBLISHER_MODE=dry_run`: validates connected destination, stored credential, and platform payload readiness without making a platform API call.
- `PUBLISHER_MODE=live`: uses platform APIs only when `LIVE_PUBLISHING_ENABLED=true` is also set.

Manual credential targets for local MVP:

- Facebook: page ID plus page access token.
- Instagram: Instagram user ID plus token.
- LinkedIn: personal URN plus token.

LinkedIn organization publishing is deferred.

## Publishing Route Resolution

When an approved output is scheduled, the app resolves the destination account in this order:

1. Use the output's explicit `integration_account_id` when it points to a connected account for the same brand and platform.
2. Otherwise use the first connected `integration_accounts` row for that brand and platform.
3. If no connected account exists, keep the job unassigned and show that state in the scheduler.

Live publishing remains deferred. The local stub publisher may process jobs, but real platform API calls are still blocked until Milestone 5 adapter work.
