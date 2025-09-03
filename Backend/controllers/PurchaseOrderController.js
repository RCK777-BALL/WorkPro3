import PurchaseOrder from '../models/PurchaseOrder';
export const createPurchaseOrder = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const po = await PurchaseOrder.create({
            ...req.body,
            ...(tenantId ? { tenantId } : {}),
        });
        res.status(201).json(po);
    }
    catch (err) {
        next(err);
    }
};
export const getPurchaseOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const po = await PurchaseOrder.findById(id).lean();
        if (!po)
            return res.status(404).json({ message: 'Not found' });
        res.json(po);
    }
    catch (err) {
        next(err);
    }
};
export const listVendorPurchaseOrders = async (req, res, next) => {
    try {
        const vendorId = req.vendorId;
        const pos = await PurchaseOrder.find({ vendor: vendorId }).lean();
        res.json(pos);
    }
    catch (err) {
        next(err);
    }
};
export const updateVendorPurchaseOrder = async (req, res, next) => {
    try {
        const vendorId = req.vendorId;
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ['acknowledged', 'shipped'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const po = await PurchaseOrder.findById(id);
        if (!po)
            return res.status(404).json({ message: 'Not found' });
        if (po.vendor.toString() !== vendorId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        po.status = status;
        await po.save();
        res.json(po);
    }
    catch (err) {
        next(err);
    }
};
