import Video from '../models/Video';
export const getAllVideos = async (req, res, next) => {
    try {
        const items = await Video.find();
        res.json(items);
    }
    catch (err) {
        next(err);
    }
};
export const getVideoById = async (req, res, next) => {
    try {
        const item = await Video.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: 'Not found' });
        res.json(item);
    }
    catch (err) {
        next(err);
    }
};
export const createVideo = async (req, res, next) => {
    try {
        const newItem = new Video(req.body);
        const saved = await newItem.save();
        res.status(201).json(saved);
    }
    catch (err) {
        next(err);
    }
};
export const updateVideo = async (req, res, next) => {
    try {
        const updated = await Video.findByIdAndUpdate(req.params.id, req.body, {
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
export const deleteVideo = async (req, res, next) => {
    try {
        const deleted = await Video.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    }
    catch (err) {
        next(err);
    }
};
