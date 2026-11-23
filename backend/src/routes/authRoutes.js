import express from 'express';
import {
  register,
  login,
  googleAuth,
  loginWith2FA,
  resend2faLoginOtp,
  send2faSetupOtp,
  enable2fa,
  disable2fa,
  get2faStatus,
  getPresenceStatus,
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
router.post('/google', googleAuth);
router.post('/login-2fa', loginWith2FA);
router.post('/2fa/resend-login-otp', resend2faLoginOtp);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// 2FA Routes (Protected)
router.get('/2fa/status', protect, get2faStatus);
router.post('/2fa/send-setup-otp', protect, send2faSetupOtp);
router.post('/2fa/enable', protect, enable2fa);
router.post('/2fa/disable', protect, disable2fa);

// Strict Real-Time Presence Route
router.get('/presence', protect, getPresenceStatus);

// Admin Routes
router.get('/users', protect, authorizeAdmin, getAllUsers);
router.put('/users/:userId/role', protect, authorizeAdmin, updateUserRole);

export default router;
