import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
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
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'payment-gateway',
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
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new NestInstrumentation(),
        new KafkaJsInstrumentation(),
        new PgInstrumentation(),
        new UndiciInstrumentation(),
        new RuntimeNodeInstrumentation(),
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
