# Totto Shake Controls and Multi-Level Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-based phone shaking, expand the hotpot level to 93 items, and ship sequential garlic and fruit levels with themed Totto items, rewards, saves, and cloud progress.

**Architecture:** Keep `index.html` as the shared game UI and move level data plus deterministic pool/layer transforms into small browser modules. `motion-controls.js` owns browser permission and converts sensor samples into `light`, `medium`, or `strong` signals; the game applies capped position and adjacent-layer changes. Home, local progress, and Supabase use the same level and skin IDs.

**Tech Stack:** Static HTML/CSS/JavaScript, DeviceMotionEvent, Node.js built-in test runner, Supabase JS, WebP assets, GitHub Pages.

## Global Constraints

- Exact level totals are hotpot 93, garlic 108, and fruit 126.
- Every item type count is a multiple of 3.
- Shaking never consumes shuffle uses, never auto-matches, and never moves tray or reserve items.
- A strong shake changes at most four remaining items and only by one adjacent layer, with a 1200 ms cooldown.
- Motion permission is requested only from an explicit user click and is stored locally, never in the account.
- Devices without motion support and denied permissions retain the complete click game.
- Levels unlock in order: hotpot, garlic, fruit.
- First clear awards 100 coins and a skin; repeat clear awards 25 coins.
- No 3D runtime or physics engine dependency may be added.

---

### Task 1: Level configuration and exact pool generation

**Files:**
- Create: `game-config.js`
- Create: `tests/game-config.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `TottoGameConfig.LEVELS`, `getLevel(id)`, `buildPool(level, random)`, `isLevelUnlocked(id, completed)`.
- `buildPool()` returns items shaped as `{ uid, type, asset, name, selected, special }`.

- [ ] **Step 1: Write the failing configuration tests**

```js
test("levels have exact legal totals", () => {
  assert.equal(buildPool(getLevel("hotpot"), () => 0.5).length, 93);
  assert.equal(buildPool(getLevel("garlic"), () => 0.5).length, 108);
  assert.equal(buildPool(getLevel("fruit"), () => 0.5).length, 126);
  for (const id of ["hotpot", "garlic", "fruit"]) {
    const counts = Object.groupBy(buildPool(getLevel(id), () => 0.5), item => item.type);
    Object.values(counts).forEach(group => assert.equal(group.length % 3, 0));
  }
});

test("levels unlock sequentially", () => {
  assert.equal(isLevelUnlocked("hotpot", []), true);
  assert.equal(isLevelUnlocked("garlic", []), false);
  assert.equal(isLevelUnlocked("garlic", ["hotpot"]), true);
  assert.equal(isLevelUnlocked("fruit", ["hotpot"]), false);
  assert.equal(isLevelUnlocked("fruit", ["hotpot", "garlic"]), true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/game-config.test.mjs`

Expected: FAIL because `game-config.js` does not exist.

- [ ] **Step 3: Implement the UMD configuration module**

Create an IIFE that exports to both `module.exports` and `window.TottoGameConfig`. Define these exact IDs:

```js
const ORDER = ["hotpot", "garlic", "fruit"];
const LEVELS = {
  hotpot: { total: 93, saveKey: "totto-pick-hotpot-v4", skin: "hotpot-chef", next: "garlic" },
  garlic: { total: 108, saveKey: "totto-pick-garlic-v1", skin: "garlic-totto", next: "fruit" },
  fruit: { total: 126, saveKey: "totto-pick-fruit-v1", skin: "fruit-totto", next: null }
};
```

Populate item definitions exactly as the approved spec requires, including `count`, `asset`, `name`, and `special`. `getLevel()` must fall back to hotpot. `isLevelUnlocked()` checks the immediately preceding ID. `buildPool()` expands counts and gives each item a collision-safe UID.

- [ ] **Step 4: Run tests and syntax checks**

Run: `node --test tests/game-config.test.mjs && node --check game-config.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game-config.js tests/game-config.test.mjs package.json
git commit -m "feat: define three Totto game levels"
```

---

### Task 2: Shared game page and larger legal boards

**Files:**
- Modify: `index.html`
- Create: `tests/game-page.test.mjs`

**Interfaces:**
- Consumes: `TottoGameConfig.getLevel()`, `buildPool()`.
- Produces: query routes `index.html?level=hotpot|garlic|fruit`; runtime `currentLevel`; per-level saves.

- [ ] **Step 1: Write failing page integration tests**

```js
test("game loads shared level configuration", async () => {
  const html = await read("index.html");
  assert.match(html, /<script src="game-config\.js"><\/script>/);
  assert.match(html, /searchParams\.get\("level"\)/);
  assert.match(html, /currentLevel\.saveKey/);
  assert.match(html, /TottoGameConfig\.buildPool/);
  assert.doesNotMatch(html, /const FOOD = \[/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/game-page.test.mjs`

Expected: FAIL because the page still hard-codes `FOOD` and `SAVE_KEY`.

- [ ] **Step 3: Replace hard-coded data with the selected level**

Load `game-config.js` before the game script. Resolve:

```js
const params = new URLSearchParams(location.search);
const currentLevel = TottoGameConfig.getLevel(params.get("level"));
const SAVE_KEY = currentLevel.saveKey;
```

Use `TottoGameConfig.buildPool(currentLevel)` in `createGame()`. Build layers with `currentLevel.itemsPerLayer`, update title/subtitle/mission text from configuration, add `level-${currentLevel.id}` to `<body>`, and include `levelId` in saves so incompatible stale data is rejected.

- [ ] **Step 4: Add theme-safe CSS**

Use CSS variables on body classes for container, background, steam/leaf/sun accents, and item shadows. Keep `.item` as a native button and preserve all current tools.

- [ ] **Step 5: Run all tests**

Run: `npm test && npm run test:syntax`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/game-page.test.mjs
git commit -m "feat: run all themes through one game page"
```

---

### Task 3: Motion permission and signal classification

**Files:**
- Create: `motion-controls.js`
- Create: `tests/motion-controls.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `TottoMotion.classifySample(sample, state)`, `requestPermission()`, `start(onSignal)`, `stop()`, `isSupported()`.
- Signal shape: `{ intensity: "light"|"medium"|"strong", x, y, magnitude, at }`.

- [ ] **Step 1: Write failing motion tests**

```js
test("classifies motion and enforces strong cooldown", () => {
  const state = { lastStrongAt: 0 };
  assert.equal(classifySample({ x: 1, y: 1, z: 9.8, at: 2000 }, state).intensity, "light");
  assert.equal(classifySample({ x: 8, y: 5, z: 12, at: 3000 }, state).intensity, "strong");
  assert.equal(classifySample({ x: 9, y: 7, z: 13, at: 3500 }, state).intensity, "medium");
  assert.equal(classifySample({ x: 9, y: 7, z: 13, at: 4300 }, state).intensity, "strong");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/motion-controls.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement motion normalization**

Use `acceleration` when available and fall back to `accelerationIncludingGravity`. Apply exponential smoothing, ignore null readings, throttle callbacks to 80 ms, classify at calibrated magnitudes, and downgrade strong samples during the 1200 ms cooldown.

- [ ] **Step 4: Implement browser permission flow**

`requestPermission()` calls `DeviceMotionEvent.requestPermission()` only when present. Return one of `granted`, `denied`, `unsupported`, or `error`. `start()` adds one `devicemotion` listener and `stop()` removes it.

- [ ] **Step 5: Run tests**

Run: `node --test tests/motion-controls.test.mjs && node --check motion-controls.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add motion-controls.js tests/motion-controls.test.mjs package.json
git commit -m "feat: add phone motion permission controller"
```

---

### Task 4: Limited shake physics and game UI

**Files:**
- Create: `board-motion.js`
- Create: `tests/board-motion.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: motion signals and current unselected board items.
- Produces: `applyBoardMotion(items, signal, random)` returning changed item UIDs.

- [ ] **Step 1: Write failing board transform tests**

```js
test("strong motion changes no more than four items by one layer", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({
    uid: String(i), selected: false, x: 50, y: 50, layer: i % 5, rotation: 0
  }));
  const changed = applyBoardMotion(items, { intensity: "strong", x: 8, y: -6 }, () => 0.4);
  assert.ok(changed.length <= 4);
  changed.forEach(({ before, after }) => assert.ok(Math.abs(after.layer - before.layer) <= 1));
});

test("light motion never changes layers", () => {
  const items = [{ uid: "a", selected: false, x: 50, y: 50, layer: 0, rotation: 0 }];
  const changed = applyBoardMotion(items, { intensity: "light", x: 2, y: 1 }, () => 0.2);
  assert.equal(changed[0].before.layer, changed[0].after.layer);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/board-motion.test.mjs`

Expected: FAIL because `board-motion.js` does not exist.

- [ ] **Step 3: Implement bounded transforms**

Clamp positions to `x=9..91`, `y=13..87`; light changes all rendered transforms visually but no data layer, medium mutates at most two items, strong mutates at most four. Layer changes use `Math.sign(random() - 0.5)` and are clamped between zero and the current maximum layer.

- [ ] **Step 4: Add permission controls to the start dialog**

Add:

```html
<button class="motion-permission" id="motionPermissionBtn">📱 开启晃动玩法</button>
<p class="motion-status" id="motionStatus">也可以只用点击游玩</p>
```

On click, call `TottoMotion.requestPermission()`. Save only `"granted"` to `localStorage["totto-motion-enabled-v1"]`. On later visits, call `start()` without showing a new prompt; if no events arrive, keep the manual retry button available.

- [ ] **Step 5: Connect signals to visuals and saves**

Add body class `is-shaking`, translate the bowl by at most 8 px, call `applyBoardMotion()` for medium/strong, render, and save. Do not modify `shuffleLeft`, `previousState`, `tray`, or `reserve`.

- [ ] **Step 6: Run all tests**

Run: `npm test && npm run test:syntax`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add board-motion.js tests/board-motion.test.mjs index.html
git commit -m "feat: let phone shakes gently uncover items"
```

---

### Task 5: Themed assets and special Totto matches

**Files:**
- Create: `assets/food/hotpot/*.webp`
- Create: `assets/food/garlic/*.webp`
- Create: `assets/food/fruit/*.webp`
- Create: `assets/characters/totto-hotpot-item.webp`
- Create: `assets/characters/totto-garlic.webp`
- Create: `assets/characters/totto-fruit.webp`
- Modify: `game-config.js`
- Modify: `index.html`
- Create: `tests/assets.test.mjs`

**Interfaces:**
- Consumes: item asset paths from `game-config.js`.
- Produces: valid WebP files for every configured item and `special: true` for each theme Totto.

- [ ] **Step 1: Write a failing asset integrity test**

The test iterates every configured asset, reads it, and asserts `RIFF` at bytes 0–3 and `WEBP` at bytes 8–11. It also asserts each level has exactly one special item type with count 3.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/assets.test.mjs`

Expected: FAIL listing the missing themed files.

- [ ] **Step 3: Generate the approved visual set**

Generate transparent-background, rounded 3D toy-style objects with consistent camera, lighting, and outline. Use cream-white/soft purple/sage for garlic, low-saturation summer fruit colors for fruit, and the existing warm hotpot palette. Keep Totto's round face, three forehead dots, worried brows, dark round eyes, and “3” mouth.

- [ ] **Step 4: Convert and validate assets**

Convert outputs to WebP at 384×384, preserving alpha and keeping each file below 120 KB. Run `file assets/food/*/*.webp assets/characters/totto-*.webp`.

- [ ] **Step 5: Add special-match feedback**

When `resolveMatches()` removes a special Totto type, add 300 bonus points, show “找到主题托托啦！”, and animate the brand portrait with `celebrate`. Do not call `openResult()` until the normal board-clear condition passes.

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: PASS with no missing assets.

- [ ] **Step 7: Commit**

```bash
git add assets game-config.js index.html tests/assets.test.mjs
git commit -m "feat: add garlic fruit and themed Totto art"
```

---

### Task 6: Sequential map, wardrobe rewards, and per-level progress

**Files:**
- Modify: `home.html`
- Modify: `index.html`
- Modify: `cloud-sync.js`
- Modify: `tests/totto-home.test.mjs`
- Create: `tests/cloud-progress.test.mjs`

**Interfaces:**
- Consumes: level IDs `hotpot`, `garlic`, `fruit`; skin IDs `hotpot-chef`, `garlic-totto`, `fruit-totto`.
- Produces: local `progress.levels[levelId] = { bestScore, bestTimeMs }`; merged cloud rows.

- [ ] **Step 1: Write failing map and progress tests**

Assert that home links to all three query routes, garlic requires hotpot, fruit requires garlic, and all three skin buttons use real image assets. Test the pure merge helper with maximum score and minimum non-null time.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/totto-home.test.mjs tests/cloud-progress.test.mjs`

Expected: FAIL because the map and per-level metrics are absent.

- [ ] **Step 3: Update completion logic**

`completeLevel()` records current level ID, increments first/repeat coins, stores:

```js
progress.levels[currentLevel.id] = {
  bestScore: Math.max(old.bestScore || 0, state.score),
  bestTimeMs: old.bestTimeMs ? Math.min(old.bestTimeMs, state.elapsed) : state.elapsed
};
```

Unlock `currentLevel.skin` and show the configured reward copy.

- [ ] **Step 4: Update home map and wardrobe**

Render real anchor elements only for unlocked levels. Locked cards stay visible with exact prerequisite copy. Add garlic and fruit skin image buttons and update the portrait/speech map for all three equipped skins.

- [ ] **Step 5: Merge per-level cloud progress**

Extract a pure `mergeProgress(local, remoteRows)` helper in `cloud-sync.js`. Merge completed IDs by union, score by max, and non-null time by min. Upsert all completed level rows with their actual per-level metrics.

- [ ] **Step 6: Run tests**

Run: `npm test && npm run test:syntax`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add home.html index.html cloud-sync.js tests
git commit -m "feat: sync three levels and skin rewards"
```

---

### Task 7: Mobile verification and GitHub Pages release

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: deployed GitHub Pages build and a cache-busted public URL.

- [ ] **Step 1: Run clean verification**

Run:

```bash
npm test
npm run test:syntax
git diff --check
```

Expected: all tests pass, syntax checks pass, and no whitespace errors.

- [ ] **Step 2: Test local routes**

Serve with `python3 -m http.server 4173`. Open all three `index.html?level=...` routes at desktop and 390×844 viewport. Verify start dialog, denied-permission fallback, 7-slot tray, tools, theme, map, and wardrobe.

- [ ] **Step 3: Simulate motion**

Dispatch synthetic `devicemotion` samples in the browser. Verify light visual motion, medium ≤2 mutations, strong ≤4 mutations, 1200 ms cooldown, unchanged shuffle count, and saved board state.

- [ ] **Step 4: Update README**

Document the three route URLs, motion permission behavior, fallback behavior, and test command.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe levels and shake controls"
```

- [ ] **Step 6: Publish and verify**

Publish the tested branch to `main`. Confirm the GitHub Pages HTML contains the new module scripts and every configured WebP URL returns HTTP 200 with `image/webp`.

