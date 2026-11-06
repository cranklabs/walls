# Changelog

## Discord login with compatible Better Auth accounts

- Add optional server-configured Discord OAuth and sign-in actions, using the existing Better Auth integration/tables and preserved provider IDs rather than recreating users or accounts.
- Require verified provider email, preserve blocked/invite-only/guest policy, retain trusted-origin/state-cookie safeguards and show safe callback errors. Add OAuth and policy regression tests plus a disposable PostgreSQL migration test in CI.
- Add non-destructive identity uniqueness indexes in migration0008; preserve existing auth/image data and the wallpaper foreign-key name. Production duplicates must be reviewed, never silently deleted or merged.
- Widen legacy verification identifiers/values to `text` in migration0009 so Better Auth can persist full OAuth state without truncation. Preserve existing records and exercise OAuth initiation through the real PostgreSQL/Drizzle adapter.
- Document application registration, exact callbacks, protected runtime credentials, schema/rollout prerequisites and the production-version distinction. No live Discord application, secret import, SMTP repair, production migration or Musashi rollout is performed by this source change.
- Application task: https://github.com/cranklabs/walls/issues/44; implementation: https://github.com/cranklabs/walls/pull/45. Deployment coordination: https://git.guneet.dev/guneet/workspace/issues/12.
