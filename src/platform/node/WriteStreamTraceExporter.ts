import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
  IExportTraceServiceRequest,
  createExportTraceServiceRequest,
} from "@opentelemetry/otlp-transformer";
import { diag } from "@opentelemetry/api";
import { WriteStreamExporterBase } from "../../WriteStreamExporterBase";
import { WriteStreamExporterNodeConfig } from "./types";
import * as stream from "node:stream";

export class WriteStreamTraceExporter
  extends WriteStreamExporterBase<
    WriteStreamExporterNodeConfig,
    ReadableSpan,
    IExportTraceServiceRequest
  >
  implements SpanExporter
{
  protected _stream?: stream.Writable;

  onInit(config: WriteStreamExporterNodeConfig): void {
    this._isShutdown = false;
    this._stream = config.stream;
  }

  async onShutdown(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this._stream?.end(resolve);
      } catch (error) {
        /* istanbul ignore next */
        reject(error);
      }
    });
  }

  isShutdown(): boolean {
    return this._isShutdown && !this._stream?.writable;
  }

  send(
    objects: ReadableSpan[],
    onSuccess: () => void,
    onError: (error: Error) => void
  ): void {
    /* istanbul ignore if */
    if (this.isShutdown()) {
      diag.debug("Shutdown already started. Cannot send objects");
      return;
    }
    const serviceRequest = this.convert(objects);

    const promise = new Promise<void>((resolve, reject) => {
      this._stream?.write(JSON.stringify(serviceRequest) + "\n", (err) => {
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
