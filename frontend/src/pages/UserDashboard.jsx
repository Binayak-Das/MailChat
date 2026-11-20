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
  Inbox,
  Bell,
  Settings,
  Send,
  Menu,
  X,
  Check,
  AlertCircle,
  Users,
  RotateCw,
  Loader2,
  Edit2,
  Save,
  Volume2,
  BellRing,
  Info,
  BellOff
} from 'lucide-react';
import {
  getNotifications,
  markNotificationsAsRead,
  updateProfile,
  fetchChats
} from '../services/api';
import ChatModule from '../components/chat/ChatModule';
import MailModule from '../components/mail/MailModule';
import { initSocket } from '../services/socket';
import { playWhatsAppNotificationSound } from '../services/sound';
import {
  requestPushPermission,
  getPushPermission,
  sendDesktopNotification
} from '../services/pushNotification';

export default function UserDashboard({ user = {}, onLogout, onUserUpdate }) {
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  const [userNameInput, setUserNameInput] = useState(user.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setUserNameInput(user.name || '');
  }, [user.name]);

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

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(() => {
    return localStorage.getItem('mailchat_pref_push_notifications') === 'true';
  });

  const [pushPermission, setPushPermission] = useState(() => getPushPermission());

  const handleTogglePushNotifications = async () => {
    if (pushPermission !== 'granted') {
      const result = await requestPushPermission();
      setPushPermission(result);
      if (result === 'granted') {
        setPushNotificationsEnabled(true);
        localStorage.setItem('mailchat_pref_push_notifications', 'true');
        showToast('Push notifications enabled successfully', 'success');
        sendDesktopNotification('MailChat Push Notifications', {
          body: 'You will now receive instant desktop notifications for emails, messages, and group activities.'
        });
      } else {
        showToast('Push notifications permission was not granted by your browser', 'error');
      }
    } else {
      const next = !pushNotificationsEnabled;
      setPushNotificationsEnabled(next);
      localStorage.setItem('mailchat_pref_push_notifications', String(next));
      showToast(next ? 'Push notifications turned ON' : 'Push notifications paused');
    }
  };

  const toggleEmailNotifications = () => {
    setEmailNotifications((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_email_notifications', String(next));
      showToast(next ? 'Email summaries enabled' : 'Email summaries paused');
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

  const handleSendTestNotification = async () => {
    let perm = pushPermission;
    if (perm !== 'granted') {
      perm = await requestPushPermission();
      setPushPermission(perm);
    }

    if (perm === 'granted') {
      setPushNotificationsEnabled(true);
      localStorage.setItem('mailchat_pref_push_notifications', 'true');
    }

    const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
    if (audioPref !== 'false') {
      playWhatsAppNotificationSound();
    }

    sendDesktopNotification('MailChat Notification Test', {
      body: 'Instant desktop alerts are configured! You will receive live notification popups.',
      force: true
    });

    showToast('Test notification triggered! If no Windows desktop banner appears, verify Windows Do Not Disturb is OFF.', 'success');
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

  const processedMessageIdsRef = useRef(new Set());

  const fetchInitialChatsUnread = useCallback(async () => {
    const token = localStorage.getItem('mailchat_token');
    if (!token) return;
    try {
      const data = await fetchChats(token);
      if (data && data.chats) {
        const total = data.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch { }
  }, []);

  const fetchNotificationsData = useCallback(async () => {
    const token = localStorage.getItem('mailchat_token');
    if (!token) return;
    try {
      const notifRes = await getNotifications(token);
      if (notifRes && notifRes.notifications) {
        setNotifications(notifRes.notifications);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchNotificationsData();
    fetchInitialChatsUnread();
  }, [fetchNotificationsData, fetchInitialChatsUnread, user.email]);

  useEffect(() => {
    if (!user) return;
    const socket = initSocket(user);

    const handleChatActivity = ({ chatId, message }) => {
      if (message) {
        const msgId = (message._id || message.id)?.toString();
        if (msgId) {
          if (processedMessageIdsRef.current.has(msgId)) {
            return;
          }
          processedMessageIdsRef.current.add(msgId);
          if (processedMessageIdsRef.current.size > 200) {
            const first = processedMessageIdsRef.current.values().next().value;
            processedMessageIdsRef.current.delete(first);
          }
        }
      }

      if (activeTab !== 'chats') {
        const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
        if (audioPref !== 'false') playWhatsAppNotificationSound();
        setUnreadChatCount((prev) => prev + 1);
        const senderName = message?.sender?.name || 'Someone';
        const snippet = message?.content || 'Sent an attachment';
        sendDesktopNotification(`New message from ${senderName}`, {
          body: snippet,
          tag: `chat-${chatId}`
        });
        showToast(`Message from ${senderName}: ${snippet}`, 'info');
      }
    };

    const handleNewEmail = (emailData) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      setUnreadEmailCount((prev) => prev + 1);
      fetchNotificationsData();
      sendDesktopNotification(`New Email from ${emailData.sender || 'Someone'}`, {
        body: emailData.subject || 'You received a new email',
        tag: `email-${emailData.id}`
      });
      showToast(`New Email from ${emailData.sender}: ${emailData.subject}`, 'info');
    };

    const handleGroupActivity = ({ title, message }) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      fetchNotificationsData();
      sendDesktopNotification(title || 'Group Activity', {
        body: message || ''
      });
      showToast(`${title}: ${message}`, 'info');
    };

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev.filter((n) => (n.id || n._id) !== (notif.id || notif._id))]);
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      sendDesktopNotification(notif.title, {
        body: notif.message,
        tag: `notif-${notif.id || notif._id}`
      });
      showToast(`${notif.title}: ${notif.message}`, 'info');
    };

    const handleUserUpdate = (updatedUserData) => {
      const updatedId = updatedUserData.id || updatedUserData._id;
      const myId = user._id || user.id;
      if (updatedId?.toString() === myId?.toString()) {
        if (onUserUpdate) onUserUpdate({ ...user, ...updatedUserData });
      }
    };

    const handleMessagesRead = ({ chatId, userId }) => {
      const myId = (user._id || user.id)?.toString();
      if (userId?.toString() === myId) {
        fetchInitialChatsUnread();
      }
    };

    socket.on('chat_activity', handleChatActivity);
    socket.on('new_email', handleNewEmail);
    socket.on('group_activity', handleGroupActivity);
    socket.on('new_notification', handleNewNotification);
    socket.on('user_updated', handleUserUpdate);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('chat_activity', handleChatActivity);
      socket.off('new_email', handleNewEmail);
      socket.off('group_activity', handleGroupActivity);
      socket.off('new_notification', handleNewNotification);
      socket.off('user_updated', handleUserUpdate);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [user, activeTab, onUserUpdate, showToast, fetchNotificationsData, fetchInitialChatsUnread]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!userNameInput.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    const token = localStorage.getItem('mailchat_token');
    if (!token) return;

    setUpdatingProfile(true);
    try {
      const res = await updateProfile(token, { name: userNameInput.trim() });
      if (res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        showToast('Profile name updated successfully', 'success');
        setShowProfileModal(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update name', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const unreadNotificationCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
    const token = localStorage.getItem('mailchat_token');
    if (token) {
      try {
        await markNotificationsAsRead(token);
      } catch { }
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
            >
              {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Name</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
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
              Inbox communications and team chats remain locked until an administrator assigns your role.
            </p>

            <div className="mt-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-3">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Registered User</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{user.name || 'User'}</span>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Change Name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
          </div>
        </main>

        <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          MailChat Unified Communication Workspace &bull; Role Security Engine
        </footer>

        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Update Profile Name</h3>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    {updatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Name'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
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
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
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
                      setShowProfileModal(true);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    <span>Update Profile Name</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
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
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                    Instant alerts for new emails, messages, and team group activities
                  </p>
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
                      You're all caught up! New emails, chat messages, and group activities will appear here.
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
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'email'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                          : n.type === 'group'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
                            : n.type === 'report'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                        {n.type === 'email' ? <Mail className="w-5 h-5" /> : n.type === 'group' ? <Users className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{n.title}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">{n.time || 'Recent'}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Profile Management</h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                      Update your account name and view your workspace identity
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 w-full max-w-2xl mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={userNameInput}
                      onChange={(e) => setUserNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Email Address (Permanent)
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Account Role
                    </label>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                      {user.role || 'user'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile || userNameInput === user.name}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Changes</span>
                  </button>
                </form>
              </div>

              <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Push & Notification Preferences</h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                      Configure browser push notifications, sound cues, and delivery alerts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/80 font-bold text-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-colors"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>Send Test Notification</span>
                  </button>
                </div>

                <div className="mt-6 space-y-3.5 w-full">
                  <div
                    onClick={handleTogglePushNotifications}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BellRing className="w-4.5 h-4.5 text-blue-600" />
                        <span>Instant Push Notifications</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Receive instant native desktop notifications for new emails, chat messages, and group activities
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Browser Permission: <span className="font-semibold capitalize">{pushPermission}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushNotificationsEnabled && pushPermission === 'granted'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePushNotifications();
                      }}
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pushNotificationsEnabled && pushPermission === 'granted' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${pushNotificationsEnabled && pushPermission === 'granted' ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={toggleDesktopAudioAlerts}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Volume2 className="w-4.5 h-4.5 text-blue-600" />
                        <span>Desktop Audio Alerts</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Play sound chime on incoming direct messages and group activity
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
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${desktopAudioAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${desktopAudioAlerts ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={toggleEmailNotifications}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Mail className="w-4.5 h-4.5 text-blue-600" />
                        <span>Email Summary Notifications</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Receive email summaries for unread messages
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
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${emailNotifications ? 'translate-x-5.5' : 'translate-x-0'
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

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Update Profile Name</h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {updatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-top-4 max-w-sm backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold leading-snug break-words">{toast.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-slate-900/10 text-slate-400 dark:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
