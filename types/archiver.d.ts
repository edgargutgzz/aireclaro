declare module "archiver" {
  import { Readable } from "stream";

  interface Archiver extends Readable {
    append(source: string | Buffer | Readable, data: { name: string }): this;
    pipe(stream: Readable): this;
    finalize(): Promise<void>;
  }

  interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }

  function archiver(format: "zip", options?: ArchiverOptions): Archiver;

  export default archiver;
}
