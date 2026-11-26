import Email from '../models/Email.js';
import Notification from '../models/Notification.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';
import { getUserByEmail } from '../utils/userStore.js';

const formatEmailTime = (dateObj) => {
  const d = new Date(dateObj);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatEmailDate = (dateObj) => {
  const d = new Date(dateObj);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const normalizeSubject = (subj) => {
  return (subj || '').replace(/^(\s*(Re|Fwd|FW):\s*)+/i, '').trim();
};

export const sendEmail = async (req, res) => {
  try {
    const { to, subject, body, attachments = [], category = 'Direct Mail', threadId, replyTo } = req.body;

    if (!to || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required.'
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email subject is required.'
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email body message is required.'
      });
    }

    const cleanTo = to.toLowerCase().trim();

    const recipientUser = await getUserByEmail(cleanTo, req.firebaseToken);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: `Recipient is not registered`
      });
    }

    const snippetText = body.trim().replace(/\s+/g, ' ');
    const snippet = snippetText.length > 90 ? `${snippetText.slice(0, 90)}...` : snippetText;

    if (Array.isArray(attachments) && attachments.length > 0) {
      const totalSize = attachments.reduce((sum, a) => sum + (Number(a.size) || 0), 0);
      if (totalSize > 12 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Total attachments size cannot exceed 12MB per email'
        });
      }
    }

    const validAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
        name: att.name || 'attachment',
        size: Number(att.size) || 0,
        type: att.type || 'application/octet-stream',
        data: att.data || ''
      }))
      : [];

    const isSelfSend = req.user._id.toString() === recipientUser._id.toString();

    let resolvedThreadId = null;
    let resolvedReplyTo = null;

    if (replyTo) {
      const parent = await Email.findById(replyTo);
      if (parent) {
        resolvedReplyTo = parent._id;
        resolvedThreadId = parent.threadId || parent._id;
      }
    } else if (threadId) {
      resolvedThreadId = threadId;
    }

    if (!resolvedThreadId) {
      const cleanSubject = normalizeSubject(subject);
      const existingThreadEmail = await Email.findOne({
        $or: [
          { sender: req.user._id, recipient: recipientUser._id },
          { sender: recipientUser._id, recipient: req.user._id }
        ],
        subject: new RegExp('^(\\s*(Re|Fwd|FW):\\s*)*' + escapeRegExp(cleanSubject) + '$', 'i')
      }).sort({ createdAt: 1 });

      if (existingThreadEmail) {
        resolvedThreadId = existingThreadEmail.threadId || existingThreadEmail._id;
      }
    }

    const newEmail = await Email.create({
      sender: req.user._id,
      senderName: req.user.name,
      senderEmail: req.user.email,
      recipient: recipientUser._id,
      recipientName: recipientUser.name,
      recipientEmail: recipientUser.email,
      subject: subject.trim(),
      body: body.trim(),
      snippet,
      attachments: validAttachments,
      category: category.trim() || 'Work',
      threadId: resolvedThreadId,
      replyTo: resolvedReplyTo,
      isRead: false,
      isStarredBySender: false,
      isStarredByRecipient: false,
      deletedByRecipient: false,
      deletedBySender: false
    });

    if (!resolvedThreadId) {
      newEmail.threadId = newEmail._id;
      await newEmail.save();
    }

    const io = req.app.get('io');

    await createNotificationAndEmit(io, {
      userId: recipientUser._id,
      title: `New Email from ${req.user.name}`,
      message: `${req.user.name} sent you an email: "${subject.trim()}"`,
      type: 'email',
      relatedEmail: newEmail._id,
      unread: true
    });

    if (io) {
      io.to(recipientUser._id.toString()).emit('new_email', {
        id: newEmail._id,
        threadId: newEmail.threadId,
        sender: newEmail.senderName,
        senderEmail: newEmail.senderEmail,
        subject: newEmail.subject,
        snippet: newEmail.snippet,
        createdAt: newEmail.createdAt
      });
    }

    if (!isSelfSend) {
      await createNotificationAndEmit(io, {
        userId: req.user._id,
        title: 'Email Sent Successfully',
        message: `Message "${subject.trim()}" was successfully delivered to ${recipientUser.name} (${recipientUser.email}).`,
        type: 'email',
        relatedEmail: newEmail._id,
        unread: false
      });
    }

    return res.status(201).json({
      success: true,
      message: `Email successfully delivered to ${recipientUser.name} (${recipientUser.email})`,
      email: {
        id: newEmail._id,
        threadId: newEmail.threadId,
        replyTo: newEmail.replyTo,
        sender: newEmail.senderName,
        senderEmail: newEmail.senderEmail,
        recipient: newEmail.recipientName,
        recipientEmail: newEmail.recipientEmail,
        subject: newEmail.subject,
        body: newEmail.body,
        snippet: newEmail.snippet,
        attachments: newEmail.attachments,
        category: newEmail.category,
        time: formatEmailTime(newEmail.createdAt),
        date: formatEmailDate(newEmail.createdAt),
        unread: !newEmail.isRead,
        starred: false,
        folder: 'sent',
        isSent: true,
        canDelete: false
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while sending email'
    });
  }
};

export const getEmails = async (req, res) => {
  try {
    const { folder = 'inbox' } = req.query;
    const userId = req.user._id;

    let query = {};

    if (folder === 'inbox') {
      query = {
        recipient: userId,
        deletedByRecipient: false,
        permanentlyDeletedByRecipient: { $ne: true }
      };
    } else if (folder === 'sent') {

      query = {
        sender: userId
      };
    } else if (folder === 'starred') {
      query = {
        $or: [
          { recipient: userId, isStarredByRecipient: true, deletedByRecipient: false, permanentlyDeletedByRecipient: { $ne: true } },
          { sender: userId, isStarredBySender: true }
        ]
      };
    } else if (folder === 'trash') {

      query = {
        recipient: userId,
        deletedByRecipient: true,
        permanentlyDeletedByRecipient: { $ne: true }
      };
    } else {

      query = {
        $or: [
          { recipient: userId, permanentlyDeletedByRecipient: { $ne: true } },
          { sender: userId }
        ]
      };
    }

    const emails = await Email.find(query).sort({ createdAt: -1 });

    const formatted = emails.map((e) => {
      const isSentByMe = e.sender.toString() === userId.toString();
      const isStarred = isSentByMe ? e.isStarredBySender : e.isStarredByRecipient;

      let emailFolder = 'inbox';
      if (isSentByMe && (folder === 'sent' || e.recipient.toString() !== userId.toString())) {
        emailFolder = 'sent';
      } else if (e.deletedByRecipient) {
        emailFolder = 'trash';
      }

      return {
        id: e._id,
        threadId: e.threadId || e._id,
        replyTo: e.replyTo || null,
        sender: e.senderName,
        senderEmail: e.senderEmail,
        recipient: e.recipientName,
        recipientEmail: e.recipientEmail,
        subject: e.subject,
        body: e.body,
        snippet: e.snippet,
        attachments: e.attachments || [],
        category: e.category || 'General',
        time: formatEmailTime(e.createdAt),
        date: formatEmailDate(e.createdAt),
        unread: isSentByMe ? false : !e.isRead,
        starred: isStarred,
        folder: emailFolder,
        isSent: isSentByMe,
        canDelete: !isSentByMe
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      emails: formatted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch emails'
    });
  }
};

export const getEmailThread = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const baseEmail = await Email.findById(id);
    if (!baseEmail) {
      return res.status(404).json({
        success: false,
        message: 'Email not found.'
      });
    }

    const isParticipant =
      baseEmail.sender.toString() === userId.toString() ||
      baseEmail.recipient.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this thread.'
      });
    }

    const targetThreadId = baseEmail.threadId || baseEmail._id;
    const cleanSubject = normalizeSubject(baseEmail.subject);

    const threadEmails = await Email.find({
      $or: [
        { threadId: targetThreadId },
        { _id: targetThreadId },
        {
          $or: [
            { sender: baseEmail.sender, recipient: baseEmail.recipient },
            { sender: baseEmail.recipient, recipient: baseEmail.sender }
          ],
          subject: new RegExp('^(\\s*(Re|Fwd|FW):\\s*)*' + escapeRegExp(cleanSubject) + '$', 'i')
        }
      ]
    }).sort({ createdAt: 1 });

    const unreadIds = threadEmails
      .filter((e) => e.recipient.toString() === userId.toString() && !e.isRead)
      .map((e) => e._id);

    if (unreadIds.length > 0) {
      await Email.updateMany({ _id: { $in: unreadIds } }, { $set: { isRead: true } });
    }

    const formatted = threadEmails.map((e, index) => {
      const isSentByMe = e.sender.toString() === userId.toString();
      const isStarred = isSentByMe ? e.isStarredBySender : e.isStarredByRecipient;

      return {
        id: e._id,
        threadId: e.threadId || targetThreadId,
        replyTo: e.replyTo || null,
        index: index + 1,
        isOriginal: index === 0,
        isLatest: index === threadEmails.length - 1,
        sender: e.senderName,
        senderEmail: e.senderEmail,
        recipient: e.recipientName,
        recipientEmail: e.recipientEmail,
        subject: e.subject,
        body: e.body,
        snippet: e.snippet,
        attachments: e.attachments || [],
        category: e.category || 'Direct Mail',
        time: formatEmailTime(e.createdAt),
        date: formatEmailDate(e.createdAt),
        createdAt: e.createdAt,
        unread: isSentByMe ? false : (unreadIds.some((uid) => uid.toString() === e._id.toString()) ? false : !e.isRead),
        starred: isStarred,
        isMe: isSentByMe,
        folder: isSentByMe ? 'sent' : (e.deletedByRecipient ? 'trash' : 'inbox'),
        canDelete: !isSentByMe
      };
    });

    return res.status(200).json({
      success: true,
      threadId: targetThreadId,
      subject: baseEmail.subject,
      normalizedSubject: cleanSubject,
      count: formatted.length,
      thread: formatted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch email thread'
    });
  }
};

export const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const email = await Email.findById(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found.'
      });
    }

    const userId = req.user._id.toString();

    if (email.sender.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: 'Compliance Policy: Sent emails cannot be deleted once sent. They are preserved as a permanent communication record.'
      });
    }

    if (email.recipient.toString() === userId) {

      if (email.deletedByRecipient || permanent === 'true') {
        email.permanentlyDeletedByRecipient = true;
        await email.save();
        return res.status(200).json({
          success: true,
          action: 'permanent',
          message: 'Email permanently deleted from trash.'
        });
      }

      email.deletedByRecipient = true;
      await email.save();
      return res.status(200).json({
        success: true,
        action: 'trash',
        message: 'Email moved to trash.'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'You are not authorized to delete this email.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete email'
    });
  }
};

export const restoreEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await Email.findById(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found.'
      });
    }

    const userId = req.user._id.toString();
    if (email.recipient.toString() === userId) {
      email.deletedByRecipient = false;
      email.permanentlyDeletedByRecipient = false;
      await email.save();
      return res.status(200).json({
        success: true,
        message: 'Email restored to inbox.'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'You are not authorized to restore this email.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore email'
    });
  }
};

export const emptyTrash = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await Email.updateMany(
      { recipient: userId, deletedByRecipient: true },
      { $set: { permanentlyDeletedByRecipient: true } }
    );

    return res.status(200).json({
      success: true,
      message: `Trash emptied successfully. ${result.modifiedCount} email(s) permanently purged.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to empty trash'
    });
  }
};

export const toggleStarEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await Email.findById(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found.'
      });
    }

    const userId = req.user._id.toString();

    if (email.sender.toString() === userId) {
      email.isStarredBySender = !email.isStarredBySender;
    }
    if (email.recipient.toString() === userId) {
      email.isStarredByRecipient = !email.isStarredByRecipient;
    }

    await email.save();

    const isStarred = email.sender.toString() === userId ? email.isStarredBySender : email.isStarredByRecipient;

    return res.status(200).json({
      success: true,
      starred: isStarred
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle star'
    });
  }
};

export const markEmailRead = async (req, res) => {
  try {
    const { id } = req.params;
    const email = await Email.findById(id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found.'
      });
    }

    if (email.recipient.toString() === req.user._id.toString()) {
      email.isRead = true;
      await email.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Email marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark email as read'
    });
  }
};

export const checkRecipient = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(cleanEmail, req.firebaseToken);

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: `User not registered`
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check recipient'
    });
  }
};
