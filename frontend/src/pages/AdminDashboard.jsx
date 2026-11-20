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
  Bell
} from 'lucide-react';
import { getAllUsers, updateUserRole } from '../services/api';
import MailModule from '../components/mail/MailModule';
import ChatModule from '../components/chat/ChatModule';
import { initSocket } from '../services/socket';
import { playWhatsAppNotificationSound } from '../services/sound';

export default function AdminDashboard({ user = {}, onLogout }) {
  const { module } = useParams();
  const navigate = useNavigate();
  const activeTab = module || 'users';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');

  // Unread count states
  const [unreadEmailCount, setUnreadEmailCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Toast alert
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time listener for incoming chats to alert admin when on other tabs
  useEffect(() => {
    if (!user) return;
    const socket = initSocket(user);

    const handleChatActivity = ({ chatId, message }) => {
      if (activeTab !== 'chats') {
        playWhatsAppNotificationSound();
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    const handleUserUpdate = () => {
      fetchUsers();
    };

    socket.on('chat_activity', handleChatActivity);
    socket.on('user_registered', handleUserUpdate);
    socket.on('user_updated', handleUserUpdate);
    return () => {
      socket.off('chat_activity', handleChatActivity);
      socket.off('user_registered', handleUserUpdate);
      socket.off('user_updated', handleUserUpdate);
    };
  }, [user, activeTab, fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    setErrorMsg('');
    try {
      const res = await updateUserRole(token, userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.user.role } : u))
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.filter((u) => u.role === 'user').length;
  const pendingCount = users.filter((u) => u.role === 'pending').length;

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

            {/* Users & Roles */}
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

            {/* Mails Service */}
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

            {/* Chats Service */}
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

          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
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
              {activeTab === 'users' && 'User & Role Management'}
              {(activeTab === 'mails' || activeTab === 'inbox') && 'Mails & Communications'}
              {activeTab === 'chats' && 'Real-Time Chats & Groups'}
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

        {/* Content area: dynamically padded based on active tab */}
        <div className={`flex-1 min-h-0 relative z-10 flex flex-col ${
          activeTab === 'mails' || activeTab === 'inbox' || activeTab === 'chats'
            ? 'p-2 sm:p-4 overflow-hidden'
            : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
        }`}>

          {errorMsg && activeTab === 'users' && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Total Registered</span>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">
                    {totalUsers}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Pending Assignment</span>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                    {pendingCount}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Users</span>
                    <UserCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                    {userCount}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Administrators</span>
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                    {adminCount}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-84">
                  <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full pl-9.5 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter Role:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      <option value="all">All Roles</option>
                      <option value="pending">Pending Only</option>
                      <option value="user">User Only</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchUsers}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors cursor-pointer"
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
                    <p className="text-sm font-semibold">No users found matching your search</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4 sm:px-6">User</th>
                          <th className="py-3.5 px-4">Current Role</th>
                          <th className="py-3.5 px-4">Joined Date</th>
                          <th className="py-3.5 px-4 text-right">Role Assignment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                        {filteredUsers.map((u) => {
                          const isSelf = u._id === user._id;

                          return (
                            <tr key={u._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                    {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                      <span>{u.name}</span>
                                      {isSelf && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                  u.role === 'admin'
                                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                    : u.role === 'user'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}>
                                  {u.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                                  {u.role === 'user' && <UserCheck className="w-3.5 h-3.5" />}
                                  {u.role === 'pending' && <Clock className="w-3.5 h-3.5" />}
                                  <span>{u.role}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  {updatingId === u._id && (
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                  )}
                                  <select
                                    value={u.role}
                                    disabled={isSelf || updatingId === u._id}
                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none transition-all cursor-pointer ${isSelf
                                      ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500'
                                      : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
                                      }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
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

          {/* TAB 2: MAILS SERVICE */}
          {(activeTab === 'mails' || activeTab === 'inbox') && (
            <MailModule
              user={user}
              showToast={showToast}
              onUnreadCountChange={setUnreadEmailCount}
            />
          )}

          {/* TAB 3: CHATS SERVICE */}
          {activeTab === 'chats' && (
            <ChatModule
              user={user}
              showToast={showToast}
              onUnreadCountChange={setUnreadChatCount}
            />
          )}

        </div>

      </div>

      {/* Global Floating Toast Alert Notification for Admin */}
      {toast && toast.type !== 'chat' && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-top-4 max-w-sm backdrop-blur-md"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
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
