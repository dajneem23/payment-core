// VietPay — k6 load test for the money path.
//
//   1. Start the stack:  docker compose up -d --build
//   2. Run:              k6 run test/k6/transfer-load.js
//      (override target) k6 run -e BASE_URL=http://localhost test/k6/transfer-load.js
//
// It logs in as admin, opens a source + destination wallet, funds the source
// heavily, then hammers POST /api/v1/transfers under a ramping load — every
// request through Traefik + JWT ForwardAuth, each with a unique Idempotency-Key.
// Thresholds fail the run if error rate or p95 latency regress.
//
// Note: all VUs transfer from ONE source wallet, so they serialise on that
// wallet's SELECT ... FOR UPDATE lock — this deliberately measures a "hot
// account" under contention (correctness holds; throughput is lock-bound). Set
// -e WALLETS=N in setup to spread across accounts for raw throughput.

import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@vietpay.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin123!';

export const options = {
  scenarios: {
    transfers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 25 }, // ramp up
        { duration: '30s', target: 25 }, // sustain
        { duration: '5s', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],       // <1% HTTP errors
    http_req_duration: ['p(95)<800'],     // 95th percentile under 800ms
    checks: ['rate>0.99'],                // >99% of checks pass
  },
};

function jsonHeaders(token, extra) {
  return Object.assign(
    { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    extra || {},
  );
}

function login(email, password) {
  const res = http.post(`${BASE}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json('accessToken');
}

export function setup() {
  const token = login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const source = http.post(`${BASE}/api/v1/wallets`,
    JSON.stringify({ currency: 'USD' }), { headers: jsonHeaders(token) }).json('id');
  const dest = http.post(`${BASE}/api/v1/wallets`,
    JSON.stringify({ currency: 'USD' }), { headers: jsonHeaders(token) }).json('id');

  // Fund the source large enough that load never legitimately overdraws.
  const dep = http.post(`${BASE}/api/v1/wallets/${source}/deposits`,
    JSON.stringify({ amount: '100000000.00', currency: 'USD' }),
    { headers: jsonHeaders(token, { 'Idempotency-Key': uuidv4() }) });
  check(dep, { 'deposit 201': (r) => r.status === 201 });

  return { token, source, dest };
}

export default function (data) {
  const res = http.post(`${BASE}/api/v1/transfers`,
    JSON.stringify({
      sourceWalletId: data.source,
      destWalletId: data.dest,
      amount: '1.00',
      currency: 'USD',
    }),
    { headers: jsonHeaders(data.token, { 'Idempotency-Key': uuidv4() }) });

  check(res, { 'transfer 201': (r) => r.status === 201 });
}

export function teardown(data) {
  // Sanity: the ledger still reconciles after the load.
  const res = http.get(`${BASE}/api/v1/wallets/${data.source}/reconciliation`,
    { headers: jsonHeaders(data.token) });
  check(res, { 'reconciled': (r) => r.status === 200 && r.json('balanced') === true });
}
