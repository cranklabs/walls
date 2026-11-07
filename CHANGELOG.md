# Changelog

## 2026-11-07 — deployment sender correction

- Owner selected `auth@guneet.dev` instead of the earlier `no-reply` proposal and
  requested the v1.12.0 app-only deployment. Correct the runtime example; sender
  selection is already runtime-configured, so no code/image/schema change is needed.
- Deployment remains blocked on the dedicated app credential and sending-access
  prerequisites. This documentation change creates no IAM/account/credential,
  deployment or test-email mutation. Coordination:
  https://git.guneet.dev/guneet/workspace/issues/25 and
  https://git.guneet.dev/infra/musashi/issues/5.

## Optional SES SDK transactional email

- Add an explicit server-side SESv2 SDK transport shared by magic links, OTPs and
  invitations, preserving existing content and SMTP as the backwards-compatible
  default. Runtime-only sender/region/configuration-set and normal AWS credential
  providers; no credentials or provider calls at build time.
- Fail closed on bad configuration/provider errors, sanitize delivery diagnostics,
  and avoid automatic SMTP fallback or ambiguous-send retries. Add mocked transport,
  real Better Auth flow and official SDK serialization/signing tests with no real
  mail/network/credentials. No schema, Discord, guest or access-policy changes.
- Live rollout, per-app sending credentials, production access and controlled tests
  remain separately gated. Source task: https://github.com/cranklabs/walls/issues/48.
  Implementation: https://github.com/cranklabs/walls/pull/49.
  Coordination: https://git.guneet.dev/guneet/workspace/issues/25.

## v1.11.0 app publication recovery

- Add a manual-only, source-pinned recovery workflow that builds the approved v1.11.0 app on matching native AMD64/ARM64 GitHub runners and publishes the OCI index only after both succeed. The original AMD64 build completed while ARM64 stalled in emulated `npm ci`; retain the already-published migration image and release metadata.
- No application/dependency/schema/OAuth credential or production deployment changes. Source remains `4a0af5a2d58bfc7eb95ddbc0449788af5b016efa`; registry credentials still come from the `release` environment. Follow-up: https://github.com/cranklabs/walls/issues/46 and https://git.guneet.dev/guneet/workspace/issues/12.

## Discord login with compatible Better Auth accounts

- Add optional server-configured Discord OAuth and sign-in actions, using the existing Better Auth integration/tables and preserved provider IDs rather than recreating users or accounts.
- Require verified provider email, preserve blocked/invite-only/guest policy, retain trusted-origin/state-cookie safeguards and show safe callback errors. Add OAuth and policy regression tests plus a disposable PostgreSQL migration test in CI.
- Add non-destructive identity uniqueness indexes in migration0008; preserve existing auth/image data and the wallpaper foreign-key name. Production duplicates must be reviewed, never silently deleted or merged.
- Widen legacy verification identifiers/values to `text` in migration0009 so Better Auth can persist full OAuth state without truncation. Preserve existing records and exercise OAuth initiation through the real PostgreSQL/Drizzle adapter.
- Document application registration, exact callbacks, protected runtime credentials, schema/rollout prerequisites and the production-version distinction. No live Discord application, secret import, SMTP repair, production migration or Musashi rollout is performed by this source change.
- Application task: https://github.com/cranklabs/walls/issues/44; implementation: https://github.com/cranklabs/walls/pull/45. Deployment coordination: https://git.guneet.dev/guneet/workspace/issues/12.
