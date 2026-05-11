FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init curl
RUN addgroup -g 1001 -S nodejs && adduser -S nuxt -u 1001 -G nodejs
WORKDIR /app

# ---- Dev Stage ----
FROM base AS dev
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
USER nuxt
EXPOSE 3000
CMD ["npx", "nuxt", "dev", "--host", "0.0.0.0"]

# ---- Build Stage ----
FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npx nuxt build

# ---- Prod Stage ----
FROM base AS prod
COPY --from=build /app/.output /app/.output
USER nuxt
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD curl -f http://localhost:3000/ || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
