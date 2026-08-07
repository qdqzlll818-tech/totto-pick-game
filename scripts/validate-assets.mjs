import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { LEVELS } = require("../game-config.js");
const configured = Object.values(LEVELS).flatMap(level => [
  level.skinAsset,
  ...level.items.map(item => item.asset)
]);
const paths = [...new Set(configured.filter(path => path && !path.startsWith("emoji:")))];

if (!paths.length) throw new Error("no configured image assets found");

let totalBytes = 0;
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
  } else {
    throw new Error(`${path}: unsupported configured image format`);
  }

  if (info.size < 2_000) throw new Error(`${path}: suspiciously small`);
  if (info.size > 450_000) throw new Error(`${path}: exceeds mobile image budget`);
  totalBytes += info.size;
}

console.log(`${paths.length} configured images valid · ${totalBytes} bytes total`);
