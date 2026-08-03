import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { unique, mergeLevelRows, canClaimDailyBonus } = require("../cloud-sync.js");
const ids = ["hotpot", "garlic", "fruit", "rain", "vanity", "studio", "picnic", "boba", "winter"];

test("cloud helpers retain arbitrary level and skin ids", () => {
  assert.deepEqual(unique(ids.concat(ids)), ids);
  const merged = mergeLevelRows(
    [{ level_id: "rain", best_score: 500, best_time_ms: 90000 }],
    [
      { level_id: "rain", best_score: 700, best_time_ms: 110000 },
      { level_id: "winter", best_score: 300, best_time_ms: 140000 }
    ]
  );

  assert.deepEqual(merged.find(row => row.level_id === "rain"), {
    level_id: "rain",
    best_score: 700,
    best_time_ms: 90000
  });
  assert.equal(merged.some(row => row.level_id === "winter"), true);
});

test("boba order bonus is claimable once per local date", () => {
  assert.equal(canClaimDailyBonus(null, "2026-08-02"), true);
  assert.equal(canClaimDailyBonus("2026-08-02", "2026-08-02"), false);
  assert.equal(canClaimDailyBonus("2026-08-02", "2026-08-03"), true);
});
