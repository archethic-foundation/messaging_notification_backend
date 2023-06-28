#syntax=docker/dockerfile:1.4

FROM node:18-alpine as push_server_base

# # https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# RUN apk add --no-cache libc6-compat

WORKDIR /srv/app

# RUN corepack enable && \
# 	corepack prepare --activate pnpm@latest && \
# 	pnpm config -g set store-dir /.pnpm-store

# Deps stage, preserve dependencies in cache as long as the lockfile isn't changed
FROM push_server_base AS push_server_deps

COPY --link package-lock.json ./
# RUN npm fetch

COPY --link . .
RUN npm install

# Development image
FROM push_server_deps as push_server_dev

EXPOSE 3000
EXPOSE 9229
ENV PORT 3000

CMD ["sh", "-c", "npm install; npm run build; npm run start_dev"]

# Build stage
FROM push_server_base AS push_server_builder

COPY --link . .
COPY --from=push_server_deps --link /srv/app/node_modules ./node_modules

RUN npm run build

# Production image, copy all the files and run nest
FROM node:18-alpine AS push_server_prod

WORKDIR /srv/app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=push_server_builder --link /srv/app/package.json ./dist/
COPY --from=push_server_builder --link /srv/app/dist ./dist
COPY --from=push_server_builder --link /srv/app/node_modules ./node_modules

USER nodejs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "dist/index.js"]