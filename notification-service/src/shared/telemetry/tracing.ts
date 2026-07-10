import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// ── Dev-only: log OTel diagnostics to console ────────────────────────────
if (process.env.OTEL_LOG_LEVEL) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// ── Resource (service identity) ──────────────────────────────────────────
const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'notification-service',
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
});

// ── Span exporter ────────────────────────────────────────────────────────
// OTLP to a local collector, Jaeger, or any OTLP-compatible backend.
// Default: http://localhost:4318/v1/traces
const spanProcessor = new BatchSpanProcessor(
    new OTLPTraceExporter({
        url:
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
            'http://localhost:4318/v1/traces',
    }),
);

// ── SDK ──────────────────────────────────────────────────────────────────
const sdk = new NodeSDK({
    resource,
    spanProcessors: [spanProcessor],
    instrumentations: [
        getNodeAutoInstrumentations({
            // Disable fs/dns/net for lower noise; enable what you need.
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
        }),
        // KafkaJS — traces produce→consume across the broker.
        new KafkaJsInstrumentation(),
    ],
});

// Graceful shutdown — let the SDK flush pending spans.
process.on('SIGTERM', () => {
    sdk
        .shutdown()
        .then(() => console.log('OTel SDK shut down'))
        .catch(() => {})
        .finally(() => process.exit(0));
});

// Start the SDK. This MUST run before any other imports so that
// instrumentation patches are applied before modules are loaded.
sdk.start();
console.log('OpenTelemetry SDK started');
