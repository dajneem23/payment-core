# syntax=docker/dockerfile:1.7
# ---- Builder: install ALL deps (cached) + compile TS ----
FROM node:24-alpine AS builder
WORKDIR /build
COPY package*.json ./
# BuildKit cache mount: reuse the npm cache across builds -> fast re-installs.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---- Prod deps only (cached), for a slim runtime image ----
FROM node:24-alpine AS proddeps
WORKDIR /build
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- Runtime ----
FROM node:24-alpine AS release
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=proddeps /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
# /app must be writable by the non-root user (winston creates ./logs at runtime).
RUN chown app:app /app
USER app
CMD ["node", "dist/main.js"]
