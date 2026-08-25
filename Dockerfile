## Multi-stage image. Produces a slim runtime with a standalone Next output.

# ---- deps ------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---- build -----------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN useradd --system --no-create-home vinsend

COPY --from=build --chown=vinsend:vinsend /app/.next/standalone ./
COPY --from=build --chown=vinsend:vinsend /app/.next/static ./.next/static
COPY --from=build --chown=vinsend:vinsend /app/public ./public
COPY --from=build --chown=vinsend:vinsend /app/scripts ./scripts
COPY --from=build --chown=vinsend:vinsend /app/src ./src
COPY --from=build --chown=vinsend:vinsend /app/tsconfig.json ./tsconfig.json

USER vinsend
EXPOSE 3000
CMD ["node", "server.js"]
