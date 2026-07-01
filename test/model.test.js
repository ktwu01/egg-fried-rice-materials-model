/*
 * Behavioral tests for the percolation–coagulation model.
 *
 * Zero dependencies — run with:  node test/model.test.js  (or: npm test)
 *
 * These are qualitative-behavior guards, not numeric golden values: they pin
 * the *shape* of the model (monotonicities, bounds, the existence of an
 * interior stirring optimum) so refactors that quietly break it get caught,
 * while the deliberately illustrative constants stay free to change.
 */
'use strict';
const assert = require('assert');
const M = require('../model.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok  ' + name);
}
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- phiOfT: Avrami coagulation fraction ---------------------------------
test('phiOfT is 0 at t=0', () => {
  assert.ok(approx(M.phiOfT(0, 180), 0));
});
test('phiOfT stays within [0,1]', () => {
  for (const t of [1, 10, 30, 90, 1000]) {
    const p = M.phiOfT(t, 180);
    assert.ok(p >= 0 && p <= 1, `phi=${p} out of range`);
  }
});
test('phiOfT increases with time', () => {
  assert.ok(M.phiOfT(30, 180) > M.phiOfT(10, 180));
});
test('phiOfT increases with temperature at fixed time', () => {
  assert.ok(M.phiOfT(30, 200) > M.phiOfT(30, 150));
});
test('kOfT (Arrhenius) increases with temperature', () => {
  assert.ok(M.kOfT(200) > M.kOfT(150));
});

// --- thetaMaxOf: stoichiometric ceiling ----------------------------------
test('thetaMaxOf is 0 at r=0', () => {
  assert.ok(approx(M.thetaMaxOf(0), 0));
});
test('thetaMaxOf is linear below r_c', () => {
  assert.ok(approx(M.thetaMaxOf(0.5 * M.RC), 0.5));
});
test('thetaMaxOf clamps to 1 at and above r_c', () => {
  assert.ok(approx(M.thetaMaxOf(M.RC), 1));
  assert.ok(approx(M.thetaMaxOf(3 * M.RC), 1));
});

// --- meanThetaAt: coverage ODE integration -------------------------------
test('meanThetaAt is 0 for zero cook time', () => {
  assert.ok(approx(M.meanThetaAt(0, 180, 2, 0.7), 0));
});
test('meanThetaAt stays within [0,1]', () => {
  for (const I of [0.2, 1, 2.5, 5]) {
    const th = M.meanThetaAt(30, 180, I, 0.7);
    assert.ok(th >= 0 && th <= 1, `theta=${th} out of range`);
  }
});
test('meanThetaAt is capped by the stoichiometric ceiling', () => {
  const r = 0.4; // theta_max = 0.4
  const th = M.meanThetaAt(90, 200, 2, r);
  assert.ok(th <= M.thetaMaxOf(r) + 1e-9, `theta=${th} exceeded ceiling`);
});
test('more egg allows higher coverage', () => {
  assert.ok(M.meanThetaAt(30, 180, 2, 0.9) > M.meanThetaAt(30, 180, 2, 0.3));
});

// --- Distribution, scoring, and the bonded criterion ---------------------
test('simulatePopulation returns finite mean/variance/bare in range', () => {
  const s = M.simulatePopulation(30, 180, 2, 0.7);
  assert.ok(s.mean >= 0 && s.mean <= 1);
  assert.ok(s.variance >= 0);
  assert.ok(s.bare >= 0 && s.bare <= 1);
});
test('exposure spread produces nonzero variance', () => {
  const s = M.simulatePopulation(30, 180, 2, 0.7);
  assert.ok(s.variance > 0, 'expected a real coverage distribution');
});
test('statsOf matches a hand-computed case', () => {
  const s = M.statsOf([0.2, 0.4, 0.6]); // below/at-or-above BARE_THETA=0.3
  assert.ok(approx(s.mean, 0.4, 1e-12));
  assert.ok(approx(s.variance, 0.0266666666, 1e-6));
  assert.ok(approx(s.bare, 1 / 3, 1e-12)); // only 0.2 < 0.3
});
test('isBonded requires all three conditions, including bare bound', () => {
  // mean/variance fine, but too many bare grains -> not bonded (the bug fix)
  assert.strictEqual(
    M.isBonded({ mean: 0.7, variance: 0.01, bare: M.BARE_C + 0.1 }), false);
  assert.strictEqual(
    M.isBonded({ mean: 0.7, variance: 0.01, bare: 0 }), true);
  // low mean -> not bonded
  assert.strictEqual(
    M.isBonded({ mean: 0.4, variance: 0.01, bare: 0 }), false);
  // high variance -> not bonded
  assert.strictEqual(
    M.isBonded({ mean: 0.7, variance: M.VAR_C + 0.1, bare: 0 }), false);
});
test('scoreOf penalizes variance and bare fraction', () => {
  const base = { mean: 0.7, variance: 0, bare: 0 };
  assert.ok(M.scoreOf(base) > M.scoreOf({ ...base, variance: 0.05 }));
  assert.ok(M.scoreOf(base) > M.scoreOf({ ...base, bare: 0.2 }));
});

// --- I* sweep: non-monotonic optimum -------------------------------------
test('sweepIstar returns I* inside the swept range', () => {
  const { best } = M.sweepIstar(30, 180, 0.7);
  assert.ok(best.I >= 0.2 && best.I <= 5, `I*=${best.I} out of range`);
});
test('competing collision/shear terms give an interior optimum', () => {
  // With shear ~ I^2 vs collision ~ I, neither extreme should win outright.
  const { best } = M.sweepIstar(30, 190, 0.8);
  assert.ok(best.I > 0.2 && best.I < 5,
    `expected interior I*, got boundary I*=${best.I}`);
});

console.log(`\n${passed} tests passed.`);
