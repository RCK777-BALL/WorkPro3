import ConditionRule from '../models/ConditionRule';
export const getAllConditionRules = async (req, res, next) => {
    try {
        const items = await ConditionRule.find({ tenantId: req.tenantId });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
export const getConditionRuleById = async (req, res, next) => {
    try {
        const item = await ConditionRule.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
        });
        if (!item)
            return res.status(404).json({ message: 'Not found' });
        res.json(item);
    }
    catch (err) {
        next(err);
    }
};
export const createConditionRule = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const newItem = new ConditionRule({ ...req.body, tenantId });
        const saved = await newItem.save();
        res.status(201).json(saved);
    }
    catch (err) {
        next(err);
    }
};
export const updateConditionRule = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const updated = await ConditionRule.findOneAndUpdate({ _id: req.params.id, tenantId }, { ...req.body, tenantId }, { new: true, runValidators: true });
        if (!updated)
            return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
};
export const deleteConditionRule = async (req, res, next) => {
    try {
        const deleted = await ConditionRule.findOneAndDelete({
            _id: req.params.id,
            tenantId: req.tenantId,
        });
        if (!deleted)
            return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
