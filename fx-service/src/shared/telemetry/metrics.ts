import client from 'prom-client';

// ── Registry ─────────────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({
    app: process.env.OTEL_SERVICE_NAME || 'notification-service',
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

// ── Kafka consumer metrics ───────────────────────────────────────────────
const kafkaMessagesConsumed = new client.Counter({
    name: 'kafka_messages_consumed_total',
    help: 'Total number of Kafka messages consumed',
    labelNames: ['topic', 'partition'],
});
register.registerMetric(kafkaMessagesConsumed);

const kafkaConsumerLag = new client.Gauge({
    name: 'kafka_consumer_lag',
    help: 'Consumer lag per topic-partition',
    labelNames: ['topic', 'partition'],
});
register.registerMetric(kafkaConsumerLag);

// ── Email metrics ────────────────────────────────────────────────────────
const emailsSentTotal = new client.Counter({
    name: 'emails_sent_total',
    help: 'Total number of emails sent',
    labelNames: ['provider', 'status'],
});
register.registerMetric(emailsSentTotal);

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

/** Track a consumed Kafka message. */
export function trackKafkaMessage(topic: string, partition: number) {
    kafkaMessagesConsumed.inc({ topic, partition: String(partition) });
}

/** Set consumer lag for a topic-partition. */
export function setKafkaConsumerLag(
    topic: string,
    partition: number,
    lag: number,
) {
    kafkaConsumerLag.set({ topic, partition: String(partition) }, lag);
}

/** Record an email send attempt. */
export function trackEmailSent(status: 'ok' | 'error') {
    emailsSentTotal.inc({ provider: 'nodemailer', status });
}

// ── Metrics endpoint ─────────────────────────────────────────────────────

/** Return the serialized Prometheus text exposition format. */
export async function getMetrics(): Promise<string> {
    return register.metrics();
}

export { register };
