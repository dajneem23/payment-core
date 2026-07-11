import client from 'prom-client';

// ── Registry ─────────────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({
    app: process.env.OTEL_SERVICE_NAME || 'payment-gateway',
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

// ── Kafka producer metrics ───────────────────────────────────────────────
const kafkaMessagesPublished = new client.Counter({
    name: 'kafka_messages_published_total',
    help: 'Total number of Kafka messages published',
    labelNames: ['topic'],
});
register.registerMetric(kafkaMessagesPublished);

// ── Payment metrics ──────────────────────────────────────────────────────
const paymentsTotal = new client.Counter({
    name: 'payments_total',
    help: 'Total number of payment attempts',
    labelNames: ['scheme', 'status'],
});
register.registerMetric(paymentsTotal);

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

/** Track a published Kafka message. */
export function trackKafkaMessage(topic: string) {
    kafkaMessagesPublished.inc({ topic });
}

/** Set consumer lag for a topic-partition (stub for compatibility). */
export function setKafkaConsumerLag(
    _topic: string,
    _partition: number,
    _lag: number,
) {
    // payment-gateway is a producer only; no consumer lag to report.
}

/** Record a payment attempt. */
export function trackPayment(scheme: string, status: string) {
    paymentsTotal.inc({ scheme, status });
}

// ── Metrics endpoint ─────────────────────────────────────────────────────

/** Return the serialized Prometheus text exposition format. */
export async function getMetrics(): Promise<string> {
    return register.metrics();
}

export { register };
