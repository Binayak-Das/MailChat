import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;
let currentSocketUser = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      if (currentSocketUser) {
        socket.emit('setup', currentSocketUser);
      }
    });
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
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentSocketUser = null;
  }
};
