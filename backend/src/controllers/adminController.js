import User from '../models/User.js';
import Email from '../models/Email.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import Report from '../models/Report.js';

export const getPlatformActivity = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ role: { $in: ['user', 'admin'] }, status: { $ne: 'banned' } });
    const pendingUsers = await User.countDocuments({ role: 'pending' });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalEmails = await Email.countDocuments();
    const emailsToday = await Email.countDocuments({ createdAt: { $gte: today } });

    const totalMessages = await Message.countDocuments();
    const messagesToday = await Message.countDocuments({ createdAt: { $gte: today } });

    const totalChats = await Chat.countDocuments();
    const groupChats = await Chat.countDocuments({ isGroupChat: true });
    const directChats = totalChats - groupChats;

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    const onlineMap = req.app.get('onlineUsers');
    const onlineUsersCount = onlineMap ? onlineMap.size : 0;

    const recentUsers = await User.find()
      .select('name email role status createdAt avatar')
      .sort({ createdAt: -1 })
      .limit(8);

    const recentReports = await Report.find()
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email status')
      .sort({ createdAt: -1 })
      .limit(6);

    const systemHealth = {
      status: 'operational',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      serverTime: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        pendingUsers,
        adminUsers,
        bannedUsers,
        totalEmails,
        emailsToday,
        totalMessages,
        messagesToday,
        totalChats,
        groupChats,
        directChats,
        totalReports,
        pendingReports,
        onlineUsersCount
      },
      systemHealth,
      recentUsers,
      recentReports
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching platform activity'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(userId);

    const io = req.app.get('io');
    if (io) {
      io.emit('user_deleted', { userId });
    }

    return res.status(200).json({
      success: true,
      message: `User ${user.name} was permanently removed`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user'
    });
  }
};

export const toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'banned', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, banned, or suspended'
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own account status'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = status;
    await user.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('user_updated', {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        createdAt: user.createdAt
      });
    }

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating user status'
    });
  }
};
