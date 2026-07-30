(function initBoardMotion(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoBoardMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createBoardMotion() {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function nudge(items, strength, random) {
    const distance = strength === "strong" ? 5 : strength === "medium" ? 3 : 1.4;
    for (const item of items) {
      if (item.selected) continue;
      item.x = clamp(item.x + (random() * 2 - 1) * distance, 8, 92);
      item.y = clamp(item.y + (random() * 2 - 1) * distance, 12, 88);
      item.rotation = clamp(item.rotation + (random() * 2 - 1) * distance * 2.3, -32, 32);
    }
  }

  function promote(items, limit, random) {
    const active = items.filter(item => !item.selected);
    const topLayer = Math.max(0, ...active.map(item => item.layer));
    const groups = new Map();

    for (const item of active) {
      if (item.layer >= topLayer) continue;
      if (!groups.has(item.layer)) groups.set(item.layer, []);
      groups.get(item.layer).push(item);
    }

    const candidates = [];
    for (const group of groups.values()) {
      group.sort(() => random() - 0.5);
      candidates.push(...group.slice(0, Math.max(0, group.length - 1)));
    }
    candidates.sort(() => random() - 0.5);

    const chosen = candidates.slice(0, limit);
    for (const item of chosen) item.layer += 1;
    return chosen.length;
  }

  function applyBoardMotion(items, strength, random = Math.random) {
    if (!["light", "medium", "strong"].includes(strength)) return { promoted: 0 };
    nudge(items, strength, random);
    const limit = strength === "strong" ? 4 : strength === "medium" ? 2 : 0;
    return { promoted: limit ? promote(items, limit, random) : 0 };
  }

  return { applyBoardMotion };
});
