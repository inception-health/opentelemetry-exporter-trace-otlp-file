import { Attributes } from "@opentelemetry/api";

export interface WriteStreamExporterConfigBase {
  attributes?: Attributes;
  concurrencyLimit?: number;
}
