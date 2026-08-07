import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getLevel, ORDER } = require("../game-config.js");
const { createGame, restoreGame } = require("../game-state.js");
const boardMotion = require("../board-motion.js");

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
    assert.ok(state.items.every(item => Number.isFinite(item.z)));
    assert.ok(state.items.every(item => Array.isArray(item.supportUids)));
    assert.ok(state.items.every(item => Array.isArray(item.occluderUids)));
    assert.ok(state.items.every(item => item.motionState === "stable"));
  }
});

test("initial boards form a dense layered pile without a hollow center", () => {
  for (const id of ["hotpot", "garlic", "fruit"]) {
    const level = getLevel(id);
    const state = createGame(level, () => 0.42);
    const distances = state.items.map(item => Math.hypot(
      (item.x - 50) / 46,
      (item.y - 50) / 38
    ));

    assert.ok(distances.filter(distance => distance <= 0.24).length >= 3, `${id} fills its center`);
    assert.ok(state.items.every((item, index) => index === 0 || item.depth !== undefined));
    assert.ok(new Set(state.items.map(item => item.depth)).size > level.itemsPerLayer);
    assert.ok(new Set(state.items.map(item => item.scale)).size > 2);
    assert.ok(distances.every(distance => distance <= 1), `${id} stays inside the pot`);
    assert.ok(distances.filter(distance => distance >= 0.78).length >= 9, `${id} fills the outer bowl`);
    assert.equal(state.layoutVersion, 5);
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

test("saves containing retired item types are discarded instead of restoring old emoji assets", () => {
  const level = getLevel("hotpot");
  const state = createGame(level, () => 0.42);
  state.items[0].type = "retired-fish-ball";
  state.items[0].asset = "emoji:⚪";

  assert.equal(restoreGame(JSON.stringify(state), level), null);
});

test("known items with an older asset URL migrate without losing the current game", () => {
  const level = getLevel("garlic");
  const state = createGame(level, () => 0.42);
  const themedTotto = state.items.find(item => item.special);
  themedTotto.asset = "assets/characters/totto-garlic.webp";
  themedTotto.selected = true;
  state.score = 70;
  state.tray.push({
    uid: themedTotto.uid,
    type: themedTotto.type,
    asset: themedTotto.asset,
    name: themedTotto.name,
    special: true
  });

  const restored = restoreGame(JSON.stringify(state), level, () => 0.42);
  const approvedAsset = "assets/characters/totto-garlic-approved.webp";

  assert.equal(restored.score, 70);
  assert.equal(restored.items.find(item => item.uid === themedTotto.uid).asset, approvedAsset);
  assert.equal(restored.tray[0].asset, approvedAsset);
});

test("old ring-layout saves migrate into a dense pile without losing progress", () => {
  const level = getLevel("garlic");
  const oldSave = createGame(level, () => 0.42);
  delete oldSave.layoutVersion;
  oldSave.score = 20;
  oldSave.items[0].selected = true;
  oldSave.items[1].selected = true;
  oldSave.tray = oldSave.items.slice(0, 2).map(item => ({
    uid: item.uid,
    type: item.type,
    asset: item.asset,
    name: item.name,
    special: item.special
  }));
  for (const item of oldSave.items) {
    item.x = 82;
    item.y = 50;
    delete item.depth;
    delete item.scale;
  }

  const restored = restoreGame(JSON.stringify(oldSave), level, () => 0.42);
  const active = restored.items.filter(item => !item.selected);
  const centerCount = active.filter(item => Math.hypot(
    (item.x - 50) / 46,
    (item.y - 50) / 38
  ) <= 0.24).length;

  assert.equal(restored.layoutVersion, 5);
  assert.equal(restored.score, 20);
  assert.equal(restored.tray.length, 2);
  assert.equal(active.length, 106);
  assert.ok(centerCount >= 3);
  assert.ok(active.every(item => item.depth !== undefined && item.scale !== undefined));
});

test("version four saves gain physics state without losing progress", () => {
  const level = getLevel("garlic");
  const saved = createGame(level, () => 0.42);
  saved.layoutVersion = 4;
  saved.score = 120;
  for (const item of saved.items) {
    delete item.z;
    delete item.supportUids;
    delete item.occluderUids;
    delete item.motionState;
  }

  const restored = restoreGame(JSON.stringify(saved), level, () => 0.42);
  assert.equal(restored.score, 120);
  assert.equal(restored.layoutVersion, 5);
  assert.ok(restored.items.every(item => Number.isFinite(item.z)));
  assert.ok(restored.items.every(item => item.motionState === "stable"));
});

test("all nine physics boards can be drained without an occlusion deadlock", () => {
  for (const [levelIndex, id] of ORDER.entries()) {
    const state = createGame(getLevel(id), boardMotion.createSeededRandom(900 + levelIndex));
    let steps = 0;
    while (steps < state.items.length) {
      const item = state.items
        .filter(candidate => boardMotion.canPickItem(candidate))
        .sort((left, right) => right.z - left.z)[0];
      assert.ok(item, `${id} has a pickable item at step ${steps}`);
      const result = boardMotion.planRemoval(
        state.items,
        item.uid,
        boardMotion.createSeededRandom(2_000 + steps)
      );
      item.selected = true;
      boardMotion.finalizePlans(state.items, result.plans);
      assert.ok(state.items.filter(candidate => !candidate.selected).every(boardMotion.isInsidePot), id);
      steps += 1;
    }
    assert.equal(steps, state.items.length, id);
  }
});
