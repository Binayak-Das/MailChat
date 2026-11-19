import { useState, useEffect, useRef } from 'react';
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
  sendEmail,
  getEmails,
  getEmailThread,
  deleteEmail,
  restoreEmail,
  emptyTrash,
  toggleStarEmail,
  markEmailAsRead,
  checkRecipientEmail,
  getNotifications,
  markNotificationsAsRead
} from '../services/api';

const normalizeSubject = (subj) => {
  return (subj || '').replace(/^(\s*(Re|Fwd|FW):\s*)+/i, '').trim();
};

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '😴', '😷', '🤒', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😲', '😳', '🥺', '😦']
  },
  {
    name: 'Gestures',
    icon: '👍',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '✍️', '🤳', '🙋‍♂️', '🙋‍♀️', '👨‍💻', '👩‍💻']
  },
  {
    name: 'Reactions',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '🌟', '💫', '⭐', '💥', '💯', '🎉', '🎊', '🏆', '🥇', '🚀', '⚡', '☀️']
  },
  {
    name: 'Office & Work',
    icon: '💼',
    emojis: ['✉️', '📩', '📨', '📧', '📤', '📥', '📦', '🏷️', '📌', '📍', '📎', '📏', '📐', '📑', '📊', '📈', '📉', '📜', '📋', '📅', '📆', '🗂️', '📁', '📂', '🗄️', '💼', '💻', '🖥️', '📱', '🔒', '🔑', '💡', '⏰']
  }
];

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

  const [mailFolder, setMailFolder] = useState('inbox'); 
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '', category: 'Work' });
  const [attachments, setAttachments] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmojiCat, setSelectedEmojiCat] = useState('Smileys');
  const [isSending, setIsSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [recipientChecking, setRecipientChecking] = useState(false);
  const [recipientValid, setRecipientValid] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [collapsedMsgIds, setCollapsedMsgIds] = useState({});
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);
  const [replyEmojiCat, setReplyEmojiCat] = useState('Smileys');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const threadEndRef = useRef(null);
  const replyFileInputRef = useRef(null);
  const replyTextareaRef = useRef(null);
  const replyEmojiPickerRef = useRef(null);

  const showToast = () => {};

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setEmojiPickerOpen(false);
      }
      if (replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(e.target)) {
        setReplyEmojiOpen(false);
      }
    };
    if (emojiPickerOpen || replyEmojiOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [emojiPickerOpen, replyEmojiOpen]);

  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmailsData = async (showSpinner = false) => {
    const token = localStorage.getItem('mailchat_token');
    if (!token) return;
    if (showSpinner) setIsRefreshing(true);
    try {
      const [emailRes, notifRes] = await Promise.all([
        getEmails(token, 'all'),
        getNotifications(token)
      ]);
      if (emailRes && emailRes.emails) {
        setEmails(emailRes.emails);
      }
      if (notifRes && notifRes.notifications) {
        setNotifications(notifRes.notifications);
      }
      if (selectedEmail) {
        try {
          const threadRes = await getEmailThread(token, selectedEmail.id);
          if (threadRes && threadRes.messages) {
            setThreadMessages(threadRes.messages);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Error refreshing emails:', err.message);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('mailchat_token');
    if (!token) {
      setEmailsLoading(false);
      return;
    }

    setEmailsLoading(true);
    fetchEmailsData(false).finally(() => {
      setEmailsLoading(false);
    });
  }, [user.email]);

  const inboxEmails = emails.filter((e) => e.folder === 'inbox');
  const unreadEmailCount = inboxEmails.filter((e) => e.unread).length;
  const starredEmailCount = emails.filter((e) => e.starred).length;
  const sentEmailCount = emails.filter((e) => e.folder === 'sent' || e.isSent).length;
  const draftsEmailCount = emails.filter((e) => e.folder === 'drafts').length;
  const trashEmailCount = emails.filter((e) => e.folder === 'trash').length;

  const displayedEmails = emails.filter((e) => {
    if (mailFolder === 'starred') {
      if (!e.starred) return false;
    } else if (mailFolder === 'sent') {
      if (e.folder !== 'sent' && !e.isSent) return false;
    } else {
      if (e.folder !== mailFolder) return false;
    }

    if (!emailSearch.trim()) return true;
    const q = emailSearch.toLowerCase();
    return (
      (e.subject && e.subject.toLowerCase().includes(q)) ||
      (e.sender && e.sender.toLowerCase().includes(q)) ||
      (e.recipient && e.recipient.toLowerCase().includes(q)) ||
      (e.snippet && e.snippet.toLowerCase().includes(q)) ||
      (e.senderEmail && e.senderEmail.toLowerCase().includes(q)) ||
      (e.recipientEmail && e.recipientEmail.toLowerCase().includes(q))
    );
  });

  const getOtherParty = (targetEmail) => {
    if (!targetEmail) return { name: 'Recipient', email: '' };
    const myEmail = (user.email || '').toLowerCase().trim();
    if (targetEmail.senderEmail?.toLowerCase() === myEmail) {
      return {
        name: targetEmail.recipient || targetEmail.recipientEmail,
        email: targetEmail.recipientEmail
      };
    }
    return {
      name: targetEmail.sender || targetEmail.senderEmail,
      email: targetEmail.senderEmail
    };
  };

  const getThreadCount = (targetEmail) => {
    const cleanTargetSubj = normalizeSubject(targetEmail.subject).toLowerCase();
    const matches = emails.filter((e) => {
      if (targetEmail.threadId && e.threadId && targetEmail.threadId === e.threadId) return true;
      const cleanSubj = normalizeSubject(e.subject).toLowerCase();
      const sameParticipants =
        (e.senderEmail === targetEmail.senderEmail && e.recipientEmail === targetEmail.recipientEmail) ||
        (e.senderEmail === targetEmail.recipientEmail && e.recipientEmail === targetEmail.senderEmail);
      return sameParticipants && cleanSubj === cleanTargetSubj;
    });
    return matches.length;
  };

  const handleToggleStar = async (id, e) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
    setThreadMessages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
    if (selectedEmail && selectedEmail.id === id) {
      setSelectedEmail((prev) => (prev ? { ...prev, starred: !prev.starred } : null));
    }
    const token = localStorage.getItem('mailchat_token');
    if (token) {
      try {
        await toggleStarEmail(token, id);
      } catch (err) {

      }
    }
  };

  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    setQuickReplyText('');
    setReplyAttachments([]);
    setReplyEmojiOpen(false);

    const cleanSubj = normalizeSubject(email.subject).toLowerCase();
    const localMatches = emails.filter((item) => {
      if (email.threadId && item.threadId && email.threadId === item.threadId) return true;
      const itemSubj = normalizeSubject(item.subject).toLowerCase();
      const sameParticipants =
        (item.senderEmail === email.senderEmail && item.recipientEmail === email.recipientEmail) ||
        (item.senderEmail === email.recipientEmail && item.recipientEmail === email.senderEmail);
      return sameParticipants && itemSubj === cleanSubj;
    }).sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    const initialThread = localMatches.length > 0 ? localMatches : [email];
    setThreadMessages(initialThread);

    const initialCollapsed = {};
    if (initialThread.length > 2) {
      initialThread.slice(1, -1).forEach((msg) => {
        initialCollapsed[msg.id] = true;
      });
    }
    setCollapsedMsgIds(initialCollapsed);

    if (email.unread) {
      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, unread: false } : item))
      );
    }

    const token = localStorage.getItem('mailchat_token');
    if (token) {
      if (email.unread) {
        markEmailAsRead(token, email.id).catch(() => {});
      }
      setThreadLoading(true);
      try {
        const res = await getEmailThread(token, email.id);
        if (res.success && res.thread && res.thread.length > 0) {
          setThreadMessages(res.thread);
          if (res.thread.length > 2) {
            const nextCollapsed = {};
            res.thread.slice(1, -1).forEach((msg) => {
              nextCollapsed[msg.id] = true;
            });
            setCollapsedMsgIds(nextCollapsed);
          }
        }
      } catch (err) {
        console.warn('Could not fetch thread from server:', err.message);
      } finally {
        setThreadLoading(false);
      }
    }
  };

  const toggleCollapseMessage = (msgId) => {
    setCollapsedMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const toggleAllMessages = () => {
    const anyCollapsed = Object.values(collapsedMsgIds).some(Boolean);
    if (anyCollapsed) {
      setCollapsedMsgIds({});
    } else {
      const all = {};
      threadMessages.slice(0, -1).forEach((m) => {
        all[m.id] = true;
      });
      setCollapsedMsgIds(all);
    }
  };

  const handleReplyFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReplyAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            data: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  const removeReplyAttachment = (idxToRemove) => {
    setReplyAttachments((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleInsertReplyEmoji = (emoji) => {
    const textarea = replyTextareaRef.current;
    if (!textarea) {
      setQuickReplyText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? quickReplyText.length;
    const end = textarea.selectionEnd ?? quickReplyText.length;
    const nextText = quickReplyText.substring(0, start) + emoji + quickReplyText.substring(end);
    setQuickReplyText(nextText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmailIds(displayedEmails.map((e) => e.id));
    } else {
      setSelectedEmailIds([]);
    }
  };

  const handleToggleSelectEmail = (id, e) => {
    e.stopPropagation();
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedAsRead = () => {
    if (selectedEmailIds.length === 0) return;
    setEmails((prev) =>
      prev.map((e) => (selectedEmailIds.includes(e.id) ? { ...e, unread: false } : e))
    );
    selectedEmailIds.forEach((id) => {
      const token = localStorage.getItem('mailchat_token');
      if (token) markEmailAsRead(token, id).catch(() => { });
    });
    setSelectedEmailIds([]);
    showToast('Marked as read');
  };

  const handleForwardEmail = (target) => {
    const emailToForward = target || selectedEmail;
    if (!emailToForward) return;

    const subj = emailToForward.subject || '';
    const fwdSubject = subj.toLowerCase().startsWith('fwd:') ? subj : `Fwd: ${subj}`;

    const fwdBody = `\n\n---------- Forwarded message ---------
From: ${emailToForward.sender || emailToForward.senderEmail} <${emailToForward.senderEmail}>
Date: ${emailToForward.date || emailToForward.time || 'Recently'}
Subject: ${emailToForward.subject}
To: ${emailToForward.recipient || emailToForward.recipientEmail || 'me'}

${emailToForward.body || ''}`;

    setComposeData({
      to: '',
      subject: fwdSubject,
      body: fwdBody,
      category: emailToForward.category || 'Direct Mail'
    });

    setAttachments(Array.isArray(emailToForward.attachments) ? [...emailToForward.attachments] : []);
    setRecipientValid(null);
    setComposeError('');
    setComposeOpen(true);
    showToast('Forwarding email — enter recipient');
  };

  const handleDeleteEmail = async (id, permanent = false) => {
    const target = emails.find((e) => e.id === id);
    if (!target) return;

    if (target.folder === 'sent' || target.isSent || target.canDelete === false) {
      showToast('⚠️ Sent emails cannot be deleted once sent (Permanent Record)');
      return;
    }

    const isAlreadyTrash = target.folder === 'trash' || permanent;

    if (isAlreadyTrash) {

      setEmails((prev) => prev.filter((e) => e.id !== id));
      setSelectedEmailIds((prev) => prev.filter((item) => item !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      showToast('Email permanently deleted from trash');

      const token = localStorage.getItem('mailchat_token');
      if (token) {
        try {
          await deleteEmail(token, id, true);
        } catch (err) {
          showToast(err.message || 'Failed to permanently delete email');
        }
      }
    } else {

      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, folder: 'trash' } : e))
      );
      setSelectedEmailIds((prev) => prev.filter((item) => item !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      showToast('Email moved to trash');

      const token = localStorage.getItem('mailchat_token');
      if (token) {
        try {
          await deleteEmail(token, id, false);
        } catch (err) {
          showToast(err.message || 'Failed to move email to trash');
        }
      }
    }
  };

  const handleRestoreEmail = async (id) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, folder: 'inbox' } : e))
    );
    setSelectedEmailIds((prev) => prev.filter((item) => item !== id));
    if (selectedEmail?.id === id) {
      setSelectedEmail((prev) => (prev ? { ...prev, folder: 'inbox' } : null));
    }
    showToast('Email restored to inbox');

    const token = localStorage.getItem('mailchat_token');
    if (token) {
      try {
        await restoreEmail(token, id);
      } catch (err) {
        showToast(err.message || 'Failed to restore email');
      }
    }
  };

  const handleEmptyTrash = async () => {
    const trashItems = emails.filter((e) => e.folder === 'trash');
    if (trashItems.length === 0) {
      showToast('Trash is already empty');
      return;
    }

    setEmails((prev) => prev.filter((e) => e.folder !== 'trash'));
    setSelectedEmailIds([]);
    if (selectedEmail?.folder === 'trash') {
      setSelectedEmail(null);
    }
    showToast(`Emptied ${trashItems.length} email(s) from trash`);

    const token = localStorage.getItem('mailchat_token');
    if (token) {
      try {
        await emptyTrash(token);
      } catch (err) {
        showToast(err.message || 'Failed to empty trash');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEmailIds.length === 0) return;

    const hasSent = selectedEmailIds.some((id) => {
      const email = emails.find((e) => e.id === id);
      return email && (email.folder === 'sent' || email.isSent || email.canDelete === false);
    });

    if (hasSent || mailFolder === 'sent') {
      showToast('⚠️ Sent emails cannot be deleted once sent (Permanent Record)');
      return;
    }

    const idsToProcess = [...selectedEmailIds];
    const isTrashFolder = mailFolder === 'trash';

    if (isTrashFolder) {

      setEmails((prev) => prev.filter((e) => !idsToProcess.includes(e.id)));
      setSelectedEmailIds([]);
      showToast(`${idsToProcess.length} email(s) permanently deleted`);

      const token = localStorage.getItem('mailchat_token');
      if (token) {
        for (const id of idsToProcess) {
          try {
            await deleteEmail(token, id, true);
          } catch (err) {

          }
        }
      }
    } else {

      setEmails((prev) =>
        prev.map((e) => (idsToProcess.includes(e.id) ? { ...e, folder: 'trash' } : e))
      );
      setSelectedEmailIds([]);
      showToast(`${idsToProcess.length} email(s) moved to trash`);

      const token = localStorage.getItem('mailchat_token');
      if (token) {
        for (const id of idsToProcess) {
          try {
            await deleteEmail(token, id, false);
          } catch (err) {

          }
        }
      }
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedEmailIds.length === 0) return;
    const idsToRestore = [...selectedEmailIds];

    setEmails((prev) =>
      prev.map((e) => (idsToRestore.includes(e.id) ? { ...e, folder: 'inbox' } : e))
    );
    setSelectedEmailIds([]);
    showToast(`${idsToRestore.length} email(s) restored to inbox`);

    const token = localStorage.getItem('mailchat_token');
    if (token) {
      for (const id of idsToRestore) {
        try {
          await restoreEmail(token, id);
        } catch (err) {

        }
      }
    }
  };

  const handleInsertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setComposeData((prev) => ({ ...prev, body: prev.body + emoji }));
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const oldText = composeData.body;
    const newText = oldText.substring(0, start) + emoji + oldText.substring(end);
    setComposeData((prev) => ({ ...prev, body: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFileSize = 10 * 1024 * 1024; 

    files.forEach((file) => {
      if (file.size > maxFileSize) {
        showToast(`"${file.name}" exceeds the 10MB limit.`);
        return;
      }

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
        showToast(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckRecipient = async () => {
    const emailVal = composeData.to.trim().toLowerCase();
    if (!emailVal || !emailVal.includes('@')) {
      setRecipientValid(null);
      return;
    }

    setRecipientChecking(true);
    try {
      const token = localStorage.getItem('mailchat_token');
      const res = await checkRecipientEmail(token, emailVal);
      if (res.exists) {
        setRecipientValid({ exists: true, user: res.user });
        setComposeError('');
      } else {
        setRecipientValid({ exists: false });
        setComposeError(`Recipient "${emailVal}" does not exist in MailChat database. Emails can only be sent to registered accounts.`);
      }
    } catch (err) {
      setRecipientValid(null);
    } finally {
      setRecipientChecking(false);
    }
  };

  const handleSendCompose = async (e) => {
    e.preventDefault();
    setComposeError('');

    const cleanTo = composeData.to.trim().toLowerCase();
    const cleanSubject = composeData.subject.trim();
    const cleanBody = composeData.body.trim();

    if (!cleanTo) {
      setComposeError('Please provide a recipient email address.');
      return;
    }
    if (!cleanSubject) {
      setComposeError('Please provide an email subject.');
      return;
    }
    if (!cleanBody && attachments.length === 0) {
      setComposeError('Please write a message body or attach media.');
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem('mailchat_token');
      const res = await sendEmail(
        {
          to: cleanTo,
          subject: cleanSubject,
          body: cleanBody || '(Media attachment)',
          attachments,
          category: composeData.category || 'Direct Mail'
        },
        token
      );

      if (res.success && res.email) {

        setEmails((prev) => [res.email, ...prev]);

        if (cleanTo === (user.email || '').toLowerCase()) {
          const inboxCopy = {
            ...res.email,
            folder: 'inbox',
            unread: true,
            canDelete: true
          };
          setEmails((prev) => [inboxCopy, ...prev]);
        }

        const newNotif = {
          id: Date.now(),
          title: 'Email Sent Successfully',
          message: `Delivered to ${res.email.recipient} (${res.email.recipientEmail})`,
          description: `Delivered to ${res.email.recipient} (${res.email.recipientEmail})`,
          time: 'Just now',
          category: 'Email',
          unread: false
        };
        setNotifications((prev) => [newNotif, ...prev]);

        setComposeData({ to: '', subject: '', body: '', category: 'Work' });
        setAttachments([]);
        setComposeOpen(false);
        setEmojiPickerOpen(false);
        setRecipientValid(null);

        setMailFolder('sent');
        setSelectedEmail(null);
        showToast(`Email delivered to ${res.email.recipient}! Displayed in Sent tab`);
      }
    } catch (err) {
      console.error('Send error:', err);

      setComposeError(err.message || 'Failed to deliver email. Recipient might not exist in database.');
      showToast(err.message || 'Failed to deliver email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendQuickReply = async (e) => {
    e.preventDefault();
    if ((!quickReplyText.trim() && replyAttachments.length === 0) || !selectedEmail) return;

    setIsSendingReply(true);
    const otherParty = getOtherParty(selectedEmail);
    const replySubject = selectedEmail.subject.toLowerCase().startsWith('re:')
      ? selectedEmail.subject
      : `Re: ${selectedEmail.subject}`;

    try {
      const token = localStorage.getItem('mailchat_token');
      const res = await sendEmail(
        {
          to: otherParty.email,
          subject: replySubject,
          body: quickReplyText.trim(),
          attachments: replyAttachments,
          category: selectedEmail.category || 'Direct Mail',
          threadId: selectedEmail.threadId || selectedEmail.id,
          replyTo: selectedEmail.id
        },
        token
      );

      if (res.success && res.email) {

        const newReply = {
          ...res.email,
          index: threadMessages.length + 1,
          isOriginal: false,
          isLatest: true,
          isMe: true
        };

        setThreadMessages((prev) => [
          ...prev.map((m) => ({ ...m, isLatest: false })),
          newReply
        ]);

        setEmails((prev) => [res.email, ...prev]);
        setQuickReplyText('');
        setReplyAttachments([]);
        setReplyEmojiOpen(false);
        showToast(`Reply delivered to ${otherParty.name || otherParty.email}! Displayed under mails`);

        setTimeout(() => {
          threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    } catch (err) {
      showToast(err.message || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const chatMessagesEndRef = useRef(null);

  const unreadChatCount = chats.reduce((acc, c) => acc + c.unread, 0);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'You',
      role: 'Team Member',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      reactions: {}
    };

    setActiveChat((prev) => ({
      ...prev,
      lastMessage: newMsg.text,
      time: 'Just now',
      messages: [...prev.messages, newMsg]
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, lastMessage: newMsg.text, time: 'Just now', messages: [...c.messages, newMsg] }
          : c
      )
    );

    setChatInput('');
  };

  const handleAddReaction = (msgId, emoji) => {
    setActiveChat((prev) => {
      const updatedMessages = prev.messages.map((m) => {
        if (m.id !== msgId) return m;
        const currentCount = m.reactions?.[emoji] || 0;
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: currentCount + 1
          }
        };
      });
      return { ...prev, messages: updatedMessages };
    });
  };

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
    (c.role && c.role.toLowerCase().includes(chatSearch.toLowerCase()))
  );

  const [notifications, setNotifications] = useState([]);

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
                <span>Inbox Messages</span>
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
                <span>Recent Chats</span>
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
            <div className="flex-1 h-full min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">

              <div className="p-2.5 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/70 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 max-w-full overflow-x-auto scrollbar-none pb-0.5 md:pb-0">

                  <button
                    onClick={() => setComposeOpen(true)}
                    className="shrink-0 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Compose</span>
                  </button>

                  <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1 shrink-0 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => { setMailFolder('inbox'); setSelectedEmail(null); }}
                      className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${mailFolder === 'inbox' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Inbox className="w-3.5 h-3.5 shrink-0" />
                      <span>Inbox</span>
                      {unreadEmailCount > 0 && <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full shrink-0">{unreadEmailCount}</span>}
                    </button>

                    <button
                      onClick={() => { setMailFolder('starred'); setSelectedEmail(null); }}
                      className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${mailFolder === 'starred' ? 'bg-amber-500 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Star className="w-3.5 h-3.5 shrink-0" />
                      <span>Starred</span>
                      {starredEmailCount > 0 && <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full shrink-0">{starredEmailCount}</span>}
                    </button>

                    <button
                      onClick={() => { setMailFolder('sent'); setSelectedEmail(null); }}
                      className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${mailFolder === 'sent' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span>Sent</span>
                    </button>

                    <button
                      onClick={() => { setMailFolder('trash'); setSelectedEmail(null); }}
                      className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${mailFolder === 'trash' ? 'bg-rose-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Trash</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-72 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                      placeholder="Search in mail..."
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                    {emailSearch && (
                      <button
                        onClick={() => setEmailSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchEmailsData(true)}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer transition-colors shrink-0 shadow-xs"
                    title="Refresh emails"
                  >
                    <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">

                <div className={`flex flex-col h-full bg-white dark:bg-slate-900 ${selectedEmail ? 'hidden' : 'w-full flex'}`}>

                  <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={displayedEmails.length > 0 && selectedEmailIds.length === displayedEmails.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        title="Select All"
                      />
                      <button
                        onClick={() => fetchEmailsData(true)}
                        disabled={isRefreshing}
                        className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Refresh emails"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                      </button>

                      {selectedEmailIds.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                          <button
                            onClick={handleMarkSelectedAsRead}
                            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Mark as Read"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>

                          {mailFolder === 'trash' ? (
                            <>
                              <button
                                onClick={handleRestoreSelected}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 font-bold text-[11px] cursor-pointer shadow-xs transition-colors"
                                title="Restore selected to inbox"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Restore Selected</span>
                              </button>
                              <button
                                onClick={handleDeleteSelected}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1 font-bold text-[11px] cursor-pointer shadow-xs transition-colors"
                                title="Permanently delete selected from trash"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete Permanently</span>
                              </button>
                            </>
                          ) : mailFolder !== 'sent' ? (
                            <button
                              onClick={handleDeleteSelected}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 flex items-center gap-1 font-bold text-[11px] cursor-pointer shadow-xs transition-colors"
                              title="Move selected to Trash"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Move to Trash</span>
                            </button>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center gap-1 select-none"
                              title="Sent emails cannot be deleted (Permanent Audit Record)"
                            >
                              <Lock className="w-3 h-3" />
                              <span className="hidden sm:inline">Sent (Locked)</span>
                            </span>
                          )}
                        </div>
                      )}

                      {mailFolder === 'trash' && selectedEmailIds.length === 0 && displayedEmails.length > 0 && (
                        <button
                          onClick={handleEmptyTrash}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          title="Empty all emails from trash permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Empty Trash Now</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none">
                      {displayedEmails.length} {displayedEmails.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {emailsLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-xs font-semibold">Loading messages...</span>
                      </div>
                    ) : displayedEmails.length === 0 ? (
                      mailFolder === 'starred' ? (
                        <div className="py-20 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-1 shadow-xs">
                            <Star className="w-6 h-6 fill-amber-400/30 text-amber-500" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-base">No Starred Messages</span>
                          <span className="text-xs text-slate-400 max-w-xs">
                            Stars let you give messages a special status to make them easier to find. Click the star icon on any message to star it.
                          </span>
                        </div>
                      ) : mailFolder === 'trash' ? (
                        <div className="py-20 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1 shadow-xs">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-base">Trash is Empty</span>
                          <span className="text-xs text-slate-400 max-w-xs">
                            No deleted messages in trash. Messages moved to trash will appear here.
                          </span>
                        </div>
                      ) : (
                        <div className="py-20 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                          <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                          <span>No messages in {mailFolder}</span>
                        </div>
                      )
                    ) : (
                      displayedEmails.map((email) => {
                        const isChecked = selectedEmailIds.includes(email.id);

                        return (
                          <div
                            key={email.id}
                            onClick={() => handleSelectEmail(email)}
                            className={`p-3.5 sm:px-5 transition-colors cursor-pointer relative group flex items-center justify-between gap-3 ${
                              email.unread
                                ? 'bg-slate-50/80 dark:bg-slate-900/90 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 font-medium'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                            }`}
                          >

                            <div className="flex items-center gap-3 min-w-0 flex-1">

                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleToggleSelectEmail(email.id, e)}
                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                              />

                              <button
                                type="button"
                                onClick={(e) => handleToggleStar(email.id, e)}
                                className="text-slate-400 hover:text-amber-400 cursor-pointer shrink-0 p-0.5"
                                title={email.starred ? 'Starred' : 'Not starred'}
                              >
                                <Star className={`w-4 h-4 ${email.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>

                              <div className="flex items-center gap-1.5 sm:gap-2 max-w-[110px] xs:max-w-[140px] sm:w-56 shrink-0 truncate">
                                <span className={`text-sm truncate ${email.unread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                                  {mailFolder === 'sent' || email.isSent ? `To: ${email.recipient || email.recipientEmail}` : email.sender}
                                </span>
                                {getThreadCount(email) > 1 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 select-none" title={`${getThreadCount(email)} messages in thread`}>
                                    {getThreadCount(email)}
                                  </span>
                                )}
                                {email.unread && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
                                <span className={`text-sm truncate ${email.unread ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                                  {email.subject}
                                </span>
                                {email.attachments && email.attachments.length > 0 && (
                                  <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" title={`${email.attachments.length} attachment(s)`} />
                                )}
                                <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden md:inline">
                                  — {email.snippet}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                {mailFolder === 'trash' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreEmail(email.id);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                      title="Restore to Inbox"
                                    >
                                      <RotateCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEmail(email.id, true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                      title="Delete Permanently from Trash"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleForwardEmail(email);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                      title="Forward"
                                    >
                                      <Forward className="w-3.5 h-3.5" />
                                    </button>
                                    {email.folder !== 'sent' && !email.isSent && email.canDelete !== false ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEmail(email.id, false);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                        title="Move to Trash"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="p-1.5 text-slate-400" title="Sent (Locked)">
                                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              {email.category && (
                                <span className="hidden lg:inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {email.category}
                                </span>
                              )}
                              <span className={`text-xs whitespace-nowrap ${email.unread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                                {email.time}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>

                {selectedEmail && (
                  <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="flex-1 flex flex-col h-full overflow-hidden">

                      <div className="p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
                            <button
                              onClick={() => setSelectedEmail(null)}
                              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 active:scale-95"
                              title="Back to all messages"
                            >
                              <ArrowLeft className="w-4 h-4 shrink-0" />
                              <span className="hidden sm:inline">All Messages</span>
                            </button>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 truncate max-w-[130px] sm:max-w-none">
                              {selectedEmail.category || 'Direct Mail'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 select-none shrink-0 whitespace-nowrap">
                              <span>{threadMessages.length} {threadMessages.length === 1 ? 'mail' : 'mails in thread'}</span>
                              {threadLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 shrink-0 overflow-x-auto scrollbar-none pt-1 sm:pt-0 border-t border-slate-200/60 dark:border-slate-800/60 sm:border-t-0">
                            {threadMessages.length > 1 && (
                              <button
                                type="button"
                                onClick={toggleAllMessages}
                                className="px-2 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-xs shrink-0"
                                title="Expand or collapse older replies"
                              >
                                <ChevronsUpDown className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">
                                  {Object.values(collapsedMsgIds).some(Boolean) ? 'Expand All' : 'Collapse Older'}
                                </span>
                              </button>
                            )}

                            <button
                              onClick={() => handleForwardEmail(selectedEmail)}
                              className="px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                              title="Forward thread"
                            >
                              <Forward className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="hidden md:inline">Forward</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => fetchEmailsData(true)}
                              disabled={isRefreshing}
                              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
                              title="Refresh thread"
                            >
                              <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                            </button>

                            <button
                              onClick={(e) => handleToggleStar(selectedEmail.id, e)}
                              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                              title="Star thread"
                            >
                              <Star className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${selectedEmail.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </button>

                            {selectedEmail.folder === 'sent' || selectedEmail.isSent || selectedEmail.canDelete === false ? (
                              <div
                                className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-xs font-bold select-none shrink-0"
                                title="Compliance Policy: Sent emails cannot be deleted once sent."
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Sent (Permanent)</span>
                              </div>
                            ) : selectedEmail.folder === 'trash' ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleRestoreEmail(selectedEmail.id)}
                                  className="px-2 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer shadow-xs transition-colors shrink-0"
                                  title="Restore email to inbox"
                                >
                                  <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="hidden md:inline">Restore</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteEmail(selectedEmail.id, true)}
                                  className="px-2 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer shadow-xs transition-colors shrink-0"
                                  title="Delete permanently from trash"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span className="hidden md:inline">Delete Permanently</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteEmail(selectedEmail.id, false)}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                                title="Move to trash"
                              >
                                <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedEmail(null)}
                              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center shrink-0"
                              title="Close email view"
                            >
                              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                            </button>
                          </div>
                        </div>

                        <h2 className="text-base sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight break-words">
                          {normalizeSubject(selectedEmail.subject)}
                        </h2>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-4">

                        {threadMessages.map((msg, idx) => {
                          const isMe = msg.senderEmail?.toLowerCase() === (user.email || '').toLowerCase().trim();
                          const isCollapsed = Boolean(collapsedMsgIds[msg.id]);
                          const isLatest = idx === threadMessages.length - 1;
                          const isOriginal = idx === 0;

                          return (
                            <div key={msg.id || idx} className="space-y-4">

                              {idx > 0 && (
                                <div className="flex items-center justify-center my-1 select-none">
                                  <div className="h-5 w-0.5 bg-slate-200 dark:bg-slate-700" />
                                </div>
                              )}

                              <div
                                className={`rounded-2xl border transition-all ${
                                  isLatest
                                    ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-sm'
                                    : 'bg-white/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                                }`}
                              >

                                {isCollapsed ? (
                                  <div
                                    onClick={() => toggleCollapseMessage(msg.id)}
                                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl select-none"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                                          isMe
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-indigo-600 text-white'
                                        }`}
                                      >
                                        {(msg.sender || 'U').slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                          <span>{isMe ? 'You' : msg.sender}</span>
                                          {isMe && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                                              Me
                                            </span>
                                          )}
                                          <span className="text-[10px] text-slate-400 font-normal">
                                            #{idx + 1}
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                          {msg.snippet || msg.body?.slice(0, 75)}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {msg.attachments && msg.attachments.length > 0 && (
                                        <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" title={`${msg.attachments.length} attachment(s)`} />
                                      )}
                                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                        {msg.date || msg.time}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    </div>
                                  </div>
                                ) : (

                                  <div className="p-4 sm:p-5 sm:px-6">

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                        <div
                                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0 ${
                                            isMe
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-indigo-600 text-white'
                                          }`}
                                        >
                                          {(msg.sender || 'U').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                              {isMe ? 'You' : msg.sender}
                                            </span>
                                            {isMe && (
                                              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                                                Me
                                              </span>
                                            )}
                                            <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                                              {isOriginal ? 'Original Email' : isLatest ? 'Latest Reply' : `Reply #${idx}`}
                                            </span>
                                          </div>
                                          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5 flex items-center gap-1">
                                            <span className="font-mono text-slate-400 truncate">&lt;{msg.senderEmail}&gt;</span>
                                            <span className="shrink-0">•</span>
                                            <span className="truncate">to {msg.recipient || msg.recipientEmail || 'me'}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pl-11 sm:pl-0">
                                        <span className="text-[11px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">
                                          {msg.date || msg.time}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleForwardEmail(msg)}
                                            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                            title="Forward message"
                                          >
                                            <Forward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleStar(msg.id, e)}
                                            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                                            title="Star message"
                                          >
                                            <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${msg.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                                          </button>
                                          {threadMessages.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => toggleCollapseMessage(msg.id)}
                                              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                                              title="Collapse message"
                                            >
                                              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="py-4 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line font-normal">
                                      {msg.body}
                                    </div>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                          <span>Delivered Attachments ({msg.attachments.length})</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {msg.attachments.map((att, aIdx) => (
                                            <div
                                              key={aIdx}
                                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-all flex flex-col justify-between"
                                            >
                                              {att.type?.startsWith('image/') ? (
                                                <div
                                                  onClick={() => setPreviewMedia(att)}
                                                  className="mb-2 relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 h-28 flex items-center justify-center cursor-pointer group"
                                                  title="Click to view full image"
                                                >
                                                  <img src={att.data} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                                    Enlarge
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="mb-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 h-20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                  <FileText className="w-8 h-8" />
                                                </div>
                                              )}
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={att.name}>
                                                    {att.name}
                                                  </p>
                                                  <p className="text-[10px] text-slate-400 font-medium">
                                                    {((att.size || 0) / 1024).toFixed(0)} KB
                                                  </p>
                                                </div>
                                                <a
                                                  href={att.data}
                                                  download={att.name}
                                                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer shadow-xs transition-colors"
                                                  title={`Download ${att.name}`}
                                                >
                                                  <Download className="w-3.5 h-3.5" />
                                                </a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          const otherParty = getOtherParty(selectedEmail);
                          return (
                            <div className="mt-6 pt-2">
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all">

                                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <Reply className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Reply to {otherParty.name}</span>
                                    <span className="text-[11px] font-normal text-slate-400 font-mono">
                                      &lt;{otherParty.email}&gt;
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                                    Conversation thread response
                                  </span>
                                </div>

                                <form onSubmit={handleSendQuickReply} className="p-4 space-y-3">

                                  <textarea
                                    ref={replyTextareaRef}
                                    rows={3}
                                    value={quickReplyText}
                                    onChange={(e) => setQuickReplyText(e.target.value)}
                                    placeholder={`Reply to ${otherParty.name}...`}
                                    className="w-full text-sm sm:text-base bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                                  />

                                  {replyAttachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                      {replyAttachments.map((att, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
                                        >
                                          {att.type?.startsWith('image/') ? (
                                            <img src={att.data} alt={att.name} className="w-4 h-4 rounded object-cover shrink-0" />
                                          ) : (
                                            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                          )}
                                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                            {att.name}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            ({(att.size / 1024).toFixed(0)} KB)
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeReplyAttachment(idx)}
                                            className="p-0.5 hover:text-rose-500 rounded text-slate-400 cursor-pointer"
                                            title="Remove attachment"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="relative flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">

                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">

                                      <input
                                        ref={replyFileInputRef}
                                        type="file"
                                        multiple
                                        onChange={handleReplyFileSelect}
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.mp4,.mp3"
                                      />

                                      <button
                                        type="button"
                                        onClick={() => replyFileInputRef.current?.click()}
                                        className="p-2 rounded-xl hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                                        title="Attach files (Images, PDFs, docs, videos)"
                                      >
                                        <Paperclip className="w-4 h-4" />
                                        {replyAttachments.length > 0 && (
                                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {replyAttachments.length}
                                          </span>
                                        )}
                                      </button>

                                      <div className="relative" ref={replyEmojiPickerRef}>
                                        <button
                                          type="button"
                                          onClick={() => setReplyEmojiOpen(!replyEmojiOpen)}
                                          className={`p-2 rounded-xl hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                            replyEmojiOpen ? 'text-amber-500 bg-amber-50 dark:bg-slate-800' : ''
                                          }`}
                                          title="Insert emoji"
                                        >
                                          <Smile className="w-4 h-4" />
                                        </button>

                                        {replyEmojiOpen && (
                                          <div className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex items-center gap-1 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
                                              {EMOJI_CATEGORIES.map((cat) => (
                                                <button
                                                  key={cat.name}
                                                  type="button"
                                                  onClick={() => setReplyEmojiCat(cat.name)}
                                                  className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                                                    replyEmojiCat === cat.name
                                                      ? 'bg-blue-600 text-white shadow-xs'
                                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                  }`}
                                                >
                                                  <span>{cat.icon}</span>
                                                  <span>{cat.name}</span>
                                                </button>
                                              ))}
                                            </div>
                                            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1 max-h-44 overflow-y-auto p-1 scrollbar-none text-xl sm:text-2xl">
                                              {EMOJI_CATEGORIES.find((c) => c.name === replyEmojiCat)?.emojis.map((emoji, eIdx) => (
                                                <button
                                                  key={eIdx}
                                                  type="button"
                                                  onClick={() => handleInsertReplyEmoji(emoji)}
                                                  className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer hover:scale-120 transition-transform active:scale-95"
                                                  title={emoji}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {(quickReplyText.trim() || replyAttachments.length > 0) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQuickReplyText('');
                                            setReplyAttachments([]);
                                          }}
                                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                                        >
                                          Discard
                                        </button>
                                      )}
                                      <button
                                        type="submit"
                                        disabled={isSendingReply || (!quickReplyText.trim() && replyAttachments.length === 0)}
                                        className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
                                      >
                                        {isSendingReply ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Delivering...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Reply className="w-3.5 h-3.5" />
                                            <span>Send Reply</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </div>
                          );
                        })()}

                        <div ref={threadEndRef} />
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {composeOpen && (
                <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 sm:w-140 max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">

                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-bold text-sm">New Message</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComposeOpen(false)}
                      className="p-1 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSendCompose} className="p-4 flex-1 flex flex-col overflow-y-auto space-y-3">

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 shrink-0">To:</span>
                        <input
                          type="email"
                          required
                          value={composeData.to}
                          onChange={(e) => {
                            setComposeData({ ...composeData, to: e.target.value });
                            setRecipientValid(null);
                            setComposeError('');
                          }}
                          onBlur={handleCheckRecipient}
                          placeholder="Enter email"
                          className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                        />
                        {recipientChecking && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                        )}
                        {recipientValid?.exists && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                            <Check className="w-3 h-3" />
                            <span>{recipientValid.user?.name || 'Verified User'}</span>
                          </span>
                        )}
                      </div>

                      {composeError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span className="font-semibold leading-relaxed">{composeError}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 shrink-0">Subject:</span>
                      <input
                        type="text"
                        required
                        value={composeData.subject}
                        onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                        placeholder="Enter subject"
                        className="flex-1 text-sm bg-transparent border-none text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex-1 min-h-[140px] relative">
                      <textarea
                        ref={textareaRef}
                        rows={6}
                        value={composeData.body}
                        onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                        placeholder="Write your email here..."
                        className="w-full text-sm bg-transparent border-none text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 resize-none leading-relaxed"
                      />
                    </div>

                    {attachments.length > 0 && (
                      <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          <span>Attached Media ({attachments.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-none">
                          {attachments.map((att, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
                            >
                              {att.type?.startsWith('image/') ? (
                                <img src={att.data} alt={att.name} className="w-5 h-5 rounded object-cover shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                {att.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({(att.size / 1024).toFixed(0)} KB)
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="p-0.5 hover:text-rose-500 rounded text-slate-400 cursor-pointer"
                                title="Remove attachment"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="relative flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">

                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.mp4,.mp3"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-xl hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
                          title="Attach media files (Images, PDFs, docs, videos)"
                        >
                          <Paperclip className="w-4 h-4" />
                          {attachments.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                              {attachments.length}
                            </span>
                          )}
                        </button>

                        <div className="relative" ref={emojiPickerRef}>
                          <button
                            type="button"
                            onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                            className={`p-2 rounded-xl hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${emojiPickerOpen ? 'text-amber-500 bg-amber-50 dark:bg-slate-800' : ''
                              }`}
                            title="Insert emojis"
                          >
                            <Smile className="w-4 h-4" />
                          </button>

                          {emojiPickerOpen && (
                            <div className="absolute bottom-12 left-0 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">

                              <div className="flex items-center gap-1 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
                                {EMOJI_CATEGORIES.map((cat) => (
                                  <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setSelectedEmojiCat(cat.name)}
                                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${selectedEmojiCat === cat.name
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1 scrollbar-none text-xl sm:text-2xl">
                                {EMOJI_CATEGORIES.find((c) => c.name === selectedEmojiCat)?.emojis.map((emoji, eIdx) => (
                                  <button
                                    key={eIdx}
                                    type="button"
                                    onClick={() => handleInsertEmoji(emoji)}
                                    className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer hover:scale-120 transition-transform active:scale-95"
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setComposeOpen(false);
                            setAttachments([]);
                            setComposeError('');
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          disabled={isSending}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Delivering...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Email</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {previewMedia && (
                <div
                  onClick={() => setPreviewMedia(null)}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                  >
                    <div className="px-4 py-3 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
                      <span className="font-bold text-sm truncate">{previewMedia.name}</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={previewMedia.data}
                          download={previewMedia.name}
                          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setPreviewMedia(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
                      <img src={previewMedia.data} alt={previewMedia.name} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'chats' && (
            <div className="flex-1 h-full min-h-0 flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">

              <div className={`w-full md:w-80 md:border-r border-slate-200 dark:border-slate-800 flex-col h-full shrink-0 bg-slate-50/60 dark:bg-slate-950/40 ${mobileChatOpen ? 'hidden md:flex' : 'flex'}`}>

                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Search direct messages..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Direct Messages</span>
                    <span className="text-[11px] font-semibold text-slate-400">({filteredChats.length})</span>
                  </div>

                  <div className="space-y-1">
                    {filteredChats.length === 0 ? (
                      <div className="py-12 px-3 text-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Direct Messages</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Conversations with team members will appear here.</div>
                      </div>
                    ) : (
                      filteredChats.map((dm) => {
                        const isSelected = activeChat?.id === dm.id;
                        return (
                          <button
                            key={dm.id}
                            onClick={() => {
                              setActiveChat(dm);
                              setMobileChatOpen(true);
                            }}
                            className={`w-full px-3 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                                  }`}>
                                  {dm.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 ${isSelected ? 'border-indigo-600' : 'border-white dark:border-slate-900'
                                  } ${dm.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold truncate">{dm.name}</div>
                                <div className={`text-xs truncate font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {dm.lastMessage}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                              <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {dm.time}
                              </span>
                              {dm.unread > 0 && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                  }`}>
                                  {dm.unread}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              <div className={`flex-1 flex-col h-full bg-white dark:bg-slate-900 overflow-hidden ${mobileChatOpen ? 'flex' : 'hidden md:flex'}`}>
                {!activeChat ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-slate-950/20">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">No Conversation Selected</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                      Select a direct conversation from the left to start sending messages in real time.
                    </p>
                  </div>
                ) : (
                  <>

                    <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">

                        <button
                          type="button"
                          onClick={() => setMobileChatOpen(false)}
                          className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                          title="Back to chat list"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                          {activeChat?.name ? activeChat.name.slice(0, 2).toUpperCase() : 'DM'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            <span className="truncate">{activeChat?.name}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                              <span className={`w-2 h-2 rounded-full ${activeChat?.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {activeChat?.status || (activeChat?.online ? 'Online' : 'Offline')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                            {activeChat?.role}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => showToast('Search messages')}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Search in conversation"
                        >
                          <Search className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => showToast('Conversation info')}
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Details"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {activeChat?.messages?.map((m) => (
                        <div
                          key={m.id}
                          className={`flex gap-3 group ${m.isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >

                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs ${m.isMe ? 'bg-blue-600' : 'bg-indigo-600'
                            }`}>
                            {m.sender.slice(0, 2).toUpperCase()}
                          </div>

                          <div className={`max-w-lg ${m.isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                            <div className={`flex items-center gap-2 mb-1 text-xs ${m.isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="font-bold text-slate-900 dark:text-white">{m.sender}</span>
                              {m.role && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  {m.role}
                                </span>
                              )}
                              <span className="text-slate-400 text-[11px]">{m.time}</span>
                            </div>

                            <div className={`px-4 py-2.5 rounded-2xl text-sm sm:text-base leading-relaxed ${m.isMe
                              ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                              }`}>
                              {m.text}
                            </div>

                            <div className={`flex items-center gap-1.5 mt-1.5 flex-wrap ${m.isMe ? 'justify-end' : 'justify-start'}`}>
                              {m.reactions && Object.entries(m.reactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(m.id, emoji)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer"
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300">{count}</span>
                                </button>
                              ))}

                              <button
                                onClick={() => handleAddReaction(m.id, '👍')}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity cursor-pointer text-xs"
                                title="React with 👍"
                              >
                                +👍
                              </button>
                              <button
                                onClick={() => handleAddReaction(m.id, '❤️')}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity cursor-pointer text-xs"
                                title="React with ❤️"
                              >
                                +❤️
                              </button>
                            </div>

                          </div>
                        </div>
                      ))}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
                      <form onSubmit={handleSendMessage} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden focus-within:border-indigo-600 transition-colors">

                        <div className="p-3">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={`Message ${activeChat?.name || 'teammate'}...`}
                            className="w-full text-sm sm:text-base bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>

                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <button
                              type="button"
                              onClick={() => showToast('Attach file')}
                              className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Attach file"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setChatInput((prev) => prev + ' 😊')}
                              className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Emoji"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-400 hidden sm:inline">
                              Press Enter ↵ to send
                            </span>
                            <button
                              type="submit"
                              disabled={!chatInput.trim()}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <span>Send</span>
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </>
                )}
              </div>

            </div>
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

    </div>
  );
}
