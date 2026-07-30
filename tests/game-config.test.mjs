import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  LEVELS,
  buildPool,
  getLevel,
  isLevelUnlocked
} = require("../game-config.js");

test("each level builds the approved total and keeps every type matchable by three", () => {
  const totals = { hotpot: 93, garlic: 108, fruit: 126 };

  for (const [id, expectedTotal] of Object.entries(totals)) {
    const pool = buildPool(getLevel(id), () => 0.5);
    assert.equal(pool.length, expectedTotal, `${id} total`);

    const counts = new Map();
    for (const item of pool) counts.set(item.type, (counts.get(item.type) || 0) + 1);
    for (const [type, count] of counts) {
      assert.equal(count % 3, 0, `${id}/${type} count ${count}`);
    }
  }
});

test("each level contains exactly three matching themed Totto items", () => {
  for (const id of Object.keys(LEVELS)) {
    const themedTotto = buildPool(getLevel(id), () => 0.5).filter(item => item.special);
    assert.equal(themedTotto.length, 3, id);
    assert.equal(new Set(themedTotto.map(item => item.type)).size, 1, id);
  }
});

test("hotpot uses cohesive local 3D food renders instead of platform emoji", () => {
  const hotpot = buildPool(getLevel("hotpot"), () => 0.5);
  const food = hotpot.filter(item => !item.special);

  assert.ok(food.length > 0);
  assert.ok(food.every(item => /^assets\/food\/[a-z-]+\.png$/.test(item.asset)));
  assert.equal(new Set(food.map(item => item.type)).size, 7);
});

test("every level uses cohesive local 3D renders instead of platform emoji", () => {
  const assetFolders = {
    hotpot: "food",
    garlic: "garlic",
    fruit: "fruit"
  };

  for (const [id, folder] of Object.entries(assetFolders)) {
    const regularItems = buildPool(getLevel(id), () => 0.5).filter(item => !item.special);
    const localAsset = new RegExp(`^assets/${folder}/[a-z-]+\\.png$`);

    assert.ok(regularItems.length > 0, id);
    assert.ok(regularItems.every(item => localAsset.test(item.asset)), id);
    assert.ok(regularItems.every(item => !item.asset.startsWith("emoji:")), id);
  }
});

test("levels unlock only after the immediately preceding level is complete", () => {
  assert.equal(isLevelUnlocked("hotpot", []), true);
  assert.equal(isLevelUnlocked("garlic", []), false);
  assert.equal(isLevelUnlocked("garlic", ["hotpot"]), true);
  assert.equal(isLevelUnlocked("fruit", ["hotpot"]), false);
  assert.equal(isLevelUnlocked("fruit", ["hotpot", "garlic"]), true);
});

test("unknown level ids safely fall back to hotpot", () => {
  assert.equal(getLevel("missing").id, "hotpot");
  assert.equal(getLevel(null).id, "hotpot");
});
