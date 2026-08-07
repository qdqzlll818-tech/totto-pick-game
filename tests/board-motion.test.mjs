import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  applyBoardMotion,
  createSeededRandom,
  ensurePhysicsState,
  finalizePlans,
  getAffectedItems,
  isInsidePot,
  planImpulse,
  planRemoval,
  rebuildRelations
} = require("../board-motion.js");

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
    const ellipseDistance = ((item.x - 50) / 46) ** 2 + ((item.y - 50) / 38) ** 2;
    assert.ok(ellipseDistance <= 1.000001, `${item.uid} escaped the pot`);
  }
});

function supportedStack() {
  return [
    { uid: "support", selected: false, layer: 0, z: 0, x: 50, y: 52, rotation: 0, radius: 7 },
    { uid: "child-a", selected: false, layer: 1, z: 1, x: 48, y: 49, rotation: 3, radius: 7 },
    { uid: "child-b", selected: false, layer: 1, z: 1.15, x: 53, y: 49, rotation: -4, radius: 7 },
    { uid: "grandchild", selected: false, layer: 2, z: 2.05, x: 51, y: 46, rotation: 2, radius: 7 },
    { uid: "far", selected: false, layer: 0, z: 0, x: 82, y: 62, rotation: 0, radius: 6 }
  ];
}

test("removing a support marks only overlapping descendants and local neighbors", () => {
  const items = supportedStack();
  ensurePhysicsState(items);
  rebuildRelations(items);

  const affected = getAffectedItems(items, "support");

  assert.deepEqual(new Set(affected), new Set(["child-a", "child-b", "grandchild"]));
  assert.equal(affected.includes("far"), false);
});

test("removal settling is deterministic, bounded, and ends in one stable state", () => {
  const first = supportedStack();
  const second = supportedStack();
  const firstPlan = planRemoval(first, "support", createSeededRandom(42));
  const secondPlan = planRemoval(second, "support", createSeededRandom(42));

  assert.deepEqual(firstPlan, secondPlan);
  assert.ok(firstPlan.plans.every(plan => plan.delay >= 30 && plan.delay <= 80));
  assert.ok(firstPlan.plans.every(plan => plan.duration >= 350 && plan.duration <= 700));

  first.find(item => item.uid === "support").selected = true;
  finalizePlans(first, firstPlan.plans);

  for (const item of first.filter(item => !item.selected)) {
    assert.equal(isInsidePot(item), true, `${item.uid} escaped`);
    assert.equal(item.motionState, "stable");
    assert.equal(item.isFalling, false);
    assert.ok(Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.z));
  }
  assert.deepEqual(first.find(item => item.uid === "far"), second.find(item => item.uid === "far"));
});

test("directional pan impulse stays safe and preserves visual hit coordinates", () => {
  const items = sampleItems();
  ensurePhysicsState(items);
  rebuildRelations(items);
  const before = new Map(items.map(item => [item.uid, { x: item.x, y: item.y }]));
  const result = planImpulse(items, {
    strength: "strong",
    direction: { x: 0.8, y: -0.35 },
    peak: 19
  }, createSeededRandom(9));

  assert.ok(result.plans.length > 0);
  assert.ok(result.plans.every(plan => Math.abs(plan.target.x - plan.start.x) <= 8));
  assert.ok(result.plans.every(plan => Math.abs(plan.rotationDelta) <= 24));
  finalizePlans(items, result.plans);

  for (const item of items) {
    assert.equal(isInsidePot(item), true);
    assert.equal(item.visualX, item.x);
    assert.equal(item.visualY, item.y);
  }
  assert.ok(items.some(item => item.x !== before.get(item.uid).x || item.y !== before.get(item.uid).y));
});

test("stable items do not remain severely coincident or unsupported after a local fall", () => {
  const items = supportedStack();
  const result = planRemoval(items, "support", createSeededRandom(17));
  items.find(item => item.uid === "support").selected = true;
  finalizePlans(items, result.plans);

  const active = items.filter(item => !item.selected);
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      assert.ok(Math.hypot(active[left].x - active[right].x, active[left].y - active[right].y) > 0.35);
    }
  }
  assert.ok(active.every(item => item.z <= 0.05 || item.supportUids.length > 0));
});
