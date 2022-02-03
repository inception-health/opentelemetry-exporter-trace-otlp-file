import { SpanAttributes } from "@opentelemetry/api";

export interface FileExporterConfigBase {
  filePath: string;
  attributes?: SpanAttributes;
  concurrencyLimit?: number;
}
