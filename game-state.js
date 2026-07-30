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
    const layerCount = Math.ceil(items.length / level.itemsPerLayer);

    return items.map((item, index) => {
      const layer = Math.floor(index / level.itemsPerLayer);
      const slot = index % level.itemsPerLayer;
      const itemsInLayer = Math.min(
        level.itemsPerLayer,
        items.length - layer * level.itemsPerLayer
      );
      const layerProgress = layerCount > 1 ? layer / (layerCount - 1) : 0;
      const spread = 0.98 - layerProgress * 0.12;
      const radius = slot === 0
        ? random() * 0.05
        : Math.sqrt(slot / Math.max(1, itemsInLayer - 1)) * spread;
      const angle = slot * 2.399963 + layer * 0.73 + random() * 0.22;
      const x = 50 + Math.cos(angle) * radius * 38;
      const y = 50 + Math.sin(angle) * radius * 31;
      const scale = 0.88
        + layerProgress * 0.12
        + ((slot % 4) - 1.5) * 0.022
        + (random() - 0.5) * 0.025;

      return {
        ...item,
        x,
        y,
        layer,
        depth: layer * 1000 + Math.round(y * 10) + slot,
        rotation: random() * 56 - 28 + ((slot % 3) - 1) * 5,
        scale: Math.max(0.82, Math.min(1.08, scale))
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
