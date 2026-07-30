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
      skinAsset: "assets/characters/totto-garlic-approved.webp",
      next: "fruit",
      items: [
        item("garlic-head", "整头蒜", "assets/garlic/garlic-head.png", 15),
        item("garlic-clove", "蒜瓣", "assets/garlic/garlic-clove.png", 9),
        item("purple-garlic", "紫皮蒜", "assets/garlic/purple-garlic.png", 9),
        item("chili", "辣椒", "assets/garlic/chili.png", 9),
        item("ginger", "姜片", "assets/garlic/ginger.png", 9),
        item("scallion", "小葱", "assets/garlic/scallion.png", 9),
        item("soy-sauce", "酱油瓶", "assets/garlic/soy-sauce.png", 9),
        item("pestle", "捣蒜锤", "assets/garlic/pestle.png", 9),
        item("mortar", "蒜臼", "assets/garlic/mortar.png", 9),
        item("spice-jar", "调味罐", "assets/garlic/spice-jar.png", 9),
        item("wood-spoon", "木勺", "assets/garlic/wood-spoon.png", 9),
        item("garlic-totto-item", "蒜头托托", "assets/characters/totto-garlic-approved.webp", 3, true)
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
      skinAsset: "assets/characters/totto-fruit-approved.webp",
      sceneProps: ["🧺", "🥤", "🌼"],
      containerLabel: "装满水果的夏日藤编果篮",
      introTitle: "水果托托掉进夏日果篮啦！",
      introCopy: "点击所有看得见的水果，凑齐三个就能消除。找到三个水果托托，把戴着草帽的它从果篮里救出来！",
      next: null,
      items: [
        item("watermelon", "西瓜", "assets/fruit/watermelon.png", 15),
        item("strawberry", "草莓", "assets/fruit/strawberry.png", 9),
        item("grapes", "葡萄", "assets/fruit/grapes.png", 9),
        item("orange", "橙子", "assets/fruit/orange.png", 9),
        item("peach", "桃子", "assets/fruit/peach.png", 9),
        item("lemon", "柠檬", "assets/fruit/lemon.png", 9),
        item("pineapple", "菠萝", "assets/fruit/pineapple.png", 9),
        item("cherries", "樱桃", "assets/fruit/cherries.png", 9),
        item("blueberries", "蓝莓", "assets/fruit/blueberries.png", 9),
        item("banana", "香蕉", "assets/fruit/banana.png", 9),
        item("pear", "梨", "assets/fruit/pear.png", 9),
        item("kiwi", "猕猴桃", "assets/fruit/kiwi.png", 9),
        item("mango", "芒果", "assets/fruit/mango.png", 9),
        item("fruit-totto-item", "水果托托", "assets/characters/totto-fruit-approved.webp", 3, true)
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
