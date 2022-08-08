import { SpanExporter } from "@opentelemetry/sdk-trace-base";

import { WriteStreamTraceExporter } from "./WriteStreamTraceExporter";
import { FileExporterNodeConfig } from "./types";
import * as fs from "fs";

export class FileTraceExporter
  extends WriteStreamTraceExporter
  implements SpanExporter
{
  constructor(config: FileExporterNodeConfig) {
    super({
      attributes: config.attributes,
      concurrencyLimit: config.concurrencyLimit,
      stream: fs.createWriteStream(config.filePath, { flags: "a" }),
    });
  }
}
