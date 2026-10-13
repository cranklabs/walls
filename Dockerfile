FROM node:22-alpine AS build

ARG BUILD_VERSION
ENV BUILD_VERSION=${BUILD_VERSION}
ENV NEXT_PUBLIC_APP_VERSION=${BUILD_VERSION}

COPY package.json /src/package.json
COPY package-lock.json /src/package-lock.json

WORKDIR /src
RUN npm ci

COPY . /src

RUN npm run build

FROM node:22-alpine AS migrate

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY src/server/db/schema.ts ./src/server/db/schema.ts

ENTRYPOINT [ "./node_modules/.bin/drizzle-kit", "migrate" ]

FROM node:22-alpine AS app

COPY --from=build /src/.next/standalone /app
COPY --from=build /src/.next/static /app/.next/static
COPY --from=build /src/public /app/public
COPY --from=build /src/fonts /app/fonts

EXPOSE 3000
WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENTRYPOINT [ "node", "server.js" ]
