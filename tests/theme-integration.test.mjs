import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getLevel } = require("../game-config.js");
const { createGame, restoreGame } = require("../game-state.js");
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new theme levels initialize serializable mechanic state", () => {
  const expected = {
    studio: "studio-combo",
    boba: "boba-orders",
    winter: "winter-yarn"
  };

  for (const [id, kind] of Object.entries(expected)) {
    const state = createGame(getLevel(id), () => 0.25);
    assert.equal(state.theme.kind, kind, id);
    assert.doesNotThrow(() => JSON.stringify(state.theme), id);
  }
});

test("older valid saves receive the current level mechanic state", () => {
  const level = getLevel("studio");
  const saved = createGame(level, () => 0.25);
  delete saved.theme;

  const restored = restoreGame(JSON.stringify(saved), level, () => 0.25);
  assert.equal(restored.theme.kind, "studio-combo");
});

test("game page loads mechanics before state and exposes a theme HUD", async () => {
  const html = await read("index.html");
  const mechanicsPosition = html.indexOf("theme-mechanics.js");
  const statePosition = html.indexOf("game-state.js");

  assert.ok(mechanicsPosition > 0);
  assert.ok(mechanicsPosition < statePosition);
  assert.match(html, /id="themeHud"/);
});

test("game app gates locked items, processes matches, and renders mechanic feedback", async () => {
  const source = await read("game-app.js");

  assert.match(source, /TottoThemeMechanics\.canPickItem/);
  assert.match(source, /TottoThemeMechanics\.onThemeMatch/);
  assert.match(source, /function renderThemeHud\(\)/);
  assert.match(source, /renderThemeHud\(\)/);
});
