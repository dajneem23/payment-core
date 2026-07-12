# VietPay — Wallets, Transfers & Card Payments

A small fintech backend that moves money **safely**: every balance change is an
atomic, double-entry ledger posting; transfers are **idempotent** (retry without
double-charging) and **overdraw-proof** under concurrency. The money core is
Java/Spring Boot; the satellites (auth, FX, notifications, card gateway) are
NestJS. Everything runs behind Traefik with one `docker compose up`.

### Live demo: https://payment.sugoiweb3.uk/

- Swagger (wallet-service) — https://payment.sugoiweb3.uk/swagger-ui.html
- Grafana dashboards — https://payment.sugoiweb3.uk/grafana

### Local dev (with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`)

- Wallet Swagger — http://localhost:8180/swagger-ui.html
- User service Swagger — http://localhost:3004/api/docs
- FX service Swagger — http://localhost:3002/api/docs
- Payment gateway Swagger — http://localhost:3005/api/docs
- Notification service Swagger — http://localhost:3003/api/docs
- Grafana — http://localhost/grafana
- Traefik dashboard — http://localhost:8888

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

---

## Testing

**The hard parts** (idempotency + concurrency), on a real Postgres via Testcontainers:

```bash
cd wallet-service && mvn verify
```
- `IdempotencyIT` — same key twice → money moves once, ledger balances.
- `ConcurrencyIT` — 20 threads on an under-funded wallet → no overdraw, ledger reconciles.
- `PaymentConsumerIT` / `PaymentEventsConsumerTest` — card top-up applied exactly once + DLQ.

**NestJS unit tests** (gateway HMAC + idempotency, acquirer BIN):

```bash
cd payment-gateway && npm test        # and: cd acquirer-sim && npm test
```

**End-to-end** (through the running stack): run `test/http/transfer.http` and
`test/http/payments.http` top-to-bottom — login → create wallet → deposit →
transfer / card top-up → check balance & history.

**Load test** (k6, transfers through the full edge → JWT → pessimistic-locked tx):

```bash
k6 run test/k6/transfer-load.js
```

---

## Status

**Done**
- scoped:
  - Safe transfers + admin deposits on an immutable **double-entry ledger**
  - **DB-level idempotency** (unique key + replay) and **concurrency-proof** overdraw prevention
  - Schema **migrations** (Flyway / TypeORM) — no auto-create
  - JWT auth at the Traefik edge (ForwardAuth)
  - **Card top-up** — gateway → Visa/Mastercard sims → outbox→Kafka → idempotent consumer + **DLQ**
  - FX rates, email notifications, Redis caching
  - Prometheus + Grafana dashboards, structured logs, OpenTelemetry traces
  - Fully **Dockerised** (`docker compose up`)
- not in scope:
  - User management (registration, login, profile updates) with greeting email
  - Admin panel for managing users and transactions

**Known limitations**
- 1 user can have multiple wallets, that could be confusing — a real system would have a single wallet per user, or a more complex hierarchy.
- OpenTelemetry enable but not jeager-exported (no Jaeger container, no traces in Grafana)

**With more time**
- Cross-currency transfers via `fx-service` rates with an exchange feature
- fees system
- Card **payout saga** (money out, with compensating reversal)
- A **fraud-service** with the Resilience4j circuit breaker fully wired



