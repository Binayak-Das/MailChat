import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

export const sendMessage = async (req, res) => {
  try {
    const { chatId, content, attachments } = req.body;

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

    const newMessage = await Message.create({
      sender: req.user._id,
      content: hasContent ? content.trim() : '',
      attachments: hasAttachments ? attachments : [],
      chat: chatId,
      readBy: [req.user._id]
    });

    chat.latestMessage = newMessage._id;
    await chat.save();

    const fullMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email avatar role')
      .populate({
        path: 'chat',
        populate: {
          path: 'users',
          select: 'name email avatar role'
        }
      });

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
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { chat: chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

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

    // Only one reaction is permitted per message
    const currentReaction = message.reactions && message.reactions.length > 0 ? message.reactions[0] : null;
    const isSameReactionBySameUser =
      currentReaction &&
      currentReaction.user &&
      currentReaction.user.toString() === req.user._id.toString() &&
      currentReaction.emoji === emoji;

    if (isSameReactionBySameUser) {
      // Toggle off: remove the reaction
      message.reactions = [];
    } else {
      // Strictly provide ONLY one reaction to one message: replace any existing reaction
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
      .populate('reactions.user', 'name avatar');

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
