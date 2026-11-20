import express from 'express';
import {
  getPlatformActivity,
  deleteUser,
  toggleUserBan
} from '../controllers/adminController.js';
import { protect, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeAdmin);

router.get('/activity', getPlatformActivity);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/status', toggleUserBan);

export default router;
