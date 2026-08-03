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
      next: "rain",
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
    },
    rain: {
      id: "rain",
      order: 3,
      title: "雨天失物局",
      subtitle: "翻开雨具失物筐",
      mission: "找到雨天救援托托",
      icon: "☔",
      total: 135,
      itemsPerLayer: 12,
      saveKey: "totto-pick-rain-v1",
      skin: "rain-totto",
      skinName: "雨天救援托托",
      skinAsset: "assets/characters/totto-rain.webp",
      next: "vanity",
      mechanic: "rain-wave",
      sceneProps: ["☂️", "💧", "🌿"],
      containerLabel: "装满雨具的透明失物筐",
      introTitle: "托托被困在雨天失物筐里啦！",
      introCopy: "点击所有看得见的雨具，凑齐三个就能消除。找到三个雨天托托，把它从失物筐里救出来！",
      items: [
        item("clear-umbrella", "透明伞", "assets/rain/clear-umbrella.png", 12),
        item("folding-umbrella", "折叠伞", "assets/rain/folding-umbrella.png", 12),
        item("rain-boots", "雨靴", "assets/rain/rain-boots.png", 12),
        item("raincoat", "雨衣", "assets/rain/raincoat.png", 12),
        item("key", "小钥匙", "assets/rain/key.png", 12),
        item("tote", "帆布包", "assets/rain/tote.png", 12),
        item("duck", "小黄鸭", "assets/rain/duck.png", 12),
        item("frog", "青蛙", "assets/rain/frog.png", 12),
        item("wet-leaf", "雨后树叶", "assets/rain/wet-leaf.png", 12),
        item("drop-bottle", "水滴瓶", "assets/rain/drop-bottle.png", 12),
        item("cloud", "小云朵", "assets/rain/cloud.png", 12),
        item("rain-totto-item", "雨天托托", "assets/characters/totto-rain.webp", 3, true)
      ]
    },
    vanity: {
      id: "vanity",
      order: 4,
      title: "梳妆台局",
      subtitle: "整理圆镜托盘",
      mission: "找到梳妆台托托",
      icon: "🪞",
      total: 144,
      itemsPerLayer: 12,
      saveKey: "totto-pick-vanity-v1",
      skin: "vanity-totto",
      skinName: "梳妆台托托",
      skinAsset: "assets/characters/totto-vanity.webp",
      next: "studio",
      mechanic: "none",
      sceneProps: ["🧴", "🪞", "🎀"],
      containerLabel: "摆满梳妆用品的圆镜托盘",
      introTitle: "托托被梳妆用品埋住啦！",
      introCopy: "点击所有看得见的梳妆用品，凑齐三个就能消除。找到三个梳妆台托托，把它从圆镜托盘里救出来！",
      items: [
        item("hand-mirror", "手镜", "assets/vanity/hand-mirror.png", 12),
        item("powder-puff", "粉扑", "assets/vanity/powder-puff.png", 12),
        item("comb", "梳子", "assets/vanity/comb.png", 12),
        item("hair-clip", "发夹", "assets/vanity/hair-clip.png", 12),
        item("lipstick", "口红", "assets/vanity/lipstick.png", 12),
        item("perfume", "香水瓶", "assets/vanity/perfume.png", 12),
        item("cream-jar", "面霜罐", "assets/vanity/cream-jar.png", 12),
        item("cotton-box", "棉片盒", "assets/vanity/cotton-box.png", 12),
        item("makeup-brush", "化妆刷", "assets/vanity/makeup-brush.png", 12),
        item("eye-shadow", "眼影盒", "assets/vanity/eye-shadow.png", 12),
        item("hand-cream", "护手霜", "assets/vanity/hand-cream.png", 12),
        item("face-headband", "洗脸头带", "assets/vanity/face-headband.png", 9),
        item("vanity-totto-item", "梳妆台托托", "assets/characters/totto-vanity.webp", 3, true)
      ]
    },
    studio: {
      id: "studio",
      order: 5,
      title: "画室局",
      subtitle: "翻开颜料画纸堆",
      mission: "找到画室托托",
      icon: "🎨",
      total: 150,
      itemsPerLayer: 11,
      saveKey: "totto-pick-studio-v1",
      skin: "artist-totto",
      skinName: "画室托托",
      skinAsset: "assets/characters/totto-artist.webp",
      next: "picnic",
      mechanic: "studio-combo",
      sceneProps: ["🖌️", "📒", "🎨"],
      containerLabel: "堆满颜料和画纸的木质调色盘",
      introTitle: "托托掉进画室的调色盘啦！",
      introCopy: "点击所有看得见的画材，连续三消可以积累灵感。找到三个画室托托，把它从调色盘里救出来！",
      items: [
        item("paintbrush", "画笔", "assets/studio/paintbrush.png", 15),
        item("palette", "调色盘", "assets/studio/palette.png", 12),
        item("paint-tube", "颜料管", "assets/studio/paint-tube.png", 12),
        item("pencil", "铅笔", "assets/studio/pencil.png", 12),
        item("crayon", "蜡笔", "assets/studio/crayon.png", 12),
        item("eraser", "橡皮", "assets/studio/eraser.png", 12),
        item("sharpener", "卷笔刀", "assets/studio/sharpener.png", 12),
        item("sketchbook", "速写本", "assets/studio/sketchbook.png", 12),
        item("wood-ruler", "木尺", "assets/studio/wood-ruler.png", 12),
        item("ink-bottle", "墨水瓶", "assets/studio/ink-bottle.png", 12),
        item("art-clip", "画夹", "assets/studio/art-clip.png", 12),
        item("mini-canvas", "小画布", "assets/studio/mini-canvas.png", 12),
        item("artist-totto-item", "画室托托", "assets/characters/totto-artist.webp", 3, true)
      ]
    },
    picnic: {
      id: "picnic",
      order: 6,
      title: "野餐局",
      subtitle: "翻开藤编野餐篮",
      mission: "找到野餐托托",
      icon: "🧺",
      total: 156,
      itemsPerLayer: 11,
      saveKey: "totto-pick-picnic-v1",
      skin: "picnic-totto",
      skinName: "野餐托托",
      skinAsset: "assets/characters/totto-picnic.webp",
      next: "boba",
      mechanic: "visible-cover",
      sceneProps: ["🌼", "🥪", "📷"],
      containerLabel: "铺着蓝灰格纹餐布的藤编野餐篮",
      introTitle: "托托被野餐篮里的东西压住啦！",
      introCopy: "点击所有露出来的野餐用品，即使被餐巾遮住一点也能选择。找到三个野餐托托，把它救出来！",
      items: [
        item("sandwich", "三明治", "assets/picnic/sandwich.png", 12),
        item("bread", "小面包", "assets/picnic/bread.png", 12),
        item("apple", "苹果", "assets/picnic/apple.png", 12),
        item("jam", "果酱瓶", "assets/picnic/jam.png", 12),
        item("strawberry-milk", "草莓牛奶", "assets/picnic/strawberry-milk.png", 12),
        item("thermos", "保温杯", "assets/picnic/thermos.png", 12),
        item("plate", "餐盘", "assets/picnic/plate.png", 12),
        item("fork", "小叉子", "assets/picnic/fork.png", 12),
        item("cheese", "奶酪", "assets/picnic/cheese.png", 12),
        item("film-camera", "胶片相机", "assets/picnic/film-camera.png", 12),
        item("daisy", "小雏菊", "assets/picnic/daisy.png", 12),
        item("napkin", "格纹餐巾", "assets/picnic/napkin.png", 12),
        item("picnic-mat", "卷起的野餐垫", "assets/picnic/picnic-mat.png", 9),
        item("picnic-totto-item", "野餐托托", "assets/characters/totto-picnic.webp", 3, true)
      ]
    },
    boba: {
      id: "boba",
      order: 7,
      title: "奶茶店局",
      subtitle: "完成今日奶茶订单",
      mission: "找到奶茶店托托",
      icon: "🧋",
      total: 162,
      itemsPerLayer: 10,
      saveKey: "totto-pick-boba-v1",
      skin: "boba-totto",
      skinName: "奶茶店托托",
      skinAsset: "assets/characters/totto-boba.webp",
      next: "winter",
      mechanic: "boba-orders",
      sceneProps: ["🧋", "🍪", "🥛"],
      containerLabel: "装满奶茶原料的焦糖色摇茶桶",
      introTitle: "托托掉进奶茶店的原料桶啦！",
      introCopy: "点击所有看得见的奶茶原料，顺便完成三份今日订单。找到三个奶茶店托托，把它救出来！",
      items: [
        item("boba-cup", "奶茶杯", "assets/boba/boba-cup.png", 15),
        item("pearl-bowl", "珍珠碗", "assets/boba/pearl-bowl.png", 12),
        item("straw-box", "吸管盒", "assets/boba/straw-box.png", 12),
        item("measuring-cup", "量杯", "assets/boba/measuring-cup.png", 12),
        item("ice-scoop", "冰铲", "assets/boba/ice-scoop.png", 12),
        item("teapot", "茶壶", "assets/boba/teapot.png", 12),
        item("shaker", "摇茶杯", "assets/boba/shaker.png", 12),
        item("syrup", "糖浆瓶", "assets/boba/syrup.png", 12),
        item("cookie", "曲奇", "assets/boba/cookie.png", 12),
        item("milk-carton", "牛奶盒", "assets/boba/milk-carton.png", 12),
        item("tea-tin", "茶叶罐", "assets/boba/tea-tin.png", 12),
        item("cup-lid", "杯盖", "assets/boba/cup-lid.png", 12),
        item("sealing-film", "封口纸", "assets/boba/sealing-film.png", 12),
        item("boba-totto-item", "奶茶店托托", "assets/characters/totto-boba.webp", 3, true)
      ]
    },
    winter: {
      id: "winter",
      order: 8,
      title: "冬日毛线局",
      subtitle: "解开软绒毛线篮",
      mission: "找到冬日毛线托托",
      icon: "🧶",
      total: 168,
      itemsPerLayer: 10,
      saveKey: "totto-pick-winter-v1",
      skin: "winter-totto",
      skinName: "冬日毛线托托",
      skinAsset: "assets/characters/totto-winter.webp",
      next: null,
      mechanic: "winter-yarn",
      sceneProps: ["🧶", "☕", "❄️"],
      containerLabel: "装满冬日织物的软绒针织篮",
      introTitle: "托托被毛线缠住啦！",
      introCopy: "点击所有没被毛线缠住的冬日物品，消除毛线球可以解开缠绕。找到三个冬日托托，把它救出来！",
      items: [
        item("yarn-ball", "毛线球", "assets/winter/yarn-ball.png", 12),
        item("knitting-needles", "织针", "assets/winter/knitting-needles.png", 12),
        item("mittens", "手套", "assets/winter/mittens.png", 12),
        item("scarf", "围巾", "assets/winter/scarf.png", 12),
        item("earmuffs", "耳罩", "assets/winter/earmuffs.png", 12),
        item("beanie", "毛线帽", "assets/winter/beanie.png", 12),
        item("socks", "袜子", "assets/winter/socks.png", 12),
        item("cocoa", "热可可", "assets/winter/cocoa.png", 12),
        item("snowflake", "雪花摆件", "assets/winter/snowflake.png", 12),
        item("hot-water-bottle", "暖水袋", "assets/winter/hot-water-bottle.png", 12),
        item("gift", "礼物盒", "assets/winter/gift.png", 12),
        item("snowman", "小雪人", "assets/winter/snowman.png", 12),
        item("button-box", "纽扣盒", "assets/winter/button-box.png", 12),
        item("folded-sweater", "折叠毛衣", "assets/winter/folded-sweater.png", 9),
        item("winter-totto-item", "冬日毛线托托", "assets/characters/totto-winter.webp", 3, true)
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
