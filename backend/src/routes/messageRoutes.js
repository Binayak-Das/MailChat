import express from 'express';
import {
  sendMessage,
  allMessages,
  toggleReaction
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', sendMessage);
router.get('/:chatId', allMessages);
router.post('/:messageId/reaction', toggleReaction);

export default router;
