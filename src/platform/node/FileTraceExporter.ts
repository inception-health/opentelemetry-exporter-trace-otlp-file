import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { otlpTypes } from "@opentelemetry/exporter-trace-otlp-http";
import { diag } from "@opentelemetry/api";
import { FileExporterBase } from "../../FileExporterBase";
import { FileExporterNodeConfig } from "./types";
import { toFileExportTraceServiceRequest } from "../../transform";
import * as fs from "fs";
import * as os from "os";

export class FileTraceExporter
  extends FileExporterBase<
    FileExporterNodeConfig,
    ReadableSpan,
    otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest
  >
  implements SpanExporter
{
  private _stream: fs.WriteStream;

  constructor(config: FileExporterNodeConfig) {
    super(config);
    this._stream = fs.createWriteStream(this.filePath, { flags: "a" });
  }

  onShutdown(): void {
    try {
      this._stream.end();
    } finally {
      this._isShutdown = true;
    }
  }

  onInit(): void {
    this._isShutdown = false;
  }

  send(
    objects: ReadableSpan[],
    onSuccess: () => void,
    onError: (error: Error) => void
  ): void {
    if (this._isShutdown) {
      diag.debug("Shutdown already started. Cannot send objects");
      return;
    }
    const serviceRequest = this.convert(objects);

    const promise = new Promise<void>((resolve, reject) => {
      this._stream.write(JSON.stringify(serviceRequest) + "\n", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }).then(onSuccess, onError);

    this._sendingPromises.push(promise);
    const popPromise = () => {
      const index = this._sendingPromises.indexOf(promise);
      this._sendingPromises.splice(index, 1);
    };
    promise.then(popPromise, popPromise);
  }

  convert(
    spans: ReadableSpan[]
  ): otlpTypes.opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest {
    return toFileExportTraceServiceRequest(spans, this, true);
  }
}
