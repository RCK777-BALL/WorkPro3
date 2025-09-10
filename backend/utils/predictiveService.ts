import Asset from '../models/Asset';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notifications';
import Prediction from '../models/Prediction';
import config from '../config/default';
import ArimaLib from 'arima';

// The ARIMA library is a regular dependency. If it's unavailable, the
// fallback logic in `arimaForecast` will handle forecasting without it.

export interface PredictionTrend {
  timestamp: Date;
  predictedValue: number;
}

export interface PredictionResult {
  asset: string;
  metric: string;
  predictedValue: number;
  probability: number;
  lowerBound: number;
  upperBound: number;
  trend: PredictionTrend[];
}

const SENSOR_LIMIT = 100; // value where probability=1
const FAILURE_THRESHOLD = 0.6; // notify if probability exceeds

function getModel(): string {
  return (
    process.env.PREDICTIVE_MODEL || config.predictive?.model || 'linear'
  );
}

function linearForecast(values: number[]): number {
  const n = values.length;
  const x = values.map((_, i) => i + 1);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, idx) => a + xi * values[idx], 0);
  const sumXX = x.reduce((a, xi) => a + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const nextX = n + 1;
  return slope * nextX + intercept;
}

function arimaForecast(values: number[]): number {
  if (ArimaLib) {
    const model = new ArimaLib({ p: 1, d: 1, q: 0 }).train(values);
    const [pred] = model.predict(1);
    return Array.isArray(pred) ? pred[0] : pred;
  }
  // Fallback: simple average differencing when library is unavailable
  if (values.length < 2) return values[values.length - 1] || 0;
  const diffs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return values[values.length - 1] + avgDiff;
}

function computeStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

interface MetricSeries {
  metric: string;
  values: number[];
}

interface MetricFeatures {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  last: number;
  rollingMean: number;
  rollingStdDev: number;
  slope: number;
  ema: number;
  lastDiff: number;
  limitRatio: number;
  range: number;
}

function engineerFeatures(
  series: MetricSeries[],
  windowSize = 5
): Record<string, MetricFeatures> {
  const features: Record<string, MetricFeatures> = {};
  for (const s of series) {
    const values = s.values;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = computeStdDev(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const last = values[values.length - 1];
    const prev = values[values.length - 2] ?? last;
    const window = values.slice(-windowSize);
    const rollingMean =
      window.reduce((a, b) => a + b, 0) / (window.length || 1);
    const rollingStdDev = computeStdDev(window);

    // Exponential moving average as a smoother trend indicator
    let ema = values[0];
    const alpha = 2 / (windowSize + 1);
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }

    // Linear regression slope as trend indicator
    const n = values.length;
    const x = values.map((_, i) => i + 1);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, idx) => a + xi * values[idx], 0);
    const sumXX = x.reduce((a, xi) => a + xi * xi, 0);
    const slope =
      (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    features[s.metric] = {
      mean,
      stdDev,
      min,
      max,
      last,
      rollingMean,
      rollingStdDev,
      slope,
      ema,
      lastDiff: last - prev,
      limitRatio: last / SENSOR_LIMIT,
      range: max - min,
    };
  }
  return features;
}

function forecast(values: number[], feat?: MetricFeatures): number {
  let prediction =
    getModel() === 'arima' ? arimaForecast(values) : linearForecast(values);
  if (feat) {
    // Adjust prediction using engineered features
    prediction += feat.slope * 0.05;
    prediction += (feat.last - feat.rollingMean) * 0.1;
    prediction += feat.lastDiff * 0.05;
    prediction += (feat.ema - feat.mean) * 0.3;
    prediction += (feat.limitRatio - 0.5) * SENSOR_LIMIT * 0.02;
  }
  return prediction;
}

export async function predictForAsset(
  assetId: string,
  tenantId: string
): Promise<PredictionResult[]> {
  const readings = await SensorReading.find({ asset: assetId, tenantId })
    .sort({ timestamp: 1 })
    .limit(50);
  if (readings.length < 2) return [];

  const metricMap = new Map<string, number[]>();
  for (const r of readings) {
    if (!metricMap.has(r.metric)) metricMap.set(r.metric, []);
    metricMap.get(r.metric)!.push(r.value);
  }
  const series: MetricSeries[] = Array.from(metricMap.entries()).map(
    ([metric, values]) => ({ metric, values })
  );
  const featureMap = engineerFeatures(series);

  const asset = await Asset.findById(assetId).lean();
  const results: PredictionResult[] = [];

  for (const { metric, values } of series) {
    const predictedValue = forecast(values, featureMap[metric]);
    const probability = Math.max(0, Math.min(1, predictedValue / SENSOR_LIMIT));
    const stdDev = computeStdDev(values);
    const margin = 1.96 * stdDev;
    const lowerBound = predictedValue - margin;
    const upperBound = predictedValue + margin;

    await Prediction.create({
      asset: assetId,
      metric,
      predictedValue,
      lowerBound,
      upperBound,
      tenantId,
    });

    if (probability > FAILURE_THRESHOLD && asset?.tenantId) {
      await Notification.create({
        tenantId: asset.tenantId,
        message: `Asset ${assetId} predicted failure probability ${(probability * 100).toFixed(
          1
        )}% for metric ${metric}`,
      });
    }

    const trendDocs = await Prediction.find({ asset: assetId, metric, tenantId })
      .sort({ timestamp: -1 })
      .limit(10);
    const trend = trendDocs
      .reverse()
      .map((p) => ({ timestamp: p.timestamp, predictedValue: p.predictedValue }));

    results.push({
      asset: assetId,
      metric,
      predictedValue,
      probability,
      lowerBound,
      upperBound,
      trend,
    });
  }

  return results;
}

export async function getPredictions(tenantId: string): Promise<PredictionResult[]> {
  const assets = await Asset.find({ tenantId });
  const results: PredictionResult[] = [];
  for (const asset of assets) {
    const preds = await predictForAsset(asset._id.toString(), tenantId);
    results.push(...preds);
  }
  return results;
}

export async function getPredictionTrend(
  assetId: string,
  metric: string,
  tenantId: string
): Promise<PredictionTrend[]> {
  const trendDocs = await Prediction.find({ asset: assetId, metric, tenantId })
    .sort({ timestamp: 1 })
    .limit(50);
  return trendDocs.map((p) => ({
    timestamp: p.timestamp,
    predictedValue: p.predictedValue,
  }));
}

export default { getPredictions, predictForAsset, getPredictionTrend };
