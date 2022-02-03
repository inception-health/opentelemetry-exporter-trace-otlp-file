import { SpanStatusCode, TraceFlags } from "@opentelemetry/api";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { FileTraceExporter } from "./FileTraceExporter";
import { FileExporterNodeConfig } from "./types";
import * as fs from "fs";

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
    beforeEach(() => {
      collectorExporterConfig = {
        filePath: "trace.log",
        attributes: {},
      };
      collectorExporter = new FileTraceExporter(collectorExporterConfig);
      spans = [];
      spans.push(Object.assign({}, mockedReadableSpan));
    });

    it("should open the connection", (done) => {
      collectorExporter.export(spans, () => {
        try {
          expect(fs.existsSync("trace.log")).toBeTruthy();
          done();
        } catch (error) {
          done(error);
        } finally {
          fs.unlinkSync("trace.log");
        }
      });
    });
  });
});
