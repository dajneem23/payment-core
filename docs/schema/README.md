# Database schema snapshots

Ready-to-load SQL snapshots of every VietPay database, generated from the **real
migrations** (Flyway for wallet-service, TypeORM for fx-service and
payment-gateway) applied to a clean Postgres and `pg_dump`-ed. They exist so the
schema can be created / inspected **without running the apps**.

## You usually don't need these

`docker compose up` runs all migrations automatically on boot — Flyway migrates
`vietpay` when wallet-service starts; TypeORM (`migrationsRun: true`) migrates
`vietpay_fx` and `vietpay_payments` when those services start. **That is the
normal path.** These files are a convenience for a reviewer who wants the schema
in a bare Postgres.

## Files

| File | Database | Contents |
|------|----------|----------|
| `vietpay.sql` | `vietpay` | Money core: `wallets` (+ SYSTEM seed accounts: `card_clearing` + per-currency funding), `transfers`, `ledger_entries` (double-entry, one-source + non-negative CHECKs), `outbox_events`, `applied_payments`, `shedlock` |
| `vietpay_fx.sql` | `vietpay_fx` | `fx_rates`, `fx_rate_snapshots` |
| `vietpay_payments.sql` | `vietpay_payments` | `payments`, `processed_webhooks`, `outbox_events` |
| `vietpay_users.sql` | `vietpay_users` | `users` (auth: email, password_hash, `role`, refresh-token hash) |
| `init-all.sql` | — | psql one-shot: create roles + databases, then `\i` each snapshot |

Every service now owns its schema through **checked-in migrations** — Flyway for
wallet-service, TypeORM (`migrationsRun: true`, `synchronize: false`) for
user-service, fx-service, and payment-gateway. No service relies on auto-create.

## Load it

Against a **fresh** Postgres, from this directory:

```bash
# everything at once (roles + databases + all schemas)
psql -h localhost -U postgres -f init-all.sql

# …or a single database
createdb -U postgres vietpay
psql -h localhost -U postgres -d vietpay -f vietpay.sql
```

## Important: snapshots OR migrations, not both

These dumps exclude the migration-history tables (`flyway_schema_history`,
TypeORM `migrations`). So if you load a snapshot into a database and **then**
start the corresponding app, its migrator will try to run the migrations again
on an already-populated schema and error. Pick one per database:

- **Running the full stack** → use `docker compose up` (let the apps migrate).
- **Just inspecting the schema** → load these snapshots into a throwaway Postgres.

## Regenerating

Re-run the migrations against a clean Postgres and `pg_dump`, e.g. for the money
DB:

```bash
psql -d vietpay -f wallet-service/src/main/resources/db/migration/V1__init.sql   # …V2…V9 in order
pg_dump -d vietpay --no-owner --no-privileges --exclude-table=flyway_schema_history > docs/schema/vietpay.sql
```
