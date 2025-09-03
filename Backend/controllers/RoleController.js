import Role from '../models/Role';
export const getAllRoles = async (_req, res, next) => {
    try {
        const roles = await Role.find();
        res.json(roles);
    }
    catch (err) {
        next(err);
    }
};
export const getRoleById = async (req, res, next) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role)
            return res.status(404).json({ message: 'Not found' });
        res.json(role);
    }
    catch (err) {
        next(err);
    }
};
export const createRole = async (req, res, next) => {
    try {
        const role = await Role.create(req.body);
        res.status(201).json(role);
    }
    catch (err) {
        next(err);
    }
};
export const updateRole = async (req, res, next) => {
    try {
        const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!role)
            return res.status(404).json({ message: 'Not found' });
        res.json(role);
    }
    catch (err) {
        next(err);
    }
};
export const deleteRole = async (req, res, next) => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id);
        if (!role)
            return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
