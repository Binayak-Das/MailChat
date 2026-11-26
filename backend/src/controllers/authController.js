import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Otp from '../models/Otp.js';
import { sendPasswordResetOtpEmail, sendTwoFactorOtpEmail } from '../utils/emailService.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';
import { verifyFirebaseIdToken } from '../utils/firebaseAuth.js';
import {
  formatUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  upsertUser,
  updateUser
} from '../utils/userStore.js';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

export const firebaseAuth = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    const { idToken: bodyToken, name, mode, email: bodyEmail } = req.body || {};
    const idToken = bodyToken || headerToken;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required'
      });
    }

    let fbUser;
    try {
      fbUser = await verifyFirebaseIdToken(idToken);
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        message: verifyErr.message || 'Invalid or expired Firebase token'
      });
    }

    const resolvedEmail = fbUser.email || bodyEmail || '';
    if (!resolvedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Firebase account does not have an email address'
      });
    }

    const cleanEmail = resolvedEmail.toLowerCase().trim();
    const isGoogleProvider = fbUser.signInProvider === 'google.com';
    const isAdminEmail = cleanEmail === ADMIN_EMAIL;

    let user = await getUserById(fbUser.uid, idToken);
    if (!user) {
      user = await getUserByEmail(cleanEmail, idToken);
    }

    if (user) {
      if (isGoogleProvider && user.authProvider !== 'google') {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please sign in with your email and password instead.'
        });
      }

      if (user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator. Please contact support.'
        });
      }

      const updates = {};
      if (!user.avatar && fbUser.picture) {
        updates.avatar = fbUser.picture;
      }
      if (name && name.trim() && (!user.name || user.name === cleanEmail.split('@')[0])) {
        updates.name = name.trim();
      }
      if (isAdminEmail && user.role !== 'admin') {
        updates.role = 'admin';
      }
      if (isGoogleProvider && user.authProvider !== 'google') {
        updates.authProvider = 'google';
      }

      if (mode !== 'register' && user.twoFactorEnabled) {
        if (Object.keys(updates).length > 0) {
          user = await upsertUser(user.id, updates, idToken);
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);

        await Otp.deleteMany({ email: cleanEmail, purpose: '2fa_login' });
        await Otp.create({
          email: cleanEmail,
          otp: hashedOtp,
          purpose: '2fa_login',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        await sendTwoFactorOtpEmail(user.email, otp, 'Account Sign-In Verification');

        const tempToken = jwt.sign(
          { id: user._id, email: user.email, purpose: '2fa_login' },
          process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure',
          { expiresIn: '10m' }
        );

        return res.status(200).json({
          success: true,
          require2FA: true,
          email: user.email,
          tempToken,
          message: `Two-factor authentication code sent to ${user.email}.`
        });
      }

      if (mode !== 'register') {
        updates.isOnline = true;
        updates.lastSeen = new Date().toISOString();
      }
      if (Object.keys(updates).length > 0) {
        user = await upsertUser(user.id, updates, idToken);
      }

      return res.status(200).json({
        success: true,
        message: isGoogleProvider ? 'Google Sign-In successful!' : 'Authentication successful! Welcome back.',
        token: idToken,
        user: formatUser(user)
      });
    }

    const newUser = await upsertUser(
      fbUser.uid,
      {
        uid: fbUser.uid,
        name: (name && name.trim()) || fbUser.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        firebaseUid: fbUser.uid,
        avatar: fbUser.picture || '',
        authProvider: isGoogleProvider ? 'google' : 'firebase',
        role: isAdminEmail ? 'admin' : isGoogleProvider ? 'user' : 'pending',
        status: 'active',
        twoFactorEnabled: false,
        isOnline: mode !== 'register',
        lastSeen: new Date().toISOString(),
        contacts: [],
        blockedUsers: []
      },
      idToken
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('user_registered', formatUser(newUser));
      if (isGoogleProvider) {
        io.emit('new_user', formatUser(newUser));
      }
    }

    return res.status(201).json({
      success: true,
      message: isGoogleProvider
        ? 'Account created with Google!'
        : 'Account registered successfully! Please sign in.',
      token: idToken,
      user: formatUser(newUser)
    });
  } catch (error) {
    console.error('Firebase Auth Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during Firebase authentication'
    });
  }
};

export const login = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Direct password login is disabled. Please sign in with Firebase.'
  });
};

export const loginWith2FA = async (req, res) => {
  try {
    const { tempToken, otp, email } = req.body;

    if (!otp || otp.toString().trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the 6-digit verification code'
      });
    }

    let targetEmail = null;
    let userId = null;

    if (tempToken) {
      try {
        const decoded = jwt.verify(
          tempToken,
          process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure'
        );
        if (decoded.purpose !== '2fa_login') {
          return res.status(400).json({
            success: false,
            message: 'Invalid 2FA session token'
          });
        }
        targetEmail = decoded.email;
        userId = decoded.id;
      } catch {
        return res.status(400).json({
          success: false,
          message: '2FA session has expired. Please sign in again.'
        });
      }
    } else if (email) {
      targetEmail = email.toLowerCase().trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing verification credentials'
      });
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: '2fa_login'
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification code not found or expired. Please request a new code.'
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many invalid attempts. Please request a new code.'
      });
    }

    const isMatch = await otpRecord.compareOtp(otp.toString().trim());
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid 2FA code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    let user = userId ? await getUserById(userId) : await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    user = await updateUser(user._id, {
      isOnline: true,
      lastSeen: new Date().toISOString()
    });

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Two-factor verification successful! Welcome back.',
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error verifying 2FA code'
    });
  }
};

export const resend2faLoginOtp = async (req, res) => {
  try {
    const { tempToken, email } = req.body;
    let targetEmail = null;

    if (tempToken) {
      try {
        const decoded = jwt.verify(
          tempToken,
          process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure'
        );
        targetEmail = decoded.email;
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Session expired. Please sign in again.'
        });
      }
    } else if (email) {
      targetEmail = email.toLowerCase().trim();
    }

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await Otp.deleteMany({ email: cleanEmail, purpose: '2fa_login' });
    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      purpose: '2fa_login',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendTwoFactorOtpEmail(user.email, otp, 'Account Sign-In Verification');

    return res.status(200).json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${user.email}.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend verification code'
    });
  }
};

export const send2faSetupOtp = async (req, res) => {
  try {
    const user = await getUserById(req.user._id, req.firebaseToken);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await Otp.deleteMany({ email: user.email, purpose: '2fa_enable' });
    await Otp.create({
      email: user.email,
      otp: hashedOtp,
      purpose: '2fa_enable',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendTwoFactorOtpEmail(user.email, otp, 'Enable Two-Factor Authentication');

    return res.status(200).json({
      success: true,
      message: `A 6-digit confirmation code has been sent to ${user.email}.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send 2FA setup verification code'
    });
  }
};

export const enable2fa = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || otp.toString().trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the 6-digit verification code sent to your email'
      });
    }

    let user = await getUserById(req.user._id, req.firebaseToken);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otpRecord = await Otp.findOne({
      email: user.email,
      purpose: '2fa_enable'
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active verification code found. Please click "Send Verification Code" first.'
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    const isMatch = await otpRecord.compareOtp(otp.toString().trim());
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.'
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    user = await updateUser(user._id, { twoFactorEnabled: true }, req.firebaseToken);

    const io = req.app.get('io');
    if (io) {
      io.emit('user_updated', formatUser(user));
    }

    return res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication is now ENABLED! Your account is protected.',
      twoFactorEnabled: true,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to enable Two-Factor Authentication'
    });
  }
};

export const disable2fa = async (req, res) => {
  try {
    const user = await updateUser(req.user._id, { twoFactorEnabled: false }, req.firebaseToken);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('user_updated', formatUser(user));
    }

    return res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication has been DISABLED.',
      twoFactorEnabled: false,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to disable Two-Factor Authentication'
    });
  }
};

export const get2faStatus = async (req, res) => {
  try {
    const user = await getUserById(req.user._id, req.firebaseToken);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      twoFactorEnabled: !!user.twoFactorEnabled
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve 2FA status'
    });
  }
};

export const getPresenceStatus = async (req, res) => {
  try {
    const io = req.app.get('io');
    const onlineMap = req.app.get('onlineUsers') || new Map();

    const verifiedOnlineUserIds = [];
    if (io) {
      for (const [userId, socketSet] of onlineMap.entries()) {
        for (const socketId of Array.from(socketSet)) {
          const s = io.sockets.sockets.get(socketId);
          if (!s || !s.connected) {
            socketSet.delete(socketId);
          }
        }
        if (socketSet.size === 0) {
          onlineMap.delete(userId);
          updateUser(userId, { isOnline: false, lastSeen: new Date().toISOString() }).catch(() => { });
        } else {
          verifiedOnlineUserIds.push(userId);
        }
      }
    }

    const allUsers = await getAllUsers(req.firebaseToken);
    const userStatuses = {};
    for (const u of allUsers) {
      const uid = u._id.toString();
      const isOnline = verifiedOnlineUserIds.includes(uid);
      userStatuses[uid] = {
        isOnline,
        lastSeen: isOnline ? new Date() : (u.lastSeen || u.updatedAt || new Date())
      };
    }

    return res.status(200).json({
      success: true,
      onlineUsers: verifiedOnlineUserIds,
      userStatuses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch presence status'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.id, req.firebaseToken);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }
    return res.status(200).json({
      success: true,
      user: formatUser(user)
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty'
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 50 characters'
      });
    }

    const updates = { name: name.trim() };
    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    const user = await updateUser(req.user._id, updates, req.firebaseToken);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('user_updated', formatUser(user));
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const onlineMap = req.app.get('onlineUsers') || new Map();
    const users = await getAllUsers(req.firebaseToken);

    const formattedUsers = users.map((u) => {
      const isOnline = onlineMap.has(u._id.toString());
      return {
        ...formatUser(u),
        isOnline,
        lastSeen: isOnline ? new Date() : (u.lastSeen || u.updatedAt)
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list'
    });
  }
};

export { getAllUsersController as getAllUsers };

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin', 'pending'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, admin, or pending'
      });
    }

    const user = await updateUser(userId, { role }, req.firebaseToken);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const io = req.app.get('io');
    if (io) {
      await createNotificationAndEmit(io, {
        userId: user._id,
        title: 'Role Permissions Updated',
        message: `Your account role was changed to "${role}". Your workspace access has been updated.`,
        type: 'role'
      });
      io.emit('user_updated', formatUser(user));
      if (role === 'user' || role === 'admin') {
        io.emit('new_user', formatUser(user));
      }
    }

    return res.status(200).json({
      success: true,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating user role'
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    if (user.authProvider === 'google' || user.googleId) {
      return res.status(400).json({
        success: false,
        isGoogleAccount: true,
        message: 'This account uses Google Sign-In and does not have a password. Please sign in using "Continue with Google".'
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await Otp.deleteMany({ email: cleanEmail, purpose: 'password_reset' });

    await Otp.create({
      email: cleanEmail,
      otp: hashedOtp,
      purpose: 'password_reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendPasswordResetOtpEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}. It is valid for 10 minutes.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error sending password recovery code'
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and the 6-digit verification code'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail);
    if (user && (user.authProvider === 'google' || user.googleId)) {
      return res.status(400).json({
        success: false,
        isGoogleAccount: true,
        message: 'This account uses Google Sign-In and does not have a password. Please sign in using "Continue with Google".'
      });
    }

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: 'password_reset'
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Verification code not found or expired. Please request a new one.'
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      });
    }

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many invalid attempts. Please request a new verification code.'
      });
    }

    const isMatch = await otpRecord.compareOtp(otp);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const resetToken = jwt.sign(
      { email: cleanEmail, purpose: 'password_reset' },
      process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure',
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully. You may now enter your new password.',
      resetToken
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error verifying OTP'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, resetToken, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    let targetEmail = null;

    if (resetToken) {
      try {
        const decoded = jwt.verify(
          resetToken,
          process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure'
        );
        if (decoded.purpose !== 'password_reset') {
          return res.status(400).json({
            success: false,
            message: 'Invalid reset token'
          });
        }
        targetEmail = decoded.email;
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Reset token has expired or is invalid. Please request a new OTP.'
        });
      }
    } else if (email && otp) {
      const cleanEmail = email.toLowerCase().trim();
      const otpRecord = await Otp.findOne({ email: cleanEmail, purpose: 'password_reset' });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Verification code expired or not found. Please request a new code.'
        });
      }

      const isMatch = await otpRecord.compareOtp(otp);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }
      targetEmail = cleanEmail;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a valid resetToken or email and verification code'
      });
    }

    const user = await getUserByEmail(targetEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    if (user.authProvider === 'google' || user.googleId) {
      return res.status(400).json({
        success: false,
        isGoogleAccount: true,
        message: 'This account uses Google Sign-In and does not have a password. Please sign in using "Continue with Google".'
      });
    }

    await Otp.deleteMany({ email: targetEmail });

    return res.status(200).json({
      success: true,
      message: 'Password reset verified! Please sign in with your new password.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating password'
    });
  }
};
