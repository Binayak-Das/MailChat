import Email from '../models/Email.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import Report from '../models/Report.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser as deleteFirebaseUser,
  getUsersMap,
  pickUserFields,
  formatUser
} from '../utils/userStore.js';

export const getPlatformActivity = async (req, res) => {
  try {
    const allUsers = await getAllUsers(req.firebaseToken);
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(
      (u) => ['user', 'admin'].includes(u.role) && u.status !== 'banned'
    ).length;
    const pendingUsers = allUsers.filter((u) => u.role === 'pending').length;
    const adminUsers = allUsers.filter((u) => u.role === 'admin').length;
    const bannedUsers = allUsers.filter((u) => u.status === 'banned').length;

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

    const recentUsers = allUsers.slice(0, 8).map((u) =>
      pickUserFields(u, ['name', 'email', 'role', 'status', 'createdAt', 'avatar'])
    );

    const rawReports = await Report.find().sort({ createdAt: -1 }).limit(6).lean();
    const reportUserIds = rawReports.flatMap((r) => [r.reporter, r.reportedUser]);
    const usersMap = await getUsersMap(reportUserIds, req.firebaseToken);

    const recentReports = rawReports.map((r) => ({
      ...r,
      reporter: pickUserFields(usersMap.get(r.reporter?.toString()), ['name', 'email']) || {
        _id: r.reporter,
        name: 'Deleted User',
        email: ''
      },
      reportedUser: pickUserFields(usersMap.get(r.reportedUser?.toString()), [
        'name',
        'email',
        'status'
      ]) || {
        _id: r.reportedUser,
        name: 'Deleted User',
        email: '',
        status: 'deleted'
      }
    }));

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

    const user = await getUserById(userId, req.firebaseToken);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await deleteFirebaseUser(userId, req.firebaseToken);

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

    const user = await updateUser(userId, { status }, req.firebaseToken);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const formatted = formatUser(user);
    const io = req.app.get('io');
    if (io) {
      io.emit('user_updated', formatted);
    }

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      user: formatted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating user status'
    });
  }
};
