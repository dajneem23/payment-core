# ── Build stage ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty base URL → API calls are relative (e.g. /api/v1/wallets), hitting the
# same domain the page was served from. Works behind Traefik / Dokploy / nginx
# without per-environment config.
ENV VITE_API_BASE_URL=
RUN npm run build

# ── Serve stage ──
FROM httpd:2.4-alpine
# Start from the default config, then layer our overrides on top.
COPY --from=build /app/dist /usr/local/apache2/htdocs/
COPY httpd-rewrite.conf /usr/local/apache2/conf/conf.d/rewrite.conf
RUN echo "Include conf/conf.d/rewrite.conf" >> /usr/local/apache2/conf/httpd.conf
EXPOSE 80
