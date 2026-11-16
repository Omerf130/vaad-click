import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";

export type EvidenceZipEntry = {
  path: string;
  data: Buffer;
};

export async function buildEvidenceZipArchive(entries: EvidenceZipEntry[]): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    archive.on("error", reject);
    stream.on("error", reject);
  });

  archive.pipe(stream);

  for (const entry of entries) {
    if (entry.path.includes("..") || entry.path.includes("\\")) {
      throw new Error("Unsafe zip path");
    }
    archive.append(entry.data, { name: entry.path });
  }

  await archive.finalize();
  return done;
}