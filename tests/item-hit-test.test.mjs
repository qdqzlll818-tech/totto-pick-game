import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { pickVisibleCandidate, sampleContainedAlpha } = require("../item-hit-test.js");

const candidate = ({
  uid,
  z,
  alphaAt,
  centerX = 100,
  centerY = 100,
  width = 100,
  height = 100,
  scale = 1,
  rotation = 0
}) => ({
  uid,
  z,
  alphaAt,
  centerX,
  centerY,
  width,
  height,
  scale,
  rotation
});

test("a transparent upper image box does not block a visible lower item", () => {
  const lower = candidate({ uid: "onion", z: 10, alphaAt: () => 1 });
  const upper = candidate({ uid: "ginger", z: 20, alphaAt: () => 0 });

  assert.equal(
    pickVisibleCandidate([lower, upper], { x: 100, y: 100 })?.uid,
    "onion"
  );
});

test("the top item wins when its real artwork is opaque at the pointer", () => {
  const lower = candidate({ uid: "onion", z: 10, alphaAt: () => 1 });
  const upper = candidate({ uid: "ginger", z: 20, alphaAt: () => 0.8 });

  assert.equal(
    pickVisibleCandidate([lower, upper], { x: 100, y: 100 })?.uid,
    "ginger"
  );
});

test("rotation and scale are inverted before sampling the alpha mask", () => {
  let sampled = null;
  const rotated = candidate({
    uid: "spoon",
    z: 30,
    rotation: 90,
    scale: 2,
    alphaAt: (u, v) => {
      sampled = { u, v };
      return 1;
    }
  });

  assert.equal(
    pickVisibleCandidate([rotated], { x: 100, y: 150 })?.uid,
    "spoon"
  );
  assert.ok(Math.abs(sampled.u - 0.75) < 0.001);
  assert.ok(Math.abs(sampled.v - 0.5) < 0.001);
});

test("a pointer outside every transformed item returns no candidate", () => {
  const item = candidate({ uid: "garlic", z: 10, alphaAt: () => 1 });
  assert.equal(pickVisibleCandidate([item], { x: 5, y: 5 }), null);
});

test("object-fit letterboxing stays transparent while real image pixels remain clickable", () => {
  const mask = {
    width: 2,
    height: 1,
    alpha: Uint8ClampedArray.from([0, 255])
  };

  assert.equal(sampleContainedAlpha(mask, 0.75, 0.1, 100, 100), 0);
  assert.equal(sampleContainedAlpha(mask, 0.75, 0.5, 100, 100), 1);
  assert.equal(sampleContainedAlpha(mask, 0.25, 0.5, 100, 100), 0);
});
