import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createShakeDetector } = require("../motion-controls.js");

test("light movement only nudges the board", () => {
  const detector = createShakeDetector();

  assert.equal(detector.update({ x: 2.2, y: 0.5, z: 0.2 }, 1000), "light");
  assert.equal(detector.update({ x: 2.5, y: 0.4, z: 0.3 }, 1100), "light");
});

test("a strong sustained shake emits one bounded strong event then cools down", () => {
  const detector = createShakeDetector({ cooldownMs: 1200 });

  assert.equal(detector.update({ x: 13, y: 5, z: 2 }, 1000), "medium");
  assert.equal(detector.update({ x: -14, y: 6, z: 3 }, 1120), "strong");
  assert.equal(detector.update({ x: 15, y: -5, z: 2 }, 1200), "light");
  assert.equal(detector.update({ x: 15, y: 5, z: 2 }, 2400), "medium");
});

test("quiet sensor noise does not trigger board movement", () => {
  const detector = createShakeDetector();
  assert.equal(detector.update({ x: 0.3, y: 0.2, z: 0.1 }, 1000), "none");
});
