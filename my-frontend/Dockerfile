# Rebuild with --pull periodically; pin digest in CI for reproducible scans.
ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk upgrade --no-cache
COPY package.json package-lock.json* ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN apk upgrade --no-cache
ARG STOCK_API_PROXY=http://api:8000
ARG NEXT_PUBLIC_QUOTE_REFRESH_PRESET=live
ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_API_URL=
ENV STOCK_API_PROXY=${STOCK_API_PROXY} \
    NEXT_PUBLIC_QUOTE_REFRESH_PRESET=${NEXT_PUBLIC_QUOTE_REFRESH_PRESET} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk upgrade --no-cache \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
