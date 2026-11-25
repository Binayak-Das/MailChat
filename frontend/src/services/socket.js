import { io } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  return 'https://mailchat-server.onrender.com';
};

const SOCKET_URL = getSocketUrl();

let socket = null;
let currentSocketUser = null;
let heartbeatInterval = null;

const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected && currentSocketUser) {
      socket.emit('heartbeat', { userId: currentSocketUser._id || currentSocketUser.id });
    }
  }, 20000);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      if (currentSocketUser) {
        socket.emit('setup', currentSocketUser);
        socket.emit('get_online_users');
      }
      startHeartbeat();
    });

    socket.on('disconnect', () => {
      stopHeartbeat();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (socket && socket.connected && currentSocketUser) {
          socket.emit('user_offline', { userId: currentSocketUser._id || currentSocketUser.id });
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket && currentSocketUser) {
          if (!socket.connected) {
            socket.connect();
          } else {
            socket.emit('setup', currentSocketUser);
            socket.emit('get_online_users');
          }
        }
      });
    }
  }
  return socket;
};

export const initSocket = (user) => {
  if (user) {
    currentSocketUser = user;
  }
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  if (currentSocketUser) {
    s.emit('setup', currentSocketUser);
    s.emit('get_online_users');
  }
  startHeartbeat();
  return s;
};

export const requestOnlineUsers = () => {
  if (socket && socket.connected) {
    socket.emit('get_online_users');
  }
};

export const disconnectSocket = (isLogout = false) => {
  stopHeartbeat();
  if (socket) {
    if (isLogout && currentSocketUser) {
      try {
        socket.emit('user_logout', { userId: currentSocketUser._id || currentSocketUser.id });
      } catch {}
    }
    socket.disconnect();
    socket = null;
    currentSocketUser = null;
  }
};
