import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function readGlbJson(path) {
  const glb = await readFile(path);
  assert.equal(glb.toString("ascii", 0, 4), "glTF");
  assert.equal(glb.readUInt32LE(4), 2);
  const jsonLength = glb.readUInt32LE(12);
  assert.equal(glb.readUInt32LE(16), 0x4e4f534a);
  return JSON.parse(glb.toString("utf8", 20, 20 + jsonLength).trim());
}

test("home renders the static Totto GLB with an image fallback", async () => {
  const home = await read("home.html");
  assert.match(home, /id="tottoStage"/);
  assert.match(home, /@google\/model-viewer@4\.2\.0/);
  assert.match(home, /id="tottoModel"/);
  assert.match(home, /src="assets\/models\/totto-static-web\.glb\?v=1"/);
  assert.doesNotMatch(home, /animation-name=/);
  assert.doesNotMatch(home, /\sautoplay(?:\s|>)/);
  assert.match(home, /camera-controls/);
  assert.match(home, /disable-zoom/);
  assert.match(home, /id="tottoFallback"/);
  assert.match(home, /id="startAdventure"/);
  assert.match(home, /和托托一起出发/);
  assert.match(home, /modelReady/);
  assert.match(home, /tottoModel\.addEventListener\("load"/);
  assert.match(home, /tottoModel\.addEventListener\("error"/);
  assert.match(home, /syncCharacterView/);
  assert.doesNotMatch(home, /totto-3d\.js/);
  assert.doesNotMatch(home, /three(?:\.module(?:\.min)?|\.min)?\.js/);
  assert.doesNotMatch(home, /Totto3D\.mount/);
});

test("Totto web model contains no animation tracks", async () => {
  const glb = await readGlbJson(new URL("../assets/models/totto-static-web.glb", import.meta.url));
  assert.equal(glb.animations?.length ?? 0, 0);
});

test("legacy 3D module remains isolated for a future GLB replacement", async () => {
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
  assert.match(game, /fromHome/);
  assert.match(game, /id="brandTotto"/);
  assert.match(game, /playBrandPose/);
  assert.doesNotMatch(game, /id="gameTotto3D"/);
  assert.doesNotMatch(game, /totto-3d\.js/);
  assert.doesNotMatch(game, /Totto3D\.mount/);
  assert.doesNotMatch(game, /three(?:\.module(?:\.min)?|\.min)?\.js/);
});

test("static model keeps fallback safeguards without playback controls", async () => {
  const home = await read("home.html");
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /tottoModel/);
  assert.match(home, /tottoFallback/);
  assert.doesNotMatch(home, /tottoModel\.(?:play|pause)\(\)/);
  assert.doesNotMatch(home, /timeScale/);
  assert.match(home, /aria-label="可以互动的托托"/);
});
