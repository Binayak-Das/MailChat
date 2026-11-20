import Notification from '../models/Notification.js';

export const createNotificationAndEmit = async (io, {
  userId,
  title,
  message,
  type = 'system',
  relatedEmail = null,
  relatedChat = null,
  unread = true
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  try {
    const notif = await Notification.create({
      user: userId,
      title: title.trim(),
      message: message.trim(),
      type,
      relatedEmail,
      relatedChat,
      unread
    });

    const formatted = {
      id: notif._id,
      _id: notif._id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      time: 'Just now',
      date: notif.createdAt ? notif.createdAt.toISOString() : new Date().toISOString(),
      unread: notif.unread,
      createdAt: notif.createdAt
    };

    if (io) {
      io.to(userId.toString()).emit('new_notification', formatted);
    }

    return formatted;
  } catch (error) {
    console.error('Failed to create and emit notification:', error);
    return null;
  }
};
