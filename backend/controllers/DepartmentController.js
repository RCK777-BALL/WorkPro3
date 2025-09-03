import Department from '../models/Department';
import logger from '../utils/logger';
export const getAllDepartments = async (req, res, next) => {
    try {
        const items = await Department.find({ tenantId: req.tenantId });
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
export const getDepartmentById = async (req, res, next) => {
    try {
        const item = await Department.findOne({
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
export const createDepartment = async (req, res, next) => {
    try {
        logger.info('Create department payload:', req.body);
        const tenantId = req.tenantId;
        const payload = {
            ...req.body,
            tenantId,
            lines: req.body.lines?.map((line) => ({
                ...line,
                tenantId,
                stations: line.stations?.map((station) => ({
                    ...station,
                    tenantId,
                })) ?? [],
            })) ?? [],
        };
        const newItem = new Department(payload);
        const saved = await newItem.save();
        res.status(201).json(saved);
    }
    catch (err) {
        logger.error('Error saving department:', err);
        next(err);
    }
};
export const updateDepartment = async (req, res, next) => {
    try {
        logger.info('Update department payload:', req.body);
        const tenantId = req.tenantId;
        const updatePayload = {
            ...req.body,
            tenantId,
            lines: req.body.lines?.map((line) => ({
                ...line,
                tenantId,
                stations: line.stations?.map((station) => ({
                    ...station,
                    tenantId,
                })) ?? [],
            })) ?? undefined,
        };
        const updated = await Department.findOneAndUpdate({ _id: req.params.id, tenantId }, updatePayload, {
            new: true,
            runValidators: true,
        });
        if (!updated)
            return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    }
    catch (err) {
        logger.error('Error updating department:', err);
        next(err);
    }
};
export const deleteDepartment = async (req, res, next) => {
    try {
        const deleted = await Department.findOneAndDelete({
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
export const getDepartmentHierarchy = async (req, res, next) => {
    try {
        const department = await Department.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
        });
        if (!department)
            return res.status(404).json({ message: 'Not found' });
        res.json(department);
    }
    catch (err) {
        next(err);
    }
};
