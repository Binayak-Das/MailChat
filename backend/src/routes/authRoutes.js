import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  getAllUsers,
  updateUserRole,
  forgotPassword,
  verifyOtp,
  resetPassword
} from '../controllers/authController.js';
import { protect, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

router.get('/users', protect, authorizeAdmin, getAllUsers);
router.put('/users/:userId/role', protect, authorizeAdmin, updateUserRole);

export default router;
