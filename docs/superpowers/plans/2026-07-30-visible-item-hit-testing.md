# Visible Item Hit Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players select every visibly exposed object pixel without transparent image boxes stealing the click, and restore the approved garlic Totto artwork with a fresh asset URL.

**Architecture:** Add a small pure hit-testing module that maps a pointer into each rotated/scaled item and resolves the highest visible opaque pixel. The game renderer caches per-image alpha masks and delegates board clicks to this module. Preserve keyboard activation and use a new filename for the approved garlic Totto asset so browsers cannot reuse a stale character image.

**Tech Stack:** Vanilla JavaScript, DOM, Canvas 2D, Node test runner, GitHub Pages.

## Global Constraints

- A fully covered lower item remains inaccessible until some of it is visible.
- A visibly exposed lower item must be selectable through transparent pixels of upper image boxes.
- Mouse and touch use pixel-accurate hit testing; keyboard activation continues to select the focused item.
- The garlic Totto must keep the approved cream rounded face, three forehead dots, bean eyes, 3-shaped mouth, garlic hood, sage apron, and belly patch.

---

### Task 1: Pure visible-pixel resolver

**Files:**
- Create: `item-hit-test.js`
- Create: `tests/item-hit-test.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `TottoItemHitTest.pickVisibleCandidate(candidates, point, threshold)`
- Candidate fields: `{ uid, z, centerX, centerY, width, height, scale, rotation, alphaAt(u, v) }`

- [ ] **Step 1: Write failing tests for transparent pass-through, opaque top selection, transforms, and no hit**
- [ ] **Step 2: Run `node --test tests/item-hit-test.test.mjs` and verify the module-missing failure**
- [ ] **Step 3: Implement inverse rotation/scale mapping and top-to-bottom alpha selection**
- [ ] **Step 4: Run the focused test and verify it passes**
- [ ] **Step 5: Load `item-hit-test.js` before `game-app.js` with matching cache versions**

### Task 2: Integrate canvas alpha masks and preserve accessibility

**Files:**
- Modify: `game-app.js`
- Modify: `tests/pause-menu.test.mjs`

**Interfaces:**
- Consumes: `TottoItemHitTest.pickVisibleCandidate`
- Produces: delegated board click behavior and unchanged `pick(uid)` game action

- [ ] **Step 1: Add a failing source-level integration test for delegated hit testing and keyboard fallback**
- [ ] **Step 2: Run the focused test and verify it fails on the current direct button click handler**
- [ ] **Step 3: Cache same-origin image alpha data, sample object-fit coordinates, and resolve pointer clicks**
- [ ] **Step 4: Preserve zero-coordinate keyboard clicks by selecting the focused button directly**
- [ ] **Step 5: Run the focused and full suites**

### Task 3: Restore approved garlic Totto without stale caching

**Files:**
- Create: `assets/characters/totto-garlic-approved.webp`
- Modify: `game-config.js`
- Modify: `home.html`
- Modify: `tests/game-config.test.mjs`
- Modify: `tests/totto-home.test.mjs`

**Interfaces:**
- Produces: one shared approved asset path for the garlic mission item, reward, and wardrobe.

- [ ] **Step 1: Add failing assertions for the approved garlic Totto path and valid WebP**
- [ ] **Step 2: Run focused tests and verify the old path fails**
- [ ] **Step 3: Copy the approved artwork byte-for-byte to the new cache-safe filename and update all references**
- [ ] **Step 4: Run the full test suite, syntax checks, and `git diff --check`**
- [ ] **Step 5: Publish to `main` and verify the production page**
