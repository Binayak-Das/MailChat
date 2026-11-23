const API_BASE_URL = 'http://localhost:5000/api';

export async function registerUser({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}

export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Authentication failed');
  }
  return data;
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch user');
  }
  return data;
}

export async function updateProfile(token, { name, avatar }) {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, avatar })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update profile');
  }
  return data;
}

export async function getAllUsers(token) {
  const response = await fetch(`${API_BASE_URL}/auth/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch users');
  }
  return data;
}

export async function updateUserRole(token, userId, role) {
  const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update user role');
  }
  return data;
}

export async function sendPasswordResetOtp(email) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Failed to send recovery OTP');
    error.isGoogleAccount = !!data.isGoogleAccount;
    throw error;
  }
  return data;
}

export async function verifyPasswordResetOtp(email, otp) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, otp })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'OTP verification failed');
  }
  return data;
}

export async function resetPassword({ email, otp, resetToken, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, otp, resetToken, newPassword })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
  return data;
}

export async function sendEmail({ to, subject, body, attachments = [], category }, token) {
  const response = await fetch(`${API_BASE_URL}/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ to, subject, body, attachments, category })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to deliver email');
  }
  return data;
}

export async function getEmails(token, folder = 'inbox') {
  const response = await fetch(`${API_BASE_URL}/emails?folder=${folder}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch emails');
  }
  return data;
}

export async function deleteEmail(token, emailId, permanent = false) {
  const url = permanent
    ? `${API_BASE_URL}/emails/${emailId}?permanent=true`
    : `${API_BASE_URL}/emails/${emailId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete email');
  }
  return data;
}

export async function restoreEmail(token, emailId) {
  const response = await fetch(`${API_BASE_URL}/emails/${emailId}/restore`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to restore email');
  }
  return data;
}

export async function emptyTrash(token) {
  const response = await fetch(`${API_BASE_URL}/emails/trash/empty`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to empty trash');
  }
  return data;
}

export async function toggleStarEmail(token, emailId) {
  const response = await fetch(`${API_BASE_URL}/emails/${emailId}/star`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to star email');
  }
  return data;
}

export async function markEmailAsRead(token, emailId) {
  const response = await fetch(`${API_BASE_URL}/emails/${emailId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark email read');
  }
  return data;
}

export async function checkRecipientEmail(token, email) {
  const response = await fetch(`${API_BASE_URL}/emails/check-recipient?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to check recipient');
  }
  return data;
}

export async function getEmailThread(token, emailId) {
  const response = await fetch(`${API_BASE_URL}/emails/${emailId}/thread`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch email thread');
  }
  return data;
}

export async function getNotifications(token) {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch notifications');
  }
  return data;
}

export async function markNotificationsAsRead(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark notifications read');
  }
  return data;
}

export async function fetchChats(token) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch conversations');
  }
  return data;
}

export async function accessOrCreateChat(token, userId) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to access chat');
  }
  return data;
}

export async function getChatUsers(token, search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/chat/users${query}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch contacts');
  }
  return data;
}

export async function createGroupChat(token, { name, users, description }) {
  const response = await fetch(`${API_BASE_URL}/chat/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, users, description })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create group');
  }
  return data;
}

export async function renameGroupChat(token, { chatId, chatName }) {
  const response = await fetch(`${API_BASE_URL}/chat/group/rename`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId, chatName })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to rename group');
  }
  return data;
}

export async function addMemberToGroup(token, { chatId, userId }) {
  const response = await fetch(`${API_BASE_URL}/chat/group/add`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId, userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to add member to group');
  }
  return data;
}

export async function removeMemberFromGroup(token, { chatId, userId }) {
  const response = await fetch(`${API_BASE_URL}/chat/group/remove`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId, userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove member from group');
  }
  return data;
}

export async function fetchMessages(token, chatId) {
  const response = await fetch(`${API_BASE_URL}/messages/${chatId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch messages');
  }
  return data;
}

export async function sendMessage(token, { chatId, content, attachments = [], replyTo = null }) {
  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId, content, attachments, replyTo })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send message');
  }
  return data;
}

export async function editMessage(token, messageId, content) {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to edit message');
  }
  return data;
}

export async function deleteMessage(token, messageId) {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete message');
  }
  return data;
}

export async function forwardMessage(token, messageId, targetChatIds) {
  const response = await fetch(`${API_BASE_URL}/messages/forward`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messageId, targetChatIds })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to forward message');
  }
  return data;
}

export async function markMessagesRead(token, chatId) {
  const response = await fetch(`${API_BASE_URL}/messages/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark messages as read');
  }
  return data;
}

export async function markMessagesDelivered(token, messageIds) {
  const response = await fetch(`${API_BASE_URL}/messages/delivered`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messageIds })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to mark messages as delivered');
  }
  return data;
}

export async function toggleMessageReaction(token, messageId, emoji) {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ emoji })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update reaction');
  }
  return data;
}

export async function getContacts(token) {
  const response = await fetch(`${API_BASE_URL}/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch contacts');
  }
  return data;
}

export async function addContact(token, userId) {
  const response = await fetch(`${API_BASE_URL}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to add contact');
  }
  return data;
}

export async function removeContact(token, userId) {
  const response = await fetch(`${API_BASE_URL}/contacts/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove contact');
  }
  return data;
}

export async function searchContacts(token, query = '') {
  const q = query ? `?query=${encodeURIComponent(query)}` : '';
  const response = await fetch(`${API_BASE_URL}/contacts/search${q}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to search contacts');
  }
  return data;
}

export async function getBlockedUsers(token) {
  const response = await fetch(`${API_BASE_URL}/contacts/blocked`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch blocked users');
  }
  return data;
}

export async function blockUser(token, userId) {
  const response = await fetch(`${API_BASE_URL}/contacts/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to block user');
  }
  return data;
}

export async function unblockUser(token, userId) {
  const response = await fetch(`${API_BASE_URL}/contacts/unblock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to unblock user');
  }
  return data;
}

export async function createReport(token, { reportedUserId, reason, details }) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reportedUserId, reason, details })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to submit report');
  }
  return data;
}

export async function getAllReports(token, status = 'all') {
  const q = status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`${API_BASE_URL}/reports${q}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch reports');
  }
  return data;
}

export async function updateReport(token, reportId, data) {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.message || 'Failed to update report');
  }
  return resData;
}

export async function getPlatformActivity(token) {
  const response = await fetch(`${API_BASE_URL}/admin/activity`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch platform activity');
  }
  return data;
}

export async function adminDeleteUser(token, userId) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete user');
  }
  return data;
}

export async function adminToggleBan(token, userId, status) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update user status');
  }
  return data;
}

// Google OAuth API
export async function googleAuthLogin({ credential, idToken, googleUser }) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ credential, idToken, googleUser })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Google authentication failed');
  }
  return data;
}

// 2FA Authentication APIs
export async function loginWith2FA({ tempToken, otp, email }) {
  const response = await fetch(`${API_BASE_URL}/auth/login-2fa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tempToken, otp, email })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Two-factor verification failed');
  }
  return data;
}

export async function resend2faLoginOtp({ tempToken, email }) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/resend-login-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tempToken, email })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to resend 2FA verification code');
  }
  return data;
}

export async function get2faStatus(token) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch 2FA status');
  }
  return data;
}

export async function send2faSetupOtp(token) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/send-setup-otp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send 2FA setup verification code');
  }
  return data;
}

export async function enable2fa(token, { otp }) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ otp })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to enable Two-Factor Authentication');
  }
  return data;
}

export async function disable2fa(token) {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to disable Two-Factor Authentication');
  }
  return data;
}

// Strict Real-Time Presence API
export async function getPresenceStatus(token) {
  const response = await fetch(`${API_BASE_URL}/auth/presence`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch online presence status');
  }
  return data;
}

