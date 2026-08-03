import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  createThemeState,
  onThemeMatch,
  canPickItem,
  serializeThemeState
} = require("../theme-mechanics.js");

test("studio combo expires after four seconds and rewards an active streak", () => {
  let state = createThemeState({ id: "studio", mechanic: "studio-combo" }, [], () => 0);

  let result = onThemeMatch(state, { type: "paintbrush", at: 1000 }, () => 0);
  assert.equal(result.state.streak, 1);
  assert.equal(result.scoreBonus, 0);

  result = onThemeMatch(result.state, { type: "paint-tube", at: 4500 }, () => 0);
  assert.equal(result.state.streak, 2);
  assert.equal(result.scoreBonus, 20);

  result = onThemeMatch(result.state, { type: "pencil", at: 9001 }, () => 0);
  assert.equal(result.state.streak, 1);
  assert.equal(result.scoreBonus, 0);
});

test("boba orders select three regular types and each order completes once", () => {
  const items = ["cup", "pearl", "straw", "cup", "pearl", "straw"].map((type, index) => ({
    uid: `i-${index}`,
    type,
    special: false
  }));
  let state = createThemeState({ id: "boba", mechanic: "boba-orders" }, items, () => 0);

  assert.equal(state.orders.length, 3);
  assert.equal(new Set(state.orders).size, 3);

  const first = state.orders[0];
  let result = onThemeMatch(state, { type: first, at: 1000 }, () => 0);
  assert.equal(result.state.completed.includes(first), true);
  assert.equal(result.coinBonus, 0);

  state = result.state;
  result = onThemeMatch(state, { type: first, at: 2000 }, () => 0);
  assert.deepEqual(result.state.completed, state.completed);
});

test("winter leaves a reachable yarn triple and yarn matches unlock three items", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    uid: `i-${index}`,
    type: index < 6 ? "yarn-ball" : "mitten",
    layer: index < 3 ? 9 : 0,
    special: false
  }));
  let state = createThemeState({ id: "winter", mechanic: "winter-yarn" }, items, () => 0);

  assert.equal(state.lockedUids.length <= 9, true);
  assert.equal(
    items.filter(item => item.type === "yarn-ball" && !state.lockedUids.includes(item.uid)).length >= 3,
    true
  );
  assert.equal(canPickItem(state, items.find(item => state.lockedUids.includes(item.uid))), false);
  assert.equal(canPickItem(state, items.find(item => !state.lockedUids.includes(item.uid))), true);

  const result = onThemeMatch(state, { type: "yarn-ball", at: 1000 }, () => 0);
  assert.equal(result.unlockedUids.length, 3);
  assert.equal(result.state.lockedUids.length, state.lockedUids.length - 3);
});

test("no-mechanic themes remain pickable and state transitions do not mutate inputs", () => {
  const state = createThemeState({ id: "vanity", mechanic: "none" }, [], () => 0);
  const before = JSON.stringify(state);
  const result = onThemeMatch(state, { type: "comb", at: 1000 }, () => 0);

  assert.equal(canPickItem(state, { uid: "comb-1" }), true);
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(result.state, state);
  assert.deepEqual(serializeThemeState(result.state), result.state);
  assert.notEqual(serializeThemeState(result.state), result.state);
});
