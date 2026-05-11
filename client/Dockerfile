FROM node:20-alpine AS base
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
CMD ["node", ".output/server/index.mjs"]
