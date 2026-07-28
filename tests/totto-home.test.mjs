import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("home exposes a real-time 3D Totto stage and adventure action", async () => {
  const home = await read("home.html");
  assert.match(home, /id="tottoStage"/);
  assert.match(home, /id="tottoFallback"/);
  assert.match(home, /id="startAdventure"/);
  assert.match(home, /和托托一起出发/);
  assert.match(home, /totto-3d\.js/);
  assert.match(home, /three(?:\.module(?:\.min)?|\.min)?\.js/);
});

test("3D module exposes the character controller contract", async () => {
  const source = await read("totto-3d.js");
  assert.match(source, /window\.Totto3D\s*=/);
  assert.match(source, /isSupported\s*\(/);
  assert.match(source, /mount\s*\(/);
  assert.match(source, /setSkin\s*\(/);
  assert.match(source, /play\s*\(/);
  assert.match(source, /destroy\s*\(/);
  assert.match(source, /bubbles:\s*true/);
});

test("home transition is carried into the game", async () => {
  const [home, game] = await Promise.all([read("home.html"), read("index.html")]);
  assert.match(home, /index\.html\?from=home/);
  assert.match(game, /id="gameTotto3D"/);
  assert.match(game, /fromHome/);
  assert.match(game, /Totto3D\.mount/);
});

test("motion and fallback safeguards remain available", async () => {
  const [home, module] = await Promise.all([read("home.html"), read("totto-3d.js")]);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /tottoFallback/);
  assert.match(module, /document\.hidden/);
  assert.match(module, /Math\.min\([^,]+,\s*1\.75\)/);
});
