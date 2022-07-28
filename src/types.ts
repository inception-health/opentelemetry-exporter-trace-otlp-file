import { Attributes } from "@opentelemetry/api";

export interface FileExporterConfigBase {
  filePath: string;
  attributes?: Attributes;
  concurrencyLimit?: number;
}
