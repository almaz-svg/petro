import test from "node:test";
import assert from "node:assert/strict";
import { sampleJourney } from "../src/journey.js";

test("journey clamps endpoints and rejects nonfinite progress deterministically", () => {
  assert.deepEqual(sampleJourney(-4), sampleJourney(0));
  assert.deepEqual(sampleJourney(4), sampleJourney(1));
  assert.deepEqual(sampleJourney(NaN), sampleJourney(0));
  assert.deepEqual(sampleJourney(Infinity), sampleJourney(0));
  assert.equal(sampleJourney(0).tableOpacity, 1);
  assert.equal(sampleJourney(0.18).tableOpacity, 0);
  assert.equal(sampleJourney(1).interactive, true);
  assert.equal(sampleJourney(0.99).interactive, false);
  assert.ok(sampleJourney(0).polar < 0.2);
});
test("journey is finite, deterministic and continuous across section boundaries", () => {
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000,
      a = sampleJourney(p);
    assert.deepEqual(a, sampleJourney(p));
    for (const [key, value] of Object.entries(a)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value), key);
    }
    assert.ok(a.polar > 0 && a.polar < Math.PI / 2);
    assert.ok(a.distanceScale > 0);
    assert.ok(a.tableOpacity >= 0 && a.tableOpacity <= 1);
  }
  for (const p of [0.18, 0.25, 0.52, 0.76]) {
    const a = sampleJourney(p - 1e-6),
      b = sampleJourney(p + 1e-6);
    for (const key of [
      "yaw",
      "polar",
      "distanceScale",
      "targetHeight",
      "tableOpacity",
    ])
      assert.ok(Math.abs(a[key] - b[key]) < 0.001, key);
  }
});
test("details move closer and final view restores the full composition", () => {
  assert.ok(
    sampleJourney(0.52).distanceScale < sampleJourney(0.25).distanceScale,
  );
  assert.ok(sampleJourney(0.76).targetHeight > sampleJourney(0).targetHeight);
  assert.equal(sampleJourney(1).distanceScale, 1);
});
