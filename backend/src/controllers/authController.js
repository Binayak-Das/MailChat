import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendPasswordResetOtpEmail, sendTwoFactorOtpEmail } from '../utils/emailService.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const formatUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'active',
  avatar: user.avatar,
  googleId: user.googleId || null,
  authProvider: user.authProvider || 'local',
  twoFactorEnabled: !!user.twoFactorEnabled,
  twoFactorMethod: user.twoFactorMethod || 'email',
  isOnline: !!user.isOnline,
  lastSeen: user.lastSeen || user.updatedAt,
  contacts: user.contacts || [],
  blockedUsers: user.blockedUsers || [],
  createdAt: user.createdAt
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'pending',
      status: 'active',
      authProvider: 'local',
      twoFactorEnabled: false,
      isOnline: false,
      lastSeen: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('user_registered', formatUser(user));
    }

    return res.status(201).json({
      success: true,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact support.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.twoFactorEnabled) {
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

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful! Welcome back.',
      token,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during authentication'
    });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential, idToken, googleUser } = req.body;
    let payload = null;

    if (credential || idToken) {
      const rawToken = credential || idToken;
      const googleClientId = process.env.GOOGLE_CLIENT_ID;

      if (googleClientId) {
        try {
          const client = new OAuth2Client(googleClientId);
          const ticket = await client.verifyIdToken({
            idToken: rawToken,
            audience: googleClientId,
          });
          payload = ticket.getPayload();
        } catch (verErr) {
          console.warn('Google client verification notice:', verErr.message);
          payload = jwt.decode(rawToken);
        }
      } else {
        payload = jwt.decode(rawToken);
      }
    } else if (googleUser && googleUser.email) {
      payload = {
        sub: googleUser.id || googleUser.sub || `google_${Date.now()}`,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture || googleUser.avatar
      };
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to verify Google identity. Please try again.'
      });
    }

    const cleanEmail = payload.email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail }).select('+password');

    if (user) {
      if (user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator. Please contact support.'
        });
      }

      let updated = false;
      if (!user.googleId && payload.sub) {
        user.googleId = payload.sub;
        updated = true;
      }
      if (!user.avatar && payload.picture) {
        user.avatar = payload.picture;
        updated = true;
      }
      if (user.authProvider !== 'google' && !user.password) {
        user.authProvider = 'google';
        updated = true;
      }
      if (updated) {
        await user.save();
      }

      if (user.twoFactorEnabled) {
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

        await sendTwoFactorOtpEmail(user.email, otp, 'Google Sign-In Verification');

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

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        message: 'Google Sign-In successful!',
        token,
        user: formatUser(user)
      });
    } else {

      const newUser = await User.create({
        name: payload.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: payload.picture || '',
        googleId: payload.sub || null,
        authProvider: 'google',
        role: 'user',
        status: 'active',
        twoFactorEnabled: false,
        isOnline: true,
        lastSeen: new Date()
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('user_registered', formatUser(newUser));
        io.emit('new_user', formatUser(newUser));
      }

      const token = generateToken(newUser._id);

      return res.status(201).json({
        success: true,
        message: 'Account created with Google!',
        token,
        user: formatUser(newUser)
      });
    }
  } catch (error) {
    console.error('Google Auth Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during Google authentication'
    });
  }
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

    const user = userId ? await User.findById(userId) : await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

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
    const user = await User.findOne({ email: cleanEmail });
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
    const user = await User.findById(req.user._id);
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

    const user = await User.findById(req.user._id);
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

    user.twoFactorEnabled = true;
    await user.save();

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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.twoFactorEnabled = false;
    await user.save();

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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      twoFactorEnabled: !!user.twoFactorEnabled
    });
  } catch (error) {
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
          User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).exec();
        } else {
          verifiedOnlineUserIds.push(userId);
        }
      }
    }

    const allUsers = await User.find().select('_id isOnline lastSeen updatedAt');
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
    const user = await User.findById(req.user.id);
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
  } catch (error) {
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    user.name = name.trim();
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

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

export const getAllUsers = async (req, res) => {
  try {
    const onlineMap = req.app.get('onlineUsers') || new Map();
    const users = await User.find().select('-password').sort({ createdAt: -1 });

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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list'
    });
  }
};

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

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
    const user = await User.findOne({ email: cleanEmail });
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
    const user = await User.findOne({ email: cleanEmail });
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

    const user = await User.findOne({ email: targetEmail }).select('+password');
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

    user.password = newPassword;
    await user.save();

    await Otp.deleteMany({ email: targetEmail });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful! Please sign in with your new password.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating password'
    });
  }
};
