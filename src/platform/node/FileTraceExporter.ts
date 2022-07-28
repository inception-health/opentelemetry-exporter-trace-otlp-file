import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  IExportTraceServiceRequest,
  createExportTraceServiceRequest,
} from "@opentelemetry/otlp-transformer";
import { diag } from "@opentelemetry/api";
import { FileExporterBase } from "../../FileExporterBase";
import { FileExporterNodeConfig } from "./types";
import * as fs from "fs";

export class FileTraceExporter
  extends FileExporterBase<
    FileExporterNodeConfig,
    ReadableSpan,
    IExportTraceServiceRequest
  >
  implements SpanExporter
{
  private _stream: fs.WriteStream;

  constructor(config: FileExporterNodeConfig) {
    super(config);
    this._stream = this._createWriteStream();
  }

  private _createWriteStream(): fs.WriteStream {
    if (this._stream && !this.isShutdown()) {
      return this._stream;
    }
    return fs.createWriteStream(this.filePath, { flags: "a" });
  }
  async onShutdown(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this._stream.end(resolve);
      } catch (error) {
        /* istanbul ignore next */
        reject(error);
      }
    });
  }

  isShutdown(): boolean {
    return this._isShutdown && !this._stream.writable;
  }

  onInit(): void {
    this._isShutdown = false;
    this._stream = this._createWriteStream();
  }

  send(
    objects: ReadableSpan[],
    onSuccess: () => void,
    onError: (error: Error) => void
  ): void {
    /* istanbul ignore if */
    if (this._isShutdown) {
      diag.debug("Shutdown already started. Cannot send objects");
      return;
    }
    const serviceRequest = this.convert(objects);

    const promise = new Promise<void>((resolve, reject) => {
      this._stream.write(JSON.stringify(serviceRequest) + "\n", (err) => {
        /* istanbul ignore if */
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

  convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
    return createExportTraceServiceRequest(spans, true);
  }
}
