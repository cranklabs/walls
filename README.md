# Walls

Beautiful backgrounds for your screens. A wallpaper sharing platform built with the [T3 Stack](https://create.t3.gg/).

## Features

- Browse a public gallery of wallpapers with a masonry-style layout
- Upload wallpapers via drag-and-drop or by pasting an image URL
- NSFW content filtering (None / Mild / All)
- Email magic link authentication (passwordless)
- User profiles and personal wallpaper collections
- Invite-only mode with access request flow
- Admin mode for managing users, invites, and wallpapers
- Dark / light theme toggle

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions)
- [React 19](https://react.dev)
- [better-auth](https://www.better-auth.com) (magic link email authentication)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Sharp](https://sharp.pixelplumbing.com) for image processing

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- SMTP server for magic link emails

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

## Environment Variables

| Variable         | Required   | Description                                                    |
| ---------------- | ---------- | -------------------------------------------------------------- |
| `APP_URL`        | Yes        | Public-facing URL of the app (used for auth and invite emails) |
| `AUTH_SECRET`    | Production | Auth secret — generate with `openssl rand -base64 32`          |
| `SMTP_HOST`      | Yes        | SMTP server hostname                                           |
| `SMTP_PORT`      | No         | SMTP port (default `587`)                                      |
| `SMTP_USERNAME`  | Yes        | SMTP auth username                                             |
| `SMTP_PASSWORD`  | Yes        | SMTP auth password                                             |
| `SMTP_MAIL_FROM` | Yes        | Sender email address for magic link emails                     |
| `DATABASE_URL`   | Yes        | PostgreSQL connection string                                   |
| `DATABASE_SSL`   | No         | Set to `true` to require SSL for Drizzle CLI connections       |

See [`.env.example`](.env.example) for a full template.

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start dev server (Turbopack)         |
| `npm run build`        | Production build                     |
| `npm run start`        | Start production server              |
| `npm run preview`      | Build + start                        |
| `npm run db:generate`  | Generate Drizzle migrations          |
| `npm run db:migrate`   | Run Drizzle migrations               |
| `npm run db:push`      | Push schema directly to the database |
| `npm run db:studio`    | Open Drizzle Studio                  |
| `npm run check`        | ESLint + TypeScript type-check       |
| `npm run format:check` | Prettier format check                |
| `npm run format:write` | Prettier auto-format                 |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on setting up a development environment and submitting changes.

## Deployment

The project includes a multi-stage `Dockerfile` and GitHub Actions workflows for CI/CD:

- **PR checks**: Build both the `app` and `migrate` Docker targets, Prettier format check, npm build.
- **Push to main**: Semantic release; when a new release is published, build and push both images for `linux/amd64` and `linux/arm64` with `latest` and matching version tags.
- **Manual publish**: Run the **Release & Docker Push** workflow with a `tag` (defaults to `latest`) to build and push both images with that tag without creating a release.

### Container images

| Image                         | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `cr.guneet.dev/walls/app`     | Next.js application, listening on port `3000`               |
| `cr.guneet.dev/walls/migrate` | One-shot job that runs `drizzle-kit migrate` and then exits |

The `app` target is the default Docker build target. Build the migration image explicitly with `docker build --target migrate .`. It includes Drizzle Kit, the migration configuration, and the committed `drizzle/` migration files; it does not need the app's auth or SMTP environment variables.

### Registry credentials

Configure these secrets in the GitHub Actions **`release` environment** with credentials that can push to the `walls` namespace on `cr.guneet.dev`. All image-publishing jobs use this environment, including manual publishes:

- `DOCKER_USERNAME`: registry username.
- `DOCKER_PASSWORD`: registry password or access token.

The registry and image names are defined in `.github/workflows/push.yml`; the `DOCKER_IMAGE` and `DOCKER_MIGRATE_IMAGE` repository variables are no longer used. The workflow publishes images only; it does not connect to Tailscale or deploy to a VPS. No Tailscale or VPS/SSH credentials are required.

### Applying migrations

Before starting or updating the app, run the migration image with the **same version tag** as the app image. Provide `DATABASE_URL` for the target PostgreSQL database and, if needed, `DATABASE_SSL=true`. For example, with `WALLS_VERSION` set to a published version and `DATABASE_URL` exported in your shell:

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
