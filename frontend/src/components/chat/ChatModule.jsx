import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Users,
  Search,
  Send,
  Plus,
  Smile,
  MoreVertical,
  ArrowLeft,
  X,
  Check,
  CheckCheck,
  UserPlus,
  UserMinus,
  LogOut,
  Edit2,
  Trash2,
  Reply,
  Forward,
  ShieldAlert,
  UserX,
  UserCheck,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Maximize2,
  Loader2,
  Info,
  CornerUpLeft,
  AlertTriangle
} from 'lucide-react';
import {
  fetchChats,
  accessOrCreateChat,
  getChatUsers,
  createGroupChat,
  renameGroupChat,
  addMemberToGroup,
  removeMemberFromGroup,
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  forwardMessage,
  markMessagesRead,
  toggleMessageReaction,
  getContacts,
  addContact,
  removeContact,
  searchContacts,
  getBlockedUsers,
  blockUser,
  unblockUser,
  createReport,
  getPresenceStatus
} from '../../services/api';
import { getSocket, initSocket } from '../../services/socket';
import { playWhatsAppNotificationSound } from '../../services/sound';
import { sendDesktopNotification } from '../../services/pushNotification';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
      '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🥳', '😎', '🤓', '🧐', '😕', '😟',
      '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭'
    ]
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤏',
      '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾',
      '✍️', '🙏', '🦶', '🦵', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '👀', '👁️'
    ]
  },
  {
    name: 'Reactions',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '🌟', '💫', '⭐', '💥', '💯',
      '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '🚀', '⚡', '☀️', '🌈', '💎', '🎯', '💡'
    ]
  },
  {
    name: 'Work',
    icon: '💼',
    emojis: [
      '✉️', '📩', '📨', '📧', '📤', '📥', '📦', '🏷️', '📌', '📍', '📎', '📏', '📐',
      '📑', '📊', '📈', '📉', '📜', '📋', '📅', '📆', '🗂️', '📁', '📂', '🗄️', '💼',
      '💻', '🖥️', '📱', '🔒', '🔑', '💡', '⏰', '⏳', '⌛', '🔔', '📣', '📢', '🔍'
    ]
  }
];

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatLastSeen = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // Format time as 10:00am / 02:45pm
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  const minutePad = minutes < 10 ? `0${minutes}` : minutes;
  const timeStr = `${hour12}:${minutePad}${ampm}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `today at ${timeStr}`;
  }
  if (isYesterday) {
    return `yesterday at ${timeStr}`;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[date.getMonth()];
  const day = date.getDate();

  if (date.getFullYear() === now.getFullYear()) {
    return `${monthStr} ${day} at ${timeStr}`;
  }
  return `${monthStr} ${day}, ${date.getFullYear()} at ${timeStr}`;
};

const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default function ChatModule({ user, showToast, onUnreadCountChange }) {
  const token = localStorage.getItem('mailchat_token');
  const currentUserId = user?._id || user?.id;

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [sidebarTab, setSidebarTab] = useState('chats');
  const [chatTab, setChatTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargetIds, setForwardTargetIds] = useState([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);

  const [activeMessageActionId, setActiveMessageActionId] = useState(null);
  const [chatHeaderMenuOpen, setChatHeaderMenuOpen] = useState(false);

  const [savedContacts, setSavedContacts] = useState([]);
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  const [reportingUser, setReportingUser] = useState(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [previewMedia, setPreviewMedia] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCat, setSelectedEmojiCat] = useState('Smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingMemberUserId, setAddingMemberUserId] = useState('');

  const processedReceivedMsgIdsRef = useRef(new Set());

  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (!e.target.closest('.message-action-menu-container')) {
        setActiveMessageActionId(null);
      }
      if (!e.target.closest('.chat-header-menu-container')) {
        setChatHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const getChatDetails = useCallback((chat) => {
    if (!chat) return { name: 'Chat', isOnline: false, subtitle: '', avatarInitials: 'CH', partner: null };

    if (chat.isGroupChat) {
      return {
        name: chat.chatName || 'Group Chat',
        isOnline: false,
        subtitle: `${chat.users?.length || 0} members`,
        avatarInitials: (chat.chatName || 'GP').slice(0, 2).toUpperCase(),
        isGroup: true,
        partner: null
      };
    }

    const partner = chat.users?.find((u) => (u._id || u.id || u).toString() !== currentUserId?.toString());
    const pid = partner ? (partner._id || partner.id || partner).toString() : '';
    const isOnline = pid ? onlineUsers.includes(pid) : false;
    const name = partner?.name || 'Direct Message';
    const statusInfo = pid ? userStatuses[pid] : null;
    const lastSeenDate = statusInfo?.lastSeen || partner?.lastSeen;
    const subtitle = isOnline
      ? 'Online'
      : lastSeenDate
        ? `Last seen ${formatLastSeen(lastSeenDate)}`
        : partner?.email || 'Offline';

    return {
      name,
      isOnline,
      subtitle,
      avatarInitials: name.slice(0, 2).toUpperCase(),
      partner,
      isGroup: false
    };
  }, [currentUserId, onlineUsers, userStatuses]);

  const loadChats = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingChats(true);
    try {
      const data = await fetchChats(token);
      if (data.chats) {
        setChats(data.chats);
        const totalUnread = data.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        if (onUnreadCountChange) onUnreadCountChange(totalUnread);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, [token, onUnreadCountChange]);

  useEffect(() => {
    if (!chats) return;
    const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    if (onUnreadCountChange) onUnreadCountChange(totalUnread);
  }, [chats, onUnreadCountChange]);

  const loadContactsData = useCallback(async () => {
    if (!token) return;
    try {
      const [contactsRes, blockedRes] = await Promise.all([
        getContacts(token),
        getBlockedUsers(token)
      ]);
      if (contactsRes.contacts) setSavedContacts(contactsRes.contacts);
      if (blockedRes.blockedUsers) setBlockedUsersList(blockedRes.blockedUsers);
    } catch (err) {
      console.error('Error fetching contacts / blocked list:', err);
    }
  }, [token]);

  const loadAllUsersForGroup = useCallback(async (search = '') => {
    if (!token) return;
    try {
      const data = await getChatUsers(token, search);
      if (data.users) setContacts(data.users);
    } catch (err) {
      console.error('Failed to load users for group:', err);
    }
  }, [token]);

  useEffect(() => {
    loadChats();
    loadContactsData();
    loadAllUsersForGroup('');

    // Fetch strict real-time presence initially
    if (token) {
      getPresenceStatus(token)
        .then((res) => {
          if (res?.onlineUsers) setOnlineUsers(res.onlineUsers);
          if (res?.userStatuses) setUserStatuses(res.userStatuses);
        })
        .catch(() => {});
    }
  }, [loadChats, loadContactsData, loadAllUsersForGroup, token]);

  useEffect(() => {
    if (!user || !token) return;

    const socket = initSocket(user);
    socket.emit('get_online_users');

    const handleConnected = () => {
      socket.emit('get_online_users');
    };

    const handleOnlineUsers = (usersList) => {
      setOnlineUsers(usersList);
    };

    const handleUserPresence = (data) => {
      if (data?.onlineUsers) {
        setOnlineUsers(data.onlineUsers);
      }
      if (data?.userId) {
        setUserStatuses((prev) => ({
          ...prev,
          [data.userId]: {
            isOnline: data.status === 'online',
            lastSeen: data.lastSeen || new Date()
          }
        }));
      }
    };

    const handleNewChat = (newChat) => {
      if (!newChat) return;
      const newChatId = (newChat._id || newChat.id)?.toString();
      if (newChatId) {
        socket.emit('join_chat', newChatId);
      }
      setChats((prev) => {
        const exists = prev.some((c) => (c._id || c.id)?.toString() === newChatId);
        if (exists) {
          return prev.map((c) => ((c._id || c.id)?.toString() === newChatId ? newChat : c));
        }
        return [newChat, ...prev];
      });
      loadChats(true);
    };

    const handleMessageReceived = (newMessage) => {
      if (!newMessage) return;
      const senderId = (newMessage.sender?._id || newMessage.sender?.id || newMessage.sender)?.toString();
      if (senderId && senderId === currentUserId?.toString()) return;

      const msgChatId = (newMessage.chat?._id || newMessage.chat?.id || newMessage.chat)?.toString();
      const currentActiveId = activeChatRef.current?._id?.toString();
      const newMsgId = (newMessage._id || newMessage.id)?.toString();

      if (newMsgId) {
        if (processedReceivedMsgIdsRef.current.has(newMsgId)) {
          return;
        }
        processedReceivedMsgIdsRef.current.add(newMsgId);
        if (processedReceivedMsgIdsRef.current.size > 200) {
          const first = processedReceivedMsgIdsRef.current.values().next().value;
          processedReceivedMsgIdsRef.current.delete(first);
        }
      }

      if (currentActiveId === msgChatId) {
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) return prev;
          return [...prev, newMessage];
        });
        setTimeout(() => scrollToBottom(), 50);

        socket.emit('mark_messages_read', { chatId: msgChatId });
        markMessagesRead(token, msgChatId).catch(() => {});
      } else {
        const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
        if (audioPref !== 'false') playWhatsAppNotificationSound();
        const senderName = newMessage.sender?.name || 'Someone';
        const snippet = newMessage.content || (newMessage.attachments?.length ? 'Sent an attachment' : 'New message');
        sendDesktopNotification(`Message from ${senderName}`, {
          body: snippet,
          tag: `chat-${msgChatId}`
        });
        showToast?.(`Message from ${senderName}: ${snippet}`, 'info');
      }

      socket.emit('message_delivered_ack', {
        messageId: newMsgId,
        senderId,
        chatId: msgChatId
      });

      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((c) => (c._id || c.id)?.toString() === msgChatId);
        const isCurrentlyActive = currentActiveId === msgChatId;
        if (chatIndex > -1) {
          const currentUnread = prevChats[chatIndex].unreadCount || 0;
          const updatedChat = {
            ...prevChats[chatIndex],
            latestMessage: newMessage,
            unreadCount: isCurrentlyActive ? 0 : currentUnread + 1,
            updatedAt: new Date().toISOString()
          };
          const rest = prevChats.filter((_, idx) => idx !== chatIndex);
          return [updatedChat, ...rest];
        } else {
          loadChats(true);
          const newChatObj = typeof newMessage.chat === 'object' && newMessage.chat !== null
            ? { ...newMessage.chat, latestMessage: newMessage, unreadCount: isCurrentlyActive ? 0 : 1, updatedAt: new Date().toISOString() }
            : null;
          return newChatObj ? [newChatObj, ...prevChats] : prevChats;
        }
      });
    };

    const handleChatUpdated = (updatedChat) => {
      if (!updatedChat) return;
      const cid = (updatedChat._id || updatedChat.id)?.toString();
      if (cid) {
        socket.emit('join_chat', cid);
      }
      setChats((prev) => {
        const exists = prev.some((c) => (c._id || c.id)?.toString() === cid);
        if (exists) {
          return prev.map((c) => ((c._id || c.id)?.toString() === cid ? { ...c, ...updatedChat } : c));
        }
        return [updatedChat, ...prev];
      });
      loadChats(true);
    };

    const handleMessageDelivered = ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if ((m._id || m.id)?.toString() === messageId?.toString()) {
            const delivered = Array.isArray(m.deliveredTo) ? m.deliveredTo : [];
            const exists = delivered.some((u) => (u._id || u.id || u)?.toString() === userId?.toString());
            return exists ? m : { ...m, deliveredTo: [...delivered, userId] };
          }
          return m;
        })
      );
    };

    const handleMessagesRead = ({ chatId, userId }) => {
      if (activeChatRef.current?._id?.toString() === chatId?.toString()) {
        setMessages((prev) =>
          prev.map((m) => {
            const readBy = Array.isArray(m.readBy) ? m.readBy : [];
            const exists = readBy.some((u) => (u._id || u.id || u)?.toString() === userId?.toString());
            return exists ? m : { ...m, readBy: [...readBy, userId] };
          })
        );
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      const updatedId = (updatedMessage._id || updatedMessage.id)?.toString();
      setMessages((prev) =>
        prev.map((m) => ((m._id || m.id)?.toString() === updatedId ? updatedMessage : m))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if ((m._id || m.id)?.toString() === messageId?.toString()) {
            return {
              ...m,
              isDeleted: true,
              content: 'This message was deleted',
              attachments: []
            };
          }
          return m;
        })
      );
    };

    const handleGroupActivity = ({ title, message, chat }) => {
      const audioPref = localStorage.getItem('mailchat_pref_audio_alerts');
      if (audioPref !== 'false') playWhatsAppNotificationSound();
      showToast?.(`${title}: ${message}`, 'info');
      sendDesktopNotification(title, { body: message });
      if (chat) {
        setChats((prev) => {
          const cid = (chat._id || chat.id)?.toString();
          const exists = prev.some((c) => (c._id || c.id)?.toString() === cid);
          return exists ? prev.map((c) => ((c._id || c.id)?.toString() === cid ? chat : c)) : [chat, ...prev];
        });
      }
    };

    const handleTyping = ({ room, user: typingUser }) => {
      if (room === activeChatRef.current?._id?.toString()) {
        if (typingUser?.name && typingUser?.id !== currentUserId) {
          setTypingUsers((prev) => new Set([...prev, typingUser.name]));
        }
      }
    };

    const handleStopTyping = ({ room, user: typingUser }) => {
      if (room === activeChatRef.current?._id?.toString()) {
        if (typingUser?.name) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(typingUser.name);
            return next;
          });
        }
      }
    };

    const handleReactionUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => ((m._id || m.id) === (updatedMessage._id || updatedMessage.id) ? updatedMessage : m))
      );
    };

    const handleBlockStatusChanged = () => {
      loadContactsData();
    };

    socket.on('connected', handleConnected);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_presence', handleUserPresence);
    socket.on('message_received', handleMessageReceived);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('group_activity', handleGroupActivity);
    socket.on('new_chat', handleNewChat);
    socket.on('chat_updated', handleChatUpdated);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('block_status_changed', handleBlockStatusChanged);

    return () => {
      socket.off('connected', handleConnected);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_presence', handleUserPresence);
      socket.off('message_received', handleMessageReceived);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('group_activity', handleGroupActivity);
      socket.off('new_chat', handleNewChat);
      socket.off('chat_updated', handleChatUpdated);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('block_status_changed', handleBlockStatusChanged);
    };
  }, [user, token, currentUserId, loadChats, loadContactsData, showToast]);

  const activeChatId = (activeChat?._id || activeChat?.id)?.toString();

  useEffect(() => {
    if (!activeChatId || !token) {
      setMessages([]);
      return;
    }

    const socket = getSocket();
    socket.emit('join_chat', activeChatId);
    socket.emit('mark_messages_read', { chatId: activeChatId });
    markMessagesRead(token, activeChatId).catch(() => {});

    setChats((prev) =>
      prev.map((c) =>
        (c._id || c.id)?.toString() === activeChatId ? { ...c, unreadCount: 0 } : c
      )
    );

    setTypingUsers(new Set());
    setAttachments([]);
    setReplyingTo(null);
    setEditingMessage(null);
    setShowEmojiPicker(false);

    let isMounted = true;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await fetchMessages(token, activeChatId);
        if (isMounted && data.messages) {
          setMessages(data.messages);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    setChats((prev) =>
      prev.map((c) => ((c._id || c.id)?.toString() === activeChatId ? { ...c, unreadCount: 0 } : c))
    );

    return () => {
      isMounted = false;
      socket.emit('leave_chat', activeChatId);
    };
  }, [activeChatId, token]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSingleSize = 10 * 1024 * 1024;
    const validFiles = files.filter((f) => {
      if (f.size > maxSingleSize) {
        showToast?.(`"${f.name}" exceeds 10MB limit`, 'error');
        return false;
      }
      return true;
    });

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            data: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const removeAttachment = (idxToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleInsertEmoji = (emoji) => {
    const input = messageInputRef.current;
    if (!input) {
      setMessageInput((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? messageInput.length;
    const end = input.selectionEnd ?? messageInput.length;
    const nextText = messageInput.substring(0, start) + emoji + messageInput.substring(end);
    setMessageInput(nextText);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!activeChat) return;
    const socket = getSocket();
    const chatId = activeChat._id || activeChat.id;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        room: chatId,
        user: { id: currentUserId, name: user?.name || 'Someone' }
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        room: chatId,
        user: { id: currentUserId, name: user?.name || 'Someone' }
      });
      isTypingRef.current = false;
    }, 2000);
  };

  const activeChatDetails = getChatDetails(activeChat);

  const isCurrentChatBlocked = Boolean(
    !activeChat?.isGroupChat &&
    activeChatDetails.partner &&
    blockedUsersList.some(
      (b) => (b._id || b.id || b).toString() === (activeChatDetails.partner._id || activeChatDetails.partner.id || activeChatDetails.partner).toString()
    )
  );

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isCurrentChatBlocked) {
      showToast?.('Cannot send messages to a blocked user', 'error');
      return;
    }

    if (editingMessage) {
      handleSaveEdit();
      return;
    }

    const hasContent = messageInput.trim().length > 0;
    const hasAttachments = attachments.length > 0;

    if ((!hasContent && !hasAttachments) || !activeChat || sendingMessage) return;

    const content = messageInput.trim();
    const outgoingAttachments = [...attachments];
    const replyTargetId = replyingTo ? (replyingTo._id || replyingTo.id) : null;
    const chatId = activeChat._id || activeChat.id;

    setMessageInput('');
    setAttachments([]);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    const socket = getSocket();
    if (isTypingRef.current) {
      socket.emit('stop_typing', {
        room: chatId,
        user: { id: currentUserId, name: user?.name || 'Someone' }
      });
      isTypingRef.current = false;
    }

    setSendingMessage(true);
    try {
      const data = await sendMessage(token, {
        chatId,
        content,
        attachments: outgoingAttachments,
        replyTo: replyTargetId
      });

      if (data.message) {
        const newMsgId = (data.message._id || data.message.id)?.toString();
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom(), 50);

        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex((c) => (c._id || c.id) === chatId);
          if (chatIndex > -1) {
            const updated = {
              ...prevChats[chatIndex],
              latestMessage: data.message,
              updatedAt: new Date().toISOString()
            };
            const rest = prevChats.filter((_, idx) => idx !== chatIndex);
            return [updated, ...rest];
          }
          return prevChats;
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast?.(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessage(message);
    setMessageInput(message.content || '');
    setReplyingTo(null);
    setActiveMessageActionId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageInput('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    if (!messageInput.trim()) {
      showToast?.('Message content cannot be empty', 'error');
      return;
    }

    try {
      const data = await editMessage(token, editingMessage._id || editingMessage.id, messageInput.trim());
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => ((m._id || m.id) === (editingMessage._id || editingMessage.id) ? data.message : m))
        );
        const socket = getSocket();
        socket.emit('message_updated', data.message);
        showToast?.('Message updated', 'success');
      }
      setEditingMessage(null);
      setMessageInput('');
    } catch (err) {
      showToast?.(err.message || 'Failed to edit message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(token, messageId);
      setMessages((prev) =>
        prev.map((m) =>
          (m._id || m.id) === messageId
            ? { ...m, isDeleted: true, content: 'This message was deleted', attachments: [] }
            : m
        )
      );
      const socket = getSocket();
      socket.emit('message_deleted', { messageId, chatId: activeChat?._id || activeChat?.id });
      showToast?.('Message deleted', 'success');
      setActiveMessageActionId(null);
    } catch (err) {
      showToast?.(err.message || 'Failed to delete message', 'error');
    }
  };

  const handleStartReply = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    setActiveMessageActionId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleStartForward = (message) => {
    setForwardingMessage(message);
    setForwardTargetIds([]);
    setForwardSearch('');
    setShowForwardModal(true);
    setActiveMessageActionId(null);
  };

  const handleExecuteForward = async () => {
    if (!forwardingMessage || forwardTargetIds.length === 0) return;
    setForwardLoading(true);
    try {
      await forwardMessage(token, forwardingMessage._id || forwardingMessage.id, forwardTargetIds);
      showToast?.('Message forwarded successfully', 'success');
      setShowForwardModal(false);
      setForwardingMessage(null);
      setForwardTargetIds([]);
      loadChats(true);
    } catch (err) {
      showToast?.(err.message || 'Failed to forward message', 'error');
    } finally {
      setForwardLoading(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const data = await toggleMessageReaction(token, messageId, emoji);
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => ((m._id || m.id) === messageId ? data.message : m))
        );
        const socket = getSocket();
        socket.emit('message_reaction', {
          chatId: activeChat?._id || activeChat?.id,
          message: data.message
        });
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleAddContact = async (targetUserId) => {
    try {
      const res = await addContact(token, targetUserId);
      setSavedContacts(res.contacts || []);
      showToast?.(res.message || 'Contact added', 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to add contact', 'error');
    }
  };

  const handleRemoveContact = async (targetUserId) => {
    try {
      const res = await removeContact(token, targetUserId);
      setSavedContacts(res.contacts || []);
      showToast?.('Contact removed', 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to remove contact', 'error');
    }
  };

  const handleBlockUser = async (targetUserId) => {
    if (!window.confirm('Block this user? You will not receive messages from them.')) return;
    try {
      const res = await blockUser(token, targetUserId);
      showToast?.(res.message || 'User blocked', 'success');
      loadContactsData();
      setChatHeaderMenuOpen(false);
    } catch (err) {
      showToast?.(err.message || 'Failed to block user', 'error');
    }
  };

  const handleUnblockUser = async (targetUserId) => {
    try {
      const res = await unblockUser(token, targetUserId);
      showToast?.(res.message || 'User unblocked', 'success');
      loadContactsData();
      setChatHeaderMenuOpen(false);
    } catch (err) {
      showToast?.(err.message || 'Failed to unblock user', 'error');
    }
  };

  const handleOpenReportModal = (targetUser) => {
    setReportingUser(targetUser);
    setReportReason('Spam');
    setReportDetails('');
    setChatHeaderMenuOpen(false);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingUser) return;
    setSubmittingReport(true);
    try {
      const targetId = reportingUser._id || reportingUser.id;
      await createReport(token, {
        reportedUserId: targetId,
        reason: reportReason,
        details: reportDetails
      });
      showToast?.('Account report submitted to admin', 'success');
      setReportingUser(null);
    } catch (err) {
      showToast?.(err.message || 'Failed to report account', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSearchUsers = async (q) => {
    setContactSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await searchContacts(token, q.trim());
      setSearchResults(res.users || []);
    } catch (err) {
      console.error('Error searching contacts:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const openNewDirectModal = () => {
    setContactSearch('');
    loadAllUsersForGroup('');
    setShowNewDirectModal(true);
  };

  const openNewGroupModal = () => {
    setContactSearch('');
    setSelectedMembers([]);
    setGroupName('');
    setGroupDescription('');
    loadAllUsersForGroup('');
    setShowNewGroupModal(true);
  };

  const handleStartDirectChat = async (targetUserId) => {
    try {
      const data = await accessOrCreateChat(token, targetUserId);
      if (data.chat) {
        const socket = getSocket();
        if (socket) {
          socket.emit('new_chat', data.chat);
          socket.emit('join_chat', data.chat._id || data.chat.id);
        }
        setChats((prev) => {
          const exists = prev.some((c) => (c._id || c.id) === (data.chat._id || data.chat.id));
          return exists ? prev : [data.chat, ...prev];
        });
        setActiveChat(data.chat);
        setMobileChatOpen(true);
        setShowNewDirectModal(false);
        showToast?.('Conversation opened', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to open conversation', 'error');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast?.('Please enter a group name', 'error');
      return;
    }
    if (selectedMembers.length < 1) {
      showToast?.('Please select at least 1 member for the group', 'error');
      return;
    }

    setCreatingGroup(true);
    try {
      const data = await createGroupChat(token, {
        name: groupName.trim(),
        users: selectedMembers,
        description: groupDescription.trim()
      });

      if (data.chat) {
        const socket = getSocket();
        if (socket) {
          socket.emit('new_chat', data.chat);
          socket.emit('group_updated', data.chat);
          socket.emit('join_chat', data.chat._id || data.chat.id);
        }
        setChats((prev) => [data.chat, ...prev]);
        setActiveChat(data.chat);
        setMobileChatOpen(true);
        setShowNewGroupModal(false);
        showToast?.(`Group "${data.chat.chatName}" created!`, 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !activeChat) return;
    if (!isGroupAdmin && user?.role !== 'admin') {
      showToast?.('Only group admin can rename the group', 'error');
      return;
    }
    try {
      const data = await renameGroupChat(token, {
        chatId: activeChat._id || activeChat.id,
        chatName: newGroupName.trim()
      });
      if (data.chat) {
        setActiveChat(data.chat);
        setChats((prev) =>
          prev.map((c) => ((c._id || c.id) === (data.chat._id || data.chat.id) ? data.chat : c))
        );
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        setIsEditingName(false);
        showToast?.('Group name updated', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to rename group', 'error');
    }
  };

  const handleAddMemberToGroup = async () => {
    if (!addingMemberUserId || !activeChat) return;
    try {
      const data = await addMemberToGroup(token, {
        chatId: activeChat._id || activeChat.id,
        userId: addingMemberUserId
      });
      if (data.chat) {
        setActiveChat(data.chat);
        setChats((prev) =>
          prev.map((c) => ((c._id || c.id) === (data.chat._id || data.chat.id) ? data.chat : c))
        );
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        setAddingMemberUserId('');
        showToast?.('Member added to group', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to add member', 'error');
    }
  };

  const handleRemoveMember = async (userIdToRemove) => {
    if (!activeChat) return;
    try {
      const data = await removeMemberFromGroup(token, {
        chatId: activeChat._id || activeChat.id,
        userId: userIdToRemove
      });
      if (data.chat) {
        setActiveChat(data.chat);
        setChats((prev) =>
          prev.map((c) => ((c._id || c.id) === (data.chat._id || data.chat.id) ? data.chat : c))
        );
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        showToast?.('Member removed', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeChat) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await removeMemberFromGroup(token, {
        chatId: activeChat._id || activeChat.id,
        userId: currentUserId
      });
      setChats((prev) => prev.filter((c) => (c._id || c.id) !== (activeChat._id || activeChat.id)));
      setActiveChat(null);
      setShowGroupInfoModal(false);
      showToast?.('You left the group', 'info');
    } catch (err) {
      showToast?.(err.message || 'Failed to leave group', 'error');
    }
  };

  const isGroupAdmin =
    activeChat?.isGroupChat &&
    (activeChat.groupAdmin?._id || activeChat.groupAdmin)?.toString() === currentUserId?.toString();

  const filteredChats = chats.filter((c) => {
    const details = getChatDetails(c);
    const matchesSearch = details.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (chatTab === 'direct') return matchesSearch && !c.isGroupChat;
    if (chatTab === 'groups') return matchesSearch && c.isGroupChat;
    return matchesSearch;
  });

  const displayedEmojis = EMOJI_CATEGORIES.find((c) => c.name === selectedEmojiCat)
    ?.emojis.filter((e) => (emojiSearch ? e.includes(emojiSearch) : true)) || [];

  const nonMemberContacts = contacts.filter((c) => {
    const cid = (c._id || c.id).toString();
    return !activeChat?.users?.some((u) => (u._id || u.id || u).toString() === cid);
  });

  const partnerUser = activeChatDetails.partner;
  const isPartnerSaved = Boolean(
    partnerUser &&
    savedContacts.some((c) => (c._id || c.id || c).toString() === (partnerUser._id || partnerUser.id || partnerUser).toString())
  );

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        className="hidden"
        multiple
      />

      <div
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 ${
          mobileChatOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setSidebarTab('chats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === 'chats'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              Chats
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarTab('contacts');
                loadContactsData();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === 'contacts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              Contacts
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarTab('blocked');
                loadContactsData();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sidebarTab === 'blocked'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              Blocked
            </button>
          </div>

          <div className="flex items-center gap-1">
            {sidebarTab === 'chats' && (
              <>
                <button
                  type="button"
                  onClick={openNewDirectModal}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                  title="New Direct Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={openNewGroupModal}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-purple-50 hover:text-purple-600 cursor-pointer transition-colors"
                  title="Create Group Chat"
                >
                  <Users className="w-4 h-4" />
                </button>
              </>
            )}
            {sidebarTab === 'contacts' && (
              <button
                type="button"
                onClick={() => {
                  setContactSearchQuery('');
                  setSearchResults([]);
                  setShowAddContactModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        {sidebarTab === 'chats' && (
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats or members..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {['all', 'direct', 'groups'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setChatTab(tab)}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                      chatTab === tab
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5">
              {loadingChats ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs font-medium">Loading conversations...</span>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No chats found</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Start a direct chat or create a team group</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const details = getChatDetails(chat);
                  const isActive = (activeChat?._id || activeChat?.id) === (chat._id || chat.id);
                  const lastMsg = chat.latestMessage;
                  const lastTime = chat.updatedAt
                    ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <button
                      key={chat._id || chat.id}
                      type="button"
                      onClick={() => {
                        setActiveChat(chat);
                        setMobileChatOpen(true);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            chat.isGroupChat
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {chat.isGroupChat ? <Users className="w-5 h-5" /> : details.avatarInitials}
                        </div>
                        {!chat.isGroupChat && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${
                              details.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {details.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{lastTime}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {lastMsg?.isDeleted
                              ? 'Message was deleted'
                              : lastMsg?.content
                              ? lastMsg.content
                              : lastMsg?.attachments?.length
                              ? `📎 Media (${lastMsg.attachments.length})`
                              : 'No messages yet'}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white font-extrabold text-[10px] rounded-full shrink-0">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {sidebarTab === 'contacts' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {savedContacts.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <UserPlus className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No saved contacts</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Click the "Add" button above to find users and add them to your contacts
                </p>
              </div>
            ) : (
              savedContacts.map((contact) => {
                const cid = (contact._id || contact.id).toString();
                const isOnline = onlineUsers.includes(cid);
                return (
                  <div
                    key={cid}
                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                          {contact.name?.slice(0, 2).toUpperCase() || 'CT'}
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {contact.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {contact.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartDirectChat(cid)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold cursor-pointer"
                        title="Open Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(cid)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs cursor-pointer"
                        title="Remove Contact"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {sidebarTab === 'blocked' && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {blockedUsersList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <ShieldAlert className="w-8 h-8 mb-2 opacity-40 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No blocked users</span>
                <p className="text-[11px] text-slate-400 mt-1">Users you block will appear here</p>
              </div>
            ) : (
              blockedUsersList.map((blocked) => {
                const bid = (blocked._id || blocked.id).toString();
                return (
                  <div
                    key={bid}
                    className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {blocked.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {blocked.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockUser(bid)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer shadow-xs"
                    >
                      Unblock
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div
        className={`flex-1 flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative ${
          mobileChatOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-slate-950/20">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instant Real-Time Chat</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the left to start messaging, manage contacts, and collaborate seamlessly.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={openNewDirectModal}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Start Direct Chat</span>
              </button>
              <button
                type="button"
                onClick={openNewGroupModal}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30 relative">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm ${
                      activeChat.isGroupChat
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {activeChat.isGroupChat ? <Users className="w-5 h-5" /> : activeChatDetails.avatarInitials}
                  </div>
                  {!activeChat.isGroupChat && (
                    <span
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${
                        activeChatDetails.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {activeChatDetails.name}
                  </div>
                  <div className={`text-xs truncate font-medium ${
                    !activeChat.isGroupChat && activeChatDetails.isOnline
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {activeChat.isGroupChat
                      ? `${activeChat.users?.length || 0} participants`
                      : activeChatDetails.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {activeChat.isGroupChat ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupName(activeChat.chatName || '');
                      setIsEditingName(false);
                      setAddingMemberUserId('');
                      loadAllUsersForGroup('');
                      setShowGroupInfoModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Info className="w-4 h-4 text-purple-600" />
                    <span className="hidden sm:inline">Group Info</span>
                  </button>
                ) : (
                  <div className="relative chat-header-menu-container">
                    <button
                      type="button"
                      onClick={() => setChatHeaderMenuOpen(!chatHeaderMenuOpen)}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {chatHeaderMenuOpen && partnerUser && (
                      <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95">
                        {isPartnerSaved ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveContact(partnerUser._id || partnerUser.id);
                              setChatHeaderMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <UserMinus className="w-4 h-4 text-slate-500" />
                            <span>Remove from Contacts</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleAddContact(partnerUser._id || partnerUser.id);
                              setChatHeaderMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            <span>Add to Contacts</span>
                          </button>
                        )}

                        {isCurrentChatBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(partnerUser._id || partnerUser.id)}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 flex items-center gap-2 cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Unblock User</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBlockUser(partnerUser._id || partnerUser.id)}
                            className="w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2 cursor-pointer"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Block User</span>
                          </button>
                        )}

                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(partnerUser)}
                          className="w-full px-3 py-2 text-left text-xs font-semibold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center gap-2 cursor-pointer"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Report Account</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isCurrentChatBlocked && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 font-semibold px-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>You have blocked this contact. Unblock to send and receive messages.</span>
                </div>
                {partnerUser && (
                  <button
                    type="button"
                    onClick={() => handleUnblockUser(partnerUser._id || partnerUser.id)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer text-[11px]"
                  >
                    Unblock
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs font-semibold">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No Messages Yet</div>
                  <div className="text-xs text-slate-400 max-w-xs mt-1">
                    Say hello or share a file to start the conversation!
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const msgId = m._id || m.id;
                  const senderId = (m.sender?._id || m.sender?.id || m.sender)?.toString();
                  const isMe = senderId === currentUserId?.toString();
                  const senderName = isMe ? 'You' : m.sender?.name || 'Teammate';
                  const time = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  const singleReaction = m.reactions && m.reactions.length > 0 ? m.reactions[0] : null;
                  const isMyReaction =
                    singleReaction &&
                    (singleReaction.user?._id || singleReaction.user)?.toString() === currentUserId?.toString();

                  let deliveryStatus = 'sent';
                  if (isMe) {
                    if (activeChat.isGroupChat) {
                      if (m.readBy?.length > 1) deliveryStatus = 'read';
                      else if (m.deliveredTo?.length > 1) deliveryStatus = 'delivered';
                    } else {
                      const pid = partnerUser ? (partnerUser._id || partnerUser.id || partnerUser).toString() : null;
                      if (pid && m.readBy?.some((u) => (u._id || u.id || u).toString() === pid)) {
                        deliveryStatus = 'read';
                      } else if (pid && m.deliveredTo?.some((u) => (u._id || u.id || u).toString() === pid)) {
                        deliveryStatus = 'delivered';
                      }
                    }
                  }

                  return (
                    <div
                      key={msgId}
                      id={`msg-${msgId}`}
                      className={`flex gap-2.5 relative group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs bg-slate-600 dark:bg-slate-700">
                          {senderName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-md md:max-w-lg relative ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                        {!m.isDeleted && (
                          <div
                            className={`absolute -top-3.5 ${
                              isMe ? 'right-0' : 'left-0'
                            } hidden group-hover:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md z-20 backdrop-blur-sm`}
                          >
                            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => {
                              const isSelected = singleReaction?.emoji === emoji;
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReaction(msgId, emoji)}
                                  className={`hover:scale-125 transition-transform p-0.5 rounded-full text-xs leading-none cursor-pointer ${
                                    isSelected ? 'bg-blue-100 dark:bg-blue-900/60 scale-110' : ''
                                  }`}
                                  title={isSelected ? `Remove ${emoji}` : `React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}

                            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                            <button
                              type="button"
                              onClick={() => handleStartReply(m)}
                              className="p-1 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartForward(m)}
                              className="p-1 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Forward"
                            >
                              <Forward className="w-3.5 h-3.5" />
                            </button>

                            {(isMe || user?.role === 'admin') && (
                              <div className="relative message-action-menu-container">
                                <button
                                  type="button"
                                  onClick={() => setActiveMessageActionId(activeMessageActionId === msgId ? null : msgId)}
                                  className="p-1 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="More options"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMessageActionId === msgId && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1">
                                    {isMe && !m.isDeleted && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(m)}
                                        className="w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msgId)}
                                      className="w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`flex items-center gap-2 mb-1 text-xs ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-bold text-slate-900 dark:text-white">{senderName}</span>
                          <span className="text-slate-400 text-[11px]">{time}</span>
                          {m.isEdited && !m.isDeleted && (
                            <span className="text-[10px] text-slate-400 italic">(edited)</span>
                          )}
                        </div>

                        {m.isForwarded && (
                          <div className={`flex items-center gap-1 text-[11px] text-slate-400 italic mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <Forward className="w-3 h-3" />
                            <span>Forwarded</span>
                          </div>
                        )}

                        {m.replyTo && (
                          <div
                            onClick={() => {
                              const targetEl = document.getElementById(`msg-${m.replyTo._id || m.replyTo.id}`);
                              if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                targetEl.classList.add('bg-blue-50/80', 'dark:bg-blue-950/40', 'rounded-xl', 'p-1', 'transition-all');
                                setTimeout(() => {
                                  targetEl.classList.remove('bg-blue-50/80', 'dark:bg-blue-950/40');
                                }, 1500);
                              }
                            }}
                            className={`mb-1.5 p-2 rounded-xl text-xs border-l-4 cursor-pointer transition-colors max-w-sm ${
                              isMe
                                ? 'bg-emerald-700/40 border-white/60 text-white text-left'
                                : 'bg-slate-200/80 dark:bg-slate-800/80 border-blue-500 text-slate-800 dark:text-slate-200 text-left'
                            }`}
                          >
                            <div className="font-bold text-[11px] flex items-center gap-1">
                              <CornerUpLeft className="w-3 h-3 opacity-70" />
                              <span>{m.replyTo.sender?.name || 'User'}</span>
                            </div>
                            <div className="truncate text-[11px] opacity-85 mt-0.5">
                              {m.replyTo.content || (m.replyTo.attachments?.length ? '📎 Attachment' : 'Message')}
                            </div>
                          </div>
                        )}

                        {m.attachments && m.attachments.length > 0 && !m.isDeleted && (
                          <div className={`space-y-2 mb-1.5 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {m.attachments.map((att, aIdx) => {
                              const isImage = att.type?.startsWith('image/');
                              const isVideo = att.type?.startsWith('video/');
                              if (isImage) {
                                return (
                                  <div
                                    key={aIdx}
                                    className="relative group/media rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 max-w-xs sm:max-w-sm bg-black/5 cursor-pointer shadow-xs"
                                    onClick={() => setPreviewMedia(att)}
                                  >
                                    <img
                                      src={att.data}
                                      alt={att.name}
                                      className="w-full max-h-72 object-cover hover:scale-[1.01] transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewMedia(att);
                                        }}
                                        className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                      </button>
                                      <a
                                        href={att.data}
                                        download={att.name}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              }

                              if (isVideo) {
                                return (
                                  <div key={aIdx} className="rounded-2xl overflow-hidden max-w-xs sm:max-w-sm shadow-xs border border-slate-200 dark:border-slate-700">
                                    <video src={att.data} controls className="w-full max-h-64 rounded-2xl" />
                                  </div>
                                );
                              }

                              if (att.type?.startsWith('audio/')) {
                                return (
                                  <div key={aIdx} className="rounded-2xl p-2.5 max-w-xs sm:max-w-sm shadow-xs border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5">
                                    <p className="text-xs truncate font-medium mb-1.5 opacity-90">{att.name}</p>
                                    <audio src={att.data} controls className="w-full h-9 rounded-xl" />
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={aIdx}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border max-w-xs sm:max-w-sm shadow-xs ${
                                    isMe
                                      ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-500'
                                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        isMe ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                                      }`}
                                    >
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">{att.name}</div>
                                      <div className={`text-[10px] ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        {formatFileSize(att.size)}
                                      </div>
                                    </div>
                                  </div>

                                  <a
                                    href={att.data}
                                    download={att.name}
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                                      isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isMe && !m.content && m.attachments?.length > 0 && !m.isDeleted && (
                          <div className="flex items-center justify-end gap-1 mb-1 text-[11px]">
                            {deliveryStatus === 'read' && (
                              <CheckCheck
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.5}
                                style={{ color: '#00e5ff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                title="Read"
                              />
                            )}
                            {deliveryStatus === 'delivered' && (
                              <CheckCheck
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.5}
                                style={{ color: '#ffffff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                title="Delivered"
                              />
                            )}
                            {deliveryStatus === 'sent' && (
                              <Check
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.5}
                                style={{ color: 'rgba(255, 255, 255, 0.85)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                title="Sent"
                              />
                            )}
                          </div>
                        )}

                        {m.isDeleted ? (
                          <div className="px-4 py-2.5 rounded-2xl text-xs italic text-slate-400 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5 opacity-50" />
                            <span>This message was deleted</span>
                          </div>
                        ) : (
                          m.content && (
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap relative ${
                                isMe
                                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white rounded-tr-xs shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                              }`}
                            >
                              <div>{m.content}</div>

                              {isMe && (
                                <div className="flex items-center justify-end gap-1 mt-1 text-[11px]">
                                  {deliveryStatus === 'read' && (
                                    <CheckCheck
                                      className="w-4 h-4 shrink-0"
                                      strokeWidth={2.5}
                                      style={{ color: '#00e5ff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                      title="Read"
                                    />
                                  )}
                                  {deliveryStatus === 'delivered' && (
                                    <CheckCheck
                                      className="w-4 h-4 shrink-0"
                                      strokeWidth={2.5}
                                      style={{ color: '#ffffff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                      title="Delivered"
                                    />
                                  )}
                                  {deliveryStatus === 'sent' && (
                                    <Check
                                      className="w-4 h-4 shrink-0"
                                      strokeWidth={2.5}
                                      style={{ color: 'rgba(255, 255, 255, 0.85)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                                      title="Sent"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}

                        {singleReaction?.emoji && !m.isDeleted && (
                          <div className={`flex mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <button
                              type="button"
                              onClick={() => handleReaction(msgId, singleReaction.emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-all cursor-pointer ${
                                isMyReaction
                                  ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                              title={isMyReaction ? 'Click to remove reaction' : `Reacted with ${singleReaction.emoji}`}
                            >
                              <span className="text-sm leading-none">{singleReaction.emoji}</span>
                              <span className="text-[11px] font-bold">1</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic py-1 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{Array.from(typingUsers).join(', ')} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 shrink-0 relative">
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full mb-3 left-4 right-4 sm:left-4 sm:right-auto sm:w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-80 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 p-1.5">
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => {
                            setSelectedEmojiCat(cat.name);
                            setEmojiSearch('');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            selectedEmojiCat === cat.name
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="text-[11px] hidden sm:inline">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Search emoji..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 sm:grid-cols-8 gap-1">
                    {displayedEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-115 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {replyingTo && (
                <div className="mb-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-blue-900 dark:text-blue-200">
                        Replying to {replyingTo.sender?.name || 'User'}:
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {replyingTo.content || (replyingTo.attachments?.length ? 'Attachment' : '')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {editingMessage && (
                <div className="mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Editing message</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-bold text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden focus-within:border-blue-600 transition-colors"
              >
                {attachments.length > 0 && (
                  <div className="p-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
                    {attachments.map((att, idx) => {
                      const isImg = att.type?.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className="relative group shrink-0 flex items-center gap-2 p-1.5 pr-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
                        >
                          {isImg ? (
                            <img src={att.data} alt={att.name} className="w-8 h-8 object-cover rounded-lg" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="max-w-[100px] sm:max-w-[130px] min-w-0">
                            <div className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs">{att.name}</div>
                            <div className="text-[10px] text-slate-400">{formatFileSize(att.size)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-3">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    disabled={isCurrentChatBlocked}
                    placeholder={
                      isCurrentChatBlocked
                        ? 'Cannot message blocked contact...'
                        : editingMessage
                        ? 'Update message...'
                        : attachments.length > 0
                        ? 'Add a caption...'
                        : `Message ${activeChatDetails.name}...`
                    }
                    className="w-full text-sm sm:text-base bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      disabled={isCurrentChatBlocked}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-40"
                      title="Attach file"
                    >
                      <Paperclip className="w-4.5 h-4.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isCurrentChatBlocked}
                      onClick={() => imageInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-40"
                      title="Upload Photo / Video"
                    >
                      <ImageIcon className="w-4.5 h-4.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isCurrentChatBlocked}
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className={`p-1.5 rounded-lg hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-40 ${
                        showEmojiPicker ? 'text-amber-500 bg-slate-200 dark:bg-slate-800' : ''
                      }`}
                      title="Emoji Picker"
                    >
                      <Smile className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Press Enter ↵ to send
                    </span>
                    <button
                      type="submit"
                      disabled={
                        isCurrentChatBlocked ||
                        (!messageInput.trim() && attachments.length === 0) ||
                        sendingMessage
                      }
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : editingMessage ? (
                        <span>Update</span>
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {previewMedia && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
            onClick={() => setPreviewMedia(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <img src={previewMedia.data} alt={previewMedia.name} className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl" />
              <div className="mt-3 flex items-center gap-4">
                <span className="text-white text-xs font-semibold">{previewMedia.name} ({formatFileSize(previewMedia.size)})</span>
                <a
                  href={previewMedia.data}
                  download={previewMedia.name}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showForwardModal && forwardingMessage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Forward className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Forward Message</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForwardModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Search chats to forward to..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chats
                  .filter((c) => getChatDetails(c).name.toLowerCase().includes(forwardSearch.toLowerCase()))
                  .map((chat) => {
                    const cid = chat._id || chat.id;
                    const details = getChatDetails(chat);
                    const isSelected = forwardTargetIds.includes(cid);
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => {
                          setForwardTargetIds((prev) =>
                            prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
                          );
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {details.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {details.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{details.subtitle}</div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <span className="text-xs text-slate-500">{forwardTargetIds.length} destination(s) selected</span>
                <button
                  type="button"
                  disabled={forwardTargetIds.length === 0 || forwardLoading}
                  onClick={handleExecuteForward}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {forwardLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Forward</span>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showAddContactModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Contact</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {searchingUsers ? (
                  <div className="py-8 flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                    <span className="text-xs">Searching users...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {contactSearchQuery ? 'No users matching search' : 'Type to search platform users'}
                  </div>
                ) : (
                  searchResults.map((usr) => {
                    const uid = usr._id || usr.id;
                    const alreadySaved = savedContacts.some((c) => (c._id || c.id).toString() === uid.toString());
                    return (
                      <div
                        key={uid}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {usr.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {usr.email}
                          </div>
                        </div>
                        {alreadySaved ? (
                          <span className="text-xs font-bold text-emerald-600 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                            Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddContact(uid)}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                          >
                            Add Contact
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {reportingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Report Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Reported User
                  </label>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white">
                    {reportingUser.name} ({reportingUser.email})
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment or abusive behavior</option>
                    <option value="Inappropriate Content">Inappropriate content</option>
                    <option value="Suspicious Activity">Suspicious activity or scam</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Additional Details
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    placeholder="Provide context or description of the incident..."
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    {submittingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Submit Report</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {showNewDirectModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Start Direct Chat</h3>
                <button
                  type="button"
                  onClick={() => setShowNewDirectModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    loadAllUsersForGroup(e.target.value);
                  }}
                  placeholder="Search colleagues..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {contacts.map((contact) => {
                  const cid = contact._id || contact.id;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => handleStartDirectChat(cid)}
                      className="w-full p-2.5 rounded-xl text-left flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {contact.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {contact.name}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{contact.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showNewGroupModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Group Chat</h3>
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="p-4 flex-1 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Marketing Team"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Brief purpose of the group..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Select Members ({selectedMembers.length} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
                    {contacts.map((contact) => {
                      const cid = contact._id || contact.id;
                      const isSelected = selectedMembers.includes(cid);
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => {
                            setSelectedMembers((prev) =>
                              prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
                            );
                          }}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 font-bold'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {contact.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold truncate">{contact.name}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{contact.email}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewGroupModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs"
                  >
                    {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {showGroupInfoModal && activeChat?.isGroupChat && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Group Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeChat.users?.length || 0} participants in this group
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Group Name
                </div>
                {isEditingName && (isGroupAdmin || user?.role === 'admin') ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleRenameGroup}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {activeChat.chatName}
                    </div>
                    {(isGroupAdmin || user?.role === 'admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewGroupName(activeChat.chatName || '');
                          setIsEditingName(true);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                        title="Rename Group"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                {activeChat.groupDescription && (
                  <div className="text-xs text-slate-500 mt-2">{activeChat.groupDescription}</div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Add Member to Group</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={addingMemberUserId}
                    onChange={(e) => setAddingMemberUserId(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">Select a contact to add...</option>
                    {nonMemberContacts.map((contact) => (
                      <option key={contact._id || contact.id} value={contact._id || contact.id}>
                        {contact.name} ({contact.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMemberToGroup}
                    disabled={!addingMemberUserId}
                    className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Participants ({activeChat.users?.length || 0})
                  </span>
                  {isGroupAdmin && (
                    <span className="text-[11px] text-purple-600 font-semibold">You are Group Admin</span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {activeChat.users?.map((member) => {
                    const memberId = (member._id || member.id || member).toString();
                    const isMe = memberId === currentUserId?.toString();
                    const isMemberAdmin =
                      (activeChat.groupAdmin?._id || activeChat.groupAdmin)?.toString() === memberId;
                    const isOnline = onlineUsers.includes(memberId);

                    return (
                      <div
                        key={memberId}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {member.name?.slice(0, 2).toUpperCase() || 'MB'}
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-800 ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              <span>{member.name || 'Member'}</span>
                              {isMe && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                              {isMemberAdmin && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {isGroupAdmin && !isMe && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
