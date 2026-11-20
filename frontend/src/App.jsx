import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import { getCurrentUser } from './services/api';
import { Loader2 } from 'lucide-react';

function App() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('mailchat_user');
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
    const token = localStorage.getItem('mailchat_token');
    if (token) {
      getCurrentUser(token)
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
            localStorage.setItem('mailchat_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('mailchat_token');
          localStorage.removeItem('mailchat_user');
          setCurrentUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (user, token) => {
    localStorage.setItem('mailchat_token', token);
    localStorage.setItem('mailchat_user', JSON.stringify(user));
    setCurrentUser(user);

    if (user.role === 'admin') {
      navigate('/admin/users');
    } else {
      navigate('/dashboard/inbox');
    }
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('mailchat_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('mailchat_token');
    localStorage.removeItem('mailchat_user');
    setCurrentUser(null);
    navigate('/');
  };

  return (
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
  );
}

export default App;
