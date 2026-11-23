import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  Globe
} from 'lucide-react';
import {
  loginUser,
  registerUser,
  googleAuthLogin,
  loginWith2FA,
  resend2faLoginOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword
} from '../../services/api';
import { useGoogleLogin } from '@react-oauth/google';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Password Recovery State
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 2FA Challenge State
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorTempToken, setTwoFactorTempToken] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFactorCooldown, setTwoFactorCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGoogleAccountError, setIsGoogleAccountError] = useState(false);

  const resetAllFields = () => {
    setFormData({ name: '', email: '', password: '' });
    setRecoveryEmail('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleAccountError(false);
    setRecoveryStep(1);
    setResendCooldown(0);
    setTwoFactorEmail('');
    setTwoFactorTempToken('');
    setTwoFactorOtp('');
    setTwoFactorCooldown(0);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    resetAllFields();
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer;
    if (twoFactorCooldown > 0) {
      timer = setTimeout(() => setTwoFactorCooldown(twoFactorCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [twoFactorCooldown]);

  const handleGoogleAuthAction = async (googlePayload) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await googleAuthLogin(googlePayload);

      // Check if 2FA applies
      if (res.require2FA) {
        setTwoFactorEmail(res.email);
        setTwoFactorTempToken(res.tempToken);
        setTwoFactorOtp('');
        setTwoFactorCooldown(60);
        setSuccessMsg(res.message || 'Two-factor verification code sent to your email.');
        setMode('2fa-challenge');
        return;
      }

      resetAllFields();
      onClose();

      if (onAuthSuccess) {
        onAuthSuccess(res.user, res.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErrorMsg('');
      setSuccessMsg('');
      setLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await userInfoRes.json();
        await handleGoogleAuthAction({
          googleUser: {
            id: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            avatar: googleUser.picture,
          }
        });
      } catch (err) {
        console.error('Google profile fetch error:', err);
        setErrorMsg('Failed to retrieve Google profile: ' + (err.message || ''));
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google Sign-In Error:', err);
      setErrorMsg('Google authentication was cancelled or failed.');
      setLoading(false);
    }
  });

  if (!isOpen) return null;

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  const handleTabChange = (newMode) => {
    resetAllFields();
    setMode(newMode);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser({
          email: formData.email.trim(),
          password: formData.password
        });

        // 2FA required
        if (res.require2FA) {
          setTwoFactorEmail(res.email);
          setTwoFactorTempToken(res.tempToken);
          setTwoFactorOtp('');
          setTwoFactorCooldown(60);
          setSuccessMsg(res.message || 'Two-factor verification code sent to your email.');
          setMode('2fa-challenge');
          return;
        }

        resetAllFields();
        onClose();

        if (onAuthSuccess) {
          onAuthSuccess(res.user, res.token);
        }
      } else if (mode === 'register') {
        await registerUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password
        });

        resetAllFields();
        setMode('login');
        setSuccessMsg('Account registered successfully! Please sign in.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication request failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    if (e) e.preventDefault();
    if (!twoFactorOtp || twoFactorOtp.trim().length < 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginWith2FA({
        tempToken: twoFactorTempToken,
        otp: twoFactorOtp.trim(),
        email: twoFactorEmail
      });

      resetAllFields();
      onClose();

      if (onAuthSuccess) {
        onAuthSuccess(res.user, res.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired 2FA code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FA = async () => {
    if (twoFactorCooldown > 0 || loading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await resend2faLoginOtp({
        tempToken: twoFactorTempToken,
        email: twoFactorEmail
      });
      setSuccessMsg(res.message || `A new verification code has been sent to ${twoFactorEmail}.`);
      setTwoFactorCooldown(60);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend 2FA verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleAccountError(false);
    setLoading(true);

    try {
      const res = await sendPasswordResetOtp(recoveryEmail.trim());
      setSuccessMsg(res.message || `A verification code has been sent to ${recoveryEmail}.`);
      setOtpCode('');
      setRecoveryStep(2);
      setResendCooldown(60);
    } catch (err) {
      const isGoogle = !!err.isGoogleAccount || (err.message && err.message.toLowerCase().includes('google'));
      setIsGoogleAccountError(isGoogle);
      setErrorMsg(err.message || 'Failed to send OTP code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await verifyPasswordResetOtp(recoveryEmail.trim(), otpCode.trim());
      setResetToken(res.resetToken || '');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Code verified successfully! You may now set your new password.');
      setRecoveryStep(3);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({
        email: recoveryEmail.trim(),
        otp: otpCode.trim(),
        resetToken,
        newPassword
      });

      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setResetToken('');
      setRecoveryEmail('');
      setFormData({ name: '', email: '', password: '' });

      setSuccessMsg(res.message || 'Password updated successfully! Please sign in.');

      setTimeout(() => {
        resetAllFields();
        setMode('login');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl shadow-slate-400/20 dark:shadow-slate-950/50 transition-colors duration-200">

        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-600/20">
            {mode === 'forgot-password' ? (
              <KeyRound className="w-6 h-6 text-white" />
            ) : mode === '2fa-challenge' ? (
              <ShieldCheck className="w-6 h-6 text-white" />
            ) : (
              <Zap className="w-6 h-6 text-white fill-white" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Your Account'}
            {mode === '2fa-challenge' && 'Two-Factor Authentication'}
            {mode === 'forgot-password' && (
              recoveryStep === 1
                ? 'Forgot Password'
                : recoveryStep === 2
                  ? 'Verify Code'
                  : 'Set New Password'
            )}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login' && 'Access your unified email and team chat workspace'}
            {mode === 'register' && 'Join MailChat and start collaborating in real time'}
            {mode === '2fa-challenge' && `Enter the 6-digit verification code sent to ${twoFactorEmail}`}
            {mode === 'forgot-password' && (
              recoveryStep === 1
                ? 'Enter your registered email to receive a 6-digit verification code'
                : recoveryStep === 2
                  ? `Enter the 6-digit verification code sent to ${recoveryEmail}`
                  : 'Create and confirm your new secure password'
            )}
          </p>
        </div>

        {mode !== 'forgot-password' && mode !== '2fa-challenge' ? (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 mb-5 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'login'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'register'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              Register
            </button>
          </div>
        ) : mode === 'forgot-password' ? (
          <div className="mb-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                if (recoveryStep === 3) {
                  setNewPassword('');
                  setConfirmPassword('');
                  setOtpCode('');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setRecoveryStep(2);
                } else if (recoveryStep === 2) {
                  setOtpCode('');
                  setRecoveryEmail('');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setRecoveryStep(1);
                } else {
                  resetAllFields();
                  setMode('login');
                }
              }}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {recoveryStep === 3 ? 'Back to code' : recoveryStep === 2 ? 'Change email' : 'Back to Sign In'}
            </button>

            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              Step {recoveryStep} of 3
            </span>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                resetAllFields();
                setMode('login');
              }}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60">
              Security Verification
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {isGoogleAccountError && (
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-100 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTON */}
        {mode !== 'forgot-password' && mode !== '2fa-challenge' && (
          <div className="mb-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleLogin()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">or email</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
            </div>
          </div>
        )}

        {/* 2FA VERIFICATION CHALLENGE VIEW */}
        {mode === '2fa-challenge' && (
          <form onSubmit={handleVerify2FA} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">
                  Enter 6-Digit 2FA Code
                </label>
                <button
                  type="button"
                  disabled={twoFactorCooldown > 0 || loading}
                  onClick={handleResend2FA}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {twoFactorCooldown > 0 ? `Resend in ${twoFactorCooldown}s` : 'Resend Code'}
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={twoFactorOtp}
                onChange={(e) => setTwoFactorOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-full py-3 px-3 text-center tracking-[0.4em] font-mono text-2xl font-black rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading || twoFactorOtp.length < 6}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Sign In</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STANDARD SIGN IN / REGISTER FORM */}
        {mode !== 'forgot-password' && mode !== '2fa-challenge' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-medium">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      resetAllFields();
                      setMode('forgot-password');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FLOW */}
        {mode === 'forgot-password' && recoveryStep === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send 6-Digit Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'forgot-password' && recoveryStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-medium">
                  Enter 6-Digit Verification Code
                </label>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full py-3 px-3 text-center tracking-[0.4em] font-mono text-xl font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === 'forgot-password' && recoveryStep === 3 && (
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                New Password (minimum 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Change Password & Sign In</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
