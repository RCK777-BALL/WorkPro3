import predictiveService from '../utils/predictiveService';
export const getPredictions = async (req, res, next) => {
    try {
        const results = await predictiveService.getPredictions(req.tenantId);
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
export const getTrend = async (req, res, next) => {
    try {
        const trend = await predictiveService.getPredictionTrend(req.params.assetId, req.params.metric, req.tenantId);
        res.json(trend);
    }
    catch (err) {
        next(err);
    }
};
