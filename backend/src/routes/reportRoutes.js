import express from 'express';
import {
  createReport,
  getAllReports,
  updateReportStatus
} from '../controllers/reportController.js';
import { protect, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createReport);
router.get('/', protect, authorizeAdmin, getAllReports);
router.put('/:reportId', protect, authorizeAdmin, updateReportStatus);

export default router;
