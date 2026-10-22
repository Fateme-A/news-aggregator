# syntax=docker/dockerfile:1

# ---- Stage 1: build the static bundle ----------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first so `npm ci` is only re-run when dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: serve it, and proxy the news APIs -------------------------
FROM nginx:alpine AS runtime

# Files under /etc/nginx/templates are run through envsubst by the image's
# entrypoint at container start, which is how the API keys arrive as runtime
# environment variables rather than being baked into the image.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/40-api-status.sh /docker-entrypoint.d/40-api-status.sh
RUN chmod +x /docker-entrypoint.d/40-api-status.sh

COPY --from=build /app/dist /usr/share/nginx/html

# Substitute only our own placeholders, so nginx's own $variables survive.
ENV NGINX_ENVSUBST_FILTER="^(GUARDIAN_KEY|NYT_KEY|NEWSAPI_KEY)$"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1
