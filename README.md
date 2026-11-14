# Walls

Beautiful backgrounds for your screens. A wallpaper sharing platform built with the [T3 Stack](https://create.t3.gg/).

## Features

- Browse a public gallery of wallpapers with a masonry-style layout
- Upload wallpapers via drag-and-drop or by pasting an image URL
- NSFW content filtering (None / Mild / All)
- Discord OAuth sign-in using a verified Discord email, with existing-account linking
- Email OTP and magic link authentication (passwordless)
- Optional password sign-in for existing members, with emailed reset links
- User profiles and personal wallpaper collections
- Invite-only mode with access request flow
- Admin mode for managing users, invites, and wallpapers
- Dark / light theme toggle

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions)
- [React 19](https://react.dev)
- [better-auth](https://www.better-auth.com) (email OTP, magic link, password and Discord authentication)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Sharp](https://sharp.pixelplumbing.com) for image processing

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- SMTP server, or an AWS SES identity and sending access, for transactional emails

### Setup

```bash
# Install dependencies
npm ci

# Copy environment variables and fill in your values
cp .env.example .env

# Apply database migrations
npm run db:migrate

# Start the dev server
npm run dev
```

### Docker Compose

A sample `docker-compose.yml` for running Walls with PostgreSQL and [Mailpit](https://mailpit.axllent.org) (local SMTP server for development):

The `migrate` service applies the committed Drizzle migrations and exits. The app starts only after migrations complete successfully.

```yaml
services:
  walls:
    image: cr.guneet.dev/walls/app:latest
    build:
      context: .
      target: app
      args:
        BUILD_VERSION: dev
    ports:
      - "3000:3000"
    environment:
      APP_URL: "http://localhost:3000"
      AUTH_SECRET: "change-me-to-a-random-secret"
      SMTP_HOST: mailpit
      SMTP_PORT: "1025"
      SMTP_USERNAME: walls
      SMTP_PASSWORD: walls
      SMTP_MAIL_FROM: "noreply@walls.local"
      DATABASE_URL: "postgresql://walls:walls@db:5432/walls"
    depends_on:
      migrate:
        condition: service_completed_successfully

  migrate:
    image: cr.guneet.dev/walls/migrate:latest
    build:
      context: .
      target: migrate
    environment:
      DATABASE_URL: "postgresql://walls:walls@db:5432/walls"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: walls
      POSTGRES_PASSWORD: walls
      POSTGRES_DB: walls
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U walls"]
      interval: 5s
      timeout: 5s
      retries: 5

  mailpit:
    image: axllent/mailpit
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "1" # Local development only
      MP_SMTP_AUTH_ALLOW_INSECURE: "1"
    ports:
      - "8025:8025" # Web UI
      - "1025:1025" # SMTP

volumes:
  pgdata:
```

Run with the published images (log in to `cr.guneet.dev` first if required):

```bash
docker compose up
```

To build both images from your local checkout instead, run `docker compose up --build`.

Then open [http://localhost:3000](http://localhost:3000) for the app and [http://localhost:8025](http://localhost:8025) for the Mailpit inbox to view magic link emails.

### AWS SES API email

Walls supports the official AWS SDK v3 (`@aws-sdk/client-sesv2`) as an optional
**server-side** transport for magic links, email OTPs and invitations. SMTP remains
the default, so existing deployments keep their current behavior unless explicitly
switched. There is no database migration or authentication-provider change.

For the owner's selected Musashi integration, the non-secret runtime settings are:

| Setting                 | Value             |
| ----------------------- | ----------------- |
| `EMAIL_PROVIDER`        | `ses`             |
| `EMAIL_FROM`            | `auth@guneet.dev` |
| `AWS_REGION`            | `us-east-1`       |
| `SES_CONFIGURATION_SET` | `guneet-dev`      |

The SDK uses its normal server credential-provider chain (for example workload-role
credentials, or a dedicated sending-only identity injected at runtime). Never use
the Terraform/operator identity for application mail. Do not put keys in source,
build arguments, `NEXT_PUBLIC_*`, plaintext configuration files or logs. On Musashi,
credentials must come from the existing Walls Obscuro namespace under the owning
[stack rules](https://git.guneet.dev/infra/musashi/src/branch/main/stacks/walls/README.md).
The client is initialized lazily on the first send; builds and isolated tests do
not require real AWS credentials. SES uses HTTPS with the SDK's normal certificate
verification, not an SMTP login or derived SMTP password.

Use only `ses:SendEmail` scoped to the intended verified identity and optional
configuration set, with the approved `ses:FromAddress` and region constraints.
Do not grant SES/IAM administrator access or create root access keys. Region,
identity verification and configuration-set association must agree. Sender
verification alone is **not** SES production access: sandbox accounts restrict
recipients and throughput. Before a public-user cutover, check sending access,
dedicated credentials, abuse/bounce/complaint handling and a controlled test.
Source preparation does not request sandbox exit or create any AWS identity/key.

SES sends the existing UTF-8 text/HTML templates using `SendEmailCommand` with
simple content. It does not silently fall back to SMTP or retry an ambiguous send;
the SDK client uses `maxAttempts: 1`. Provider errors are replaced with a generic
delivery error rather than logging credentials, recipients, OTPs or login links.
Normal auth/invite error handling remains in place. Switching back to SMTP is an
explicit configuration/rollout decision, never an automatic failure fallback.

The existing Musashi image/configuration is not changed by merging or publishing
this code. A pinned-image app-only rollout, protected credentials, sender choice,
rollback and any real test recipient require separately reviewed approval. No
database migration, Discord change, Azure cleanup or unsolicited email is implied.
Application: https://github.com/cranklabs/walls/issues/48. Coordination:
https://git.guneet.dev/guneet/workspace/issues/25.

### Discord login setup

Discord login uses the existing **Better Auth** integration; it does not depend on SMTP or send sign-in emails. Existing email OTP/magic-link methods remain available and their SMTP configuration is unchanged.

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **OAuth2**, register the exact redirect URI for the environment:
   - Production: `https://walls.guneet.dev/api/auth/callback/discord`
   - Local development: `http://localhost:3000/api/auth/callback/discord`
3. Configure both `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in the server's environment. With Docker, inject them **at runtime**, not as build arguments or `NEXT_PUBLIC_*` variables. With the Compose example, add them to the `walls.environment` mapping; the migration service does not need them.
4. Restart the app as part of an approved deployment, then use **Continue with Discord** on either sign-in page.

No bot, guild membership, privileged intent or bot permission is needed. The provider requests only `identify` and `email`. Users must have an email address verified by Discord; phone-only and unverified-email accounts are denied. Registering the Discord application does not itself configure or deploy Walls.

The provider/button stays disabled when both credentials are absent. Setting only one is a configuration error. The client secret stays server-side; never paste credentials into chat/issues, commit them, or put them in the browser bundle. For Musashi, the [owning stack documentation](https://git.guneet.dev/infra/musashi/src/branch/main/stacks/walls/README.md) governs protected Obscuro injection, image selection and actual rollout. Application releases publish images only; they do not activate Discord on that host.

#### Accounts, access rules and compatible tables

Discord uses the existing `walls_user`, `walls_account`, `walls_session` and `walls_verification` tables. **Do not recreate the auth tables, discard accounts or run `db:push` on an existing deployment.** Existing Discord identities are reused by provider/account ID, preserving user IDs, wallpaper ownership, permissions and stored profile data. An existing user signing in with a new Discord identity must use the same verified email to link it; an unverified email is never a trusted shortcut. Discord profile email changes do not reassign an already linked account to another user.

Blocked users cannot create new accounts or sessions, including returning OAuth users. New users still need an invitation when invite-only mode is enabled. Guest-viewing policy is unchanged. Normal OAuth state-cookie and redirect-origin checks remain enabled; cancelled or denied callbacks return a safe sign-in error.

Migration `0008_auth_identity_uniqueness` adds only unique indexes for case-folded email and `(provider_id, account_id)`, preventing concurrent sign-ins from creating duplicate identities. It does not create/drop auth tables or alter existing rows. It fails rather than silently merging/deleting any pre-existing duplicates; inspect duplicate groups and make a protected backup before an approved migration. The existing self-referencing wallpaper constraint keeps its migration-0007 name, with no unrelated constraint rewrite in 0008.

Migration `0009_oauth_verification_storage` widens the existing verification `identifier` and `value` columns to `text`, preserving their contents. Better Auth's OAuth state contains callback URLs and a code verifier, so it exceeds the legacy 255-character value limit; leaving that column unchanged makes OAuth initiation fail. Tests exercise the actual Drizzle adapter against PostgreSQL, not just an in-memory schema.

A deployment still on 1.7.0 has migrations 0000–0006. Upgrading it to this branch also includes the earlier, unrelated remix migration 0007 before the auth migrations 0008/0009; that app/schema upgrade or a scoped backport must be selected explicitly before rollout. OAuth application setup can be completed while the code is being tested; production stays unchanged until credentials and rollout are ready.

### Password sign-in

Members can add a password in **Settings** after signing in with an email code, magic link or Discord, then sign in at `/signin/password`. Email+password **sign-up is disabled**: a password never creates an account, so invite-only admission and blocking work exactly as for the other methods.

- Passwords are 8–128 characters and stored only as Better Auth scrypt hashes in the existing `walls_account.password` column, as a `credential` account. There is **no database migration** and no new environment variable.
- Changing a password requires the current one and can sign out other devices. Setting or changing a password needs a recent sign-in (Better Auth's one-day freshness window).
- **Forgot password** (`/signin/forgot-password`) emails a one-hour, single-use reset link through the configured sender (SMTP or SES). The response is the same whether or not the email has an account. Completing a reset signs the member out everywhere. A reset can also set a first password for a member who has none.
- Blocked members cannot sign in with a password and are not sent reset emails. Wrong passwords, unknown emails and members without a password all get the same "Incorrect email or password" response.
- In production Better Auth rate-limits per client IP: 3 sign-in or password-change attempts per 10 seconds and 3 reset emails per minute. It uses the first `X-Forwarded-For` address, so run Walls behind a proxy that sets that header itself.

### Authentication tests

```bash
npm test
npm run typecheck
npm run lint
```

The isolated OAuth and password tests mock Discord token/profile responses and email delivery, and exercise Better Auth's real callback/state/session/account, sign-in, password-change and reset paths; they need no production credentials, SMTP, live Discord application or user data. PostgreSQL integration tests additionally verify upgrading the existing schema, preserving user/account/image data and enforcing identity uniqueness under concurrent inserts.

`npm run test:db` requires a **new disposable local** PostgreSQL database through `TEST_DATABASE_URL`. Safety checks require a localhost host, database `walls_auth_test`, fixture user `walls_test` and fixture password `walls_test_fixture`; it refuses an existing application schema and never drops a database/schema to make the test pass. Never point it at production. The CI workflow provisions that fixture automatically. These are deliberately public test credentials, not deployment credentials.

## Environment Variables

| Variable                | Required     | Description                                                     |
| ----------------------- | ------------ | --------------------------------------------------------------- |
| `APP_URL`               | Yes          | Public-facing URL of the app (used for auth and invite emails)  |
| `AUTH_SECRET`           | Production   | Auth secret — generate with `openssl rand -base64 32`           |
| `DISCORD_CLIENT_ID`     | With Discord | Discord OAuth client ID; configure together with its secret     |
| `DISCORD_CLIENT_SECRET` | With Discord | Server-only Discord OAuth secret; never expose to clients       |
| `EMAIL_PROVIDER`        | No           | `smtp` (default) or `ses`; explicit selection, no fallback      |
| `EMAIL_FROM`            | With email   | Sender address; falls back to legacy `SMTP_MAIL_FROM`           |
| `AWS_REGION`            | With SES     | Region of the verified SES identity                             |
| `SES_CONFIGURATION_SET` | No           | SES configuration-set name; otherwise identity/account defaults |
| `SMTP_HOST`             | With SMTP    | SMTP server hostname                                            |
| `SMTP_PORT`             | No           | SMTP port (default `587`)                                       |
| `SMTP_USERNAME`         | With SMTP    | SMTP auth username                                              |
| `SMTP_PASSWORD`         | With SMTP    | SMTP auth password                                              |
| `SMTP_MAIL_FROM`        | Legacy       | Sender fallback when `EMAIL_FROM` is unset                      |
| `DATABASE_URL`          | Yes          | PostgreSQL connection string                                    |
| `DATABASE_SSL`          | No           | Set to `true` to require SSL for Drizzle CLI connections        |

See [`.env.example`](.env.example) for a full template.

## Scripts

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start dev server (Turbopack)                        |
| `npm run build`        | Production build                                    |
| `npm run start`        | Start production server                             |
| `npm run preview`      | Build + start                                       |
| `npm run db:generate`  | Generate Drizzle migrations                         |
| `npm run db:migrate`   | Run Drizzle migrations                              |
| `npm run db:push`      | Push schema directly to the database                |
| `npm run db:studio`    | Open Drizzle Studio                                 |
| `npm test`             | Isolated authentication policy/OAuth/password tests |
| `npm run test:db`      | Disposable PostgreSQL migration/uniqueness tests    |
| `npm run check`        | ESLint + TypeScript type-check                      |
| `npm run format:check` | Prettier format check                               |
| `npm run format:write` | Prettier auto-format                                |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up a development environment and submitting changes.

## Deployment

The project includes a multi-stage `Dockerfile` and GitHub Actions workflows for CI/CD:

- **CI** (`.github/workflows/ci.yml`): Authentication/OAuth and disposable PostgreSQL migration tests, type-checking, both Docker targets, Prettier format check, npm build and workflow lint. Runs on pull requests, on release PRs (dispatched by the release workflow) and on every release commit before publishing.
- **Release** (`.github/workflows/release.yml`): runs [release-please](https://github.com/googleapis/release-please) on every push to `main` and publishes images when a release is created. See [Releases](#releases).

There is no manual publishing path. Rolling a release out to a server is a separate deployment step.

### Releases

Commits on `main` (including squash-merge titles) follow [Conventional Commits](https://www.conventionalcommits.org). Configuration lives in `release-please-config.json` and `.release-please-manifest.json`, which records the current version.

1. Merging a `feat:`, `fix:` or other releasable change into `main` does **not** release. release-please opens or updates a single release PR that bumps the version in `package.json`, `package-lock.json` and the manifest, and adds the generated release notes to [`CHANGELOG.md`](CHANGELOG.md). `ci:`, `docs:`, `test:` and `chore:` commits do not trigger a release.
2. PRs created with the workflow token do not trigger `pull_request` workflows, so the release workflow dispatches CI on the release-PR branch. Wait for it to pass before merging.
3. **Merging the release PR is the approval to release.** release-please creates the `vX.Y.Z` tag and GitHub Release on the merge commit. The release workflow then:
   1. runs the full CI suite on that exact commit;
   2. builds `walls/app` (with `BUILD_VERSION`) and `walls/migrate` natively on `linux/amd64` and `linux/arm64` runners, with SBOM and provenance attestations, and pushes each image by digest only;
   3. smoke-tests those exact digests on their native runner: the migrate image applies every migration to a throwaway PostgreSQL database (and re-runs as a no-op), then the app image starts against it with placeholder configuration and must answer `/api/auth/ok` and render the home page with the release version;
   4. only then combines the digests into multi-architecture indexes and tags them.

`CHANGELOG.md` is generated: do not edit it by hand. Hand-written notes on changes and deployment coordination live in [`docs/deployment-log.md`](docs/deployment-log.md).

If publishing fails, fix the cause and use **Re-run failed jobs** on the release run. A release whose run can no longer be re-run needs a reviewed, one-off workflow that republishes it from its tag.

### Container images

| Image                         | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `cr.guneet.dev/walls/app`     | Next.js application, listening on port `3000`               |
| `cr.guneet.dev/walls/migrate` | One-shot job that runs `drizzle-kit migrate` and then exits |

Each release `vX.Y.Z` publishes both images as `vX.Y.Z`, `vX.Y`, `vX` and `latest` (the aliases move only for the newest release). Releases up to `v1.12.0` were published with unprefixed tags (for example `1.12.0`); those stay in the registry, but new releases use only `v`-prefixed tags. Deployments should pin an exact version tag, preferably with its digest, never `latest` or an alias.

The `app` target is the default Docker build target. Build the migration image explicitly with `docker build --target migrate .`. It includes Drizzle Kit, the migration configuration, and the committed `drizzle/` migration files; it does not need the app's auth or SMTP environment variables.

### Registry credentials

Configure these secrets in the GitHub Actions **`release` environment** with credentials that can push to the `walls` namespace on `cr.guneet.dev`. Only the image build and tagging jobs of the release workflow use this environment:

- `DOCKER_USERNAME`: registry username.
- `DOCKER_PASSWORD`: registry password or access token.

The registry and image names are defined in `.github/workflows/release.yml`. The workflow publishes images only; it does not connect to Tailscale or deploy to a VPS. No Tailscale or VPS/SSH credentials are required.

### Applying migrations

Before starting or updating the app, run the migration image with the **same version tag** as the app image. Provide `DATABASE_URL` for the target PostgreSQL database and, if needed, `DATABASE_SSL=true`. For example, with `WALLS_VERSION` set to a published version tag (for example `v1.13.0`) and `DATABASE_URL` exported in your shell:

```bash
docker login cr.guneet.dev
docker pull "cr.guneet.dev/walls/migrate:${WALLS_VERSION}"
docker pull "cr.guneet.dev/walls/app:${WALLS_VERSION}"
docker run --rm \
  --env DATABASE_URL \
  --env DATABASE_SSL \
  "cr.guneet.dev/walls/migrate:${WALLS_VERSION}"
```

Only start or update the app after the migration container exits successfully. The database must be reachable from the container; attach it to the database's Docker network with `--network` if necessary. Migrations apply pending changes using Drizzle's migration journal, so rerunning the same image is safe for a database already managed by Drizzle migrations. For production, back up the database before migrating and use version tags rather than `latest`.

For the Compose example above, update both image tags to the same version, then deploy with:

```bash
docker compose pull
docker compose run --rm migrate
docker compose up -d
```

Do not continue to `docker compose up -d` if the migration command fails. Databases initialized using `db:push` rather than migrations need an appropriate migration baseline before using `db:migrate`; do not apply the initial migrations blindly to an existing schema.
