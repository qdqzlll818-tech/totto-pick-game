import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createShakeDetector } = require("../motion-controls.js");

test("ordinary walking and hand movement never moves the pot", () => {
  const detector = createShakeDetector();
  const walking = [
    { x: 2.8, y: 1.7, z: 0.9 },
    { x: -3.6, y: 2.1, z: -1.2 },
    { x: 4.8, y: -2.5, z: 1.4 },
    { x: -5.8, y: 2.9, z: -1.8 }
  ];

  walking.forEach((sample, index) => {
    assert.equal(detector.update(sample, 1000 + index * 90), "none");
  });
});

test("one bump or repeated movement in the same direction is ignored", () => {
  const detector = createShakeDetector();

  assert.equal(detector.update({ x: 12, y: 2, z: 1 }, 1000), "none");
  assert.equal(detector.update({ x: 13, y: 2, z: 1 }, 1160), "none");
});

test("a forceful forward-back toss triggers one medium pan flip", () => {
  const detector = createShakeDetector();

  assert.equal(detector.update({ x: 12, y: 2, z: 1 }, 1000), "none");
  assert.equal(detector.update({ x: -13, y: -1, z: -2 }, 1200), "medium");
});

test("a very forceful opposite toss triggers strong once then cools down", () => {
  const detector = createShakeDetector({ cooldownMs: 1800 });

  assert.equal(detector.update({ x: 18, y: 4, z: 2 }, 1000), "none");
  assert.equal(detector.update({ x: -19, y: -3, z: -2 }, 1180), "strong");
  assert.equal(detector.update({ x: 20, y: 3, z: 2 }, 1300), "none");
  assert.equal(detector.update({ x: -20, y: -3, z: -2 }, 1450), "none");
});

test("a slow direction change is not treated as one pan-flip gesture", () => {
  const detector = createShakeDetector({ gestureWindowMs: 420 });

  assert.equal(detector.update({ x: 13, y: 2, z: 1 }, 1000), "none");
  assert.equal(detector.update({ x: -14, y: -2, z: -1 }, 1600), "none");
});

test("quiet sensor noise does not trigger board movement", () => {
  const detector = createShakeDetector();
  assert.equal(detector.update({ x: 0.3, y: 0.2, z: 0.1 }, 1000), "none");
});
