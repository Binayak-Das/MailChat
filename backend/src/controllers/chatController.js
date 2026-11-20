import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';

export const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId param not sent with request'
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a direct chat with yourself'
      });
    }

    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } }
      ]
    })
      .populate('users', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name email avatar role'
        }
      });

    if (isChat.length > 0) {
      return res.status(200).json({
        success: true,
        chat: isChat[0]
      });
    }

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to chat with not found'
      });
    }

    const chatData = {
      chatName: targetUser.name,
      isGroupChat: false,
      users: [req.user._id, userId]
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate('users', '-password');

    const io = req.app.get('io');
    if (io) {
      fullChat.users.forEach((u) => {
        const uid = (u._id || u.id || u)?.toString();
        if (uid) {
          io.to(uid).emit('new_chat', fullChat);
        }
      });
    }

    return res.status(201).json({
      success: true,
      chat: fullChat
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error accessing chat'
    });
  }
};

export const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name email avatar role'
        }
      })
      .sort({ updatedAt: -1 });

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chat: chat._id,
          readBy: { $ne: req.user._id }
        });
        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: chatsWithUnread.length,
      chats: chatsWithUnread
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching chats'
    });
  }
};

export const getChatUsers = async (req, res) => {
  try {
    const searchFilter = req.query.search
      ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ]
      }
      : {};

    const users = await User.find({
      ...searchFilter,
      _id: { $ne: req.user._id },
      role: { $in: ['user', 'admin'] }
    })
      .select('name email avatar role status createdAt')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching contacts'
    });
  }
};

export const createGroupChat = async (req, res) => {
  try {
    let { name, users, description } = req.body;

    if (!name || !users) {
      return res.status(400).json({
        success: false,
        message: 'Group name and members are required'
      });
    }

    if (typeof users === 'string') {
      try {
        users = JSON.parse(users);
      } catch {
        users = [users];
      }
    }

    if (!Array.isArray(users) || users.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one other member is required to create a group'
      });
    }

    const memberIds = new Set(users.map((u) => (typeof u === 'object' && u._id ? u._id.toString() : u.toString())));
    memberIds.add(req.user._id.toString());

    const groupChat = await Chat.create({
      chatName: name.trim(),
      users: Array.from(memberIds),
      isGroupChat: true,
      groupAdmin: req.user._id,
      groupDescription: description ? description.trim() : ''
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    const io = req.app.get('io');
    const chatIdStr = fullGroupChat._id.toString();
    for (const u of fullGroupChat.users) {
      const uid = (u._id || u.id || u)?.toString();
      if (uid) {
        if (io) {
          io.in(uid).socketsJoin(chatIdStr);
          io.to(uid).emit('new_chat', fullGroupChat);
          io.to(uid).emit('chat_updated', fullGroupChat);
          io.to(uid).emit('chat_activity', {
            chatId: chatIdStr,
            chat: fullGroupChat,
            message: null
          });
          if (uid !== req.user._id.toString()) {
            io.to(uid).emit('group_activity', {
              type: 'created',
              chat: fullGroupChat,
              title: 'Added to Group',
              message: `${req.user.name} added you to "${fullGroupChat.chatName}".`
            });
          }
        }
        if (uid !== req.user._id.toString()) {
          await createNotificationAndEmit(io, {
            userId: uid,
            title: 'Added to New Group',
            message: `${req.user.name} added you to group "${fullGroupChat.chatName}".`,
            type: 'group',
            relatedChat: fullGroupChat._id
          });
        }
      }
    }

    return res.status(201).json({
      success: true,
      chat: fullGroupChat
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating group chat'
    });
  }
};

export const renameGroup = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    if (!chatId || !chatName) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and new name are required'
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group chat not found'
      });
    }

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    const isAdmin =
      (chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can rename the group'
      });
    }

    const oldName = chat.chatName;
    chat.chatName = chatName.trim();
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name email avatar role'
        }
      });

    const io = req.app.get('io');
    for (const u of updatedChat.users) {
      const uid = (u._id || u.id || u)?.toString();
      if (uid) {
        if (io) {
          io.to(uid).emit('chat_updated', updatedChat);
          if (uid !== req.user._id.toString()) {
            io.to(uid).emit('group_activity', {
              type: 'renamed',
              chat: updatedChat,
              title: 'Group Renamed',
              message: `${req.user.name} renamed "${oldName}" to "${updatedChat.chatName}".`
            });
          }
        }
        if (uid !== req.user._id.toString()) {
          await createNotificationAndEmit(io, {
            userId: uid,
            title: 'Group Renamed',
            message: `${req.user.name} renamed "${oldName}" to "${updatedChat.chatName}".`,
            type: 'group',
            relatedChat: updatedChat._id
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      chat: updatedChat
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error renaming group'
    });
  }
};

export const addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and User ID are required'
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group chat not found'
      });
    }

    const isMember = chat.users.some(
      (u) => u.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only group members can add new participants'
      });
    }

    const alreadyInGroup = chat.users.some(
      (u) => u.toString() === userId.toString()
    );
    if (alreadyInGroup) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    chat.users.push(userId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name email avatar role'
        }
      });

    const addedUser = await User.findById(userId);
    const io = req.app.get('io');
    for (const u of updatedChat.users) {
      const uid = (u._id || u.id || u)?.toString();
      if (uid) {
        if (io) {
          io.to(uid).emit('chat_updated', updatedChat);
          io.to(uid).emit('new_chat', updatedChat);
          if (uid === userId.toString()) {
            io.to(uid).emit('group_activity', {
              type: 'added',
              chat: updatedChat,
              title: 'Added to Group',
              message: `${req.user.name} added you to "${updatedChat.chatName}".`
            });
          }
        }
        if (uid === userId.toString()) {
          await createNotificationAndEmit(io, {
            userId: uid,
            title: 'Added to Group',
            message: `${req.user.name} added you to group "${updatedChat.chatName}".`,
            type: 'group',
            relatedChat: updatedChat._id
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      chat: updatedChat
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error adding member to group'
    });
  }
};

export const removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and User ID are required'
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group chat not found'
      });
    }

    const isSelf = userId.toString() === req.user._id.toString();
    const isAdmin = chat.groupAdmin && chat.groupAdmin.toString() === req.user._id.toString();

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can remove other members'
      });
    }

    chat.users = chat.users.filter((u) => u.toString() !== userId.toString());

    if (chat.users.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      return res.status(200).json({
        success: true,
        message: 'Group disbanded as all members left',
        chatId
      });
    }

    if (chat.groupAdmin && chat.groupAdmin.toString() === userId.toString()) {
      chat.groupAdmin = chat.users[0];
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'latestMessage',
        populate: {
          path: 'sender',
          select: 'name email avatar role'
        }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('removed_from_group', { chatId });
      io.to(userId.toString()).emit('group_activity', {
        type: 'removed',
        chatId,
        title: 'Removed from Group',
        message: `You were removed from "${chat.chatName}".`
      });
      updatedChat.users.forEach((u) => {
        const uid = (u._id || u.id || u)?.toString();
        if (uid) {
          io.to(uid).emit('chat_updated', updatedChat);
        }
      });
    }

    return res.status(200).json({
      success: true,
      chat: updatedChat
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error removing member from group'
    });
  }
};
