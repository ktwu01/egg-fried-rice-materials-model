/*
 * Percolation–coagulation model of egg fried rice.
 *
 * Extracted from demo.html so the same functions drive the animation, the
 * live statistics, the I* sweep, and the Node tests in test/model.test.js.
 * Runs both in the browser (as the global `RiceModel`) and under Node
 * (via module.exports).
 *
 * Physical constants are illustrative — chosen to reproduce plausible
 * qualitative behavior, not measured values.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RiceModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- Kinetic / stoichiometric constants -------------------------------
  const EA_OVER_R = 4000, A_PRE = 1543, AVRAMI_N = 2;
  const BETA0 = 0.2, GAMMA0 = 0.02, RC = 1.0;

  // --- "Bonded" percolation criterion -----------------------------------
  const THETA_C = 0.65;     // minimum mean coverage
  const VAR_C = 0.035;      // maximum coverage variance
  const BARE_THETA = 0.3;   // a grain counts as isolated below this coverage
  const BARE_C = 0.05;      // maximum isolated-grain fraction

  // --- Coverage-distribution model --------------------------------------
  // Grains differ in how exposed they are to egg–grain collisions (position
  // in the wok, surface area, clumping). That spread is what turns a single
  // mean trajectory into a real distribution with variance and bare grains.
  const EXPOSURE_SPREAD = 0.55; // ± fractional spread in per-grain collision exposure

  // --- I* sweep score weights -------------------------------------------
  // Optimize distribution quality, not just mean coverage:
  //   score = mean - LAMBDA_VAR * variance - MU_BARE * bareFraction
  const LAMBDA_VAR = 6.0;
  const MU_BARE = 1.5;

  const DT = 0.05; // integration step (seconds)

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function kOfT(Tc) { return A_PRE * Math.exp(-EA_OVER_R / (Tc + 273.15)); }

  function phiOfT(t, Tc) {
    const k = kOfT(Tc);
    return 1 - Math.exp(-Math.pow(k * t, AVRAMI_N));
  }

  function thetaMaxOf(r) { return Math.min(1, r / RC); }

  // Integrate one grain's coverage ODE:
  //   dθ/dt = β0·I·exposure·(θmax − θ)·φ(t)  −  γ0·I²·θ
  function integrateGrain(tCook, Tc, I, r, exposure) {
    let theta = 0;
    const tm = thetaMaxOf(r);
    const b = BETA0 * I * exposure;
    const g = GAMMA0 * I * I;
    for (let t = 0; t < tCook; t += DT) {
      const phi = phiOfT(t, Tc);
      theta += (b * Math.max(tm - theta, 0) * phi - g * theta) * DT;
      theta = clamp01(theta);
    }
    return theta;
  }

  // Mean-trajectory coverage (exposure = 1). Kept for back-compat / tests.
  function meanThetaAt(tCook, Tc, I, r) {
    return integrateGrain(tCook, Tc, I, r, 1);
  }

  // Deterministic exposure for grain i of n, evenly spanning the spread.
  function exposureAt(i, n) {
    if (n <= 1) return 1;
    return (1 - EXPOSURE_SPREAD) + (2 * EXPOSURE_SPREAD) * (i / (n - 1));
  }

  // Simulate a heterogeneous population and return its coverage distribution.
  function simulatePopulation(tCook, Tc, I, r, nSamples) {
    const n = nSamples || 21;
    let sum = 0, sumSq = 0, bareCount = 0;
    for (let i = 0; i < n; i++) {
      const th = integrateGrain(tCook, Tc, I, r, exposureAt(i, n));
      sum += th;
      sumSq += th * th;
      if (th < BARE_THETA) bareCount++;
    }
    const mean = sum / n;
    const variance = Math.max(0, sumSq / n - mean * mean);
    return { mean, variance, bare: bareCount / n };
  }

  // Compute mean / variance / bare fraction from a set of grain coverages.
  function statsOf(thetas) {
    const n = thetas.length;
    if (n === 0) return { mean: 0, variance: 0, bare: 0 };
    let sum = 0, sumSq = 0, bareCount = 0;
    for (const t of thetas) {
      sum += t;
      sumSq += t * t;
      if (t < BARE_THETA) bareCount++;
    }
    const mean = sum / n;
    return {
      mean,
      variance: Math.max(0, sumSq / n - mean * mean),
      bare: bareCount / n
    };
  }

  // Score used by the I* sweep: reward coverage, penalize spread and bare grains.
  function scoreOf(stats) {
    return stats.mean - LAMBDA_VAR * stats.variance - MU_BARE * stats.bare;
  }

  // Full percolation criterion, including the bare-grain bound the original
  // demo advertised in its status text but never actually checked.
  function isBonded(stats) {
    return stats.mean >= THETA_C && stats.variance <= VAR_C && stats.bare <= BARE_C;
  }

  // Sweep stirring intensity and pick I* by score (not mean coverage alone).
  function sweepIstar(tCook, Tc, r, opts) {
    opts = opts || {};
    const iMin = opts.iMin != null ? opts.iMin : 0.2;
    const iMax = opts.iMax != null ? opts.iMax : 5;
    const step = opts.step != null ? opts.step : 0.1;
    const nSamples = opts.nSamples;
    const curve = [];
    let best = { I: iMin, score: -Infinity, stats: null };
    for (let I = iMin; I <= iMax + 1e-9; I += step) {
      const stats = simulatePopulation(tCook, Tc, I, r, nSamples);
      const score = scoreOf(stats);
      curve.push({ I, stats, score });
      if (score > best.score) best = { I, score, stats };
    }
    return { best, curve, iMin, iMax };
  }

  return {
    // constants
    EA_OVER_R, A_PRE, AVRAMI_N, BETA0, GAMMA0, RC,
    THETA_C, VAR_C, BARE_THETA, BARE_C,
    EXPOSURE_SPREAD, LAMBDA_VAR, MU_BARE, DT,
    // functions
    clamp01, kOfT, phiOfT, thetaMaxOf,
    integrateGrain, meanThetaAt, exposureAt,
    simulatePopulation, statsOf, scoreOf, isBonded, sweepIstar
  };
});
