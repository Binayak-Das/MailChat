import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getIceServers,
  createMeeting,
  getMeetings,
  getMeetingByCode,
  updateMeetingSettings,
  endMeeting,
  shareMeetingToChats
} from '../controllers/meetingController.js';

const router = express.Router();

router.use(protect);

router.get('/ice-servers', getIceServers);
router.post('/', createMeeting);
router.get('/', getMeetings);
router.get('/:code', getMeetingByCode);
router.patch('/:code/settings', updateMeetingSettings);
router.post('/:code/end', endMeeting);
router.post('/:code/share', shareMeetingToChats);

export default router;
