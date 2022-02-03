import { SpanAttributes, diag } from "@opentelemetry/api";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { ExportServiceError } from "@opentelemetry/exporter-trace-otlp-http/build/src/types";
import { FileExporterConfigBase } from "./types";

export abstract class FileExporterBase<
  T extends FileExporterConfigBase,
  ExportItem,
  ServiceRequest
> {
  public readonly filePath: string;
  public readonly attributes?: SpanAttributes;
  protected _concurrencyLimit: number;
  protected _isShutdown = false;
  private _shuttingDownPromise: Promise<void> = Promise.resolve();
  protected _sendingPromises: Promise<unknown>[] = [];

  /**
   * @param config
   */
  constructor(config: T = {} as T) {
    this.filePath = config.filePath;

    this.attributes = config.attributes;

    this.shutdown = this.shutdown.bind(this);

    this._concurrencyLimit =
      typeof config.concurrencyLimit === "number"
        ? config.concurrencyLimit
        : Infinity;

    // platform dependent
    this.onInit(config);
  }

  /**
   * Export items.
   * @param items
   * @param resultCallback
   */
  export(
    items: ExportItem[],
    resultCallback: (result: ExportResult) => void
  ): void {
    if (this._isShutdown) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error("Exporter has been shutdown"),
      });
      return;
    }

    if (this._sendingPromises.length >= this._concurrencyLimit) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error("Concurrent export limit reached"),
      });
      return;
    }

    this._export(items)
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((error: ExportServiceError) => {
        resultCallback({ code: ExportResultCode.FAILED, error });
      });
  }

  private _export(items: ExportItem[]): Promise<unknown> {
    return new Promise<void>((resolve, reject) => {
      try {
        diag.debug("items to be sent", items);
        this.send(items, resolve, reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Shutdown the exporter.
   */
  shutdown(): Promise<void> {
    if (this._isShutdown) {
      diag.debug("shutdown already started");
      return this._shuttingDownPromise;
    }
    this._isShutdown = true;
    diag.debug("shutdown started");
    this._shuttingDownPromise = new Promise((resolve, reject) => {
      Promise.resolve()
        .then(() => {
          return this.onShutdown();
        })
        .then(() => {
          return Promise.all(this._sendingPromises);
        })
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    });
    return this._shuttingDownPromise;
  }

  abstract onShutdown(): void;
  abstract onInit(config: T): void;
  abstract send(
    items: ExportItem[],
    onSuccess: () => void,
    onError: (error: Error) => void
  ): void;
  abstract convert(objects: ExportItem[]): ServiceRequest;
}
