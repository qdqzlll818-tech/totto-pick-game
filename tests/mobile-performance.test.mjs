import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("game startup decodes unique level assets and mounts the board in frame-sized batches", async () => {
  const source = await read("game-app.js");
  assert.match(source, /preloadLevelAssets/);
  assert.match(source, /image\.decode/);
  assert.match(source, /DocumentFragment/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /drawImage\(image, 0, 0, canvas\.width, canvas\.height\)/);
  assert.doesNotMatch(source, /els\.items\.innerHTML\s*=\s*""/);
});

test("cloud provider no longer blocks initial game script execution", async () => {
  const html = await read("index.html");
  assert.match(html, /supabase-js@2"\s+defer/);
});

test("2.5D updates use transform animation and expose debug tools only by query opt-in", async () => {
  const [app, css, html] = await Promise.all([
    read("game-app.js"),
    read("game.css"),
    read("index.html")
  ]);
  assert.match(app, /params\.get\("dev"\) === "1"/);
  assert.match(app, /simulateShake/);
  assert.match(css, /\.physics-debug/);
  assert.match(css, /translate3d/);
  assert.match(html, /id="physicsDebug"/);
  assert.match(html, /hidden/);
  assert.match(app, /if \(!boardReady \|\| isPaused \|\| resolveLock \|\| physicsLock/);
  assert.match(app, /physicsLock = true;[\s\S]*await animateExtraction/);
});

test("black garlic is not made transparent by gameplay CSS", async () => {
  const css = await read("game.css");
  assert.doesNotMatch(css, /purple-garlic[^}]*opacity\s*:/);
  assert.doesNotMatch(css, /purple-garlic[^}]*mix-blend-mode\s*:/);
});
