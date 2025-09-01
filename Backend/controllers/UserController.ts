import { AuthedRequest } from '../types/AuthedRequest';
import { AuthedRequestHandler } from '../types/AuthedRequestHandler';
import User from '../models/User';

export const getAllUsers: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const items = await User.find({ tenantId: req.tenantId }).select('-password');
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getUserById: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const item = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('-password');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createUser: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const newItem = new User({ ...req.body, tenantId: req.tenantId });
    const saved = await newItem.save();
    const { password: _pw, ...safeUser } = saved.toObject();
    res.status(201).json(safeUser);
  } catch (err) {
    next(err);
  }
};

export const updateUser: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteUser: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const deleted = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getUserTheme: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    if (req.params.id !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findById(req.params.id).select('theme');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ theme: user.theme ?? 'system' });
  } catch (err) {
    next(err);
  }
};

export const updateUserTheme: AuthedRequestHandler = async (
  req,
  res,
  next
) => {
  try {
    if (req.params.id !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({ message: 'Invalid theme' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { new: true }
    ).select('theme');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ theme: user.theme });
  } catch (err) {
    next(err);
  }
};
