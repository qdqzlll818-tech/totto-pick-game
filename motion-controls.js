(function initMotionControls(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoMotionControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMotionControls() {
  "use strict";

  function createShakeDetector(options = {}) {
    const mediumThreshold = options.mediumThreshold ?? 10.5;
    const strongThreshold = options.strongThreshold ?? 17;
    const gestureWindowMs = options.gestureWindowMs ?? 420;
    const cooldownMs = options.cooldownMs ?? 1800;
    const reversalCosine = options.reversalCosine ?? -0.35;
    let pendingImpulse = null;
    let lastFlipAt = -Infinity;

    return {
      update(acceleration = {}, timestamp = Date.now()) {
        const x = Number(acceleration.x) || 0;
        const y = Number(acceleration.y) || 0;
        const z = Number(acceleration.z) || 0;
        const magnitude = Math.hypot(x, y, z);

        if (timestamp - lastFlipAt < cooldownMs) return "none";
        if (magnitude < mediumThreshold) return "none";

        const impulse = { x, y, z, magnitude, timestamp };
        if (!pendingImpulse || timestamp - pendingImpulse.timestamp > gestureWindowMs) {
          pendingImpulse = impulse;
          return "none";
        }

        const dot = x * pendingImpulse.x + y * pendingImpulse.y + z * pendingImpulse.z;
        const cosine = dot / (magnitude * pendingImpulse.magnitude);
        if (cosine <= reversalCosine) {
          const peak = Math.max(magnitude, pendingImpulse.magnitude);
          pendingImpulse = null;
          lastFlipAt = timestamp;
          return peak >= strongThreshold ? "strong" : "medium";
        }

        if (magnitude > pendingImpulse.magnitude) pendingImpulse = impulse;
        return "none";
      },
      reset() {
        pendingImpulse = null;
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
