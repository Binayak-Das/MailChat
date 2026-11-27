import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import MeetRoom from './components/meet/MeetRoom';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import CookieBanner from './components/landing/CookieBanner';
import { getCurrentUser } from './services/api';
import { disconnectSocket } from './services/socket';
import { cookieStorage } from './services/storage';
import { auth } from './config/firebase';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

function MeetRouteGuard({ loading, currentUser }) {
  const location = useLocation();
  useEffect(() => {
    if (!loading && !currentUser && location.pathname.startsWith('/meet/')) {
      sessionStorage.setItem('mailchat_post_login_redirect', location.pathname);
    }
  }, [loading, currentUser, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  return <MeetRoom user={currentUser} />;
}

function App() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = cookieStorage.getItem('mailchat_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = cookieStorage.getItem('mailchat_token');
    if (token) {
      getCurrentUser(token)
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
            cookieStorage.setItem('mailchat_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          cookieStorage.removeItem('mailchat_token');
          cookieStorage.removeItem('mailchat_user');
          setCurrentUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser && cookieStorage.getItem('mailchat_token')) {
        try {
          const freshToken = await fbUser.getIdToken();
          cookieStorage.setItem('mailchat_token', freshToken);
        } catch {
          // Ignore token refresh errors; existing error handlers will prompt re-login
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user, token) => {
    cookieStorage.setItem('mailchat_token', token);
    cookieStorage.setItem('mailchat_user', JSON.stringify(user));
    setCurrentUser(user);

    const postLoginRedirect = sessionStorage.getItem('mailchat_post_login_redirect');
    if (postLoginRedirect) {
      sessionStorage.removeItem('mailchat_post_login_redirect');
      navigate(postLoginRedirect, { replace: true });
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin/users');
    } else {
      navigate('/dashboard/inbox');
    }
  };

  const handleUserUpdate = (updatedUser) => {
    cookieStorage.setItem('mailchat_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    disconnectSocket(true);
    signOut(auth).catch(() => {});
    cookieStorage.removeItem('mailchat_token');
    cookieStorage.removeItem('mailchat_user');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/terms"
          element={<TermsPage currentUser={currentUser} />}
        />
        <Route
          path="/terms-and-conditions"
          element={<Navigate to="/terms" replace />}
        />

        <Route
          path="/privacy"
          element={<PrivacyPage currentUser={currentUser} />}
        />
        <Route
          path="/privacy-policy"
          element={<Navigate to="/privacy" replace />}
        />

        <Route
          path="/cookies"
          element={<CookiePolicyPage currentUser={currentUser} />}
        />
        <Route
          path="/cookie-policy"
          element={<Navigate to="/cookies" replace />}
        />

        <Route
          path="/admin"
          element={<Navigate to="/admin/users" replace />}
        />
        <Route
          path="/admin/:module"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !currentUser || currentUser.role !== 'admin' ? (
              <Navigate to="/" replace />
            ) : (
              <AdminDashboard user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            )
          }
        />
        <Route
          path="/admin/:module/:submodule"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !currentUser || currentUser.role !== 'admin' ? (
              <Navigate to="/" replace />
            ) : (
              <AdminDashboard user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={<Navigate to="/dashboard/inbox" replace />}
        />
        <Route
          path="/dashboard/:module"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <UserDashboard user={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            )
          }
        />

        <Route path="/inbox" element={<Navigate to="/dashboard/inbox" replace />} />
        <Route path="/chats" element={<Navigate to="/dashboard/chats" replace />} />
        <Route path="/chat" element={<Navigate to="/dashboard/chats" replace />} />
        <Route path="/meet" element={<Navigate to="/dashboard/meet" replace />} />
        <Route
          path="/meet/:code"
          element={<MeetRouteGuard loading={loading} currentUser={currentUser} />}
        />
        <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
        <Route
          path="/settings"
          element={
            currentUser?.role === 'admin' ? (
              <Navigate to="/admin/settings" replace />
            ) : (
              <Navigate to="/dashboard/settings" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <CookieBanner />
    </>
  );
}

export default App;
