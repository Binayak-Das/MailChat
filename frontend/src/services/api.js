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
    throw new Error(data.message || 'Failed to send recovery OTP');
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

// Chat API Endpoints
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

// Message API Endpoints
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

export async function sendMessage(token, { chatId, content, attachments = [] }) {
  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ chatId, content, attachments })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send message');
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

