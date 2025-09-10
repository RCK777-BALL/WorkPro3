import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

 export const getTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {

    const { user } = req as Request;
 
    const { theme = 'system', colorScheme = 'default' } = (user ?? {}) as {
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    };

    res.json({ theme, colorScheme });
  } catch (err) {
    next(err);
  }
};

 export const updateTheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { theme, colorScheme } = req.body;

    const { user } = req as Request;
     const updated = await User.findByIdAndUpdate(
      user!._id,
      { theme, colorScheme },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ theme: updated.theme, colorScheme: updated.colorScheme });
  } catch (err) {
    next(err);
  }
};
