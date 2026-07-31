import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("game exposes a complete pause menu with safe restart confirmation", async () => {
  const html = await read("index.html");

  for (const id of [
    "pauseBtn",
    "pauseMenu",
    "continueBtn",
    "restartBtn",
    "restartConfirm",
    "confirmRestartBtn",
    "cancelRestartBtn",
    "pauseHomeLink"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /aria-modal="true"/);
});

test("paused games freeze time and reject board input until continued", async () => {
  const source = await read("game-app.js");

  assert.match(source, /let isPaused = false/);
  assert.match(source, /function pauseGame\(\)/);
  assert.match(source, /function continueGame\(\)/);
  assert.match(source, /if \(isPaused \|\| resolveLock/);
  assert.match(source, /state\.status === "playing" && !isPaused/);
  assert.match(source, /els\.pauseMenu\.classList\.add\("show"\)/);
});

test("the current visual and script versions are cache-busted together", async () => {
  const html = await read("index.html");

  assert.match(html, /game\.css\?v=8/);
  assert.match(html, /game-config\.js\?v=8/);
  assert.match(html, /game-state\.js\?v=8/);
  assert.match(html, /motion-controls\.js\?v=9/);
  assert.match(html, /item-hit-test\.js\?v=8/);
  assert.match(html, /game-app\.js\?v=8/);
});
