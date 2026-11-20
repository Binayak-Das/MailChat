import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  UserCheck,
  Clock,
  Search,
  LogOut,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Menu,
  X,
  RefreshCw,
  Mail,
  MessageSquare,
  Bell,
  Activity,
  AlertTriangle,
  UserX,
  Trash2,
  Edit2,
  CheckCircle,
  Radio,
  Settings,
  BellRing,
  Volume2,
  Save,
  User as UserIcon,
  Info
} from 'lucide-react';
import {
  getAllUsers,
  updateUserRole,
  updateProfile,
  getPlatformActivity,
  adminDeleteUser,
  adminToggleBan,
  getAllReports,
  updateReport,
  fetchChats
} from '../services/api';
import MailModule from '../components/mail/MailModule';
import ChatModule from '../components/chat/ChatModule';
import { initSocket } from '../services/socket';
import { playWhatsAppNotificationSound } from '../services/sound';
import {
  sendDesktopNotification,
  requestPushPermission,
  getPushPermission
} from '../services/pushNotification';

export default function AdminDashboard({ user = {}, onLogout, onUserUpdate }) {
  const { module } = useParams();
  const navigate = useNavigate();
  const activeTab = module || 'users';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  const [adminNameInput, setAdminNameInput] = useState(user.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setAdminNameInput(user.name || '');
  }, [user.name]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');

  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState('all');
  const [processingReportId, setProcessingReportId] = useState(null);

  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('mailchat_theme') === 'dark';
  });

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

  const token = localStorage.getItem('mailchat_token');

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(() => {
    return localStorage.getItem('mailchat_pref_push_notifications') === 'true';
  });
  const [pushPermission, setPushPermission] = useState(() => getPushPermission());

  const [desktopAudioAlerts, setDesktopAudioAlerts] = useState(() => {
    const saved = localStorage.getItem('mailchat_pref_audio_alerts');
    return saved !== null ? saved === 'true' : true;
  });

  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('mailchat_pref_email_notifications');
    return saved !== null ? saved === 'true' : true;
  });

  const [adminPriorityAlerts, setAdminPriorityAlerts] = useState(() => {
    const saved = localStorage.getItem('mailchat_pref_admin_priority_alerts');
    return saved !== null ? saved === 'true' : true;
  });

  const handleTogglePushNotifications = async () => {
    if (pushPermission !== 'granted') {
      const result = await requestPushPermission();
      setPushPermission(result);
      if (result === 'granted') {
        setPushNotificationsEnabled(true);
        localStorage.setItem('mailchat_pref_push_notifications', 'true');
        showToast('Push notifications enabled successfully', 'success');
        sendDesktopNotification('MailChat Admin Push Notifications', {
          body: 'You will receive instant native desktop notifications for reports, system activity, emails, and chats.'
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

  const toggleDesktopAudioAlerts = () => {
    setDesktopAudioAlerts((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_audio_alerts', String(next));
      showToast(next ? 'Desktop audio alerts enabled' : 'Desktop audio alerts muted');
      return next;
    });
  };

  const toggleEmailNotifications = () => {
    setEmailNotifications((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_email_notifications', String(next));
      showToast(next ? 'Email summaries enabled' : 'Email summaries paused');
      return next;
    });
  };

  const toggleAdminPriorityAlerts = () => {
    setAdminPriorityAlerts((prev) => {
      const next = !prev;
      localStorage.setItem('mailchat_pref_admin_priority_alerts', String(next));
      showToast(next ? 'Admin priority alerts enabled' : 'Admin priority alerts paused');
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

    sendDesktopNotification('MailChat Admin Notification Test', {
      body: 'Instant desktop popups are active! Live alerts are working.',
      force: true
    });

    showToast('Test notification triggered! If no Windows desktop banner appears, verify Windows Do Not Disturb is OFF.', 'success');
  };

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getAllUsers(token);
      setUsers(res.users || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchActivity = useCallback(async () => {
    if (!token) return;
    setLoadingActivity(true);
    try {
      const res = await getPlatformActivity(token);
      setActivityData(res);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, [token]);

  const fetchReportsData = useCallback(async () => {
    if (!token) return;
    setLoadingReports(true);
    try {
      const res = await getAllReports(token, reportFilter);
      setReports(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [token, reportFilter]);

  const processedMessageIdsRef = useRef(new Set());

  const fetchInitialChatsUnread = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchChats(token);
      if (data && data.chats) {
        const total = data.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadChatCount(total);
      }
    } catch { }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'reports') fetchReportsData();
    fetchInitialChatsUnread();
  }, [activeTab, fetchUsers, fetchActivity, fetchReportsData, fetchInitialChatsUnread]);

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
        sendDesktopNotification(`Chat message from ${message?.sender?.name || 'Someone'}`, {
          body: message?.content || 'New attachment sent'
        });
        showToast(`Message from ${message?.sender?.name || 'Someone'}: ${message?.content || 'Attachment'}`, 'info');
      }
    };

    const handleNewEmail = (emailData) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      setUnreadEmailCount((prev) => prev + 1);
      sendDesktopNotification(`New Email from ${emailData.sender || 'Someone'}`, {
        body: emailData.subject || 'You received a new email'
      });
      showToast(`New email received from ${emailData.sender}`, 'info');
    };

    const handleNewReport = (report) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      showToast(`Account reported: ${report.reportedUser?.name} (${report.reason})`, 'warning');
      sendDesktopNotification('New Account Report Filed', {
        body: `${report.reporter?.name} reported ${report.reportedUser?.name} for "${report.reason}".`
      });
      if (activeTab === 'reports') fetchReportsData();
      if (activeTab === 'activity') fetchActivity();
    };

    const handleNewNotification = (notif) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      sendDesktopNotification(notif.title, {
        body: notif.message,
        tag: `notif-${notif.id || notif._id}`
      });
      showToast(`${notif.title}: ${notif.message}`, 'info');
    };

    const handleUserUpdate = () => {
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'activity') fetchActivity();
    };

    const handleMessagesRead = ({ chatId, userId }) => {
      const myId = (user._id || user.id)?.toString();
      if (userId?.toString() === myId) {
        fetchInitialChatsUnread();
      }
    };

    socket.on('chat_activity', handleChatActivity);
    socket.on('new_email', handleNewEmail);
    socket.on('new_report', handleNewReport);
    socket.on('new_notification', handleNewNotification);
    socket.on('user_registered', handleUserUpdate);
    socket.on('user_updated', handleUserUpdate);
    socket.on('user_deleted', handleUserUpdate);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('chat_activity', handleChatActivity);
      socket.off('new_email', handleNewEmail);
      socket.off('new_report', handleNewReport);
      socket.off('new_notification', handleNewNotification);
      socket.off('user_registered', handleUserUpdate);
      socket.off('user_updated', handleUserUpdate);
      socket.off('user_deleted', handleUserUpdate);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [user, activeTab, fetchUsers, fetchActivity, fetchReportsData, showToast, fetchInitialChatsUnread]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    setErrorMsg('');
    try {
      const res = await updateUserRole(token, userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.user.role } : u))
      );
      showToast('User role updated', 'success');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleBan = async (targetUser) => {
    const isBanned = targetUser.status === 'banned';
    const nextStatus = isBanned ? 'active' : 'banned';
    if (!window.confirm(`${isBanned ? 'Unban' : 'Ban'} user "${targetUser.name}"?`)) return;

    setUpdatingId(targetUser._id);
    try {
      const res = await adminToggleBan(token, targetUser._id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, status: res.user.status } : u))
      );
      showToast(`User is now ${nextStatus}`, 'success');
      fetchActivity();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Permanently delete account for "${targetUser.name}"? This action cannot be undone.`)) return;

    setUpdatingId(targetUser._id);
    try {
      await adminDeleteUser(token, targetUser._id);
      setUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
      showToast('User account deleted permanently', 'success');
      fetchActivity();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateReport = async (reportId, status, actionTaken = '') => {
    setProcessingReportId(reportId);
    try {
      await updateReport(token, reportId, { status, actionTaken });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status, actionTaken: actionTaken || r.actionTaken } : r))
      );
      showToast(`Report marked as ${status}`, 'success');
      fetchActivity();
    } catch (err) {
      showToast(err.message || 'Failed to update report', 'error');
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleBanReportedAccount = async (report) => {
    const reportedId = report.reportedUser?._id || report.reportedUser?.id;
    if (!reportedId) return;
    if (!window.confirm(`Ban reported account "${report.reportedUser?.name}"?`)) return;

    setProcessingReportId(report._id);
    try {
      await adminToggleBan(token, reportedId, 'banned');
      await updateReport(token, report._id, {
        status: 'resolved',
        actionTaken: 'Account Banned by Admin'
      });
      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? { ...r, status: 'resolved', actionTaken: 'Account Banned by Admin' }
            : r
        )
      );
      showToast(`Account banned and report marked resolved`, 'success');
      fetchUsers();
      fetchActivity();
    } catch (err) {
      showToast(err.message || 'Failed to ban user', 'error');
    } finally {
      setProcessingReportId(null);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!adminNameInput.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setUpdatingProfile(true);
    try {
      const res = await updateProfile(token, { name: adminNameInput.trim() });
      if (res.user) {
        if (onUserUpdate) onUserUpdate(res.user);
        showToast('Admin profile name updated', 'success');
        setShowProfileModal(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update name', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.filter((u) => u.role === 'user').length;
  const pendingCount = users.filter((u) => u.role === 'pending').length;
  const bannedCount = users.filter((u) => u.status === 'banned').length;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-68 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          <div className="h-18 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                  Mail<span className="text-indigo-600 dark:text-indigo-400">Chat</span>
                </span>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold tracking-wide">
                  Admin Console
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
              onClick={() => { navigate('/admin/users'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4.5 h-4.5 shrink-0" />
                <span>Users & Roles</span>
              </div>
              {pendingCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                  }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigate('/admin/activity'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'activity'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4.5 h-4.5 shrink-0" />
                <span>Platform Activity</span>
              </div>
            </button>

            <button
              onClick={() => { navigate('/admin/reports'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <span>Reported Accounts</span>
              </div>
            </button>

            <button
              onClick={() => { navigate('/admin/mails'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'mails' || activeTab === 'inbox'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-4.5 h-4.5 shrink-0" />
                <span>Mails</span>
              </div>
              {unreadEmailCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'mails' || activeTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                  }`}>
                  {unreadEmailCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { navigate('/admin/chats'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'chats'
                ? 'bg-indigo-600 text-white shadow-xs'
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
              onClick={() => { navigate('/admin/settings'); setMobileSidebarOpen(false); }}
              className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs'
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
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user.name || 'Administrator'}
                </div>
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                  Admin
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
              title="Edit Profile Name"
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
              {activeTab === 'users' && 'Manage Users & Roles'}
              {activeTab === 'activity' && 'Platform Activity Monitor'}
              {activeTab === 'reports' && 'Reported Accounts'}
              {(activeTab === 'mails' || activeTab === 'inbox') && 'Mails & Communications'}
              {activeTab === 'chats' && 'Real-Time Chats & Groups'}
              {activeTab === 'settings' && 'Account & System Settings'}
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
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white hidden sm:inline">
                  {user.name || 'Admin'}
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
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                    <span>Update Name</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>Settings & Preferences</span>
                  </button>
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

        <div className={`flex-1 min-h-0 relative z-10 flex flex-col ${activeTab === 'mails' || activeTab === 'inbox' || activeTab === 'chats'
          ? 'p-2 sm:p-4 overflow-hidden'
          : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
          }`}>
          {errorMsg && activeTab === 'users' && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Total</span>
                    <Users className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                    {totalUsers}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Pending</span>
                    <Clock className="w-4.5 h-4.5 text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                    {pendingCount}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Users</span>
                    <UserCheck className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                    {userCount}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Admins</span>
                    <Shield className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                    {adminCount}
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Suspended</span>
                    <UserX className="w-4.5 h-4.5 text-rose-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                    {bannedCount}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full pl-9.5 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Role:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="all">All Roles</option>
                      <option value="pending">Pending Only</option>
                      <option value="user">User Only</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="banned">Suspended Only</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchUsers}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Refresh user list"
                  >
                    <RefreshCw className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Loading user database...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No users matching search criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Role Assignment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Joined Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                        {filteredUsers.map((u) => {
                          const isSelf = u._id === (user._id || user.id);
                          const isBanned = u.status === 'banned';
                          return (
                            <tr key={u._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                    {u.name?.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {isSelf && <span className="text-[10px] text-indigo-600 font-bold">(You)</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <select
                                  value={u.role}
                                  disabled={isSelf || updatingId === u._id}
                                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${u.role === 'admin'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                                    : u.role === 'user'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                      : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200'
                                    }`}
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                  <option value="pending">Pending</option>
                                </select>
                              </td>

                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isBanned
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                  <span>{isBanned ? 'Suspended' : 'Active'}</span>
                                </span>
                              </td>

                              <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {!isSelf && (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={updatingId === u._id}
                                      onClick={() => handleToggleBan(u)}
                                      className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isBanned
                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                        : 'text-amber-600 hover:bg-amber-50'
                                        }`}
                                      title={isBanned ? 'Unban Account' : 'Suspend Account'}
                                    >
                                      {isBanned ? <CheckCircle className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingId === u._id}
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Account"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Platform Activity</h2>
                  <p className="text-xs text-slate-500">Real-time statistics, communication metrics, and infrastructure health</p>
                </div>
                <button
                  type="button"
                  onClick={fetchActivity}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingActivity && !activityData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <span className="text-xs font-semibold">Gathering platform activity data...</span>
                </div>
              ) : activityData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Users</span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {activityData.stats?.totalUsers || 0}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                        {activityData.stats?.activeUsers || 0} active
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Online Sockets</span>
                      <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
                        <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                        <span>{activityData.stats?.onlineUsersCount || 0}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Connected users</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Chats</span>
                      <div className="text-2xl font-black text-indigo-600 mt-1">
                        {activityData.stats?.totalChats || 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {activityData.stats?.groupChats || 0} groups / {activityData.stats?.directChats || 0} direct
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Messages</span>
                      <div className="text-2xl font-black text-blue-600 mt-1">
                        {activityData.stats?.totalMessages || 0}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                        +{activityData.stats?.messagesToday || 0} today
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Emails</span>
                      <div className="text-2xl font-black text-purple-600 mt-1">
                        {activityData.stats?.totalEmails || 0}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                        +{activityData.stats?.emailsToday || 0} today
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase">Reports</span>
                      <div className="text-2xl font-black text-amber-600 mt-1">
                        {activityData.stats?.totalReports || 0}
                      </div>
                      <div className="text-[11px] text-amber-600 font-semibold mt-1">
                        {activityData.stats?.pendingReports || 0} pending review
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Recently Registered Accounts</h3>
                    <div className="space-y-2">
                      {activityData.recentUsers?.map((u) => (
                        <div
                          key={u._id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
                              {u.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>{' '}
                              <span className="text-slate-400 font-normal">({u.email})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-200 dark:bg-slate-700">
                              {u.role}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reported User Accounts</h2>
                  <p className="text-xs text-slate-500">Review reported accounts for spam, harassment, or policy violations</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter Status:</span>
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Reports</option>
                    <option value="pending">Pending Only</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
              </div>

              {loadingReports ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <span className="text-xs font-semibold">Loading account reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <div className="text-base font-bold text-slate-800 dark:text-slate-200">No Reports Found</div>
                  <p className="text-xs text-slate-400 mt-1">Platform behavior reports filed by users will appear here for admin review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const rId = report._id;
                    const reportedUser = report.reportedUser;
                    const reporter = report.reporter;
                    const isBanned = reportedUser?.status === 'banned';

                    return (
                      <div
                        key={rId}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {report.reason}
                            </span>
                            <span className="text-xs text-slate-400">
                              Filed on {report.createdAt ? new Date(report.createdAt).toLocaleString() : ''}
                            </span>
                          </div>

                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize self-start sm:self-auto ${report.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : report.status === 'dismissed'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                            Status: {report.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <span className="text-slate-400 uppercase font-bold block mb-1">Reported Account</span>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {reportedUser?.name || 'Deleted User'}
                            </div>
                            <div className="text-slate-500">{reportedUser?.email}</div>
                            <div className="mt-1">
                              Status: <span className="font-bold capitalize">{isBanned ? 'Suspended' : 'Active'}</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                            <span className="text-slate-400 uppercase font-bold block mb-1">Reported By</span>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {reporter?.name || 'User'}
                            </div>
                            <div className="text-slate-500">{reporter?.email}</div>
                          </div>
                        </div>

                        {report.details && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Report Notes:</span>
                            {report.details}
                          </div>
                        )}

                        {report.actionTaken && report.actionTaken !== 'None' && (
                          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Action Taken: {report.actionTaken}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {report.status !== 'resolved' && (
                            <>
                              <button
                                type="button"
                                disabled={processingReportId === rId}
                                onClick={() => handleBanReportedAccount(report)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Ban User</span>
                              </button>
                              <button
                                type="button"
                                disabled={processingReportId === rId}
                                onClick={() => handleUpdateReport(rId, 'resolved', 'Admin reviewed and resolved')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Resolved</span>
                              </button>
                            </>
                          )}
                          {report.status !== 'dismissed' && (
                            <button
                              type="button"
                              disabled={processingReportId === rId}
                              onClick={() => handleUpdateReport(rId, 'dismissed', 'Report dismissed by admin')}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'mails' || activeTab === 'inbox') && (
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

          {activeTab === 'settings' && (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <div className="p-5 sm:p-6 lg:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Profile Management</h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                      Update your administrator account name and view workspace identity
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
                      value={adminNameInput}
                      onChange={(e) => setAdminNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                      <Shield className="w-3.5 h-3.5" />
                      Administrator
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile || adminNameInput === user.name}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
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
                    className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900/80 font-bold text-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-colors"
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
                        <BellRing className="w-4.5 h-4.5 text-indigo-600" />
                        <span>Instant Push Notifications</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Receive instant native desktop notifications for new emails, chat messages, and reports
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
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pushNotificationsEnabled && pushPermission === 'granted' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
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
                        <Volume2 className="w-4.5 h-4.5 text-indigo-600" />
                        <span>Desktop Audio Alerts</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Play sound chime on incoming direct messages, reports, and emails
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
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${desktopAudioAlerts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
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
                        <Mail className="w-4.5 h-4.5 text-indigo-600" />
                        <span>Email Summary Notifications</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Receive email summaries for system events and unread messages
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
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${emailNotifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
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
                    onClick={toggleAdminPriorityAlerts}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                  >
                    <div className="pr-4">
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-4.5 h-4.5 text-indigo-600" />
                        <span>Admin Priority Security & Report Alerts</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        Immediate high-priority popups and alerts whenever a user files an account violation report
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={adminPriorityAlerts}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAdminPriorityAlerts();
                      }}
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${adminPriorityAlerts ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${adminPriorityAlerts ? 'translate-x-5.5' : 'translate-x-0'
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Update Admin Name</h3>
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
                  Administrator Name
                </label>
                <input
                  type="text"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
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
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
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
