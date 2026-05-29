# syntax=docker/dockerfile:1.7
# =============================================================================
# Dockerfile multi-stage para deploy de Next.js 16 en Google Cloud Run.
#
# Estrategia:
#   1) deps    → npm ci en una capa cacheable (sólo se invalida si cambia el
#                package.json/package-lock.json).
#   2) builder → next build con output: "standalone".
#   3) runner  → imagen final mínima que sólo contiene server.js + lo
#                necesario para correr. Corre como usuario no-root y escucha
#                en $PORT (Cloud Run lo inyecta, default 8080) en 0.0.0.0.
#
# IMPORTANTE — variables NEXT_PUBLIC_*:
#   Las vars NEXT_PUBLIC_* se inlinean en el bundle del cliente DURANTE
#   `next build`. No alcanza con setearlas en Cloud Run a runtime: hay que
#   pasarlas como `--build-arg` al construir la imagen. Para Cloud Build /
#   gcloud, configurarlas como build-args. Las vars server-only
#   (SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_USERNAME) NO se pasan acá:
#   se setean directamente en el servicio de Cloud Run.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat lo recomienda Next.js para algunas deps nativas en Alpine.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2 — builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Build-args para vars públicas que se inlinean en el bundle del cliente.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cloud Run inyecta PORT (default 8080). HOSTNAME=0.0.0.0 es obligatorio
# para que Cloud Run pueda enrutar tráfico al contenedor.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Usuario no-root para reducir superficie de ataque.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Output standalone: server.js + node_modules mínimos.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets (JS chunks, CSS) — Next.js NO los incluye en standalone.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Carpeta public/ (logo Mundial 2026, mascotas, trofeo, etc).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
