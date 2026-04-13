"""OpenTelemetry setup helpers."""
from __future__ import annotations

from fastapi import FastAPI

from app.config import (
    OTEL_ENABLED,
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_SAMPLING_RATIO,
    OTEL_SERVICE_NAME,
    logger,
)


def setup_otel(app: FastAPI) -> None:
    if not OTEL_ENABLED:
        return
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
        from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

        resource = Resource(attributes={SERVICE_NAME: OTEL_SERVICE_NAME})
        provider = TracerProvider(
            resource=resource,
            sampler=ParentBased(root=TraceIdRatioBased(OTEL_SAMPLING_RATIO)),
        )
        if OTEL_EXPORTER_OTLP_ENDPOINT:
            exporter = OTLPSpanExporter(endpoint=OTEL_EXPORTER_OTLP_ENDPOINT)
        else:
            exporter = ConsoleSpanExporter()
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        FastAPIInstrumentor.instrument_app(app)
        logger.info("OpenTelemetry enabled")
    except Exception as exc:
        logger.warning("OpenTelemetry setup failed: %s", exc)
