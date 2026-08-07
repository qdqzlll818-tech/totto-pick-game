import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("home builds every map and wardrobe card from game configuration", async () => {
  const home = await read("home.html");

  assert.match(home, /id="levelList"/);
  assert.match(home, /id="skinGrid"/);
  assert.match(home, /TottoGameConfig\.ORDER\.map/);
  assert.match(home, /level\.skinAsset/);
  assert.match(home, /index\.html\?level=\$\{level\.id\}/);
  assert.doesNotMatch(home, /id="garlicLevel"/);
  assert.doesNotMatch(home, /id="fruitLevel"/);
});

test("home renders Totto as a lightweight image without 3D dependencies", async () => {
  const home = await read("home.html");
  assert.match(home, /id="tottoStage"/);
  assert.match(home, /id="tottoPortrait"/);
  assert.match(home, /src="assets\/characters\/totto-default\.webp\?v=3"/);
  assert.match(home, /id="startAdventure"/);
  assert.match(home, /和托托一起出发/);
  assert.doesNotMatch(home, /<model-viewer/);
  assert.doesNotMatch(home, /@google\/model-viewer/);
  assert.doesNotMatch(home, /\.glb/);
  assert.doesNotMatch(home, /tottoModel/);
  assert.doesNotMatch(home, /totto-3d\.js/);
  assert.doesNotMatch(home, /three(?:\.module(?:\.min)?|\.min)?\.js/);
  assert.doesNotMatch(home, /Totto3D\.mount/);
});

test("published Totto wardrobe images are valid WebP files", async () => {
  for (const path of [
    "../assets/characters/totto-default.webp",
    "../assets/characters/totto-hotpot-chef.webp",
    "../assets/characters/totto-garlic-approved.webp",
    "../assets/characters/totto-fruit-approved.webp",
    "../assets/characters/totto-rain.webp",
    "../assets/characters/totto-vanity.webp",
    "../assets/characters/totto-artist.webp",
    "../assets/characters/totto-picnic.webp",
    "../assets/characters/totto-boba.webp",
    "../assets/characters/totto-winter.webp"
  ]) {
    const image = await readFile(new URL(path, import.meta.url));
    assert.equal(image.toString("ascii", 0, 4), "RIFF");
    assert.equal(image.toString("ascii", 8, 12), "WEBP");
    assert.ok(image.length > 10_000);
  }
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

test("game loads the current save-migration script instead of a cached copy", async () => {
  const game = await read("index.html");
  assert.match(game, /<script src="game-state\.js\?v=11"><\/script>/);
});

test("image character keeps touch and keyboard interactions", async () => {
  const home = await read("home.html");
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /portrait\.addEventListener\("click",greetFromPointer\)/);
  assert.match(home, /portrait\.addEventListener\("keydown"/);
  assert.match(home, /aria-label="可以互动的托托"/);
});
