(function initMotionControls(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoMotionControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMotionControls() {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const NONE = Object.freeze({ strength: "none", direction: { x: 0, y: 0 }, peak: 0 });

  function boardDirection(vector) {
    const x = vector.x;
    const y = vector.y * 0.55 - vector.z * 0.82;
    const length = Math.hypot(x, y);
    if (length < 0.001) return { x: 0, y: 0 };
    return { x: clamp(x / length, -1, 1), y: clamp(y / length, -1, 1) };
  }

  function createShakeDetector(options = {}) {
    const mediumThreshold = options.mediumThreshold ?? 10.5;
    const strongThreshold = options.strongThreshold ?? 17;
    const gestureWindowMs = options.gestureWindowMs ?? 420;
    const minimumReversalMs = options.minimumReversalMs ?? 80;
    const cooldownMs = options.cooldownMs ?? 1800;
    const reversalCosine = options.reversalCosine ?? -0.42;
    const deadZone = options.deadZone ?? 0.65;
    const noiseLearningThreshold = options.noiseLearningThreshold ?? 5;
    const baselineRate = options.baselineRate ?? 0.08;
    let pendingImpulse = null;
    let lastFlipAt = -Infinity;
    let baseline = { x: 0, y: 0, z: 0 };

    function updateDetailed(acceleration = {}, timestamp = Date.now()) {
      const raw = {
        x: Number(acceleration.x) || 0,
        y: Number(acceleration.y) || 0,
        z: Number(acceleration.z) || 0
      };
      const rawMagnitude = Math.hypot(raw.x, raw.y, raw.z);

      if (rawMagnitude < noiseLearningThreshold) {
        baseline = {
          x: baseline.x + (raw.x - baseline.x) * baselineRate,
          y: baseline.y + (raw.y - baseline.y) * baselineRate,
          z: baseline.z + (raw.z - baseline.z) * baselineRate
        };
      }

      const vector = {
        x: Math.abs(raw.x - baseline.x) < deadZone ? 0 : raw.x - baseline.x,
        y: Math.abs(raw.y - baseline.y) < deadZone ? 0 : raw.y - baseline.y,
        z: Math.abs(raw.z - baseline.z) < deadZone ? 0 : raw.z - baseline.z
      };
      const magnitude = Math.hypot(vector.x, vector.y, vector.z);

      if (timestamp - lastFlipAt < cooldownMs) return NONE;
      if (pendingImpulse && timestamp - pendingImpulse.timestamp > gestureWindowMs) {
        pendingImpulse = null;
      }
      if (magnitude < mediumThreshold) return NONE;

      const impulse = { ...vector, magnitude, timestamp };
      if (!pendingImpulse) {
        pendingImpulse = impulse;
        return NONE;
      }

      const elapsed = timestamp - pendingImpulse.timestamp;
      const dot = vector.x * pendingImpulse.x + vector.y * pendingImpulse.y + vector.z * pendingImpulse.z;
      const cosine = dot / Math.max(0.0001, magnitude * pendingImpulse.magnitude);

      if (elapsed >= minimumReversalMs && elapsed <= gestureWindowMs && cosine <= reversalCosine) {
        const peak = Math.max(magnitude, pendingImpulse.magnitude);
        const direction = boardDirection(vector);
        pendingImpulse = null;
        lastFlipAt = timestamp;
        return { strength: peak >= strongThreshold ? "strong" : "medium", direction, peak };
      }

      if (cosine > 0.25 && magnitude > pendingImpulse.magnitude) pendingImpulse = impulse;
      return NONE;
    }

    return {
      update(acceleration, timestamp) {
        return updateDetailed(acceleration, timestamp).strength;
      },
      updateDetailed,
      reset() {
        pendingImpulse = null;
        lastFlipAt = -Infinity;
        baseline = { x: 0, y: 0, z: 0 };
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

  return { boardDirection, createShakeDetector, requestMotionPermission };
});
