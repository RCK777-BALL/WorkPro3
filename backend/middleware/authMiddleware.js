import jwt from 'jsonwebtoken';
import User from '../models/User';
import Role from '../models/Role';
/**
 * Authenticate requests using a JWT token. The token may be provided
 * in the `Authorization` header as a Bearer token or via the
 * `token` cookie. When valid, the corresponding user document is
 * loaded and attached to `req.user`.
 */
export const requireAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.token;
        const authHeader = req.headers.authorization;
        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        if (!id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User.findById(id).lean().exec();
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const role = await Role.findOne({ name: user.role }).lean();
        const permissions = role?.permissions ?? [];
        const tenantId = user.tenantId.toString();
        req.user = { ...user, tenantId, permissions };
        req.tenantId = tenantId;
        next();
    }
    catch (_err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
export default {
    requireAuth,
};
