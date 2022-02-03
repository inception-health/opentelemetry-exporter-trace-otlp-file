import { SpanAttributes } from "@opentelemetry/api";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import * as core from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import {
  otlpTypes,
  toCollectorResource,
} from "@opentelemetry/exporter-trace-otlp-http";
import {
  toCollectorSpan,
  groupSpansByResourceAndLibrary,
} from "@opentelemetry/exporter-trace-otlp-http/build/src/transform";
import { FileExporterConfigBase } from "./types";
import { FileExporterBase } from "./FileExporterBase";

/**
 * Prepares trace service request to be sent to collector
 * @param spans spans
 * @param collectorExporterBase
 * @param useHex - if ids should be kept as hex without converting to base64
 */
export function toFileExportTraceServiceRequest<
  T extends FileExporterConfigBase
>(
  spans: ReadableSpan[],
  collectorTraceExporterBase: FileExporterBase<
    T,
    ReadableSpan,
    otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest
  >,
  useHex?: boolean
): otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest {
  const groupedSpans: Map<
    Resource,
    Map<core.InstrumentationLibrary, ReadableSpan[]>
  > = groupSpansByResourceAndLibrary(spans);

  const additionalAttributes = Object.assign(
    {},
    collectorTraceExporterBase.attributes
  );

  return {
    resourceSpans: toCollectorResourceSpans(
      groupedSpans,
      additionalAttributes,
      useHex
    ),
  };
}

/**
 * Convert to InstrumentationLibrarySpans
 * @param instrumentationLibrary
 * @param spans
 * @param useHex - if ids should be kept as hex without converting to base64
 */
function toCollectorInstrumentationLibrarySpans(
  instrumentationLibrary: core.InstrumentationLibrary,
  spans: ReadableSpan[],
  useHex?: boolean
): otlpTypes.opentelemetryProto.trace.v1.InstrumentationLibrarySpans {
  return {
    spans: spans.map((span) => toCollectorSpan(span, useHex)),
    instrumentationLibrary,
  };
}

/**
 * Returns a list of resource spans which will be exported to the collector
 * @param groupedSpans
 * @param baseAttributes
 * @param useHex - if ids should be kept as hex without converting to base64
 */
function toCollectorResourceSpans(
  groupedSpans: Map<Resource, Map<core.InstrumentationLibrary, ReadableSpan[]>>,
  baseAttributes: SpanAttributes,
  useHex?: boolean
): otlpTypes.opentelemetryProto.trace.v1.ResourceSpans[] {
  return Array.from(groupedSpans, ([resource, libSpans]) => {
    return {
      resource: toCollectorResource(resource, baseAttributes),
      instrumentationLibrarySpans: Array.from(
        libSpans,
        ([instrumentationLibrary, spans]) =>
          toCollectorInstrumentationLibrarySpans(
            instrumentationLibrary,
            spans,
            useHex
          )
      ),
    };
  });
}
