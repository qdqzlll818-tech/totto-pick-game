import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  LEVELS,
  ORDER,
  buildPool,
  getLevel,
  isLevelUnlocked
} = require("../game-config.js");

test("all nine levels have approved totals and order", () => {
  assert.deepEqual(ORDER, [
    "hotpot", "garlic", "fruit", "rain", "vanity",
    "studio", "picnic", "boba", "winter"
  ]);
  assert.deepEqual(
    Object.fromEntries(ORDER.map(id => [id, buildPool(getLevel(id), () => 0.5).length])),
    {
      hotpot: 93,
      garlic: 108,
      fruit: 126,
      rain: 135,
      vanity: 144,
      studio: 150,
      picnic: 156,
      boba: 162,
      winter: 168
    }
  );
});

test("new levels use local cohesive 3D assets", () => {
  for (const id of ["rain", "vanity", "studio", "picnic", "boba", "winter"]) {
    const level = getLevel(id);
    const regular = level.items.filter(entry => !entry.special);
    assert.ok(regular.every(entry => entry.asset.startsWith(`assets/${id}/`)), id);
    assert.ok(regular.every(entry => /\.(png|webp)$/.test(entry.asset)), id);
    assert.equal(level.items.filter(entry => entry.special)[0].count, 3, id);
  }
});

test("every later level requires the immediately previous clear", () => {
  const completed = [];
  for (let index = 0; index < ORDER.length; index += 1) {
    const id = ORDER[index];
    assert.equal(isLevelUnlocked(id, completed), index === 0, `${id} before prerequisite`);
    if (index > 0) {
      completed.push(ORDER[index - 1]);
      assert.equal(isLevelUnlocked(id, completed), true, `${id} after prerequisite`);
    }
  }
});

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

test("garlic mission and reward use the cache-safe approved Totto artwork", () => {
  const garlic = getLevel("garlic");
  const themedTotto = garlic.items.find(item => item.special);
  const approvedAsset = "assets/characters/totto-garlic-approved.webp";

  assert.equal(garlic.skinAsset, approvedAsset);
  assert.equal(themedTotto.asset, approvedAsset);
});

test("fruit mission and reward use one cache-safe approved Totto artwork", () => {
  const fruit = getLevel("fruit");
  const themedTotto = fruit.items.find(item => item.special);
  const approvedAsset = "assets/characters/totto-fruit-approved.webp";

  assert.equal(fruit.skinAsset, approvedAsset);
  assert.equal(themedTotto.asset, approvedAsset);
});

test("fruit level describes its own summer picnic scene and rescue story", () => {
  const fruit = getLevel("fruit");

  assert.deepEqual(fruit.sceneProps, ["🧺", "🥤", "🌼"]);
  assert.equal(fruit.containerLabel, "装满水果的夏日藤编果篮");
  assert.equal(fruit.introTitle, "水果托托掉进夏日果篮啦！");
  assert.match(fruit.introCopy, /看得见的水果/);
  assert.match(fruit.introCopy, /三个水果托托/);
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
