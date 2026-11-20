import User from '../models/User.js';

export const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'contacts',
      select: 'name email avatar role status createdAt'
    });

    return res.status(200).json({
      success: true,
      count: user.contacts?.length || 0,
      contacts: user.contacts || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching contacts'
    });
  }
};

export const addContact = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself to contacts'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to add not found'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { contacts: userId }
    });

    const updatedUser = await User.findById(req.user._id).populate({
      path: 'contacts',
      select: 'name email avatar role status createdAt'
    });

    return res.status(200).json({
      success: true,
      message: `${targetUser.name} added to your contacts`,
      contacts: updatedUser.contacts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error adding contact'
    });
  }
};

export const removeContact = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { contacts: userId }
    });

    const updatedUser = await User.findById(req.user._id).populate({
      path: 'contacts',
      select: 'name email avatar role status createdAt'
    });

    return res.status(200).json({
      success: true,
      message: 'Contact removed',
      contacts: updatedUser.contacts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error removing contact'
    });
  }
};

export const searchContacts = async (req, res) => {
  try {
    const { query } = req.query;
    const searchFilter = query
      ? {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }
      : {};

    const currentUser = await User.findById(req.user._id);
    const contactsSet = new Set((currentUser.contacts || []).map((id) => id.toString()));
    const blockedSet = new Set((currentUser.blockedUsers || []).map((id) => id.toString()));

    const users = await User.find({
      ...searchFilter,
      _id: { $ne: req.user._id },
      role: { $in: ['user', 'admin'] }
    })
      .select('name email avatar role status createdAt')
      .sort({ name: 1 })
      .limit(30);

    const formattedUsers = users.map((u) => ({
      _id: u._id,
      id: u._id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      isContact: contactsSet.has(u._id.toString()),
      isBlocked: blockedSet.has(u._id.toString())
    }));

    return res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error searching users'
    });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'blockedUsers',
      select: 'name email avatar role status createdAt'
    });

    return res.status(200).json({
      success: true,
      count: user.blockedUsers?.length || 0,
      blockedUsers: user.blockedUsers || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching blocked users'
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to block not found'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('block_status_changed', {
        userId,
        isBlocked: true
      });
      io.to(userId.toString()).emit('block_status_changed', {
        userId: req.user._id,
        blockedBy: req.user._id
      });
    }

    return res.status(200).json({
      success: true,
      message: `${targetUser.name} has been blocked`,
      blockedUserId: userId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error blocking user'
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('block_status_changed', {
        userId,
        isBlocked: false
      });
      io.to(userId.toString()).emit('block_status_changed', {
        userId: req.user._id,
        unblockedBy: req.user._id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User has been unblocked',
      unblockedUserId: userId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error unblocking user'
    });
  }
};
