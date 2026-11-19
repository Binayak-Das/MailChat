import express from 'express';
import {
  sendEmail,
  getEmails,
  getEmailThread,
  deleteEmail,
  restoreEmail,
  emptyTrash,
  toggleStarEmail,
  markEmailRead,
  checkRecipient
} from '../controllers/emailController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/send', sendEmail);
router.get('/', getEmails);
router.get('/check-recipient', checkRecipient);
router.get('/:id/thread', getEmailThread);
router.delete('/trash/empty', emptyTrash);
router.delete('/:id', deleteEmail);
router.patch('/:id/restore', restoreEmail);
router.patch('/:id/star', toggleStarEmail);
router.patch('/:id/read', markEmailRead);

export default router;
