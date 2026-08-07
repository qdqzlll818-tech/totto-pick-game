(function initBoardMotion(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoBoardMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createBoardMotion() {
  "use strict";

  const POT_RADIUS_X = 46;
  const POT_RADIUS_Y = 38;
  const CELL_SIZE = 15;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function hashString(value = "") {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSeededRandom(seed = 1) {
    let value = Number(seed) >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    };
  }

  function ensurePhysicsState(items) {
    for (const item of items) {
      const hash = hashString(item.uid || item.type);
      const layer = Math.max(0, Number(item.layer) || 0);
      item.z = Number.isFinite(item.z) ? item.z : layer + (hash % 17) / 100;
      item.radius = Number.isFinite(item.radius) ? item.radius : 5.1 + (hash % 19) / 20;
      item.mass = Number.isFinite(item.mass) ? item.mass : 0.82 + (hash % 31) / 55;
      item.vx = Number.isFinite(item.vx) ? item.vx : 0;
      item.vy = Number.isFinite(item.vy) ? item.vy : 0;
      item.vz = Number.isFinite(item.vz) ? item.vz : 0;
      item.angularVelocity = Number.isFinite(item.angularVelocity) ? item.angularVelocity : 0;
      item.supportUids = Array.isArray(item.supportUids) ? item.supportUids : [];
      item.occluderUids = Array.isArray(item.occluderUids) ? item.occluderUids : [];
      item.visibleRatio = Number.isFinite(item.visibleRatio) ? item.visibleRatio : 1;
      item.motionState = item.motionState || "stable";
      item.isFalling = item.motionState !== "stable";
      item.visualX = Number.isFinite(item.visualX) ? item.visualX : item.x;
      item.visualY = Number.isFinite(item.visualY) ? item.visualY : item.y;
      item.physicsPickable = item.physicsPickable !== false;
    }
    return items;
  }

  function isInsidePot(item) {
    return ((item.x - 50) / POT_RADIUS_X) ** 2 + ((item.y - 50) / POT_RADIUS_Y) ** 2 <= 1.000001;
  }

  function keepInsidePot(item) {
    const dx = item.x - 50;
    const dy = item.y - 50;
    const distance = Math.hypot(dx / POT_RADIUS_X, dy / POT_RADIUS_Y);
    if (distance <= 1) return item;
    const correction = 0.985 / distance;
    item.x = 50 + dx * correction;
    item.y = 50 + dy * correction;
    return item;
  }

  function cellKey(x, y) {
    return `${Math.floor(x / CELL_SIZE)}:${Math.floor(y / CELL_SIZE)}`;
  }

  function createSpatialIndex(items) {
    const cells = new Map();
    for (const item of items) {
      if (item.selected) continue;
      const key = cellKey(item.x, item.y);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(item);
    }
    return cells;
  }

  function nearby(index, item) {
    const cx = Math.floor(item.x / CELL_SIZE);
    const cy = Math.floor(item.y / CELL_SIZE);
    const values = [];
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      for (let y = cy - 1; y <= cy + 1; y += 1) {
        values.push(...(index.get(`${x}:${y}`) || []));
      }
    }
    return values;
  }

  function overlapRatio(left, right) {
    const dx = left.x - right.x;
    const dy = (left.y - right.y) * 1.12;
    const distance = Math.hypot(dx, dy);
    const radius = (left.radius || 6) + (right.radius || 6);
    return clamp((radius - distance) / Math.max(1, Math.min(left.radius || 6, right.radius || 6)), 0, 1);
  }

  function isAbove(candidate, item) {
    if (candidate.z > item.z + 0.08) return true;
    if (Math.abs(candidate.z - item.z) > 0.08) return false;
    return (candidate.depth || 0) > (item.depth || 0);
  }

  function rebuildRelations(items, options = {}) {
    ensurePhysicsState(items);
    const active = items.filter(item => !item.selected);
    const targetUids = options.uids ? new Set(options.uids) : null;
    const index = createSpatialIndex(active);

    for (const item of active) {
      if (targetUids && !targetUids.has(item.uid)) continue;
      const supports = [];
      const occluders = [];
      let covered = 0;

      for (const other of nearby(index, item)) {
        if (other.uid === item.uid) continue;
        const overlap = overlapRatio(item, other);
        if (overlap <= 0.08) continue;
        if (isAbove(other, item)) {
          occluders.push({ uid: other.uid, overlap, z: other.z });
          covered += overlap * 0.52;
        } else if (item.z - other.z <= 1.85 && overlap >= 0.15) {
          supports.push({ uid: other.uid, overlap, z: other.z });
        }
      }

      supports.sort((left, right) => right.overlap - left.overlap || right.z - left.z);
      occluders.sort((left, right) => right.z - left.z || right.overlap - left.overlap);
      item.supportUids = supports.slice(0, 3).map(entry => entry.uid);
      item.occluderUids = occluders.map(entry => entry.uid);
      item.visibleRatio = clamp(1 - covered, 0, 1);
      item.physicsPickable = item.visibleRatio >= 0.24 && item.motionState === "stable";
    }
    return items;
  }

  function getAffectedItems(items, removedUid) {
    ensurePhysicsState(items);
    rebuildRelations(items);
    const removed = items.find(item => item.uid === removedUid);
    if (!removed) return [];
    const affected = new Set();
    const queue = [removedUid];

    while (queue.length) {
      const supportUid = queue.shift();
      for (const item of items) {
        if (item.selected || affected.has(item.uid) || item.uid === removedUid) continue;
        if (item.supportUids.includes(supportUid)) {
          affected.add(item.uid);
          queue.push(item.uid);
        }
      }
    }

    if (!affected.size) {
      for (const item of items) {
        if (item.selected || item.uid === removedUid || item.z <= removed.z) continue;
        if (overlapRatio(item, removed) >= 0.18) affected.add(item.uid);
      }
    }
    return [...affected];
  }

  function boundedPoint(x, y) {
    const point = { x, y };
    keepInsidePot(point);
    return point;
  }

  function planRemoval(items, removedUid, random = Math.random) {
    ensurePhysicsState(items);
    rebuildRelations(items);
    const removed = items.find(item => item.uid === removedUid);
    if (!removed) return { removedUid, affectedUids: [], plans: [] };
    const affectedUids = getAffectedItems(items, removedUid);
    const ordered = affectedUids
      .map(uid => items.find(item => item.uid === uid))
      .filter(Boolean)
      .sort((left, right) => left.z - right.z);
    const plans = ordered.map((item, index) => {
      const pull = 0.34 + random() * 0.2;
      const toVacancyX = removed.x - item.x;
      const toVacancyY = removed.y - item.y;
      const length = Math.max(1, Math.hypot(toVacancyX, toVacancyY));
      const lateral = (random() - 0.5) * 2.8;
      const point = boundedPoint(
        item.x + toVacancyX * pull - toVacancyY / length * lateral,
        item.y + toVacancyY * pull + toVacancyX / length * lateral + 0.75 + random() * 1.1
      );
      const drop = Math.min(item.z, 0.72 + index * 0.18 + random() * 0.42);
      const duration = 360 + Math.round(random() * 250);
      const delay = 30 + Math.round(random() * 50);
      const rotationDelta = clamp(
        (toVacancyX / length) * (7 + random() * 8) / item.mass + (random() - 0.5) * 5,
        -18,
        18
      );
      return {
        uid: item.uid,
        kind: "fall",
        start: { x: item.x, y: item.y, z: item.z, rotation: item.rotation },
        target: { x: point.x, y: point.y, z: Math.max(0, item.z - drop), rotation: item.rotation + rotationDelta },
        delay,
        duration,
        lift: 0,
        bounce: 0.07 + random() * 0.07,
        rotationDelta,
        velocity: {
          x: (point.x - item.x) / duration,
          y: (point.y - item.y) / duration,
          z: -drop / duration
        }
      };
    });
    return { removedUid, affectedUids, plans };
  }

  function normalizedDirection(direction = {}) {
    const x = Number(direction.x) || 0;
    const y = Number(direction.y) || 0;
    const length = Math.hypot(x, y);
    return length > 0.001 ? { x: x / length, y: y / length } : { x: 0.72, y: -0.32 };
  }

  function planImpulse(items, impulse = {}, random = Math.random) {
    ensurePhysicsState(items);
    rebuildRelations(items);
    const active = items.filter(item => !item.selected);
    const strength = typeof impulse === "string" ? impulse : impulse.strength;
    if (!["light", "medium", "strong"].includes(strength)) return { plans: [], affectedUids: [] };
    const direction = normalizedDirection(typeof impulse === "string" ? {
      x: random() * 2 - 1,
      y: random() * 2 - 1
    } : impulse.direction);
    const baseDistance = strength === "strong" ? 6.4 : strength === "medium" ? 4.2 : 2;
    const maxZ = Math.max(1, ...active.map(item => item.z));
    const plans = active.map(item => {
      const height = clamp(item.z / maxZ, 0, 1);
      const supportPenalty = Math.min(0.22, item.supportUids.length * 0.055);
      const mobility = clamp(0.18 + height * 0.72 - supportPenalty, 0.14, 0.92) / Math.sqrt(item.mass);
      const lateral = (random() - 0.5) * baseDistance * 0.42;
      const distance = baseDistance * mobility * (0.82 + random() * 0.28);
      const point = boundedPoint(
        item.x + direction.x * distance - direction.y * lateral,
        item.y + direction.y * distance + direction.x * lateral
      );
      const maxRotation = strength === "strong" ? 24 : strength === "medium" ? 17 : 10;
      const rotationDelta = clamp(
        (direction.x * 0.65 + (random() - 0.5)) * maxRotation * mobility,
        -maxRotation,
        maxRotation
      );
      const duration = 420 + Math.round(random() * 220);
      return {
        uid: item.uid,
        kind: "impulse",
        start: { x: item.x, y: item.y, z: item.z, rotation: item.rotation },
        target: { x: point.x, y: point.y, z: item.z, rotation: item.rotation + rotationDelta },
        delay: Math.round(random() * 45 * (1 - height)),
        duration,
        lift: 0.22 + mobility * (strength === "strong" ? 0.95 : 0.58),
        bounce: 0.06 + mobility * 0.06,
        rotationDelta,
        velocity: {
          x: (point.x - item.x) / duration,
          y: (point.y - item.y) / duration,
          z: 0
        }
      };
    });
    return { plans, affectedUids: plans.map(plan => plan.uid), direction, strength };
  }

  function resolveCoincident(items, affectedUids) {
    const affected = new Set(affectedUids);
    for (let iteration = 0; iteration < 2; iteration += 1) {
      const active = items.filter(item => !item.selected);
      for (let left = 0; left < active.length; left += 1) {
        for (let right = left + 1; right < active.length; right += 1) {
          const first = active[left];
          const second = active[right];
          if (!affected.has(first.uid) && !affected.has(second.uid)) continue;
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= 0.38) continue;
          const angle = distance > 0.001 ? Math.atan2(dy, dx) : (hashString(second.uid) % 628) / 100;
          const correction = (0.4 - distance) / 2;
          if (affected.has(first.uid)) {
            first.x -= Math.cos(angle) * correction;
            first.y -= Math.sin(angle) * correction;
            keepInsidePot(first);
          }
          if (affected.has(second.uid)) {
            second.x += Math.cos(angle) * correction;
            second.y += Math.sin(angle) * correction;
            keepInsidePot(second);
          }
        }
      }
    }
  }

  function stabilizeUnsupported(items, affectedUids) {
    const affected = new Set(affectedUids);
    for (let pass = 0; pass < 4; pass += 1) {
      rebuildRelations(items);
      let changed = false;
      for (const item of items) {
        if (!affected.has(item.uid) || item.selected || item.z <= 0.05 || item.supportUids.length) continue;
        item.z = pass === 3 ? 0 : Math.max(0, item.z - 0.75);
        changed = true;
      }
      if (!changed) break;
    }
    rebuildRelations(items);
    for (const item of items) {
      if (affected.has(item.uid) && !item.selected && item.z > 0.05 && !item.supportUids.length) {
        item.z = 0;
      }
    }
    rebuildRelations(items);
  }

  function finalizePlans(items, plans = []) {
    const byUid = new Map(items.map(item => [item.uid, item]));
    const affectedUids = [];
    let hasFall = false;
    for (const plan of plans) {
      const item = byUid.get(plan.uid);
      if (!item || item.selected) continue;
      item.x = plan.target.x;
      item.y = plan.target.y;
      item.z = plan.target.z;
      item.rotation = clamp(plan.target.rotation, -48, 48);
      item.vx = 0;
      item.vy = 0;
      item.vz = 0;
      item.angularVelocity = 0;
      item.motionState = "stable";
      item.isFalling = false;
      item.physicsAffected = false;
      keepInsidePot(item);
      affectedUids.push(item.uid);
      hasFall ||= plan.kind === "fall";
    }
    resolveCoincident(items, affectedUids);
    if (hasFall) stabilizeUnsupported(items, affectedUids);
    for (const uid of affectedUids) {
      const item = byUid.get(uid);
      item.visualX = item.x;
      item.visualY = item.y;
      item.layer = Math.max(0, Math.round(item.z));
      item.depth = Math.round(item.z * 1000 + item.y * 10);
    }
    rebuildRelations(items);
    if (hasFall) {
      for (const uid of affectedUids) {
        const item = byUid.get(uid);
        if (item.z > 0.05 && !item.supportUids.length) {
          item.z = 0;
          item.layer = 0;
          item.depth = Math.round(item.y * 10);
          item.visualX = item.x;
          item.visualY = item.y;
        }
      }
      rebuildRelations(items);
    }
    return items;
  }

  function canPickItem(item) {
    return Boolean(item && !item.selected && item.motionState === "stable" && item.physicsPickable !== false);
  }

  function applyBoardMotion(items, strength, random = Math.random) {
    const result = planImpulse(items, strength, random);
    finalizePlans(items, result.plans);
    return { promoted: 0, moved: result.plans.length, direction: result.direction };
  }

  return {
    POT_RADIUS_X,
    POT_RADIUS_Y,
    applyBoardMotion,
    canPickItem,
    createSeededRandom,
    ensurePhysicsState,
    finalizePlans,
    getAffectedItems,
    isInsidePot,
    keepInsidePot,
    overlapRatio,
    planImpulse,
    planRemoval,
    rebuildRelations
  };
});
