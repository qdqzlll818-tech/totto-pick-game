(function initGameState(root, factory) {
  const config = typeof module === "object" && module.exports
    ? require("./game-config.js")
    : root.TottoGameConfig;
  const mechanics = typeof module === "object" && module.exports
    ? require("./theme-mechanics.js")
    : root.TottoThemeMechanics;
  const physics = typeof module === "object" && module.exports
    ? require("./board-motion.js")
    : root.TottoBoardMotion;
  const api = factory(config, mechanics, physics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoGameState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameState(config, mechanics, physics) {
  "use strict";

  const LAYOUT_VERSION = 5;

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
      const spread = 1 - layerProgress * 0.11;
      const radius = slot === 0
        ? random() * 0.05
        : Math.sqrt(slot / Math.max(1, itemsInLayer - 1)) * spread;
      const angle = slot * 2.399963 + layer * 0.73 + random() * 0.22;
      const x = 50 + Math.cos(angle) * radius * 46;
      const y = 50 + Math.sin(angle) * radius * 38;
      const scale = 0.97
        + layerProgress * 0.13
        + ((slot % 4) - 1.5) * 0.025
        + (random() - 0.5) * 0.03;

      return {
        ...item,
        x,
        y,
        layer,
        depth: layer * 1000 + Math.round(y * 10) + slot,
        rotation: random() * 56 - 28 + ((slot % 3) - 1) * 5,
        scale: Math.max(0.9, Math.min(1.17, scale))
      };
    });
  }

  function createGame(level, random = Math.random) {
    const resolved = config.getLevel(level?.id);
    const pool = shuffle(config.buildPool(resolved, random), random);
    const items = placeItems(pool, resolved, random);
    physics.ensurePhysicsState(items);
    physics.rebuildRelations(items);

    return {
      levelId: resolved.id,
      layoutVersion: LAYOUT_VERSION,
      items,
      tray: [],
      reserve: [],
      score: 0,
      combo: 0,
      shuffleLeft: 3,
      moveLeft: 3,
      reserveLeft: 2,
      physicsSeed: Math.floor(random() * 0x7fffffff) || 1,
      physicsStep: 0,
      startedAt: Date.now(),
      elapsed: 0,
      status: "playing",
      theme: mechanics.createThemeState(resolved, items, random)
    };
  }

  function restoreGame(serialized, level, random = Math.random) {
    try {
      const saved = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
      const resolved = config.getLevel(level?.id);
      if (
        saved &&
        saved.levelId === resolved.id &&
        saved.status === "playing" &&
        Array.isArray(saved.items) &&
        Array.isArray(saved.tray) &&
        Array.isArray(saved.reserve)
      ) {
        const currentAssets = new Map(resolved.items.map(item => [item.id, item.asset]));
        const savedEntries = [...saved.items, ...saved.tray, ...saved.reserve];
        if (!savedEntries.every(item => currentAssets.has(item.type))) return null;
        savedEntries.forEach(item => {
          item.asset = currentAssets.get(item.type);
        });
        if (saved.layoutVersion !== 4 && saved.layoutVersion !== LAYOUT_VERSION) {
          const active = placeItems(saved.items.filter(item => !item.selected), resolved, random);
          const selected = placeItems(saved.items.filter(item => item.selected), resolved, random);
          const migrated = new Map([...active, ...selected].map(item => [item.uid, item]));
          saved.items = saved.items.map(item => migrated.get(item.uid));
        }
        physics.ensurePhysicsState(saved.items);
        saved.items.forEach(item => {
          item.motionState = "stable";
          item.isFalling = false;
          item.vx = 0;
          item.vy = 0;
          item.vz = 0;
          item.angularVelocity = 0;
          item.visualX = item.x;
          item.visualY = item.y;
        });
        physics.rebuildRelations(saved.items);
        saved.layoutVersion = LAYOUT_VERSION;
        saved.physicsSeed = Number.isFinite(saved.physicsSeed) ? saved.physicsSeed : Math.floor(random() * 0x7fffffff) || 1;
        saved.physicsStep = Number.isFinite(saved.physicsStep) ? saved.physicsStep : 0;
        if (!saved.theme || typeof saved.theme !== "object") {
          saved.theme = mechanics.createThemeState(resolved, saved.items, random);
        }
        return saved;
      }
    } catch {
      return null;
    }
    return null;
  }

  return { createGame, restoreGame };
});
