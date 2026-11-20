import express from 'express';
import {
  getContacts,
  addContact,
  removeContact,
  searchContacts,
  getBlockedUsers,
  blockUser,
  unblockUser
} from '../controllers/contactController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getContacts)
  .post(addContact);

router.delete('/:userId', removeContact);
router.get('/search', searchContacts);
router.get('/blocked', getBlockedUsers);
router.post('/block', blockUser);
router.post('/unblock', unblockUser);

export default router;
