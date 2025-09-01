import express from 'express';
import {
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
} from '../controllers/VideoController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllVideos);
router.get('/:id', getVideoById);
router.post('/', createVideo);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);

export default router;
