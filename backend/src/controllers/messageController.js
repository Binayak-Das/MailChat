import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, attachments, replyTo } = req.body;

    const hasContent = content && content.trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!chatId || (!hasContent && !hasAttachments)) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and either message content or media attachment are required'
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to send messages in this chat'
      });
    }

    if (!chat.isGroupChat) {
      const partnerId = chat.users.find(
        (u) => u.toString() !== req.user._id.toString()
      );
      if (partnerId) {
        const currentUser = await User.findById(req.user._id);
        const partnerUser = await User.findById(partnerId);

        const hasBlockedPartner = currentUser.blockedUsers?.some(
          (b) => b.toString() === partnerId.toString()
        );
        const isBlockedByPartner = partnerUser?.blockedUsers?.some(
          (b) => b.toString() === req.user._id.toString()
        );

        if (hasBlockedPartner || isBlockedByPartner) {
          return res.status(403).json({
            success: false,
            message: 'Cannot send message: this conversation is blocked'
          });
        }
      }
    }

    const initialDelivered = [req.user._id];
    const onlineMap = req.app.get('onlineUsers');
    if (onlineMap && chat.users) {
      chat.users.forEach((uid) => {
        const idStr = uid.toString();
        if (idStr !== req.user._id.toString() && onlineMap.has(idStr)) {
          initialDelivered.push(uid);
        }
      });
    }

    const messageData = {
      sender: req.user._id,
      content: hasContent ? content.trim() : '',
      attachments: hasAttachments ? attachments : [],
      chat: chatId,
      readBy: [req.user._id],
      deliveredTo: initialDelivered
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    const newMessage = await Message.create(messageData);

    chat.latestMessage = newMessage._id;
    await chat.save();

    const fullMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email avatar role')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      })
      .populate({
        path: 'chat',
        populate: {
          path: 'users',
          select: 'name email avatar role'
        }
      });

    const io = req.app.get('io');
    if (io && fullMessage.chat) {
      const chatIdStr = chat._id.toString();
      const senderIdStr = req.user._id.toString();
      fullMessage.chat.users?.forEach((u) => {
        const uid = (u._id || u.id || u)?.toString();
        if (uid) {
          io.in(uid).socketsJoin(chatIdStr);
          if (uid !== senderIdStr) {
            io.to(uid).emit('message_received', fullMessage);
            io.to(uid).emit('chat_activity', {
              chatId: chatIdStr,
              chat: fullMessage.chat,
              message: fullMessage
            });
          }
        }
      });
      io.to(chatIdStr).emit('chat_updated', fullMessage.chat);
    }

    return res.status(201).json({
      success: true,
      message: fullMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message'
    });
  }
};

export const allMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages in this chat'
      });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email avatar role')
      .populate('reactions.user', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      })
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { chat: chatId, readBy: { $ne: req.user._id } },
      {
        $addToSet: {
          readBy: req.user._id,
          deliveredTo: req.user._id
        }
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(chatId.toString()).emit('messages_read', {
        chatId,
        userId: req.user._id.toString()
      });
    }

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch messages'
    });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a deleted message'
      });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name email avatar role')
      .populate('reactions.user', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      });

    const io = req.app.get('io');
    if (io && message.chat) {
      io.to(message.chat.toString()).emit('message_updated', updatedMessage);
    }

    return res.status(200).json({
      success: true,
      message: updatedMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to edit message'
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this message'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    const io = req.app.get('io');
    if (io && message.chat) {
      io.to(message.chat.toString()).emit('message_deleted', {
        messageId: message._id,
        chatId: message.chat,
        deletedAt: message.deletedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      messageId: message._id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete message'
    });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetChatIds } = req.body;

    if (!messageId || !Array.isArray(targetChatIds) || targetChatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Original message ID and target chat IDs array are required'
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    if (originalMessage.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward a deleted message'
      });
    }

    const forwardedMessages = [];
    const io = req.app.get('io');
    const onlineMap = req.app.get('onlineUsers');

    for (const targetChatId of targetChatIds) {
      const chat = await Chat.findById(targetChatId);
      if (!chat) continue;

      const isMember = chat.users.some(
        (u) => u.toString() === req.user._id.toString()
      );
      if (!isMember) continue;

      const initialDelivered = [req.user._id];
      if (onlineMap && chat.users) {
        chat.users.forEach((uid) => {
          const idStr = uid.toString();
          if (idStr !== req.user._id.toString() && onlineMap.has(idStr)) {
            initialDelivered.push(uid);
          }
        });
      }

      const newMsg = await Message.create({
        sender: req.user._id,
        content: originalMessage.content,
        attachments: originalMessage.attachments,
        chat: targetChatId,
        readBy: [req.user._id],
        deliveredTo: initialDelivered,
        isForwarded: true
      });

      chat.latestMessage = newMsg._id;
      await chat.save();

      const populatedMsg = await Message.findById(newMsg._id)
        .populate('sender', 'name email avatar role')
        .populate({
          path: 'chat',
          populate: {
            path: 'users',
            select: 'name email avatar role'
          }
        });

      forwardedMessages.push(populatedMsg);

      if (io) {
        io.to(targetChatId.toString()).emit('message_received', populatedMsg);
        chat.users.forEach((uid) => {
          const uStr = (uid._id || uid.id || uid).toString();
          if (uStr && uStr !== req.user._id.toString()) {
            io.to(uStr).emit('message_received', populatedMsg);
            io.to(uStr).emit('chat_activity', {
              chatId: targetChatId,
              chat,
              message: populatedMsg
            });
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Message forwarded successfully',
      forwardedCount: forwardedMessages.length,
      messages: forwardedMessages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to forward message'
    });
  }
};

export const markMessagesRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'chatId is required'
      });
    }

    await Message.updateMany(
      { chat: chatId, readBy: { $ne: req.user._id } },
      {
        $addToSet: {
          readBy: req.user._id,
          deliveredTo: req.user._id
        }
      }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(chatId.toString()).emit('messages_read', {
        chatId,
        userId: req.user._id.toString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark messages as read'
    });
  }
};

export const markMessagesDelivered = async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messageIds array is required'
      });
    }

    await Message.updateMany(
      { _id: { $in: messageIds }, deliveredTo: { $ne: req.user._id } },
      { $addToSet: { deliveredTo: req.user._id } }
    );

    const io = req.app.get('io');
    if (io) {
      messageIds.forEach((mId) => {
        io.emit('message_delivered', {
          messageId: mId,
          userId: req.user._id.toString()
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as delivered'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark messages as delivered'
    });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const currentReaction = message.reactions && message.reactions.length > 0 ? message.reactions[0] : null;
    const isSameReactionBySameUser =
      currentReaction &&
      currentReaction.user &&
      currentReaction.user.toString() === req.user._id.toString() &&
      currentReaction.emoji === emoji;

    if (isSameReactionBySameUser) {
      message.reactions = [];
    } else {
      message.reactions = [
        {
          user: req.user._id,
          emoji
        }
      ];
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name email avatar role')
      .populate('reactions.user', 'name avatar')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      });

    const io = req.app.get('io');
    if (io && message.chat) {
      io.to(message.chat.toString()).emit('reaction_updated', updatedMessage);
    }

    return res.status(200).json({
      success: true,
      message: updatedMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update reaction'
    });
  }
};
