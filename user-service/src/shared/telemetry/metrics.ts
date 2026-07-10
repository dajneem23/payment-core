import client from 'prom-client';

// ── Registry ─────────────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({
    app: process.env.OTEL_SERVICE_NAME || 'user-service',
});

// ── Default metrics — CPU, memory, event loop, GC, etc. ──────────────────
client.collectDefaultMetrics({ register });

// ── HTTP metrics ─────────────────────────────────────────────────────────
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDuration);

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestTotal);

// ── Auth metrics ─────────────────────────────────────────────────────────
const authLoginsTotal = new client.Counter({
    name: 'auth_logins_total',
    help: 'Total number of login attempts',
    labelNames: ['status'],
});
register.registerMetric(authLoginsTotal);

const authRegistrationsTotal = new client.Counter({
    name: 'auth_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['status'],
});
register.registerMetric(authRegistrationsTotal);

const tokenRefreshesTotal = new client.Counter({
    name: 'token_refreshes_total',
    help: 'Total number of token refresh attempts',
    labelNames: ['status'],
});
register.registerMetric(tokenRefreshesTotal);

// ── Collector helpers ────────────────────────────────────────────────────

export function observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSec: number,
) {
    const labels = { method, route, status_code: String(statusCode) };
    httpRequestDuration.observe(labels, durationSec);
    httpRequestTotal.inc(labels);
}

export function trackLogin(status: 'ok' | 'error') {
    authLoginsTotal.inc({ status });
}

export function trackRegistration(status: 'ok' | 'error') {
    authRegistrationsTotal.inc({ status });
}

export function trackTokenRefresh(status: 'ok' | 'error') {
    tokenRefreshesTotal.inc({ status });
}

// ── Metrics endpoint ─────────────────────────────────────────────────────

export async function getMetrics(): Promise<string> {
    return register.metrics();
}

export { register };
