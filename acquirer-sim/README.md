# acquirer-sim

A minimal **simulated card acquirer** (Visa / Mastercard) for the VietPay card
top-up flow. One codebase, deployed twice with different env — as `visa-service`
and `mastercard-service` in `docker-compose.yml` (they differ only by scheme, BIN
allowlist, HMAC secret, and port).

It stands in for a real card network: the `payment-gateway` calls it to
**authorize** and **capture** a card charge, and it fires an **asynchronous,
HMAC-signed settlement webhook** back to the gateway. No database — it's a pure
simulator.

## Where it sits

```
payment-gateway ──authorize + capture (x-api-key)──▶ acquirer-sim (visa|mastercard)
       ▲                                                    │
       └──────── settlement webhook (X-Signature: HMAC) ◀───┘  (async, after SETTLEMENT_DELAY_MS)
```

The gateway then turns the settlement into a `PaymentCaptured` event on Kafka,
which wallet-service consumes to post the double-entry ledger effect.

## API

All endpoints require the header `x-api-key: $ACQUIRER_API_KEY`.

### `POST /acquirer/authorize`
```json
{ "paymentId": "<uuid>", "amount": "10.00", "currency": "USD",
  "cardToken": "tok_...", "bin": "411111", "callbackUrl": "http://payment-gateway:3005/payments/webhooks/visa" }
```
- **200** → `{ "declined": false, "providerRef": "VISA-xxxxxxxx", "status": "AUTHORIZED" }`
- **402** → `{ "declined": true, "reason": "..." }` when the `bin` is not in
  `ALLOWED_BINS`, or a random decline fires (`DECLINE_RATE`).

### `POST /acquirer/capture`
```json
{ "paymentId": "<uuid>", "providerRef": "VISA-xxxxxxxx", "amount": "10.00",
  "currency": "USD", "callbackUrl": "http://payment-gateway:3005/payments/webhooks/visa" }
```
- **200** → `{ "status": "CAPTURED" }` immediately, then after
  `SETTLEMENT_DELAY_MS` it POSTs the settlement webhook to `callbackUrl`.

### Settlement webhook (outbound, to the gateway)
```
POST {callbackUrl}
X-Signature: <hex HMAC-SHA256(rawBody, HMAC_SECRET)>
{ "providerEventId": "<uuid>", "providerRef": "VISA-xxxxxxxx", "paymentId": "<uuid>", "status": "SETTLED" }
```
Retried a few times on failure. The gateway verifies `X-Signature` with the
matching per-scheme secret before acting, and dedupes on `providerEventId`.

## Configuration (env)

| Var | Meaning | Example |
|---|---|---|
| `SCHEME` | Brand this instance simulates | `VISA` / `MASTERCARD` |
| `ALLOWED_BINS` | Comma-separated accepted BINs; others are declined | `411111,424242,400000` |
| `HMAC_SECRET` | Signs the settlement webhook (must match the gateway's per-scheme secret) | `visa-dev-secret` |
| `ACQUIRER_API_KEY` | Shared key the gateway presents on authorize/capture | `dev-acquirer-key` |
| `SETTLEMENT_DELAY_MS` | Delay before the async settlement webhook | `1500` |
| `DECLINE_RATE` | Probability `0..1` of a random decline (chaos testing) | `0` |
| `PORT` | Listen port | `3006` (visa) / `3007` (mc) |

See `.env.example`.

## Run locally

```bash
npm install
npm run start:dev           # or: npm run build && npm run start:prod
```

Health `GET /healthcheck`, metrics `GET /metrics`, Swagger `GET /api/docs` (dev).

## Design notes

- **Simulated, not real PCI**: only a tokenized `cardToken` + `bin` cross the
  wire — never a PAN. The BIN (first 6 digits) is routing metadata, not sensitive.
- **Authorize vs capture** are kept as distinct steps to mirror a real card
  lifecycle; the decline decision happens at authorize.
- **Async settlement** models how real acquirers confirm out-of-band — which is
  exactly why the gateway propagates it via the outbox/Kafka rather than inline.
