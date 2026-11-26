import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../utils/firebaseAuth.js';
import { getUserById, getUserByEmail, upsertUser } from '../utils/userStore.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];

    // 1. Try verifying as a Firebase ID Token
    try {
      const fbUser = await verifyFirebaseIdToken(token);
      let user = await getUserById(fbUser.uid, token);

      if (!user && fbUser.email) {
        user = await getUserByEmail(fbUser.email, token);
      }

      if (!user && fbUser.email) {
        const isGoogle = fbUser.signInProvider === 'google.com';
        user = await upsertUser(
          fbUser.uid,
          {
            uid: fbUser.uid,
            name: fbUser.name || fbUser.email.split('@')[0],
            email: fbUser.email.toLowerCase().trim(),
            avatar: fbUser.picture || '',
            authProvider: isGoogle ? 'google' : 'firebase',
            role: isGoogle ? 'user' : 'pending',
            status: 'active'
          },
          token
        );
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account not found. Please sign in again.'
        });
      }

      if (user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator.'
        });
      }

      req.user = user;
      req.firebaseUser = fbUser;
      req.firebaseToken = token;
      return next();
    } catch {
      // Not a valid Firebase ID token; fall back to backend JWT (used for hardcoded admin & 2FA)
    }

    // 2. Fallback: verify backend-issued JWT
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'mailchat_super_secret_jwt_key_2026_secure'
      );

      const user = await getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      if (user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator.'
        });
      }

      req.user = user;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please sign in again.'
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Not authorized, no session token provided'
  });
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access required'
    });
  }
};
