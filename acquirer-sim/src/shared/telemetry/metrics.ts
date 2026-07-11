import client from 'prom-client';

// ── Registry ─────────────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({
    app: process.env.OTEL_SERVICE_NAME || 'acquirer-sim',
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

// ── Metric collector helpers ─────────────────────────────────────────────

/** Record an HTTP request to the histogram + counter. */
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

// ── Metrics endpoint ─────────────────────────────────────────────────────

/** Return the serialized Prometheus text exposition format. */
export async function getMetrics(): Promise<string> {
    return register.metrics();
}

export { register };
