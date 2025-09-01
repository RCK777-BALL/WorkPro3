import Asset from '../models/Asset';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notification';

export interface PredictionResult {
  asset: string;
  predictedValue: number;
  probability: number;
}

const SENSOR_LIMIT = 100; // value where probability=1
const FAILURE_THRESHOLD = 0.6; // notify if probability exceeds

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

export async function predictForAsset(
  assetId: string,
  tenantId: string
): Promise<PredictionResult | null> {
  const readings = await SensorReading.find({ asset: assetId, tenantId })
    .sort({ timestamp: 1 })
    .limit(20);
  if (readings.length < 2) return null;
  const values = readings.map((r) => r.value);
  const predictedValue = linearForecast(values);
  const probability = Math.max(0, Math.min(1, predictedValue / SENSOR_LIMIT));

  const asset = await Asset.findById(assetId).lean();

  if (probability > FAILURE_THRESHOLD && asset?.tenantId) {
    await Notification.create({
      tenantId: asset.tenantId,
      message: `Asset ${assetId} predicted failure probability ${(probability * 100).toFixed(1)}%`,
    });
  }

  return { asset: assetId, predictedValue, probability };
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

export default { getPredictions, predictForAsset };
