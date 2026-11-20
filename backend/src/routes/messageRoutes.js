import express from 'express';
import {
  sendMessage,
  allMessages,
  editMessage,
  deleteMessage,
  forwardMessage,
  markMessagesRead,
  markMessagesDelivered,
  toggleReaction
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', sendMessage);
router.get('/:chatId', allMessages);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/forward', forwardMessage);
router.post('/read', markMessagesRead);
router.post('/delivered', markMessagesDelivered);
router.post('/:messageId/reaction', toggleReaction);

export default router;
