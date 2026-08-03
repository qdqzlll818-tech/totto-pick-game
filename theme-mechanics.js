(function initThemeMechanics(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoThemeMechanics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createThemeMechanics() {
  "use strict";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizedRandom(random) {
    const value = Number(random());
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(0.999999999, value));
  }

  function pickDistinct(values, count, random) {
    const pool = Array.from(new Set(values));
    const picked = [];

    while (pool.length && picked.length < count) {
      const index = Math.floor(normalizedRandom(random) * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function createThemeState(level = {}, items = [], random = Math.random) {
    if (level.mechanic === "studio-combo") {
      return { kind: "studio-combo", streak: 0, lastMatchAt: 0 };
    }

    if (level.mechanic === "boba-orders") {
      const types = items
        .filter(item => !item.special)
        .map(item => item.type)
        .filter(Boolean);
      return {
        kind: "boba-orders",
        orders: pickDistinct(types, 3, random),
        completed: [],
        dailyBonusClaimed: false
      };
    }

    if (level.mechanic === "winter-yarn") {
      const lockCandidates = items
        .filter(item => !item.special && item.type !== "yarn-ball")
        .map(item => item.uid)
        .filter(Boolean);
      return {
        kind: "winter-yarn",
        lockedUids: pickDistinct(lockCandidates, 9, random)
      };
    }

    return { kind: level.mechanic || "none" };
  }

  function canPickItem(themeState = {}, item = {}) {
    return !Array.isArray(themeState.lockedUids) || !themeState.lockedUids.includes(item.uid);
  }

  function onThemeMatch(themeState = {}, event = {}, random = Math.random) {
    const state = clone(themeState);
    const result = { state, scoreBonus: 0, coinBonus: 0, unlockedUids: [] };

    if (state.kind === "studio-combo") {
      const at = Number(event.at) || 0;
      const isActive = state.streak > 0 && at - state.lastMatchAt <= 4000;
      state.streak = isActive ? state.streak + 1 : 1;
      state.lastMatchAt = at;
      result.scoreBonus = Math.max(0, state.streak - 1) * 20;
    } else if (state.kind === "boba-orders" && state.orders.includes(event.type)) {
      if (!state.completed.includes(event.type)) state.completed.push(event.type);
    } else if (state.kind === "winter-yarn" && event.type === "yarn-ball") {
      const unlockCount = Math.min(3, state.lockedUids.length);
      const start = state.lockedUids.length > unlockCount
        ? Math.floor(normalizedRandom(random) * (state.lockedUids.length - unlockCount + 1))
        : 0;
      result.unlockedUids = state.lockedUids.splice(start, unlockCount);
    }

    return result;
  }

  function serializeThemeState(themeState = {}) {
    return clone(themeState);
  }

  return { createThemeState, onThemeMatch, canPickItem, serializeThemeState };
});
