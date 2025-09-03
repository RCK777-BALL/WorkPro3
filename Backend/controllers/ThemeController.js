import User from '../models/User';
export const getTheme = async (req, res, next) => {
    try {
        const { user } = req;
        const { theme = 'system', colorScheme = 'default' } = user;
        res.json({ theme, colorScheme });
    }
    catch (err) {
        next(err);
    }
};
export const updateTheme = async (req, res, next) => {
    try {
        const { theme, colorScheme } = req.body;
        const { user } = req;
        const updated = await User.findByIdAndUpdate(user._id, { theme, colorScheme }, { new: true, runValidators: true });
        if (!updated)
            return res.status(404).json({ message: 'Not found' });
        res.json({ theme: updated.theme, colorScheme: updated.colorScheme });
    }
    catch (err) {
        next(err);
    }
};
