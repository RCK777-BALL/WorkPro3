import Asset from '../models/Asset';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notification';
import Prediction from '../models/Prediction';

export interface PredictionTrend {
  timestamp: Date;
  predictedValue: number;
}

export interface PredictionResult {
  asset: string;
  predictedValue: number;
  probability: number;
  lowerBound: number;
  upperBound: number;
  trend: PredictionTrend[];
}

const SENSOR_LIMIT = 100; // value where probability=1
const FAILURE_THRESHOLD = 0.6; // notify if probability exceeds
const MODEL = process.env.PREDICTIVE_MODEL || 'linear';

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
  // Very small ARIMA(1,1,0) style forecast using average differencing
  if (values.length < 2) return values[values.length - 1] || 0;
  const diffs = [] as number[];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return values[values.length - 1] + avgDiff;
}

function computeStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

interface MetricSeries {
  metric: string;
  values: number[];
}

function engineerFeatures(series: MetricSeries[]): number[] {
  const features: number[] = [];
  for (const s of series) {
    const mean = s.values.reduce((a, b) => a + b, 0) / s.values.length;
    const last = s.values[s.values.length - 1];
    features.push(mean, last);
  }
  return features;
}

function forecast(values: number[]): number {
  return MODEL === 'arima' ? arimaForecast(values) : linearForecast(values);
}

export async function predictForAsset(
  assetId: string,
  tenantId: string
): Promise<PredictionResult | null> {
  const readings = await SensorReading.find({ asset: assetId, tenantId })
    .sort({ timestamp: 1 })
    .limit(50);
  if (readings.length < 2) return null;

  const metricMap = new Map<string, number[]>();
  for (const r of readings) {
    if (!metricMap.has(r.metric)) metricMap.set(r.metric, []);
    metricMap.get(r.metric)!.push(r.value);
  }
  const series: MetricSeries[] = Array.from(metricMap.entries()).map(
    ([metric, values]) => ({ metric, values })
  );
  engineerFeatures(series); // currently unused but placeholder for future models

  const primary = series[0];
  const predictedValue = forecast(primary.values);
  const probability = Math.max(0, Math.min(1, predictedValue / SENSOR_LIMIT));
  const stdDev = computeStdDev(primary.values);
  const margin = 1.96 * stdDev;
  const lowerBound = predictedValue - margin;
  const upperBound = predictedValue + margin;

  await Prediction.create({
    asset: assetId,
    metric: primary.metric,
    predictedValue,
    lowerBound,
    upperBound,
    tenantId,
  });

  const asset = await Asset.findById(assetId).lean();

  if (probability > FAILURE_THRESHOLD && asset?.tenantId) {
    await Notification.create({
      tenantId: asset.tenantId,
      message: `Asset ${assetId} predicted failure probability ${(probability * 100).toFixed(
        1
      )}%`,
    });
  }

  const trendDocs = await Prediction.find({ asset: assetId, tenantId })
    .sort({ timestamp: -1 })
    .limit(10);
  const trend = trendDocs
    .reverse()
    .map((p) => ({ timestamp: p.timestamp, predictedValue: p.predictedValue }));

  return { asset: assetId, predictedValue, probability, lowerBound, upperBound, trend };
}

export async function getPredictions(tenantId: string): Promise<PredictionResult[]> {
  const assets = await Asset.find({ tenantId });
  const results: PredictionResult[] = [];
  for (const asset of assets) {
    const p = await predictForAsset(asset._id.toString(), tenantId);
    if (p) results.push(p);
  }
  return results;
}

export async function getPredictionTrend(
  assetId: string,
  tenantId: string
): Promise<PredictionTrend[]> {
  const trendDocs = await Prediction.find({ asset: assetId, tenantId })
    .sort({ timestamp: 1 })
    .limit(50);
  return trendDocs.map((p) => ({
    timestamp: p.timestamp,
    predictedValue: p.predictedValue,
  }));
}

export default { getPredictions, predictForAsset, getPredictionTrend };
