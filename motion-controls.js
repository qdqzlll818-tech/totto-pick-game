(function initMotionControls(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoMotionControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMotionControls() {
  "use strict";

  function createShakeDetector(options = {}) {
    const mediumThreshold = options.mediumThreshold ?? 9;
    const strongThreshold = options.strongThreshold ?? 13;
    const cooldownMs = options.cooldownMs ?? 1200;
    let strongSamples = 0;
    let lastFlipAt = -Infinity;

    return {
      update(acceleration = {}, timestamp = Date.now()) {
        const x = Number(acceleration.x) || 0;
        const y = Number(acceleration.y) || 0;
        const z = Number(acceleration.z) || 0;
        const magnitude = Math.hypot(x, y, z);

        if (timestamp - lastFlipAt < cooldownMs) return magnitude >= 1.6 ? "light" : "none";
        if (magnitude < 1.6) {
          strongSamples = 0;
          return "none";
        }
        if (magnitude < mediumThreshold) {
          strongSamples = 0;
          return "light";
        }
        if (magnitude >= strongThreshold) {
          strongSamples += 1;
          if (strongSamples >= 2) {
            strongSamples = 0;
            lastFlipAt = timestamp;
            return "strong";
          }
        } else {
          strongSamples = 0;
        }
        return "medium";
      },
      reset() {
        strongSamples = 0;
        lastFlipAt = -Infinity;
      }
    };
  }

  async function requestMotionPermission(target = globalThis) {
    const motion = target.DeviceMotionEvent;
    if (!motion) return { granted: false, reason: "unsupported" };
    if (typeof motion.requestPermission !== "function") {
      return { granted: true, reason: "implicit" };
    }
    try {
      const result = await motion.requestPermission();
      return { granted: result === "granted", reason: result };
    } catch {
      return { granted: false, reason: "error" };
    }
  }

  return { createShakeDetector, requestMotionPermission };
});
