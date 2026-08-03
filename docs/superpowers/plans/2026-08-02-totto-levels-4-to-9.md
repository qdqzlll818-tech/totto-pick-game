# Totto Levels 4–9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six sequentially unlocked Totto rescue levels—rain, vanity, studio, picnic, boba, and winter—with cohesive 3D item art, six approved skins, lightweight theme mechanics, persistent progress, and mobile-safe interactions.

**Architecture:** Extend the data-driven `game-config.js` catalogue and keep `index.html` as the shared runtime. Add a focused `theme-mechanics.js` pure module for combo, order, and yarn-lock rules; `game-app.js` owns DOM integration only. Keep skin and item art as local optimized WebP/PNG assets so GitHub Pages works without runtime image services.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Node.js built-in test runner, Supabase browser client, localStorage, GitHub Pages, built-in image generation plus local image optimization.

## Global Constraints

- Preserve the existing hotpot, garlic, and fruit save keys and completed progress.
- Every item count must be divisible by three, and every level must contain exactly three matching themed Totto items.
- Level order is exactly `hotpot → garlic → fruit → rain → vanity → studio → picnic → boba → winter`.
- First clear awards 100 coins and its configured skin; repeat clear awards 25 coins.
- Any visibly exposed item remains clickable regardless of visual stacking order.
- Normal walking and minor phone movement must not trigger a pan flip.
- New item art must be local, cohesive, rounded 3D imagery with transparent backgrounds; do not ship emoji fallbacks as the normal art.
- Totto skins preserve the approved short body, stub feet, three forehead dots, `3` mouth, and asymmetric viewer-left-pointed/viewer-right-rounded top knot.
- Existing pause, continue, restart, undo, autosave, motion permission, and cloud sync behavior remains available in every new level.

---

## File Structure

- Modify `game-config.js`: catalogue for all nine levels and shared level metadata.
- Modify `tests/game-config.test.mjs`: totals, asset folders, sequential unlock, and theme metadata.
- Modify `home.html`: data-driven nine-level map and ten-skin wardrobe including default.
- Modify `tests/totto-home.test.mjs`: map routes, wardrobe assets, and WebP validation.
- Create `theme-mechanics.js`: pure theme rule state transitions.
- Create `tests/theme-mechanics.test.mjs`: deterministic tests for studio combo, boba orders, and winter yarn locks.
- Modify `index.html`: optional theme HUD region and script loading.
- Modify `game-app.js`: integrate level hooks and theme HUD with pick/match/save/restart flows.
- Modify `game-state.js`: initialize and restore serializable theme state.
- Modify `game.css`: six scene palettes, containers, and theme HUD styling.
- Create `scripts/validate-assets.mjs`: validate dimensions, alpha, file signatures, and configured paths.
- Create asset folders: `assets/rain`, `assets/vanity`, `assets/studio`, `assets/picnic`, `assets/boba`, `assets/winter`.
- Add character assets under `assets/characters`: `totto-rain.webp`, `totto-vanity.webp`, `totto-artist.webp`, `totto-picnic.webp`, `totto-boba.webp`, `totto-winter.webp`.

---

### Task 1: Extend the Nine-Level Catalogue

**Files:**
- Modify: `game-config.js`
- Modify: `tests/game-config.test.mjs`

**Interfaces:**
- Consumes: existing `item(id, name, asset, count, special)` helper.
- Produces: `TottoGameConfig.LEVELS`, `ORDER`, `getLevel(id)`, `isLevelUnlocked(id, completed)`, and `buildPool(level, random)` covering nine levels.

- [ ] **Step 1: Write failing catalogue tests**

Add these expectations to `tests/game-config.test.mjs`:

```js
test("all nine levels have approved totals and order", () => {
  assert.deepEqual(ORDER, [
    "hotpot", "garlic", "fruit", "rain", "vanity",
    "studio", "picnic", "boba", "winter"
  ]);
  assert.deepEqual(
    Object.fromEntries(ORDER.map(id => [id, buildPool(getLevel(id), () => 0.5).length])),
    { hotpot: 93, garlic: 108, fruit: 126, rain: 135, vanity: 144,
      studio: 150, picnic: 156, boba: 162, winter: 168 }
  );
});

test("new levels use local cohesive 3D assets", () => {
  for (const id of ["rain", "vanity", "studio", "picnic", "boba", "winter"]) {
    const level = getLevel(id);
    const regular = level.items.filter(entry => !entry.special);
    assert.ok(regular.every(entry => entry.asset.startsWith(`assets/${id}/`)));
    assert.ok(regular.every(entry => /\.(png|webp)$/.test(entry.asset)));
    assert.equal(level.items.filter(entry => entry.special)[0].count, 3);
  }
});

test("every later level requires the immediately previous clear", () => {
  const completed = [];
  for (let index = 0; index < ORDER.length; index += 1) {
    const id = ORDER[index];
    assert.equal(isLevelUnlocked(id, completed), index === 0);
    if (index > 0) {
      completed.push(ORDER[index - 1]);
      assert.equal(isLevelUnlocked(id, completed), true, id);
    }
  }
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/game-config.test.mjs`

Expected: FAIL because `ORDER` contains only three IDs and `rain` through `winter` fall back to `hotpot`.

- [ ] **Step 3: Add six concrete level definitions**

Append definitions to `LEVELS` using these exact identities and metadata:

```js
rain: {
  id: "rain", order: 3, title: "雨天失物局", subtitle: "翻开雨具失物筐",
  mission: "找到雨天救援托托", icon: "☔", total: 135, itemsPerLayer: 12,
  saveKey: "totto-pick-rain-v1", skin: "rain-totto", skinName: "雨天救援托托",
  skinAsset: "assets/characters/totto-rain.webp", next: "vanity",
  mechanic: "rain-wave", sceneProps: ["☂️", "💧", "🌿"],
  containerLabel: "装满雨具的透明失物筐",
  introTitle: "托托被困在雨天失物筐里啦！",
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
}
```

Add the remaining five definitions with these exact values:

```js
vanity: {
  id: "vanity", order: 4, title: "梳妆台局", subtitle: "整理圆镜托盘",
  mission: "找到梳妆台托托", icon: "🪞", total: 144, itemsPerLayer: 12,
  saveKey: "totto-pick-vanity-v1", skin: "vanity-totto", skinName: "梳妆台托托",
  skinAsset: "assets/characters/totto-vanity.webp", next: "studio", mechanic: "none",
  sceneProps: ["🧴", "🪞", "🎀"], containerLabel: "摆满梳妆用品的圆镜托盘",
  introTitle: "托托被梳妆用品埋住啦！",
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
  id: "studio", order: 5, title: "画室局", subtitle: "翻开颜料画纸堆",
  mission: "找到画室托托", icon: "🎨", total: 150, itemsPerLayer: 11,
  saveKey: "totto-pick-studio-v1", skin: "artist-totto", skinName: "画室托托",
  skinAsset: "assets/characters/totto-artist.webp", next: "picnic", mechanic: "studio-combo",
  sceneProps: ["🖌️", "📒", "🎨"], containerLabel: "堆满颜料和画纸的木质调色盘",
  introTitle: "托托掉进画室的调色盘啦！",
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
  id: "picnic", order: 6, title: "野餐局", subtitle: "翻开藤编野餐篮",
  mission: "找到野餐托托", icon: "🧺", total: 156, itemsPerLayer: 11,
  saveKey: "totto-pick-picnic-v1", skin: "picnic-totto", skinName: "野餐托托",
  skinAsset: "assets/characters/totto-picnic.webp", next: "boba", mechanic: "visible-cover",
  sceneProps: ["🌼", "🥪", "📷"], containerLabel: "铺着蓝灰格纹餐布的藤编野餐篮",
  introTitle: "托托被野餐篮里的东西压住啦！",
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
  id: "boba", order: 7, title: "奶茶店局", subtitle: "完成今日奶茶订单",
  mission: "找到奶茶店托托", icon: "🧋", total: 162, itemsPerLayer: 10,
  saveKey: "totto-pick-boba-v1", skin: "boba-totto", skinName: "奶茶店托托",
  skinAsset: "assets/characters/totto-boba.webp", next: "winter", mechanic: "boba-orders",
  sceneProps: ["🧋", "🍪", "🥛"], containerLabel: "装满奶茶原料的焦糖色摇茶桶",
  introTitle: "托托掉进奶茶店的原料桶啦！",
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
  id: "winter", order: 8, title: "冬日毛线局", subtitle: "解开软绒毛线篮",
  mission: "找到冬日毛线托托", icon: "🧶", total: 168, itemsPerLayer: 10,
  saveKey: "totto-pick-winter-v1", skin: "winter-totto", skinName: "冬日毛线托托",
  skinAsset: "assets/characters/totto-winter.webp", next: null, mechanic: "winter-yarn",
  sceneProps: ["🧶", "☕", "❄️"], containerLabel: "装满冬日织物的软绒针织篮",
  introTitle: "托托被毛线缠住啦！",
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
```

- [ ] **Step 4: Run catalogue tests**

Run: `node --test tests/game-config.test.mjs`

Expected: PASS, including legal totals and three themed Totto items for all nine levels.

- [ ] **Step 5: Commit the catalogue**

```bash
git add game-config.js tests/game-config.test.mjs
git commit -m "feat: define Totto rescue levels four through nine"
```

---

### Task 2: Render the Map and Wardrobe from Configuration

**Files:**
- Modify: `home.html`
- Modify: `tests/totto-home.test.mjs`

**Interfaces:**
- Consumes: `TottoGameConfig.ORDER`, `LEVELS`, `isLevelUnlocked`, local progress and skin IDs.
- Produces: `#levelList` containing nine links/cards and `#skinGrid` containing ten skin buttons.

- [ ] **Step 1: Add failing home structure tests**

```js
test("home builds all map and wardrobe cards from game configuration", async () => {
  const home = await read("home.html");
  assert.match(home, /id="levelList"/);
  assert.match(home, /id="skinGrid"/);
  assert.match(home, /TottoGameConfig\.ORDER\.forEach/);
  for (const id of ["rain", "vanity", "studio", "picnic", "boba", "winter"]) {
    assert.match(home, new RegExp(`index\\.html\\?level=\\$\\{level\\.id\\}`));
    assert.match(home, new RegExp(`totto-${id === "studio" ? "artist" : id}\\.webp`));
  }
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/totto-home.test.mjs`

Expected: FAIL because the map and wardrobe contain hard-coded cards for only three levels.

- [ ] **Step 3: Replace hard-coded cards with empty containers**

Use:

```html
<div class="level-list" id="levelList"></div>
<div class="skins" id="skinGrid"></div>
```

Keep the current section headings and navigation unchanged.

- [ ] **Step 4: Add data-driven rendering helpers**

Inside the existing home script add:

```js
const DEFAULT_SKIN = {
  id: "default", name: "原始托托",
  asset: "assets/characters/totto-default.webp?v=2"
};

function renderLevelCards() {
  $("#levelList").innerHTML = TottoGameConfig.ORDER.map(id => {
    const level = TottoGameConfig.getLevel(id);
    const unlocked = TottoGameConfig.isLevelUnlocked(id, progress.completed);
    const cleared = progress.completed.includes(id);
    return `<a class="level${unlocked ? "" : " locked"}"
      data-level="${id}" href="${unlocked ? `index.html?level=${id}` : "#"}"
      aria-disabled="${unlocked ? "false" : "true"}">
      <span class="level-icon">${level.icon}</span>
      <span class="level-text"><b>第${level.order + 1}关 · ${level.title}</b>
      <small>${level.total} 个物品 · 解锁${level.skinName}</small></span>
      <span class="level-reward">${cleared ? "已通关 ✓" : unlocked ? "可挑战" : "🔒"}</span>
    </a>`;
  }).join("");
}

function renderSkinCards() {
  const entries = [DEFAULT_SKIN, ...TottoGameConfig.ORDER.map(id => {
    const level = TottoGameConfig.getLevel(id);
    return { id: level.skin, name: level.skinName, asset: level.skinAsset };
  })];
  $("#skinGrid").innerHTML = entries.map(entry => {
    const owned = entry.id === "default" || skins.includes(entry.id);
    return `<button class="skin${owned ? "" : " locked"}" data-skin="${entry.id}"
      ${owned ? "" : "disabled"}><img src="${entry.asset}" alt="${entry.name}">
      <small>${entry.name}</small></button>`;
  }).join("");
}
```

Change the skin click registration to event delegation on `#skinGrid`, then call both helpers at the start of `render()`.

- [ ] **Step 5: Run home tests**

Run: `node --test tests/totto-home.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit map and wardrobe rendering**

```bash
git add home.html tests/totto-home.test.mjs
git commit -m "feat: render nine-level map and Totto wardrobe"
```

---

### Task 3: Prepare and Validate Six Character Skin Assets

**Files:**
- Create: `assets/characters/totto-rain.webp`
- Create: `assets/characters/totto-vanity.webp`
- Create: `assets/characters/totto-artist.webp`
- Create: `assets/characters/totto-picnic.webp`
- Create: `assets/characters/totto-boba.webp`
- Create: `assets/characters/totto-winter.webp`
- Create: `scripts/validate-assets.mjs`
- Modify: `tests/totto-home.test.mjs`

**Interfaces:**
- Consumes: the six approved concept images listed in the design conversation.
- Produces: square 1024×1024 WebP character cutouts with alpha, under 450 KB each.

- [ ] **Step 1: Extend the WebP signature test**

Add the six character paths to the existing `published Totto wardrobe images are valid WebP files` path list.

- [ ] **Step 2: Create the asset validator**

Create `scripts/validate-assets.mjs`:

```js
import { readFile, stat } from "node:fs/promises";

const paths = process.argv.slice(2);
if (!paths.length) throw new Error("pass at least one asset path");

for (const path of paths) {
  const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
  if (path.endsWith(".webp")) {
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error(`${path}: invalid WebP signature`);
    }
  } else if (path.endsWith(".png")) {
    if (bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
      throw new Error(`${path}: invalid PNG signature`);
    }
  }
  if (info.size < 10_000) throw new Error(`${path}: suspiciously small`);
  if (info.size > 900_000) throw new Error(`${path}: exceeds web budget`);
  console.log(`${path}: ${info.size} bytes`);
}
```

- [ ] **Step 3: Generate high-fidelity chroma-key cutouts one skin at a time**

For each approved concept, use the same identity-lock prompt and change only clothing/accessories:

```text
Create the exact same approved TOTTO mascot as a centered full-body 3D game asset.
Lock: huge rounded-square head, short compact body, two stub feet, exactly three gold forehead dots,
closed happy crescent eyes, 3-shaped mouth, belly patch, and viewer-left pointed/viewer-right rounded top knot.
Preserve the approved theme outfit and rescued-happy emotion. No long legs or human anatomy.
Place the opaque character on a perfectly flat solid #00ff00 background with no shadow,
gradient, texture, reflection, text, border, or green color on the character.
```

Use the built-in image generator with the approved concept and original Totto master as references. Run the chroma removal helper with `--auto-key border --soft-matte --despill`, then convert to WebP without resizing distortion.

- [ ] **Step 4: Validate all six assets**

Run:

```bash
node scripts/validate-assets.mjs \
  assets/characters/totto-rain.webp \
  assets/characters/totto-vanity.webp \
  assets/characters/totto-artist.webp \
  assets/characters/totto-picnic.webp \
  assets/characters/totto-boba.webp \
  assets/characters/totto-winter.webp
node --test tests/totto-home.test.mjs
```

Expected: every path reports a valid WebP under 900 KB and tests pass.

- [ ] **Step 5: Commit character skins**

```bash
git add assets/characters scripts/validate-assets.mjs tests/totto-home.test.mjs
git commit -m "feat: add six theme-locked Totto skins"
```

---

### Task 4: Produce Cohesive 3D Item Assets by Level

**Files:**
- Create: PNG assets in `assets/rain`, `assets/vanity`, `assets/studio`, `assets/picnic`, `assets/boba`, `assets/winter`
- Modify: `package.json`

**Interfaces:**
- Consumes: exact asset paths from `game-config.js`.
- Produces: one transparent PNG for each regular item type, 512×512 preferred, under 350 KB.

- [ ] **Step 1: Add an asset validation script**

Add to `package.json`:

```json
"test:assets": "node scripts/validate-assets.mjs assets/rain/*.png assets/vanity/*.png assets/studio/*.png assets/picnic/*.png assets/boba/*.png assets/winter/*.png"
```

- [ ] **Step 2: Generate each item as an individual render**

Use one image generation call per item; do not ask the model to squeeze all items into a labelled contact sheet. Reuse this exact production prompt and substitute the item name and theme palette:

```text
Create one centered [ITEM NAME] as a premium rounded 3D mobile game object.
Front three-quarter view, chunky toy-like volume, clear silhouette, soft matte material,
cohesive Japanese/Korean lifestyle palette for the [LEVEL NAME] set.
No face unless the item is an animal. No text, label, hands, character, duplicate object, border, or watermark.
Perfectly flat solid #00ff00 chroma-key background, no cast shadow, no floor, no reflection,
and no green on the object. Generous even padding; object fills about 72% of the square canvas.
```

After every generation, remove chroma locally and save using the path already configured in `game-config.js`. Validate alpha edges visually before proceeding to the next item.

- [ ] **Step 3: Run path and file validation**

Run:

```bash
npm run test:assets
node --test tests/game-config.test.mjs
```

Expected: every configured regular item path exists, has a valid PNG signature, and is within the web budget.

- [ ] **Step 4: Commit assets in level-sized groups**

```bash
git add assets/rain assets/vanity
git commit -m "feat: add rain and vanity 3D item sets"
git add assets/studio assets/picnic
git commit -m "feat: add studio and picnic 3D item sets"
git add assets/boba assets/winter package.json
git commit -m "feat: add boba and winter 3D item sets"
```

---

### Task 5: Add Pure Theme Mechanics

**Files:**
- Create: `theme-mechanics.js`
- Create: `tests/theme-mechanics.test.mjs`

**Interfaces:**
- Consumes: a level definition, created game items, match event `{ type, at }`, and optional deterministic random function.
- Produces: `createThemeState(level, items, random)`, `onThemeMatch(themeState, event, random)`, `canPickItem(themeState, item)`, and `serializeThemeState(themeState)`.

- [ ] **Step 1: Write deterministic mechanic tests**

```js
test("studio combo expires after four seconds", () => {
  let state = createThemeState({ id: "studio", mechanic: "studio-combo" }, [], () => 0);
  state = onThemeMatch(state, { type: "brush", at: 1000 }, () => 0).state;
  assert.equal(state.streak, 1);
  state = onThemeMatch(state, { type: "paint", at: 4500 }, () => 0).state;
  assert.equal(state.streak, 2);
  state = onThemeMatch(state, { type: "pencil", at: 9001 }, () => 0).state;
  assert.equal(state.streak, 1);
});

test("boba orders select three regular types and complete once", () => {
  const items = ["cup", "pearl", "straw", "cup", "pearl", "straw"].map(type => ({ type }));
  let state = createThemeState({ id: "boba", mechanic: "boba-orders" }, items, () => 0);
  assert.equal(state.orders.length, 3);
  const first = state.orders[0];
  const result = onThemeMatch(state, { type: first, at: 1000 }, () => 0);
  assert.equal(result.state.completed.includes(first), true);
  assert.equal(result.coinBonus, 0);
});

test("winter always leaves one reachable yarn triple and unlocks three items", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    uid: `i-${index}`, type: index < 6 ? "yarn-ball" : "mitten", layer: index < 3 ? 9 : 0
  }));
  let state = createThemeState({ id: "winter", mechanic: "winter-yarn" }, items, () => 0);
  assert.equal(state.lockedUids.length <= 9, true);
  assert.equal(items.filter(item => item.type === "yarn-ball" && !state.lockedUids.includes(item.uid)).length >= 3, true);
  const result = onThemeMatch(state, { type: "yarn-ball", at: 1000 }, () => 0);
  assert.equal(result.unlockedUids.length <= 3, true);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/theme-mechanics.test.mjs`

Expected: FAIL because `theme-mechanics.js` does not exist.

- [ ] **Step 3: Implement the pure state module**

Use a UMD wrapper consistent with `game-config.js`. Keep state JSON-safe:

```js
function createThemeState(level, items, random = Math.random) {
  if (level.mechanic === "studio-combo") return { kind: "studio-combo", streak: 0, lastMatchAt: 0 };
  if (level.mechanic === "boba-orders") {
    const types = [...new Set(items.filter(item => !item.special).map(item => item.type))];
    const orders = pickDistinct(types, 3, random);
    return { kind: "boba-orders", orders, completed: [], dailyBonusClaimed: false };
  }
  if (level.mechanic === "winter-yarn") {
    const candidates = items.filter(item => item.type !== "yarn-ball" && !item.special);
    return { kind: "winter-yarn", lockedUids: pickDistinct(candidates.map(item => item.uid), 9, random) };
  }
  return { kind: "none" };
}

function canPickItem(themeState, item) {
  return !themeState.lockedUids?.includes(item.uid);
}
```

Implement `onThemeMatch` with the following stable result shape and immutable input handling:

```js
function onThemeMatch(themeState, event) {
  const state = JSON.parse(JSON.stringify(themeState));
  const result = { state, scoreBonus: 0, coinBonus: 0, unlockedUids: [] };
  if (state.kind === "studio-combo") {
    state.streak = event.at - state.lastMatchAt <= 4000 ? state.streak + 1 : 1;
    state.lastMatchAt = event.at;
    result.scoreBonus = Math.max(0, state.streak - 1) * 20;
  } else if (state.kind === "boba-orders" && state.orders.includes(event.type)) {
    if (!state.completed.includes(event.type)) state.completed.push(event.type);
  } else if (state.kind === "winter-yarn" && event.type === "yarn-ball") {
    result.unlockedUids = state.lockedUids.slice(0, 3);
    state.lockedUids = state.lockedUids.slice(result.unlockedUids.length);
  }
  return result;
}
```

- [ ] **Step 4: Run mechanic tests**

Run: `node --test tests/theme-mechanics.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit mechanics**

```bash
git add theme-mechanics.js tests/theme-mechanics.test.mjs
git commit -m "feat: add deterministic theme mechanics"
```

---

### Task 6: Integrate Theme State into Saves and Gameplay

**Files:**
- Modify: `game-state.js`
- Modify: `game-app.js`
- Modify: `index.html`
- Modify: `tests/game-state.test.mjs`
- Create: `tests/theme-ui.test.mjs`

**Interfaces:**
- Consumes: `TottoThemeMechanics` functions from Task 5.
- Produces: `state.theme`, `#themeHud`, blocked-item feedback, order progress, and studio streak scoring.

- [ ] **Step 1: Write failing state and integration tests**

```js
test("new games initialize serializable theme state", () => {
  for (const id of ["studio", "boba", "winter"]) {
    const state = createGame(getLevel(id), () => 0);
    assert.equal(typeof state.theme.kind, "string");
    assert.doesNotThrow(() => JSON.stringify(state));
  }
});
```

Create `tests/theme-ui.test.mjs` to assert that `index.html` loads `theme-mechanics.js` before `game-state.js` and contains `id="themeHud"`, and that `game-app.js` references `canPickItem`, `onThemeMatch`, and `renderThemeHud`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test tests/game-state.test.mjs tests/theme-ui.test.mjs
```

Expected: FAIL because no theme state or HUD exists.

- [ ] **Step 3: Initialize and restore theme state**

Change the `game-state.js` UMD factory to receive both config and theme mechanics. In `createGame()` add:

```js
const placed = placeItems(pool, resolved, random);
return {
  levelId: resolved.id,
  layoutVersion: LAYOUT_VERSION,
  items: placed,
  theme: mechanics.createThemeState(resolved, placed, random),
  // existing fields unchanged
};
```

In `restoreGame()`, preserve a valid saved `theme`; otherwise regenerate it from saved items and the current level.

- [ ] **Step 4: Add the optional HUD container**

Place this under `.mission-card`:

```html
<section class="theme-hud" id="themeHud" hidden aria-live="polite"></section>
```

Load scripts in this exact order:

```html
<script src="game-config.js?v=9"></script>
<script src="theme-mechanics.js?v=1"></script>
<script src="game-state.js?v=9"></script>
```

- [ ] **Step 5: Integrate pick and match hooks**

Before selecting an item in `pick(uid)`, call `canPickItem(state.theme, item)`. For a locked winter item, show `毛线缠住啦，先消除一组毛线球` and return without changing `previousState`.

After a successful match in `resolveMatches()`, call:

```js
const themeResult = TottoThemeMechanics.onThemeMatch(
  state.theme,
  { type: match[0].type, at: elapsedNow() },
  Math.random
);
state.theme = themeResult.state;
state.score += themeResult.scoreBonus;
renderThemeHud();
```

Add `renderThemeHud()` to render studio streak text, three boba order chips, or winter locked count; hide the section for levels without an active HUD.

- [ ] **Step 6: Run integration tests**

Run:

```bash
node --test tests/game-state.test.mjs tests/theme-ui.test.mjs tests/pause-menu.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit integration**

```bash
git add game-state.js game-app.js index.html tests/game-state.test.mjs tests/theme-ui.test.mjs
git commit -m "feat: integrate theme missions into Totto gameplay"
```

---

### Task 7: Add Six Distinct Scene Treatments

**Files:**
- Modify: `game.css`
- Modify: `game-app.js`
- Create: `tests/theme-scenes.test.mjs`

**Interfaces:**
- Consumes: body classes `level-rain`, `level-vanity`, `level-studio`, `level-picnic`, `level-boba`, `level-winter`.
- Produces: six cohesive scene palettes, container appearances, and lightweight motion feedback.

- [ ] **Step 1: Write failing scene tests**

```js
test("all six later levels have dedicated scene selectors", async () => {
  const css = await read("game.css");
  for (const id of ["rain", "vanity", "studio", "picnic", "boba", "winter"]) {
    assert.match(css, new RegExp(`\\.level-${id}`));
  }
  assert.match(css, /\.level-rain \.pot\.shaking/);
  assert.match(css, /\.theme-hud/);
  assert.match(css, /\.item\.theme-locked/);
});
```

- [ ] **Step 2: Run the scene test and verify failure**

Run: `node --test tests/theme-scenes.test.mjs`

Expected: FAIL because the new selectors do not exist.

- [ ] **Step 3: Add level-specific palettes and containers**

Define CSS custom properties per body class and implement:

- Rain: translucent blue-gray basket, waterline and ripple on deliberate shake.
- Vanity: warm ivory mirrored tray with restrained pink reflection.
- Studio: oval wooden palette with subtle paint daubs outside the item hit area.
- Picnic: woven basket rim and blue-gray gingham liner.
- Boba: caramel shaker bucket with oat counter backdrop.
- Winter: knitted basket liner with soft blue-gray shadows.

Keep `.items` geometry unchanged so existing hit testing and pile density remain stable.

- [ ] **Step 4: Mark winter-locked items without changing z-order**

In `render()`, toggle `theme-locked` based on `canPickItem(state.theme, item)`. Style it with a thin yarn overlay using a pseudo-element and preserve pointer events on the button so feedback can appear.

- [ ] **Step 5: Run scene and hit-testing tests**

Run:

```bash
node --test tests/theme-scenes.test.mjs tests/item-hit-test.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit scene treatments**

```bash
git add game.css game-app.js tests/theme-scenes.test.mjs
git commit -m "feat: style six new Totto rescue scenes"
```

---

### Task 8: Preserve Rewards, Cloud Sync, and Daily Bonus Safety

**Files:**
- Modify: `game-app.js`
- Modify: `cloud-sync.js`
- Modify: `tests/game-state.test.mjs`
- Create: `tests/cloud-sync-levels.test.mjs`

**Interfaces:**
- Consumes: arbitrary level and skin IDs from configuration.
- Produces: per-level best score/time, first/repeat rewards, daily boba bonus, and cloud merge covering all nine IDs.

- [ ] **Step 1: Write failing reward and merge tests**

Create `tests/cloud-sync-levels.test.mjs` with fixed assertions for arbitrary IDs and the daily guard:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { unique, mergeLevelRows, canClaimDailyBonus } = require("../cloud-sync.js");
const ids = ["hotpot", "garlic", "fruit", "rain", "vanity", "studio", "picnic", "boba", "winter"];

test("cloud helpers retain arbitrary level and skin ids", () => {
  assert.deepEqual(unique(ids.concat(ids)), ids);
  const merged = mergeLevelRows(
    [{ level_id: "rain", best_score: 500, best_time_ms: 90000 }],
    [{ level_id: "rain", best_score: 700, best_time_ms: 110000 },
     { level_id: "winter", best_score: 300, best_time_ms: 140000 }]
  );
  assert.deepEqual(merged.find(row => row.level_id === "rain"), {
    level_id: "rain", best_score: 700, best_time_ms: 90000
  });
  assert.equal(merged.some(row => row.level_id === "winter"), true);
});

test("boba order bonus is claimable once per local date", () => {
  assert.equal(canClaimDailyBonus(null, "2026-08-02"), true);
  assert.equal(canClaimDailyBonus("2026-08-02", "2026-08-02"), false);
  assert.equal(canClaimDailyBonus("2026-08-02", "2026-08-03"), true);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/cloud-sync-levels.test.mjs tests/game-state.test.mjs`

Expected: FAIL until merge helpers and the daily bonus guard are exported or isolated for testing.

- [ ] **Step 3: Extract pure progress helpers**

Export or attach these exact pure helpers from `cloud-sync.js` without hard-coding level IDs:

```js
const unique = values => [...new Set(values)];

function mergeLevelRows(localRows, remoteRows) {
  const rows = new Map();
  for (const row of [...localRows, ...remoteRows]) {
    const current = rows.get(row.level_id);
    rows.set(row.level_id, {
      level_id: row.level_id,
      best_score: Math.max(current?.best_score || 0, row.best_score || 0),
      best_time_ms: [current?.best_time_ms, row.best_time_ms]
        .filter(value => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b)[0] || null
    });
  }
  return [...rows.values()];
}

function canClaimDailyBonus(lastDate, today) {
  return lastDate !== today;
}
```

- [ ] **Step 4: Apply reward results during completion**

Keep the existing 100/25 coin rule. If the boba theme reports all three orders completed and the daily guard allows it, add 10 coins once and include the bonus in result copy. Do not make the order bonus a condition for unlocking winter.

- [ ] **Step 5: Run sync and reward tests**

Run:

```bash
node --test tests/cloud-sync-levels.test.mjs tests/game-state.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit persistence changes**

```bash
git add game-app.js cloud-sync.js tests/game-state.test.mjs tests/cloud-sync-levels.test.mjs
git commit -m "feat: persist nine-level rewards and theme bonuses"
```

---

### Task 9: Full Regression, Browser QA, Cache Bump, and Documentation

**Files:**
- Modify: `index.html`
- Modify: `home.html`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed Tasks 1–8.
- Produces: a verified GitHub Pages-ready build with cache-safe asset references.

- [ ] **Step 1: Add complete syntax coverage**

Set:

```json
"test:syntax": "node --check cloud-sync.js && node --check totto-3d.js && node --check game-config.js && node --check game-state.js && node --check theme-mechanics.js && node --check game-app.js"
```

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm test
npm run test:syntax
npm run test:assets
git diff --check
```

Expected: all tests pass, all syntax checks pass, all assets validate, and `git diff --check` prints no errors.

- [ ] **Step 3: Start the local server and execute browser flows**

Run: `npm run serve`

Verify at `http://127.0.0.1:4173/home.html`:

1. Existing player with fruit completed sees rain unlocked and vanity locked.
2. Each unlocked card opens its correct query URL.
3. A new level starts, pauses, continues, restarts, autosaves, reloads, and resumes.
4. A visibly exposed lower item can be selected through transparent upper-image pixels.
5. Studio streak, boba orders, and winter yarn feedback update without blocking base gameplay.
6. Desktop play remains complete without motion permission.
7. Mobile viewport 390×844 keeps the pile, tray, tools, and pause button usable.

- [ ] **Step 4: Bump cache versions**

Increment changed local script and stylesheet query versions consistently in `index.html` and character asset query versions in `home.html`. Do not rename localStorage save keys from earlier tasks.

- [ ] **Step 5: Update README**

Document the nine level URLs, sequential unlock order, three lightweight mechanics, asset validation command, and the fact that motion permission is device/browser-specific rather than account-synced.

- [ ] **Step 6: Re-run verification after cache and docs changes**

Run:

```bash
npm test
npm run test:syntax
npm run test:assets
git status --short
```

Expected: all commands pass; status lists only intentional final documentation/cache edits.

- [ ] **Step 7: Commit the verified release**

```bash
git add index.html home.html README.md package.json
git commit -m "release: prepare Totto four-seasons chapter"
```

---

## Final Acceptance

- Nine map entries unlock sequentially and cannot be bypassed through direct URLs.
- Every level contains a dense, non-hollow 3D pile and exactly three matching themed Totto items.
- All new skins use the approved compact Totto identity.
- All 75 regular new item types use local transparent 3D assets.
- Pause, restart, continue, autosave, undo, shuffle, move-out, reserve, visible-item hit testing, and deliberate pan-flip motion remain functional.
- Studio combo, boba orders, and winter yarn mechanics are deterministic, understandable, and non-blocking except the explicit yarn lock.
- Existing player progress and cloud data survive the release.
- Automated tests, syntax checks, asset checks, and browser QA pass before publishing.
