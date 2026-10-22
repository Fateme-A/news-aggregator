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
# The unprivileged variant runs the master process as a non-root user and
# listens on 8080. Nothing here needs root, so nothing here runs as root.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

USER root

# Files under /etc/nginx/templates are run through envsubst by the image's
# entrypoint at container start, which is how the API keys arrive as runtime
# environment variables rather than being baked into the image.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/40-api-status.sh /docker-entrypoint.d/40-api-status.sh
RUN chmod +x /docker-entrypoint.d/40-api-status.sh

COPY --from=build /app/dist /usr/share/nginx/html

# The entrypoint writes api-status.json here, and nginx needs its own cache
# directory; both must be writable by the unprivileged user.
RUN mkdir -p /var/cache/nginx/news \
 && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html

USER nginx

# Substitute only our own placeholders, so nginx's own $variables survive.
ENV NGINX_ENVSUBST_FILTER="^(GUARDIAN_KEY|NYT_KEY|NEWSAPI_KEY)$"

EXPOSE 8080

# 127.0.0.1, not localhost: nginx binds IPv4 only, while busybox wget resolves
# `localhost` to ::1 first and the check fails with "connection refused" against
# a perfectly healthy container.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
