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
