import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all six later levels have dedicated scene selectors", async () => {
  const css = await read("game.css");

  for (const id of ["rain", "vanity", "studio", "picnic", "boba", "winter"]) {
    assert.match(css, new RegExp(`\\.level-${id}`), id);
  }
  assert.match(css, /\.level-rain \.pot\.shaking/);
  assert.match(css, /\.theme-hud/);
  assert.match(css, /\.item\.theme-locked/);
});

test("later scenes keep item geometry shared while changing only their containers", async () => {
  const css = await read("game.css");

  assert.doesNotMatch(css, /\.level-(rain|vanity|studio|picnic|boba|winter) \.items\s*\{/);
  assert.match(css, /\.level-picnic \.pot-rim/);
  assert.match(css, /\.level-winter \.pot-depth/);
  assert.match(css, /\.level-boba \.pot/);
});
