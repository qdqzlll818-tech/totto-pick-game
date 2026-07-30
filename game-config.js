(function initGameConfig(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoGameConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameConfig() {
  "use strict";

  const item = (id, name, asset, count, special = false) => ({
    id,
    name,
    asset,
    count,
    special
  });

  const LEVELS = {
    hotpot: {
      id: "hotpot",
      order: 0,
      title: "火锅局",
      subtitle: "三个一样就捞走",
      mission: "救出火锅小厨神托托",
      icon: "🍲",
      total: 93,
      itemsPerLayer: 14,
      saveKey: "totto-pick-hotpot-v4",
      skin: "hotpot-chef",
      skinName: "火锅小厨神",
      skinAsset: "assets/characters/totto-hotpot-chef.webp",
      next: "garlic",
      items: [
        item("mushroom", "香菇", "assets/food/mushroom.png", 15),
        item("corn", "玉米", "assets/food/corn.png", 15),
        item("shrimp", "鲜虾", "assets/food/shrimp.png", 12),
        item("tofu", "豆腐", "assets/food/tofu.png", 12),
        item("beef", "肥牛卷", "assets/food/beef.png", 12),
        item("greens", "青菜", "assets/food/greens.png", 12),
        item("dumpling", "饺子", "assets/food/dumpling.png", 12),
        item("hotpot-totto", "火锅托托", "assets/characters/totto-hotpot-chef.webp", 3, true)
      ]
    },
    garlic: {
      id: "garlic",
      order: 1,
      title: "大蒜局",
      subtitle: "扒开蒜香竹篮",
      mission: "找到蒜头托托",
      icon: "🧄",
      total: 108,
      itemsPerLayer: 13,
      saveKey: "totto-pick-garlic-v1",
      skin: "garlic-totto",
      skinName: "蒜香小围裙",
      skinAsset: "assets/characters/totto-garlic.webp",
      next: "fruit",
      items: [
        item("garlic-head", "整头蒜", "emoji:🧄", 15),
        item("garlic-clove", "蒜瓣", "emoji:🤍", 9),
        item("purple-garlic", "紫皮蒜", "emoji:🧅", 9),
        item("chili", "辣椒", "emoji:🌶️", 9),
        item("ginger", "姜片", "emoji:🫚", 9),
        item("scallion", "小葱", "emoji:🌱", 9),
        item("soy-sauce", "酱油瓶", "emoji:🧴", 9),
        item("pestle", "捣蒜锤", "emoji:🔨", 9),
        item("mortar", "蒜臼", "emoji:🥣", 9),
        item("spice-jar", "调味罐", "emoji:🫙", 9),
        item("wood-spoon", "木勺", "emoji:🥄", 9),
        item("garlic-totto-item", "蒜头托托", "assets/characters/totto-garlic.webp", 3, true)
      ]
    },
    fruit: {
      id: "fruit",
      order: 2,
      title: "水果局",
      subtitle: "翻开夏日水果篮",
      mission: "找到水果托托",
      icon: "🍉",
      total: 126,
      itemsPerLayer: 12,
      saveKey: "totto-pick-fruit-v1",
      skin: "fruit-totto",
      skinName: "夏日水果帽",
      skinAsset: "assets/characters/totto-fruit.webp",
      next: null,
      items: [
        item("watermelon", "西瓜", "emoji:🍉", 15),
        item("strawberry", "草莓", "emoji:🍓", 9),
        item("grapes", "葡萄", "emoji:🍇", 9),
        item("orange", "橙子", "emoji:🍊", 9),
        item("peach", "桃子", "emoji:🍑", 9),
        item("lemon", "柠檬", "emoji:🍋", 9),
        item("pineapple", "菠萝", "emoji:🍍", 9),
        item("cherries", "樱桃", "emoji:🍒", 9),
        item("blueberries", "蓝莓", "emoji:🫐", 9),
        item("banana", "香蕉", "emoji:🍌", 9),
        item("pear", "梨", "emoji:🍐", 9),
        item("kiwi", "猕猴桃", "emoji:🥝", 9),
        item("mango", "芒果", "emoji:🥭", 9),
        item("fruit-totto-item", "水果托托", "assets/characters/totto-fruit.webp", 3, true)
      ]
    }
  };

  const ORDER = Object.values(LEVELS)
    .sort((a, b) => a.order - b.order)
    .map(level => level.id);

  function getLevel(id) {
    return LEVELS[id] || LEVELS.hotpot;
  }

  function isLevelUnlocked(id, completed = []) {
    const index = ORDER.indexOf(id);
    if (index <= 0) return index === 0;
    return completed.includes(ORDER[index - 1]);
  }

  function buildPool(level, random = Math.random) {
    const resolved = getLevel(level?.id);
    const pool = [];

    for (const definition of resolved.items) {
      for (let index = 0; index < definition.count; index += 1) {
        pool.push({
          uid: `${definition.id}-${index}-${Math.floor(random() * 1e9).toString(36)}`,
          type: definition.id,
          asset: definition.asset,
          name: definition.name,
          selected: false,
          special: definition.special
        });
      }
    }

    return pool;
  }

  return { LEVELS, ORDER, getLevel, isLevelUnlocked, buildPool };
});
