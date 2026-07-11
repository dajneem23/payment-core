# VietPay — Wallets, Transfers & Card Payments

A small fintech backend that moves money **safely**: every balance change is an
atomic, double-entry ledger posting; transfers are **idempotent** (retry without
double-charging) and **overdraw-proof** under concurrency. The money core is
Java/Spring Boot; the satellites (auth, FX, notifications, card gateway) are
NestJS. Everything runs behind Traefik with one `docker compose up`.

---

## Run it

```bash
docker compose up -d --build
```

For local debugging (exposes service ports directly) and dashboards:

```bash
# expose ports (psql, redis, direct service hits)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# + Grafana & Prometheus
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile observability up -d
```

Then:

| What | Where |
|------|-------|
| API docs (Swagger) | http://localhost/swagger-ui.html |
| OpenAPI JSON | http://localhost/v3/api-docs |
| Runnable requests | `test/http/*.http` (VS Code REST Client / IntelliJ) |
| Traefik dashboard | http://localhost:8888 |
| Grafana / Prometheus | http://localhost/grafana · http://localhost/prometheus |

A seeded admin (`admin@vietpay.com` / `Admin123!`) can fund wallets. The fastest
tour is `test/http/transfer.http` and `test/http/payments.http` — run top-to-bottom.

---

## What's inside

Single entry point (Traefik `:80`), path-routed to each service:

| Route | Service | Does |
|-------|---------|------|
| `/auth` | **user-service** (NestJS) | register / login / refresh; issues the JWT |
| `/api/v1/**` | **wallet-service** (Java) | wallets, transfers, deposits, ledger — the graded core |
| `/payments` | **payment-gateway** (NestJS) | card top-ups → drives the wallet ledger via Kafka |
| `/api/fx` | **fx-service** (NestJS) | live Vietcombank exchange rates |
| `/notifications` | **notification-service** (NestJS) | consumes events, sends receipts |
| (internal) | **visa-service / mastercard-service** | simulated card acquirers |

---

## API endpoints

Interactive docs: **http://localhost/swagger-ui.html** (wallet-service, public via Traefik).
The NestJS services expose Swagger at **`/api/docs`** on their own port when started
with the dev overlay (`NODE_ENV=development`). Every service also has
`GET /healthcheck` and `GET /metrics`.

### wallet-service — `/api/v1` · Swagger http://localhost/swagger-ui.html
- `POST /api/v1/wallets` — open a wallet
- `GET  /api/v1/wallets` — list my wallets
- `GET  /api/v1/wallets/{id}` — get balance
- `GET  /api/v1/wallets/{id}/transactions` — ledger history (paged)
- `GET  /api/v1/wallets/{id}/reconciliation` — prove balance == ledger sum
- `POST /api/v1/wallets/{id}/deposits` — fund a wallet (ADMIN, `Idempotency-Key`)
- `POST /api/v1/transfers` — send money (`Idempotency-Key`)
- `GET  /api/v1/transfers/{id}` — transfer detail (participants only)

### user-service — `/auth` · Swagger http://localhost:3004/api/docs
- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout`
- `GET  /auth/iam` — current identity · `GET /auth/verify` — used by Traefik ForwardAuth
- `GET  /internal/users/{id}` — service-to-service (blocked at the edge)

### payment-gateway — `/payments` · Swagger http://localhost:3005/api/docs
- `POST /payments/topups` — card top-up (`Idempotency-Key`)
- `POST /payments/webhooks/{scheme}` — acquirer settlement (HMAC-signed; internal)

### fx-service — `/api/fx` · Swagger http://localhost:3002/api/docs
- `GET /api/fx/rates` — all rates
- `GET /api/fx/rates/{code}` — one currency
- `GET /api/fx/rates/{code}/history` — rate history

### notification-service — `/notifications` · Swagger http://localhost:3003/api/docs
- `POST /notifications/{email|payment|transfer/credit|welcome|otp}`
- consumes Kafka `transfer-events` / `user-events`; `/internal/kafka/*` admin

### visa-service / mastercard-service — `/acquirer` (internal, no public route)
- `POST /acquirer/authorize` · `POST /acquirer/capture` — called east-west by the gateway


