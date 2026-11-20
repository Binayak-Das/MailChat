import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Mail,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Clock,
  CheckCircle,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Inbox,
  Bell,
  Settings,
  Star,
  Search,
  Filter,
  Send,
  Menu,
  X,
  Check,
  AlertCircle,
  Hash,
  Paperclip,
  Smile,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreVertical,
  Plus,
  RotateCw,
  Tag,
  AtSign,
  FileText,
  Users,
  CornerUpLeft,
  ArrowLeft,
  Download,
  Lock,
  Image as ImageIcon,
  Loader2,
  ChevronsUpDown
} from 'lucide-react';
import {
  getNotifications,
  markNotificationsAsRead
} from '../services/api';
import ChatModule from '../components/chat/ChatModule';
import MailModule from '../components/mail/MailModule';
import { initSocket } from '../services/socket';
import { playWhatsAppNotificationSound } from '../services/sound';

export default function UserDashboard({ user = {}, onLogout }) {
  const { module } = useParams();
  const navigate = useNavigate();
  const validModules = ['inbox', 'chats', 'notifications', 'settings'];
  const activeTab = validModules.includes(module) ? module : 'inbox';

  useEffect(() => {
    if (module && !validModules.includes(module)) {
      navigate('/dashboard/inbox', { replace: true });
    }
  }, [module, navigate]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('mailchat_theme') === 'dark';
  });

  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('mailchat_pref_email_notifications');
    return saved !== null ? saved === 'true' : true;
  });
  const [desktopAudioAlerts, setDesktopAudioAlerts] = useState(() => {
    const saved = localStorage.getItem('mailchat_pref_audio_alerts');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleEmailNotifications = () => {
    setEmailNotifications((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_email_notifications', String(next));
      showToast(next ? 'Email notifications enabled' : 'Email notifications paused');
      return next;
    });
  };

  const toggleDesktopAudioAlerts = () => {
    setDesktopAudioAlerts((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_audio_alerts', String(next));
      showToast(next ? 'Desktop audio alerts enabled' : 'Desktop audio alerts muted');
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('mailchat_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('mailchat_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPending = user.role === 'pending';

  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Real-time listener across all modules to alert receiver if not in that chat
  useEffect(() => {
    if (!user) return;
    const socket = initSocket(user);

    const handleChatActivity = ({ chatId, message }) => {
      if (activeTab !== 'chats') {
        playWhatsAppNotificationSound();
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    socket.on('chat_activity', handleChatActivity);
    return () => {
      socket.off('chat_activity', handleChatActivity);
    };
  }, [user, activeTab]);

  const fetchNotificationsData = async () => {
    const token = localStorage.getItem('mailchat_token');
    if (!token) return;
    try {
      const notifRes = await getNotifications(token);
      if (notifRes && notifRes.notifications) {
        setNotifications(notifRes.notifications);
      }
    } catch { }
  };

  useEffect(() => {
    fetchNotificationsData();
  }, [user.email]);

  const unreadNotificationCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
    const token = localStorage.getItem('mailchat_token');
    if (token) {
      try {
        await markNotificationsAsRead(token);
      } catch (err) {

      }
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col justify-between transition-colors duration-200">

        <header className="relative z-30 h-18 px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                Mail<span className="text-blue-600 dark:text-blue-400">Chat</span>
              </span>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold tracking-wide">
                Account Activation
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-blue-600" />}
            </button>

            <div className="relative z-50" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white hidden sm:inline">
                  {user.name || 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 mb-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl text-center">

            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-amber-500/15 animate-ping opacity-75" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Role Assignment Pending
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Please Wait for Role Update
            </h1>

            <p className="text-base text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
              Your account has been registered, but full workspace privileges have not been granted yet.
              To maintain workspace security, inbox communications and team chats remain locked until an administrator assigns your role.
            </p>

            <div className="mt-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-3">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Registered User</span>
                <span className="font-bold text-slate-900 dark:text-white">{user.name || 'User'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user.email || 'user@mailchat.com'}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Current Status</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending Administrator Approval
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCw className="w-4.5 h-4.5" />
                <span>Check for Role Update</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
              Workspace administrators have been notified. Once updated to a Member or Admin role, full access will unlock automatically.
            </p>

          </div>
        </main>

        <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          MailChat Unified Communication Workspace &bull; Role Security Engine
        </footer>

      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        <div>
          <div className="h-18 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                  Mail<span className="text-blue-600 dark:text-blue-400">Chat</span>
                </span>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wide">
                  Workspace
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => { navigate('/dashboard/inbox'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'inbox'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4.5 h-4.5 shrink-0" />
                <span>Mails</span>
              </div>
              {unreadEmailCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                  }`}>
                  {unreadEmailCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigate('/dashboard/chats'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'chats'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4.5 h-4.5 shrink-0" />
                <span>Chats</span>
              </div>
              {unreadChatCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'chats' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  }`}>
                  {unreadChatCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigate('/dashboard/notifications'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4.5 h-4.5 shrink-0" />
                <span>Notifications</span>
              </div>
              {unreadNotificationCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                  }`}>
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigate('/dashboard/settings'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4.5 h-4.5 shrink-0" />
                <span>Settings</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
              }`}>
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user.name || 'User'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                {user.email || 'user@mailchat.com'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="relative z-40 h-18 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white capitalize">
              {activeTab === 'inbox' && 'Inbox'}
              {activeTab === 'chats' && 'Chats'}
              {activeTab === 'notifications' && 'System Notifications'}
              {activeTab === 'settings' && 'Account Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-blue-600" />}
            </button>

            <div className="relative z-50" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer select-none"
              >
                <div className={`w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
                  }`}>
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white hidden sm:inline">
                  {user.name || 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 mb-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        <div className={`flex-1 min-h-0 relative z-10 flex flex-col ${activeTab === 'inbox' || activeTab === 'chats'
          ? 'p-2 sm:p-5 lg:p-6 overflow-hidden'
          : 'p-3 sm:p-6 lg:p-8 overflow-y-auto'
          }`}>

          {activeTab === 'inbox' && (
            <MailModule
              user={user}
              showToast={showToast}
              onUnreadCountChange={setUnreadEmailCount}
            />
          )}

          {activeTab === 'chats' && (
            <ChatModule
              user={user}
              showToast={showToast}
              onUnreadCountChange={setUnreadChatCount}
            />
          )}

          {activeTab === 'notifications' && (
            <div className="w-full space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">All Notifications</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">Security, real-time message pings, and system status alerts</p>
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs transition-colors"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="space-y-3 w-full">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-200">No Notifications</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      You're all caught up! New emails, security notices, and direct mentions will appear here.
                    </div>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id || n._id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-colors flex items-start gap-4 w-full ${n.unread
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.category === 'Security' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                        }`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{n.title}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">{n.time || (n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent')}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1 leading-relaxed">{n.message || n.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full space-y-6">
              <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Workspace Preferences</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                  Manage communication alerts, sound cues, and desktop message notifications across your workspace
                </p>

                <div className="mt-6 space-y-3.5 w-full">
                  <div
                    onClick={toggleEmailNotifications}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Email Notifications
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Receive email summaries for unread direct messages
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={emailNotifications}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEmailNotifications();
                      }}
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${emailNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${emailNotifications ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={toggleDesktopAudioAlerts}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        Desktop Audio Alerts
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Play a soft tone on incoming direct message alerts
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={desktopAudioAlerts}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDesktopAudioAlerts();
                      }}
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${desktopAudioAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${desktopAudioAlerts ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Global Floating Toast Alert Notification */}
      {toast && toast.type !== 'chat' && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-top-4 max-w-sm backdrop-blur-md"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold leading-snug break-words">{toast.message}</div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-900/10 text-slate-400 dark:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
