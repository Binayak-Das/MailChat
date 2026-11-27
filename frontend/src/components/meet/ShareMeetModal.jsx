import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  Search,
  Users,
  MessageSquare,
  Send,
  Video,
  Loader2,
  Link2,
  UserPlus
} from 'lucide-react';
import { fetchChats, getChatUsers, accessOrCreateChat, shareMeetingToChats } from '../../services/api';
import { cookieStorage } from '../../services/storage';

export default function ShareMeetModal({
  isOpen,
  onClose,
  meeting,
  currentUser,
  onShared,
  showToast
}) {
  const token = cookieStorage.getItem('mailchat_token');
  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();

  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const meetingCode = meeting?.meetingCode || '';
  const meetingUrl =
    typeof window !== 'undefined' && meetingCode
      ? `${window.location.origin}/meet/${meetingCode}`
      : `/meet/${meetingCode}`;

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoadingChats(true);
    Promise.all([
      fetchChats(token).catch(() => ({ chats: [] })),
      getChatUsers(token).catch(() => ({ users: [] }))
    ])
      .then(([chatRes, userRes]) => {
        setChats(chatRes.chats || []);
        setAllUsers(userRes.users || []);
      })
      .finally(() => setLoadingChats(false));
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedChatIds([]);
      setSelectedUserIds([]);
      setSearchQuery('');
      setCustomMessage('');
    }
  }, [isOpen]);

  const getChatDisplay = (chat) => {
    if (chat.isGroupChat) {
      return {
        name: chat.chatName || 'Group Chat',
        subtitle: `${chat.users?.length || 0} members`,
        isGroup: true
      };
    }
    const partner = chat.users?.find(
      (u) => (u._id || u.id || u)?.toString() !== currentUserId
    );
    return {
      name: partner?.name || chat.chatName || 'Direct Chat',
      subtitle: partner?.email || 'Personal Chat',
      isGroup: false
    };
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const info = getChatDisplay(c);
      return (
        info.name.toLowerCase().includes(q) ||
        info.subtitle.toLowerCase().includes(q)
      );
    });
  }, [chats, searchQuery, currentUserId]);

  const existingPartnerIds = useMemo(() => {
    const ids = new Set();
    chats.forEach((c) => {
      if (!c.isGroupChat) {
        c.users?.forEach((u) => {
          const uid = (u._id || u.id || u)?.toString();
          if (uid && uid !== currentUserId) ids.add(uid);
        });
      }
    });
    return ids;
  }, [chats, currentUserId]);

  const filteredUsersWithoutChat = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      const uid = (u._id || u.id)?.toString();
      if (!uid || uid === currentUserId || existingPartnerIds.has(uid)) return false;
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, existingPartnerIds, searchQuery, currentUserId]);

  const toggleChat = (chatId) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      if (showToast) showToast('Copied to clipboard!', 'success');
    } catch {
      if (showToast) showToast('Failed to copy', 'error');
    }
  };

  const handleShare = async () => {
    if ((selectedChatIds.length === 0 && selectedUserIds.length === 0) || !meetingCode) return;
    setSending(true);
    try {
      const resolvedChatIds = [...selectedChatIds];
      for (const uid of selectedUserIds) {
        try {
          const chatRes = await accessOrCreateChat(token, uid);
          if (chatRes?.chat?._id && !resolvedChatIds.includes(chatRes.chat._id)) {
            resolvedChatIds.push(chatRes.chat._id);
          }
        } catch {
          // ignore individual chat creation error
        }
      }

      if (resolvedChatIds.length === 0) {
        throw new Error('Could not resolve any target chats');
      }

      const res = await shareMeetingToChats(token, meetingCode, {
        chatIds: resolvedChatIds,
        customMessage,
        meetingUrl
      });
      if (showToast) {
        showToast(
          `Meet link shared to ${res.sharedCount || resolvedChatIds.length} chat(s)!`,
          'success'
        );
      }
      if (onShared) onShared(res);
      onClose();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to share link', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !meeting) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share Meeting Link
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                {meeting.title || 'MailChat Meet'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-200 truncate">
                  {meetingUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(meetingUrl, 'link')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-800">
              <span>
                Meeting Code:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {meetingCode}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(meetingCode, 'code')}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                {copiedCode ? 'Copied Code!' : 'Copy Code'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Share directly to Groups & Personal Chats
            </label>
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups or contacts..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {loadingChats ? (
                <div className="py-8 flex items-center justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredChats.length === 0 && filteredUsersWithoutChat.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No chats, groups, or users found.
                </div>
              ) : (
                <>
                  {filteredChats.map((chat) => {
                    const info = getChatDisplay(chat);
                    const selected = selectedChatIds.includes(chat._id);
                    return (
                      <button
                        key={chat._id}
                        type="button"
                        onClick={() => toggleChat(chat._id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          selected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                              info.isGroup ? 'bg-purple-600' : 'bg-blue-600'
                            }`}
                          >
                            {info.isGroup ? (
                              <Users className="w-4 h-4" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              <span>{info.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                  info.isGroup
                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {info.isGroup ? 'Group' : 'Direct'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {info.subtitle}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}

                  {filteredUsersWithoutChat.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Other Users
                      </div>
                      {filteredUsersWithoutChat.map((u) => {
                        const uid = (u._id || u.id)?.toString();
                        const selected = selectedUserIds.includes(uid);
                        return (
                          <button
                            key={uid}
                            type="button"
                            onClick={() => toggleUser(uid)}
                            className={`w-full p-2.5 mb-1.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                              selected
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                <UserPlus className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                                    User
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                selected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Optional note (e.g., Join our quick standup!)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedChatIds.length + selectedUserIds.length} recipient{(selectedChatIds.length + selectedUserIds.length) === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={(selectedChatIds.length === 0 && selectedUserIds.length === 0) || sending}
              onClick={handleShare}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center gap-1.5 cursor-pointer"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Invite</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
