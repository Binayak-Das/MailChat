import express from 'express';
import {
  accessChat,
  fetchChats,
  getChatUsers,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(accessChat)
  .get(fetchChats);

router.get('/users', getChatUsers);
router.post('/group', createGroupChat);
router.put('/group/rename', renameGroup);
router.put('/group/add', addToGroup);
router.put('/group/remove', removeFromGroup);

export default router;
