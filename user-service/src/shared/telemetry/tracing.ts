import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
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
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'user-service',
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
});

// ── Span exporter ────────────────────────────────────────────────────────
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
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
        }),
    ],
});

process.on('SIGTERM', () => {
    sdk
        .shutdown()
        .then(() => console.log('OTel SDK shut down'))
        .catch(() => {})
        .finally(() => process.exit(0));
});

sdk.start();
console.log('OpenTelemetry SDK started');
