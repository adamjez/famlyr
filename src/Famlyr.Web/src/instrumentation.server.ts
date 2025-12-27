import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import winston from "winston";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (otlpEndpoint) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    console.log(`Initializing OpenTelemetry with endpoint: ${otlpEndpoint}`);

    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter(),
        metricReaders: [
            new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter(),
                exportIntervalMillis: 5000,
            }),
        ],
        instrumentations: [
            getNodeAutoInstrumentations(),
        ],
    });

    sdk.start();
    console.log("OpenTelemetry SDK started with HTTP/proto transport");

    process.on("SIGTERM", () => {
        sdk.shutdown()
            .then(() => console.log("Telemetry shutdown complete"))
            .catch((error) =>
                console.error("Error shutting down telemetry", error)
            )
            .finally(() => process.exit(0));
    });
} else {
    console.log("OpenTelemetry disabled: OTEL_EXPORTER_OTLP_ENDPOINT not set");
}

// Setup Winston logger factory with OpenTelemetry transport
export function createLogger(category = "nodefrontend") {
    return winston.createLogger({
        level: "info", // This is the min level, anything lower won't be sent
        format: winston.format.json(),
        defaultMeta: {
            category: category, // This doesn't flow to the category in OTLP logs but it's here to ensure it's captured
        },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ),
            }),
            ...(otlpEndpoint ? [new OpenTelemetryTransportV3()] : []),
        ],
    });
}
