import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { applyBoardMotion } = require("../board-motion.js");

function sampleItems() {
  return Array.from({ length: 12 }, (_, index) => ({
    uid: `item-${index}`,
    selected: false,
    layer: Math.floor(index / 4),
    x: 30 + index,
    y: 35 + index,
    rotation: 0
  }));
}

test("light shake changes position but never changes layers", () => {
  const items = sampleItems();
  const beforeLayers = items.map(item => item.layer);

  const result = applyBoardMotion(items, "light", () => 0.75);

  assert.deepEqual(items.map(item => item.layer), beforeLayers);
  assert.equal(result.promoted, 0);
  assert.ok(items.some((item, index) => item.x !== 30 + index));
});

test("medium shake promotes at most two items by one adjacent layer", () => {
  const items = sampleItems();
  const before = new Map(items.map(item => [item.uid, item.layer]));

  const result = applyBoardMotion(items, "medium", () => 0.2);
  const changed = items.filter(item => item.layer !== before.get(item.uid));

  assert.ok(changed.length <= 2);
  assert.equal(result.promoted, changed.length);
  assert.ok(changed.every(item => item.layer === before.get(item.uid) + 1));
});

test("strong shake promotes at most four items and cannot expose the whole bottom", () => {
  const items = sampleItems();
  const bottomCount = items.filter(item => item.layer === 0).length;

  const result = applyBoardMotion(items, "strong", () => 0.1);
  const promotedFromBottom = items.filter(
    item => item.uid.startsWith("item-") && Number(item.uid.slice(5)) < 4 && item.layer === 1
  ).length;

  assert.ok(result.promoted <= 4);
  assert.ok(promotedFromBottom < bottomCount);
});

test("shake motion keeps every item inside the pot ellipse", () => {
  const items = [
    { uid: "right-edge", selected: false, layer: 0, x: 88, y: 50, rotation: 0 },
    { uid: "bottom-edge", selected: false, layer: 1, x: 50, y: 81, rotation: 0 },
    { uid: "corner", selected: false, layer: 2, x: 82, y: 76, rotation: 0 }
  ];

  applyBoardMotion(items, "strong", () => 1);

  for (const item of items) {
    const ellipseDistance = ((item.x - 50) / 38) ** 2 + ((item.y - 50) / 31) ** 2;
    assert.ok(ellipseDistance <= 1.000001, `${item.uid} escaped the pot`);
  }
});
