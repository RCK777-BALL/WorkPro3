/**
 * Factory for permission-based authorization middleware.
 * Ensures the authenticated user has all required permissions
 * before allowing the request to proceed.
 */
export const authorize = (...required) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userPerms = req.user.permissions || [];
        // Determine which permissions from `required` are not present on the
        // authenticated user. Using a list allows callers or tests to inspect
        // which permissions were missing when access is denied.
        const missing = required.filter((p) => !userPerms.includes(p));
        if (missing.length > 0) {
            res.status(403).json({ message: 'Forbidden', missing });
            return;
        }
        next();
    };
};
export default authorize;
