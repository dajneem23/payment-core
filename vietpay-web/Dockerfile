# ── Build stage ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Serve stage ──
FROM httpd:2.4-alpine
COPY --from=build /app/dist /usr/local/apache2/htdocs/
COPY httpd.conf /usr/local/apache2/conf/httpd.conf
EXPOSE 80
