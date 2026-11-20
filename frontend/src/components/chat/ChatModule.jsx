import { useState, useEffect, useRef, useCallback } from 'react';
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
  UserPlus,
  UserMinus,
  LogOut,
  Edit2,
  CheckCircle2,
  Loader2,
  Info,
  Circle,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Maximize2
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
  toggleMessageReaction
} from '../../services/api';
import { getSocket, initSocket } from '../../services/socket';
import { playWhatsAppNotificationSound } from '../../services/sound';

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

export default function ChatModule({ user, showToast, onUnreadCountChange }) {
  const token = localStorage.getItem('mailchat_token');
  const currentUserId = user?._id || user?.id;

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [chatTab, setChatTab] = useState('all'); // 'all' | 'direct' | 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Media upload state
  const [attachments, setAttachments] = useState([]);
  const [previewMedia, setPreviewMedia] = useState(null); // for modal lightbox view
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCat, setSelectedEmojiCat] = useState('Smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Modals
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Group editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingMemberUserId, setAddingMemberUserId] = useState('');

  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Scroll to bottom of message list
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Helper to get chat display details
  const getChatDetails = useCallback((chat) => {
    if (!chat) return { name: 'Chat', isOnline: false, subtitle: '', avatarInitials: 'CH' };

    if (chat.isGroupChat) {
      return {
        name: chat.chatName || 'Group Chat',
        isOnline: false,
        subtitle: `${chat.users?.length || 0} members`,
        avatarInitials: (chat.chatName || 'GP').slice(0, 2).toUpperCase(),
        isGroup: true
      };
    }

    const partner = chat.users?.find((u) => (u._id || u.id || u).toString() !== currentUserId?.toString());
    const isOnline = partner ? onlineUsers.includes((partner._id || partner.id || partner).toString()) : false;
    const name = partner?.name || 'Direct Message';
    return {
      name,
      isOnline,
      subtitle: isOnline ? 'Online' : partner?.email || 'Offline',
      avatarInitials: name.slice(0, 2).toUpperCase(),
      partner,
      isGroup: false
    };
  }, [currentUserId, onlineUsers]);

  // Load chats on mount
  const loadChats = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingChats(true);
    try {
      const data = await fetchChats(token);
      if (data.chats) {
        setChats(data.chats);
        // Calculate unread count
        const totalUnread = data.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        if (onUnreadCountChange) onUnreadCountChange(totalUnread);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, [token, onUnreadCountChange]);

  // Load available contacts
  const loadContacts = useCallback(async (search = '') => {
    if (!token) return;
    setLoadingContacts(true);
    try {
      const data = await getChatUsers(token, search);
      if (data.users) {
        setContacts(data.users);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [token]);

  useEffect(() => {
    loadChats();
    loadContacts('');
  }, [loadChats, loadContacts]);

  useEffect(() => {
    if (onUnreadCountChange && chats) {
      const total = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      onUnreadCountChange(total);
    }
  }, [chats, onUnreadCountChange]);

  // Socket.io initialization and listeners
  useEffect(() => {
    if (!user || !token) return;

    const socket = initSocket(user);

    const handleConnected = () => { };

    const handleOnlineUsers = (usersList) => {
      setOnlineUsers(usersList);
    };

    const handleUserPresence = (data) => {
      if (data?.onlineUsers) {
        setOnlineUsers(data.onlineUsers);
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
      loadContacts('');
      loadChats(true);
    };

    const handleMessageReceived = (newMessage) => {
      if (!newMessage) return;
      const senderId = (newMessage.sender?._id || newMessage.sender?.id || newMessage.sender)?.toString();
      // Skip if this message was sent by the current user (already added locally)
      if (senderId && senderId === currentUserId?.toString()) {
        return;
      }

      const msgChatId = (newMessage.chat?._id || newMessage.chat?.id || newMessage.chat)?.toString();
      const currentActiveId = activeChatRef.current?._id?.toString();
      const newMsgId = (newMessage._id || newMessage.id)?.toString();

      if (currentActiveId === msgChatId) {
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) return prev;
          return [...prev, newMessage];
        });
        setTimeout(() => scrollToBottom(), 50);
        // Play alert sound for incoming message
        playWhatsAppNotificationSound();
      } else {
        // Alert receiver with WhatsApp sound when message arrives in an inactive chat
        playWhatsAppNotificationSound();
      }

      // Update chats list
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
          const chatObj = newMessage.chat && typeof newMessage.chat === 'object' ? newMessage.chat : null;
          if (chatObj) {
            const newChat = {
              ...chatObj,
              _id: msgChatId,
              latestMessage: newMessage,
              unreadCount: isCurrentlyActive ? 0 : 1,
              updatedAt: new Date().toISOString()
            };
            return [newChat, ...prevChats];
          }
          return prevChats;
        }
      });

      loadChats(true);
      loadContacts('');
    };

    const handleChatActivity = ({ chatId, chat, message }) => {
      const currentActiveId = activeChatRef.current?._id?.toString();
      if (currentActiveId !== chatId) {
        playWhatsAppNotificationSound();
      }

      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((c) => (c._id || c.id)?.toString() === chatId);
        const isCurrentlyActive = currentActiveId === chatId;
        if (chatIndex > -1) {
          const currentUnread = prevChats[chatIndex].unreadCount || 0;
          const updatedChat = {
            ...prevChats[chatIndex],
            latestMessage: message,
            unreadCount: isCurrentlyActive ? 0 : currentUnread + 1,
            updatedAt: new Date().toISOString()
          };
          const rest = prevChats.filter((_, idx) => idx !== chatIndex);
          return [updatedChat, ...rest];
        } else {
          const fullChat = chat || (message?.chat && typeof message.chat === 'object' ? message.chat : null);
          if (fullChat) {
            const newChat = {
              ...fullChat,
              _id: chatId,
              latestMessage: message,
              unreadCount: isCurrentlyActive ? 0 : 1,
              updatedAt: new Date().toISOString()
            };
            return [newChat, ...prevChats];
          }
          return prevChats;
        }
      });

      loadChats(true);
      loadContacts('');
    };

    const handleChatUpdated = (updatedChat) => {
      if (!updatedChat) return;
      const updatedId = (updatedChat._id || updatedChat.id)?.toString();
      if (updatedId) {
        socket.emit('join_chat', updatedId);
      }
      setChats((prev) => {
        const exists = prev.some((c) => (c._id || c.id)?.toString() === updatedId);
        if (!exists) {
          return [updatedChat, ...prev];
        }
        return prev.map((c) => ((c._id || c.id)?.toString() === updatedId ? updatedChat : c));
      });
      if (activeChatRef.current && (activeChatRef.current._id || activeChatRef.current.id)?.toString() === updatedId) {
        setActiveChat(updatedChat);
      }
      loadContacts('');
    };

    const handleUserEvent = () => {
      loadContacts('');
      loadChats(true);
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

    socket.on('connected', handleConnected);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_presence', handleUserPresence);
    socket.on('message_received', handleMessageReceived);
    socket.on('chat_activity', handleChatActivity);
    socket.on('chat_updated', handleChatUpdated);
    socket.on('new_chat', handleNewChat);
    socket.on('new_user', handleUserEvent);
    socket.on('user_registered', handleUserEvent);
    socket.on('user_updated', handleUserEvent);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('connected', handleConnected);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_presence', handleUserPresence);
      socket.off('message_received', handleMessageReceived);
      socket.off('chat_activity', handleChatActivity);
      socket.off('chat_updated', handleChatUpdated);
      socket.off('new_chat', handleNewChat);
      socket.off('new_user', handleUserEvent);
      socket.off('user_registered', handleUserEvent);
      socket.off('user_updated', handleUserEvent);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('reaction_updated', handleReactionUpdated);
    };
  }, [user, token, currentUserId, loadChats, loadContacts]);

  // Load messages whenever activeChatId changes
  const activeChatId = (activeChat?._id || activeChat?.id)?.toString();

  useEffect(() => {
    if (!activeChatId || !token) {
      setMessages([]);
      return;
    }

    const socket = getSocket();
    socket.emit('join_chat', activeChatId);
    setTypingUsers(new Set());
    setAttachments([]);
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
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
      socket.emit('leave_chat', activeChatId);
    };
  }, [activeChatId, token]);

  // Handle file select for media upload
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSingleSize = 15 * 1024 * 1024; // 15MB
    const validFiles = files.filter((f) => {
      if (f.size > maxSingleSize) {
        showToast?.(`"${f.name}" exceeds 15MB limit`, 'error');
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

    if (e.target) {
      e.target.value = '';
    }
  };

  const removeAttachment = (idxToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Insert emoji at cursor position
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

  // Typing event emission
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

  // Send message with text and/or media attachments
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const hasContent = messageInput.trim().length > 0;
    const hasAttachments = attachments.length > 0;

    if ((!hasContent && !hasAttachments) || !activeChat || sendingMessage) return;

    const content = messageInput.trim();
    const outgoingAttachments = [...attachments];
    const chatId = activeChat._id || activeChat.id;

    setMessageInput('');
    setAttachments([]);
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
        attachments: outgoingAttachments
      });

      if (data.message) {
        const newMsgId = (data.message._id || data.message.id)?.toString();
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id)?.toString() === newMsgId)) return prev;
          return [...prev, data.message];
        });
        socket.emit('new_message', data.message);
        setTimeout(() => scrollToBottom(), 50);

        // Update latest message in chats list
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

  // Toggle emoji reactions
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

  const openNewDirectModal = () => {
    setContactSearch('');
    loadContacts('');
    setShowNewDirectModal(true);
  };

  const openNewGroupModal = () => {
    setContactSearch('');
    setSelectedMembers([]);
    setGroupName('');
    setGroupDescription('');
    loadContacts('');
    setShowNewGroupModal(true);
  };

  // Start 1-to-1 chat with user
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
        loadContacts('');
        showToast?.('Conversation opened', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to open conversation', 'error');
    }
  };

  // Create Group Chat
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
        loadContacts('');

        showToast?.(`Group "${data.chat.chatName}" created!`, 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Rename Group
  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !activeChat) return;
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
        setIsEditingName(false);
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        showToast?.('Group name updated', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to rename group', 'error');
    }
  };

  // Add Member to Group
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
        setAddingMemberUserId('');
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        showToast?.('Member added to group', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to add member', 'error');
    }
  };

  // Remove Member from Group
  const handleRemoveMember = async (memberId) => {
    if (!activeChat) return;
    try {
      const data = await removeMemberFromGroup(token, {
        chatId: activeChat._id || activeChat.id,
        userId: memberId
      });
      if (data.chat) {
        setActiveChat(data.chat);
        setChats((prev) =>
          prev.map((c) => ((c._id || c.id) === (data.chat._id || data.chat.id) ? data.chat : c))
        );
        const socket = getSocket();
        socket.emit('group_updated', data.chat);
        showToast?.('Member removed from group', 'success');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to remove member', 'error');
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!activeChat) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await removeMemberFromGroup(token, {
        chatId: activeChat._id || activeChat.id,
        userId: currentUserId
      });

      const leavingChatId = activeChat._id || activeChat.id;
      setChats((prev) => prev.filter((c) => (c._id || c.id) !== leavingChatId));
      setActiveChat(null);
      setShowGroupInfoModal(false);
      setMobileChatOpen(false);

      const socket = getSocket();
      socket.emit('leave_chat', leavingChatId);

      showToast?.('You left the group', 'info');
    } catch (err) {
      showToast?.(err.message || 'Failed to leave group', 'error');
    }
  };

  // Filtered chats based on search and tab
  const filteredChats = chats.filter((c) => {
    if (chatTab === 'direct' && c.isGroupChat) return false;
    if (chatTab === 'groups' && !c.isGroupChat) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const details = getChatDetails(c);
    const lastMsg = c.latestMessage?.content || '';
    return details.name.toLowerCase().includes(query) || lastMsg.toLowerCase().includes(query);
  });

  // Direct chat partners already present in existing chats
  const directPartnerIds = new Set(
    chats
      .filter((c) => !c.isGroupChat)
      .map((c) => {
        const partner = c.users?.find((u) => (u._id || u.id || u).toString() !== currentUserId?.toString());
        return partner ? (partner._id || partner.id || partner).toString() : null;
      })
      .filter(Boolean)
  );

  // Available contacts (registered users with whom direct chat hasn't been started yet)
  const availableContacts = contacts.filter((c) => {
    const cid = (c._id || c.id).toString();
    if (cid === currentUserId?.toString()) return false;
    if (directPartnerIds.has(cid)) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query);
  });

  const activeChatDetails = getChatDetails(activeChat);
  const isGroupAdmin = activeChat?.isGroupChat && (activeChat?.groupAdmin?._id || activeChat?.groupAdmin)?.toString() === currentUserId?.toString();

  // Non-member contacts for group add
  const nonMemberContacts = contacts.filter(
    (c) => !activeChat?.users?.some((u) => (u._id || u.id || u).toString() === (c._id || c.id).toString())
  );

  // Emojis for active category with search filtering
  const currentCategoryObj = EMOJI_CATEGORIES.find((cat) => cat.name === selectedEmojiCat) || EMOJI_CATEGORIES[0];
  const displayedEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(emojiSearch.trim()))
    : currentCategoryObj.emojis;

  return (
    <div className="flex-1 h-full min-h-0 flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs relative">

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* ==================== LEFT SIDEBAR: CHAT LIST ==================== */}
      <div
        className={`w-full md:w-84 md:border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 bg-slate-50/60 dark:bg-slate-950/40 ${mobileChatOpen ? 'hidden md:flex' : 'flex'
          }`}
      >
        {/* Header Actions */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Messages</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={openNewDirectModal}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                title="New Direct Chat"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={openNewGroupModal}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                title="Create Group"
              >
                <Users className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Tabs: All / Direct / Groups */}
          <div className="flex rounded-lg bg-slate-200/60 dark:bg-slate-900 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setChatTab('all')}
              className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${chatTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              All ({chats.length + availableContacts.length})
            </button>
            <button
              onClick={() => setChatTab('direct')}
              className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${chatTab === 'direct'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Direct ({chats.filter((c) => !c.isGroupChat).length + availableContacts.length})
            </button>
            <button
              onClick={() => setChatTab('groups')}
              className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${chatTab === 'groups'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Groups ({chats.filter((c) => c.isGroupChat).length})
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filteredChats.length === 0 && (chatTab === 'groups' || availableContacts.length === 0) ? (
            <div className="py-12 px-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {chatTab === 'groups' ? 'No Group Chats' : 'No Conversations'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                {chatTab === 'groups'
                  ? 'Create a group to communicate with multiple users simultaneously.'
                  : 'Start a 1-to-1 chat or create a group using the buttons above.'}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={openNewDirectModal}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  + New Chat
                </button>
                <button
                  type="button"
                  onClick={openNewGroupModal}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 cursor-pointer"
                >
                  + New Group
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Existing Conversations */}
              {filteredChats.map((chat) => {
                const details = getChatDetails(chat);
                const isSelected = (activeChat?._id || activeChat?.id) === (chat._id || chat.id);
                const latestSenderName =
                  (chat.latestMessage?.sender?._id || chat.latestMessage?.sender?.id || chat.latestMessage?.sender)?.toString() === currentUserId?.toString()
                    ? 'You'
                    : chat.latestMessage?.sender?.name || '';

                const latestText = chat.latestMessage?.content || (
                  chat.latestMessage?.attachments?.[0]?.type?.startsWith('image/')
                    ? '📷 Photo'
                    : chat.latestMessage?.attachments?.length > 0
                      ? `📎 ${chat.latestMessage.attachments[0].name}`
                      : ''
                );

                return (
                  <button
                    key={chat._id || chat.id}
                    onClick={() => {
                      setActiveChat(chat);
                      setMobileChatOpen(true);
                      setChats((prev) =>
                        prev.map((c) =>
                          (c._id || c.id)?.toString() === (chat._id || chat.id)?.toString()
                            ? { ...c, unreadCount: 0 }
                            : c
                        )
                      );
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer group ${isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center ${isSelected
                              ? 'bg-white/20 text-white'
                              : chat.isGroupChat
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                            }`}
                        >
                          {chat.isGroupChat ? <Users className="w-4 h-4" /> : details.avatarInitials}
                        </div>

                        {/* Online dot for direct chats */}
                        {!chat.isGroupChat && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 ${isSelected ? 'border-blue-600' : 'border-white dark:border-slate-900'
                              } ${details.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          />
                        )}
                      </div>

                      {/* Chat Text Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-sm font-bold truncate flex items-center gap-1.5">
                            <span className="truncate">{details.name}</span>
                            {chat.isGroupChat && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                                  }`}
                              >
                                Group
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`text-xs truncate font-medium mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                          {chat.latestMessage ? (
                            <>
                              {latestSenderName && <span className="font-semibold">{latestSenderName}: </span>}
                              <span>{latestText}</span>
                            </>
                          ) : (
                            <span className="italic opacity-80">No messages yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Unread Badge */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 ml-2 py-0.5">
                      <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {chat.latestMessage?.createdAt
                          ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : ''}
                      </span>
                      {chat.unreadCount > 0 && !isSelected && (
                        <span className="min-w-4.5 h-4.5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-emerald-500 text-white shadow-xs">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Direct Messages: Contacts without previous chats */}
              {chatTab !== 'groups' && availableContacts.length > 0 && (
                <div className="pt-2">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                    <span>Direct Messages ({availableContacts.length})</span>
                    <span className="text-[10px] font-normal lowercase text-slate-400">click to chat</span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {availableContacts.map((contact) => {
                      const cid = (contact._id || contact.id).toString();
                      const isOnline = onlineUsers.includes(cid);
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => handleStartDirectChat(cid)}
                          className="w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 group text-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                                {contact.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${
                                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {contact.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <span className="truncate">{contact.email}</span>
                                <span className="text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-[10px] shrink-0">
                                  Message &rarr;
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ==================== RIGHT PANEL: ACTIVE CHAT WINDOW ==================== */}
      <div
        className={`flex-1 flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative ${mobileChatOpen ? 'flex' : 'hidden md:flex'
          }`}
      >
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-slate-950/20">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instant Real-Time Chat</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Select a conversation from the left to start messaging with media upload & emojis, or create a group to communicate with multiple
              team members simultaneously.
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
            {/* Active Chat Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Back to chat list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${activeChat.isGroupChat
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    }`}
                >
                  {activeChat.isGroupChat ? <Users className="w-5 h-5" /> : activeChatDetails.avatarInitials}
                </div>

                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <span className="truncate">{activeChatDetails.name}</span>
                    {!activeChat.isGroupChat && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${activeChatDetails.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                        />
                        {activeChatDetails.isOnline ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                    {activeChat.isGroupChat ? `${activeChat.users?.length || 0} participants` : activeChatDetails.subtitle}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {activeChat.isGroupChat && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupName(activeChat.chatName || '');
                      setIsEditingName(false);
                      setAddingMemberUserId('');
                      loadContacts('');
                      setShowGroupInfoModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Group Settings & Members"
                  >
                    <Info className="w-4 h-4 text-purple-600" />
                    <span className="hidden sm:inline">Group Info</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Body */}
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
                    Say hello or share a photo to start the conversation!
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const senderId = (m.sender?._id || m.sender?.id || m.sender)?.toString();
                  const isMe = senderId === currentUserId?.toString();
                  const senderName = isMe ? 'You' : m.sender?.name || 'Teammate';
                  const time = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  // Strictly ONE reaction allowed per message
                  const singleReaction = m.reactions && m.reactions.length > 0 ? m.reactions[0] : null;
                  const isMyReaction =
                    singleReaction &&
                    (singleReaction.user?._id || singleReaction.user)?.toString() === currentUserId?.toString();

                  return (
                    <div
                      key={m._id || m.id}
                      className={`flex gap-3 relative group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar: ONLY show for other users (removes 'YO' on own messages) */}
                      {!isMe && (
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs bg-slate-600 dark:bg-slate-700"
                        >
                          {senderName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Content Box */}
                      <div className={`max-w-[85%] sm:max-w-md md:max-w-lg relative ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                        {/* Floating WhatsApp-style reaction picker on hover */}
                        <div
                          className={`absolute -top-3.5 ${isMe ? 'right-0' : 'left-0'} hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md z-20 backdrop-blur-sm transition-all duration-150`}
                        >
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => {
                            const isSelected = singleReaction?.emoji === emoji;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReaction(m._id || m.id, emoji)}
                                className={`hover:scale-130 transition-transform p-0.5 rounded-full text-sm leading-none cursor-pointer ${isSelected ? 'bg-blue-100 dark:bg-blue-900/60 scale-110' : ''
                                  }`}
                                title={isSelected ? `Remove ${emoji}` : `React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>

                        {/* Sender Name & Time */}
                        <div className={`flex items-center gap-2 mb-1 text-xs ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-bold text-slate-900 dark:text-white">{senderName}</span>
                          <span className="text-slate-400 text-[11px]">{time}</span>
                        </div>

                        {/* Media Attachments */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className={`space-y-2 mb-1.5 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {m.attachments.map((att, aIdx) => {
                              const isImage = att.type?.startsWith('image/');
                              const isVideo = att.type?.startsWith('video/');
                              const isAudio = att.type?.startsWith('audio/');

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
                                        title="View Full Size"
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                      </button>
                                      <a
                                        href={att.data}
                                        download={att.name}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                                        title="Download"
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

                              if (isAudio) {
                                return (
                                  <div key={aIdx} className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-xs sm:max-w-sm">
                                    <audio src={att.data} controls className="w-full" />
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={aIdx}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border max-w-xs sm:max-w-sm shadow-xs ${isMe
                                      ? 'bg-blue-700 text-white border-blue-600'
                                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                                        }`}
                                    >
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">{att.name}</div>
                                      <div className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {formatFileSize(att.size)}
                                      </div>
                                    </div>
                                  </div>

                                  <a
                                    href={att.data}
                                    download={att.name}
                                    className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      }`}
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Text Message Bubble */}
                        {m.content && (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap ${isMe
                                ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                              }`}
                          >
                            {m.content}
                          </div>
                        )}

                        {/* Display strictly ONE reaction pill under the bubble when reacted */}
                        {singleReaction?.emoji && (
                          <div className={`flex mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <button
                              type="button"
                              onClick={() => handleReaction(m._id || m.id, singleReaction.emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-all cursor-pointer ${isMyReaction
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

              {/* Typing indicator */}
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

            {/* Media & Input Section */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 shrink-0 relative">

              {/* EMOJI PICKER POPOVER */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full mb-3 left-4 right-4 sm:left-4 sm:right-auto sm:w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-80 animate-in fade-in slide-in-from-bottom-2"
                >
                  {/* Category switcher */}
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
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${selectedEmojiCat === cat.name
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

                  {/* Search emoji */}
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

                  {/* Emoji grid */}
                  <div className="flex-1 overflow-y-auto p-2 grid grid-cols-7 sm:grid-cols-8 gap-1">
                    {displayedEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-115 transition-transform cursor-pointer"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form & Input Container */}
              <form
                onSubmit={handleSendMessage}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden focus-within:border-blue-600 transition-colors"
              >
                {/* Selected Attachments Strip */}
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
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Input Text Area */}
                <div className="p-3">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    placeholder={
                      attachments.length > 0
                        ? 'Add a caption...'
                        : `Message ${activeChatDetails.name}...`
                    }
                    className="w-full text-sm sm:text-base bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                {/* Bottom Bar: Action Buttons & Send */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    {/* Media upload - All files */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Attach file / document"
                    >
                      <Paperclip className="w-4.5 h-4.5" />
                    </button>

                    {/* Media upload - Photo / Image */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-1.5 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title="Upload Photo / Video"
                    >
                      <ImageIcon className="w-4.5 h-4.5" />
                    </button>

                    {/* Proper Emoji Picker button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className={`p-1.5 rounded-lg hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors ${showEmojiPicker ? 'text-amber-500 bg-slate-200 dark:bg-slate-800' : ''
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
                      disabled={(!messageInput.trim() && attachments.length === 0) || sendingMessage}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

      {/* ==================== MEDIA LIGHTBOX PREVIEW MODAL ==================== */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2 text-white border-b border-slate-800 mb-2">
              <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md">{previewMedia.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewMedia.data}
                  download={previewMedia.name}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={previewMedia.data}
                alt={previewMedia.name}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: NEW DIRECT CHAT ==================== */}
      {showNewDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">New Direct Message</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a team member to start a one-on-one conversation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDirectModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    loadContacts(e.target.value);
                  }}
                  placeholder="Search contacts by name or email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loadingContacts ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs">Searching team members...</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No registered users found matching "{contactSearch}".
                </div>
              ) : (
                contacts.map((contact) => {
                  const isOnline = onlineUsers.includes((contact._id || contact.id).toString());
                  return (
                    <button
                      key={contact._id || contact.id}
                      onClick={() => handleStartDirectChat(contact._id || contact.id)}
                      className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                            {contact.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <span
                            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {contact.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {contact.email}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: CREATE GROUP CHAT ==================== */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>Create New Group</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Communicate with multiple team members in one dedicated space
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col min-h-0">
              <div className="p-4 space-y-3.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Engineering Leads, Marketing Team"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="What is this group for?"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Members *
                    </label>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {selectedMembers.length} selected
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => {
                        setContactSearch(e.target.value);
                        loadContacts(e.target.value);
                      }}
                      placeholder="Filter members..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Members Selection List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loadingContacts ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-2" />
                    <span className="text-xs">Loading contacts...</span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No users found.
                  </div>
                ) : (
                  contacts.map((contact) => {
                    const id = (contact._id || contact.id).toString();
                    const isSelected = selectedMembers.includes(id);

                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => {
                          setSelectedMembers((prev) =>
                            isSelected ? prev.filter((m) => m !== id) : [...prev, id]
                          );
                        }}
                        className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {contact.name?.slice(0, 2).toUpperCase()}
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

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-300 dark:border-slate-700'
                            }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {creatingGroup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Create Group ({selectedMembers.length + 1} members)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: GROUP INFO & MEMBER MANAGEMENT ==================== */}
      {showGroupInfoModal && activeChat?.isGroupChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Group Name & Rename */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Group Name
                </div>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleRenameGroup}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {activeChat.chatName}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroupName(activeChat.chatName || '');
                        setIsEditingName(true);
                      }}
                      className="p-1 text-slate-400 hover:text-purple-600 cursor-pointer"
                      title="Edit Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeChat.groupDescription && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {activeChat.groupDescription}
                  </div>
                )}
              </div>

              {/* Add New Member Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Add Member to Group</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={addingMemberUserId}
                    onChange={(e) => setAddingMemberUserId(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-600"
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
                    className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Participants ({activeChat.users?.length || 0})
                  </span>
                  {isGroupAdmin && (
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      You are Group Admin
                    </span>
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
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {member.name?.slice(0, 2).toUpperCase() || 'MB'}
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'
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

                        {/* Remove button */}
                        {isGroupAdmin && !isMe && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(memberId)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Remove from group"
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

            {/* Leave Group Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="px-3.5 py-2 text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGroupInfoModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
