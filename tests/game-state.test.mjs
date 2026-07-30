import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getLevel } = require("../game-config.js");
const { createGame, restoreGame } = require("../game-state.js");

test("shared game state builds the selected level with the configured item count", () => {
  for (const id of ["hotpot", "garlic", "fruit"]) {
    const level = getLevel(id);
    const state = createGame(level, () => 0.42);

    assert.equal(state.levelId, id);
    assert.equal(state.items.length, level.total);
    assert.equal(state.status, "playing");
    assert.deepEqual(state.tray, []);
    assert.deepEqual(state.reserve, []);
    assert.ok(state.items.every(item => item.layer >= 0));
  }
});

test("saved games restore only into their original level", () => {
  const hotpot = getLevel("hotpot");
  const state = createGame(hotpot, () => 0.42);
  const serialized = JSON.stringify(state);

  assert.equal(restoreGame(serialized, hotpot).levelId, "hotpot");
  assert.equal(restoreGame(serialized, getLevel("garlic")), null);
  assert.equal(restoreGame("{broken", hotpot), null);
});

test("finished games are not resumed", () => {
  const level = getLevel("hotpot");
  const state = createGame(level, () => 0.42);
  state.status = "won";

  assert.equal(restoreGame(JSON.stringify(state), level), null);
});
