import { RandomForestRegression } from "ml-random-forest";

/**
 * Real ML-driven forecasting, replacing Zia AutoML: Catalyst's AutoML is
 * unavailable on the India data center (confirmed against Catalyst's own
 * docs — "AutoML is currently not available to Catalyst users accessing
 * from the EU, AU, IN, JP, SA or CA data centers"), which this project, as
 * an Indian state-police platform, will almost certainly run on. Rather than
 * build against a service that won't be reachable, this trains a small
 * region-independent Random Forest regression in-process instead.
 *
 * Task: for each (police station, crime sub-head) bucket, predict next
 * quarter's case count from the two prior quarters' counts plus that
 * bucket's heinous-case fraction — a genuine forward-looking forecast,
 * distinct from lib/risk.js's original backward-looking ratio heuristic
 * (which only detects a spike that already happened).
 */

const WINDOW_DAYS = 90;
const WINDOW_COUNT = 8; // 8 rolling 90-day windows across the ~2-year seeded dataset

/** Buckets case rows into WINDOW_COUNT trailing 90-day windows, oldest first. */
function buildWindows(rows) {
  const now = Date.now();
  const windows = Array.from({ length: WINDOW_COUNT }, () => new Map()); // bucketKey -> {count, heinous}

  for (const row of rows) {
    const ageDays = (now - new Date(row.CrimeRegisteredDate).getTime()) / (1000 * 60 * 60 * 24);
    const windowIndex = WINDOW_COUNT - 1 - Math.floor(ageDays / WINDOW_DAYS);
    if (windowIndex < 0 || windowIndex >= WINDOW_COUNT) continue;

    const bucketKey = `${row.PoliceStationID}::${row.CrimeMinorHeadID}`;
    const bucket = windows[windowIndex].get(bucketKey) ?? { count: 0, heinous: 0 };
    bucket.count += 1;
    if (row.isHeinous) bucket.heinous += 1;
    windows[windowIndex].set(bucketKey, bucket);
  }

  return windows;
}

/**
 * Trains on (window t-2, window t-1) -> actual(window t) triples across every
 * historical window, then predicts (window N-2, window N-1) -> window N+1 —
 * i.e. forecasts the upcoming quarter from the two most recent ones.
 */
export function predictNextQuarterCounts(rows) {
  const windows = buildWindows(rows);
  const allBucketKeys = new Set();
  for (const w of windows) for (const key of w.keys()) allBucketKeys.add(key);

  const trainX = [];
  const trainY = [];
  for (let t = 2; t < WINDOW_COUNT; t++) {
    for (const key of allBucketKeys) {
      const prior2 = windows[t - 2].get(key) ?? { count: 0, heinous: 0 };
      const prior1 = windows[t - 1].get(key) ?? { count: 0, heinous: 0 };
      const actual = windows[t].get(key) ?? { count: 0, heinous: 0 };
      trainX.push(featureRow(prior2, prior1));
      trainY.push(actual.count);
    }
  }

  // Too little history (e.g. a freshly seeded/small dataset) to fit a model
  // meaningfully — callers fall back to treating the latest window as-is.
  if (trainX.length < 20) return new Map();

  // Note (verified against synthetic data, see git history): tree-based
  // regressors predict via leaf averages, so they interpolate within the
  // range of training targets rather than extrapolate beyond it — a sharply
  // accelerating trend will be under-predicted. Acceptable for a "which
  // buckets are trending up" signal; would need a different model family if
  // precise magnitude on fast-accelerating trends mattered.

  const model = new RandomForestRegression({
    seed: 42,
    nEstimators: 50,
    maxFeatures: 0.8,
    replacement: true,
  });
  model.train(trainX, trainY);

  const predictions = new Map();
  const lastX = [];
  const keys = [];
  for (const key of allBucketKeys) {
    const prior2 = windows[WINDOW_COUNT - 2].get(key) ?? { count: 0, heinous: 0 };
    const prior1 = windows[WINDOW_COUNT - 1].get(key) ?? { count: 0, heinous: 0 };
    lastX.push(featureRow(prior2, prior1));
    keys.push(key);
  }
  if (lastX.length === 0) return predictions;

  const predicted = model.predict(lastX);
  keys.forEach((key, i) => predictions.set(key, Math.max(0, predicted[i])));
  return predictions;
}

function featureRow(prior2, prior1) {
  const heinousFraction1 = prior1.count > 0 ? prior1.heinous / prior1.count : 0;
  return [prior2.count, prior1.count, prior1.count - prior2.count, heinousFraction1];
}
