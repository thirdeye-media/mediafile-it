# syntax=docker/dockerfile:1
# Portable production image for MediaFile_it.
# Runs anywhere that accepts a container: Northflank, Railway, Render,
# Fly.io, Cloud Run, a plain VPS, etc. No platform-specific config needed.

# ---- Build stage: compile frontend (vite) + server bundle (esbuild) ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Produces dist/ (frontend assets + index.html) and dist/server.cjs
RUN npm run build

# ---- Runtime stage: production deps + build output only ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (vite is a runtime dep here because
# server.ts imports it at module top-level, even though it's used only in dev).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled app
COPY --from=builder /app/dist ./dist

# Markdown config files the server reads from process.cwd() at runtime
# (AI_CONFIGURATION.md, ANNOTATION_GUIDELINES.md, PLACEHOLDERS.md,
#  SPREADSHEET_CONFIGURATION.md, USAGE.md, SYSTEM_PROMPT.md, ...).
COPY --from=builder /app/*.md ./

# The host injects PORT; the server falls back to 3000 if unset.
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
