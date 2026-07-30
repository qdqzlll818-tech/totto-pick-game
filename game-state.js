(function initGameState(root, factory) {
  const config = typeof module === "object" && module.exports
    ? require("./game-config.js")
    : root.TottoGameConfig;
  const api = factory(config);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoGameState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameState(config) {
  "use strict";

  function shuffle(items, random) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [items[index], items[target]] = [items[target], items[index]];
    }
    return items;
  }

  function placeItems(items, level, random) {
    return items.map((item, index) => {
      const layer = Math.floor(index / level.itemsPerLayer);
      const slot = index % level.itemsPerLayer;
      const progress = (slot + 1) / level.itemsPerLayer;
      const angle = slot * 2.399963 + layer * 0.36 + random() * 0.18;
      const radius = 13 + Math.sqrt(progress) * 31;

      return {
        ...item,
        x: Math.max(10, Math.min(90, 50 + Math.cos(angle) * radius)),
        y: Math.max(14, Math.min(86, 50 + Math.sin(angle) * radius * 0.82)),
        layer,
        rotation: random() * 48 - 24
      };
    });
  }

  function createGame(level, random = Math.random) {
    const resolved = config.getLevel(level?.id);
    const pool = shuffle(config.buildPool(resolved, random), random);

    return {
      levelId: resolved.id,
      items: placeItems(pool, resolved, random),
      tray: [],
      reserve: [],
      score: 0,
      combo: 0,
      shuffleLeft: 3,
      moveLeft: 3,
      reserveLeft: 2,
      startedAt: Date.now(),
      elapsed: 0,
      status: "playing"
    };
  }

  function restoreGame(serialized, level) {
    try {
      const saved = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
      if (
        saved &&
        saved.levelId === config.getLevel(level?.id).id &&
        saved.status === "playing" &&
        Array.isArray(saved.items) &&
        Array.isArray(saved.tray) &&
        Array.isArray(saved.reserve)
      ) {
        return saved;
      }
    } catch {
      return null;
    }
    return null;
  }

  return { createGame, restoreGame };
});
