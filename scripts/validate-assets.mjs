import { readFile, stat } from "node:fs/promises";

const paths = process.argv.slice(2);
if (!paths.length) throw new Error("pass at least one asset path");

for (const path of paths) {
  const [bytes, info] = await Promise.all([readFile(path), stat(path)]);

  if (path.endsWith(".webp")) {
    const isWebp = bytes.toString("ascii", 0, 4) === "RIFF"
      && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!isWebp) throw new Error(`${path}: invalid WebP signature`);
    if (bytes.readUInt32LE(4) + 8 !== bytes.length) {
      throw new Error(`${path}: truncated WebP file`);
    }
  } else if (path.endsWith(".png")) {
    if (bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
      throw new Error(`${path}: invalid PNG signature`);
    }
    if (bytes.subarray(-12).toString("hex") !== "0000000049454e44ae426082") {
      throw new Error(`${path}: truncated PNG file`);
    }
  }

  if (info.size < 10_000) throw new Error(`${path}: suspiciously small`);
  if (info.size > 900_000) throw new Error(`${path}: exceeds web budget`);
  console.log(`${path}: ${info.size} bytes`);
}
