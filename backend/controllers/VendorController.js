import Vendor from '../models/Vendor';
export const getAllVendors = async (req, res, next) => {
    try {
        const items = await Vendor.find();
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
export const getVendorById = async (req, res, next) => {
    try {
        const item = await Vendor.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: 'Not found' });
        res.json(item);
    }
    catch (err) {
        next(err);
    }
};
export const createVendor = async (req, res, next) => {
    try {
        const newItem = new Vendor(req.body);
        const saved = await newItem.save();
        res.status(201).json(saved);
    }
    catch (err) {
        next(err);
    }
};
export const updateVendor = async (req, res, next) => {
    try {
        const updated = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated)
            return res.status(404).json({ message: 'Not found' });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
};
export const deleteVendor = async (req, res, next) => {
    try {
        const deleted = await Vendor.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
