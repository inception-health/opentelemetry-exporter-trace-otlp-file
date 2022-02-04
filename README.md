# OpenTelemetry OTLP Trace Exporter to File

This OpenTelemetry exporter will stream spans as OTLP json to a log file

## Usage

```javascript
import { FileTraceExporter } from "opentelemetry-exporter-trace-otlp-file";

const exporter = new FileTraceExporter({ filePath: "trace.log" });
const tracerProvider = new BasicTracerProvider();
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));
tracerProvider.register();
```
