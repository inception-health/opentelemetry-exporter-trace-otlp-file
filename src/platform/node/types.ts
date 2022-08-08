import { WriteStreamExporterConfigBase } from "../../types";
import * as stream from "node:stream";

export interface WriteStreamExporterNodeConfig
  extends WriteStreamExporterConfigBase {
  stream: stream.Writable;
}

export interface FileExporterNodeConfig extends WriteStreamExporterConfigBase {
  filePath: string;
}
