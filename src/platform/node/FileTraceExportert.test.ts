import { SpanStatusCode, TraceFlags } from "@opentelemetry/api";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { FileTraceExporter } from "./FileTraceExporter";
import { FileExporterNodeConfig } from "./types";
import * as fs from "fs";
import { ExportResultCode } from "@opentelemetry/core";
import * as path from "path";

const FILE_PATH = path.join(__dirname, "trace.log");
const EXPECTED_TRACE_FILE = path.join(__dirname, "__assets__", "otlptrace");

export const mockedReadableSpan: ReadableSpan = {
  name: "documentFetch",
  kind: 0,
  spanContext: () => {
    return {
      traceId: "1f1008dc8e270e85c40a0d7c3939b278",
      spanId: "5e107261f64fa53e",
      traceFlags: TraceFlags.SAMPLED,
    };
  },
  parentSpanId: "78a8915098864388",
  startTime: [1574120165, 429803070],
  endTime: [1574120165, 438688070],
  ended: true,
  status: { code: SpanStatusCode.OK },
  attributes: { component: "document-load" },
  links: [
    {
      context: {
        traceId: "1f1008dc8e270e85c40a0d7c3939b278",
        spanId: "78a8915098864388",
        traceFlags: TraceFlags.SAMPLED,
      },
      attributes: { component: "document-load" },
    },
  ],
  events: [
    { name: "fetchStart", time: [1574120165, 429803070] },
    {
      name: "domainLookupStart",
      time: [1574120165, 429803070],
    },
    { name: "domainLookupEnd", time: [1574120165, 429803070] },
    {
      name: "connectStart",
      time: [1574120165, 429803070],
    },
    { name: "connectEnd", time: [1574120165, 429803070] },
    {
      name: "requestStart",
      time: [1574120165, 435513070],
    },
    { name: "responseStart", time: [1574120165, 436923070] },
    {
      name: "responseEnd",
      time: [1574120165, 438688070],
    },
  ],
  duration: [0, 8885000],
  resource: Resource.default().merge(
    new Resource({
      service: "ui",
      version: 1,
      cost: 112.12,
    })
  ),
  instrumentationLibrary: { name: "default", version: "0.0.1" },
};
describe("FileTraceExporter", () => {
  let collectorExporter: FileTraceExporter;
  let collectorExporterConfig: FileExporterNodeConfig;
  let spans: ReadableSpan[];

  describe("export", () => {
    let resultCode: ExportResultCode | undefined = undefined;
    beforeAll((done) => {
      collectorExporterConfig = {
        filePath: FILE_PATH,
        attributes: {},
      };
      collectorExporter = new FileTraceExporter(collectorExporterConfig);
      spans = [];
      resultCode = undefined;
      spans.push(Object.assign({}, mockedReadableSpan));
      collectorExporter.export(spans, ({ code, error }) => {
        resultCode = code;
        done(error);
      });
    });

    afterAll(async () => {
      await collectorExporter.shutdown();

      if (fs.existsSync(FILE_PATH)) {
        fs.unlinkSync(FILE_PATH);
      }
    });

    it("should have result code of success", () => {
      expect(resultCode).toEqual(ExportResultCode.SUCCESS);
    });

    it("should export traces to file", () => {
      expect(fs.existsSync(FILE_PATH)).toBeTruthy();
    });

    it("should match snapshot", () => {
      const trace = fs.readFileSync(FILE_PATH);
      const expectedTrace = fs.readFileSync(EXPECTED_TRACE_FILE);
      expect(trace).toEqual(expectedTrace);
    });
  });

  describe("shutdown", () => {
    beforeEach(() => {
      collectorExporterConfig = {
        filePath: FILE_PATH,
        attributes: {},
        concurrencyLimit: 1,
      };
      collectorExporter = new FileTraceExporter(collectorExporterConfig);
      spans = [];
      spans.push(Object.assign({}, mockedReadableSpan));
    });

    afterEach(async () => {
      await collectorExporter.shutdown();

      if (fs.existsSync(FILE_PATH)) {
        fs.unlinkSync(FILE_PATH);
      }
    });

    it("should shutdown", async () => {
      await collectorExporter.shutdown();
      expect(collectorExporter.isShutdown()).toBeTruthy();
      collectorExporter.onInit();
      expect(collectorExporter.isShutdown()).toBeFalsy();
    });

    it("should error exporting when shutdown", (done) => {
      collectorExporter
        .shutdown()
        .then(() =>
          collectorExporter.export(spans, (result) => {
            expect(result.code).toEqual(ExportResultCode.FAILED);
            done();
          })
        )
        .catch(done);
    });

    it("should error exporting when over concurrency limit", (done) => {
      const spy = jest.fn();
      collectorExporter.export(spans, spy);
      collectorExporter.export(spans, (result) => {
        try {
          expect(result.code).toEqual(ExportResultCode.FAILED);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it("should error exporting when callback errors", (done) => {
      const mockSend = jest.fn().mockImplementation(() => {
        throw new Error("Send Error");
      });
      collectorExporter.send = mockSend;
      collectorExporter.export(spans, (result) => {
        try {
          expect(result.error?.message).toEqual("Send Error");
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });
});
