FROM oven/bun:1 AS base
WORKDIR /app

# Install turbo + dependencies
COPY package.json bun.lock* turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build with turbo
RUN bun turbo run build --filter=@klic/web

# Production
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public

# Copy migration files for runtime migrate
COPY --from=base /app/packages/db/drizzle/ ./packages/db/drizzle/
COPY --from=base /app/packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts

# Install drizzle-kit for runtime migrations + googleapis (dynamically imported, not traced by standalone)
RUN bun add drizzle-kit drizzle-orm postgres googleapis

RUN chown -R appuser:appgroup /app/packages/db

USER appuser
EXPOSE 3000
CMD ["sh", "-c", "cd packages/db && bunx drizzle-kit migrate && cd /app && bun apps/web/server.js"]
