import {
  getUserById,
  updateUser,
  getAllUsers,
  getUsersMap,
  pickUserFields
} from '../utils/userStore.js';

const CONTACT_FIELDS = ['name', 'email', 'avatar', 'role', 'status', 'createdAt'];

export const getContacts = async (req, res) => {
  try {
    const user = await getUserById(req.user._id, req.firebaseToken);
    const contactIds = user?.contacts || [];
    const map = await getUsersMap(contactIds, req.firebaseToken);
    const contacts = contactIds
      .map((id) => pickUserFields(map.get(id.toString()), CONTACT_FIELDS))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: contacts.length,
      contacts
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

    const targetUser = await getUserById(userId, req.firebaseToken);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to add not found'
      });
    }

    const current = await getUserById(req.user._id, req.firebaseToken);
    const nextContacts = Array.from(
      new Set([...(current?.contacts || []).map(String), userId.toString()])
    );
    await updateUser(req.user._id, { contacts: nextContacts }, req.firebaseToken);

    const map = await getUsersMap(nextContacts, req.firebaseToken);
    const contacts = nextContacts
      .map((id) => pickUserFields(map.get(id), CONTACT_FIELDS))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      message: `${targetUser.name} added to your contacts`,
      contacts
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
    const current = await getUserById(req.user._id, req.firebaseToken);
    const nextContacts = (current?.contacts || [])
      .map(String)
      .filter((id) => id !== userId.toString());

    await updateUser(req.user._id, { contacts: nextContacts }, req.firebaseToken);

    const map = await getUsersMap(nextContacts, req.firebaseToken);
    const contacts = nextContacts
      .map((id) => pickUserFields(map.get(id), CONTACT_FIELDS))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      message: 'Contact removed',
      contacts
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
    const q = (query || '').toLowerCase().trim();

    const currentUser = await getUserById(req.user._id, req.firebaseToken);
    const contactsSet = new Set((currentUser?.contacts || []).map((id) => id.toString()));
    const blockedSet = new Set((currentUser?.blockedUsers || []).map((id) => id.toString()));

    const allUsers = await getAllUsers(req.firebaseToken);
    const filtered = allUsers
      .filter((u) => {
        if (u._id.toString() === req.user._id.toString()) return false;
        if (!['user', 'admin'].includes(u.role)) return false;
        if (!q) return true;
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 30);

    const formattedUsers = filtered.map((u) => ({
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
    const user = await getUserById(req.user._id, req.firebaseToken);
    const blockedIds = user?.blockedUsers || [];
    const map = await getUsersMap(blockedIds, req.firebaseToken);
    const blockedUsers = blockedIds
      .map((id) => pickUserFields(map.get(id.toString()), CONTACT_FIELDS))
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: blockedUsers.length,
      blockedUsers
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

    const targetUser = await getUserById(userId, req.firebaseToken);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to block not found'
      });
    }

    const current = await getUserById(req.user._id, req.firebaseToken);
    const nextBlocked = Array.from(
      new Set([...(current?.blockedUsers || []).map(String), userId.toString()])
    );
    await updateUser(req.user._id, { blockedUsers: nextBlocked }, req.firebaseToken);

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

    const current = await getUserById(req.user._id, req.firebaseToken);
    const nextBlocked = (current?.blockedUsers || [])
      .map(String)
      .filter((id) => id !== userId.toString());
    await updateUser(req.user._id, { blockedUsers: nextBlocked }, req.firebaseToken);

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
