# One image: the NestJS API, which also serves the built web app.

FROM node:24-slim AS build
# Prisma's migration engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter api --filter web

COPY apps apps

# The web app's settings are baked in at build time (Railway passes service variables as build args).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_URL=/api/v1
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
  || (echo "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set" && exit 1)
RUN pnpm --filter web build && pnpm --filter api build

# Keep only the API's production dependencies (they include prisma and tsx for
# migrations and the admin scripts).
RUN rm -rf node_modules apps/*/node_modules \
  && pnpm install --frozen-lockfile --prod --filter api

FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api apps/api
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
