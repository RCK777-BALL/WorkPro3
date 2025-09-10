import User from '../models/User';
import { filterFields } from '../utils/filterFields';
import { Request, Response, NextFunction } from 'express';

const userCreateFields = [
  'name',
  'email',
  'passwordHash',
  'role',
  'employeeId',
  'managerId',
  'theme',
  'colorScheme',
  'mfaEnabled',
  'mfaSecret',
];

const userUpdateFields = [...userCreateFields];

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Retrieve all users
 *     responses:
 *       200:
 *         description: List of users
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const items = await User.find({ tenantId }).select('-passwordHash');
    res.json(items);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const item = await User.findOne({ _id: req.params.id, tenantId }).select('-passwordHash');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: User created
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const payload = filterFields(req.body, userCreateFields);
    const newItem = new User({ ...payload, tenantId });
    const saved = await newItem.save();
    const { passwordHash: _pw, ...safeUser } = saved.toObject();
    res.status(201).json(safeUser);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const update = filterFields(req.body, userUpdateFields);
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      update,
      {
        new: true,
        runValidators: true,
      }
    ).select('-passwordHash');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deletion successful
 *       404:
 *         description: User not found
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' });
    const deleted = await User.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users/{id}/theme:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get a user's theme preference
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Theme preference
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export const getUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    if (req.params.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findById(req.params.id).select('theme');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ theme: user.theme ?? 'system' });
  } catch (err) {
    next(err);
  }
};

/**
 * @openapi
 * /api/users/{id}/theme:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update a user's theme preference
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *     responses:
 *       200:
 *         description: Theme updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
export const updateUserTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.user as any)?._id ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    if (req.params.id !== userId && req.user?.role !== 'admin') {
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
