# Game Visual Depth and Pause Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game board feel like a dense 3D pile with larger objects and a more deliberate palette, and add a safe pause menu with continue, restart, and home actions.

**Architecture:** Keep the game lightweight by rendering transparent raster item assets and CSS depth effects instead of runtime WebGL. Treat pause as a local UI state layered over the existing serializable game state so autosave remains compatible. Increment the placement layout version so existing saves migrate to the new larger, fuller arrangement.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node built-in test runner, GitHub Pages.

## Global Constraints

- Preserve the existing Totto character identity and game rules.
- The first level remains 93 objects and every object type remains matchable in groups of three.
- No runtime 3D library or large GLB is added.
- Pause must stop the elapsed timer and block board actions.
- Restart requires confirmation and clears only the active level run.
- Desktop and mobile must remain usable with touch targets of at least 44 CSS pixels.

---

### Task 1: Lock the new board and pause requirements with tests

**Files:**
- Modify: `tests/game-config.test.mjs`
- Modify: `tests/game-state.test.mjs`
- Create: `tests/pause-menu.test.mjs`

**Interfaces:**
- Consumes: `TottoGameConfig.buildPool`, `TottoGameState.createGame`, and the static markup/scripts.
- Produces: Regression coverage for raster food assets, layout version 3, fuller board coordinates, and pause controls.

- [ ] **Step 1: Write failing asset and layout tests**

Add assertions that the hotpot level uses local PNG food assets, that fresh states report layout version 3, and that the generated coordinates fill both the center and outer area of the pot.

- [ ] **Step 2: Write failing pause-menu markup tests**

Assert that `index.html` contains `pauseBtn`, `pauseMenu`, `continueBtn`, `restartBtn`, `confirmRestartBtn`, and `pauseHomeLink`, and that `game-app.js` guards input with an `isPaused` state.

- [ ] **Step 3: Run the focused tests to verify failure**

Run: `node --test tests/game-config.test.mjs tests/game-state.test.mjs tests/pause-menu.test.mjs`

Expected: FAIL because the raster assets, layout version 3, and pause controls are not implemented.

### Task 2: Ship local 3D item assets and a fuller placement model

**Files:**
- Create: `assets/food/beef.png`
- Create: `assets/food/corn.png`
- Create: `assets/food/dumpling.png`
- Create: `assets/food/greens.png`
- Create: `assets/food/mushroom.png`
- Create: `assets/food/shrimp.png`
- Create: `assets/food/tofu.png`
- Modify: `game-config.js`
- Modify: `game-state.js`

**Interfaces:**
- Consumes: Existing item asset strings and `placeItems(items, level, random)`.
- Produces: Local transparent PNG asset paths and layout version 3 coordinates.

- [ ] **Step 1: Copy the approved transparent food renders into the isolated worktree**

Copy the seven existing 1254×1254 RGBA food renders without altering the source files.

- [ ] **Step 2: Replace hotpot emoji assets with local PNG assets**

Use only the seven cohesive 3D food renders plus the themed Totto item, preserving a total of exactly 93 objects and counts divisible by three.

- [ ] **Step 3: Enlarge and widen the placement distribution**

Increase the ellipse radii and scale range, keep at least three center objects, place visible objects toward the outer bowl, and bump `LAYOUT_VERSION` from 2 to 3.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/game-config.test.mjs tests/game-state.test.mjs`

Expected: PASS.

### Task 3: Add pause, continue, confirmed restart, and return-home behavior

**Files:**
- Modify: `index.html`
- Modify: `game-app.js`
- Modify: `game.css`

**Interfaces:**
- Consumes: Existing timer helpers, `restart()`, and local-save behavior.
- Produces: `pauseGame()`, `continueGame()`, `openRestartConfirmation()`, and `closeRestartConfirmation()`.

- [ ] **Step 1: Add accessible pause and restart-confirmation markup**

Add a pause button in the top bar and a modal with named controls for continue, restart, and return home. Put restart confirmation inside the same modal so focus stays in one interruption.

- [ ] **Step 2: Implement paused timer and input guards**

Add `isPaused`; freeze elapsed time before opening the menu; block picking, tools, reserve release, and shake motion; restart or resume without double-counting elapsed time.

- [ ] **Step 3: Wire every control**

Continue resumes the timer, restart opens confirmation, confirm creates a clean level state, cancel returns to the pause menu, and return home uses `home.html`.

- [ ] **Step 4: Run pause tests**

Run: `node --test tests/pause-menu.test.mjs`

Expected: PASS.

### Task 4: Replace the washed-out palette and increase perceived 3D depth

**Files:**
- Modify: `game.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: Existing level body classes and item markup.
- Produces: A charcoal bowl, warm wood environment, larger item sizing, improved shadows/highlights, and responsive modal styling.

- [ ] **Step 1: Define semantic palette roles**

Use warm neutral canvas colors, graphite bowl colors, restrained cream surfaces, a paprika action accent, and sage only for enabled motion state.

- [ ] **Step 2: Increase object size and visible board coverage**

Expand `.items`, make objects approximately 30–35% larger, keep special Totto slightly larger, and tune mobile sizes so the pile remains dense without clipping.

- [ ] **Step 3: Add raster and emoji depth treatment**

Use directional drop shadows, soft highlights, and small perspective variation without visible item cards or borders.

- [ ] **Step 4: Cache-bust updated assets**

Increment the stylesheet, config, state, and app query versions in `index.html`.

### Task 5: Verify, inspect, and publish

**Files:**
- Modify only if verification exposes a concrete defect.

**Interfaces:**
- Consumes: The completed static game.
- Produces: Passing tests and a deployed GitHub Pages build.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Inspect desktop and mobile renders in one bounded browser pass**

Verify the pile fills the bowl, the 3D assets load, the pause menu freezes time, restart confirmation works, and controls remain usable at desktop and phone widths.

- [ ] **Step 3: Fix all observed defects in one batch and re-run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 4: Commit and publish**

Commit the scoped files, push them to the public repository, verify GitHub Pages returns the versioned assets, and provide a cache-busted direct link.
