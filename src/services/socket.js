import { io } from 'socket.io-client';
import { getStoredAccessToken } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = API_BASE_URL
  ? API_BASE_URL.replace(/\/+$/, '')
  : window.location.origin;

let adminSocket = null;
let connectHandlers = [];
let disconnectHandlers = [];
let reconnectHandlers = [];

export function getAdminSocket() {
  // Return the existing socket instance if it already exists (even while connecting).
  // Do NOT check .connected — a connecting socket has connected=false but must NOT
  // be replaced, or its event listeners would be orphaned on the old reference.
  if (adminSocket) return adminSocket;

  const token = getStoredAccessToken();
  if (!token) return null;

  const uid = localStorage.getItem('adminId') || '';
  // Always send role:'admin' so the backend joins this socket to the 'role:admin'
  // room. The backend's emitToAllAdmins() emits to 'role:admin'. The stored
  // adminRole value ("0","1","2") does not match that room name.
  const role = 'admin';

  adminSocket = io(`${normalizedBaseUrl}/admin-notifications`, {
    auth: { token, uid, role },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 10000,
    // forceNew removed — we manage the singleton ourselves via adminSocket variable
  });

  adminSocket.on('connect', () => {
    connectHandlers.forEach((fn) => fn());
  });

  adminSocket.on('disconnect', (reason) => {
    disconnectHandlers.forEach((fn) => fn(reason));
  });

  adminSocket.on('reconnect', (attempt) => {
    reconnectHandlers.forEach((fn) => fn(attempt));
  });

  adminSocket.on('connect_error', () => {});

  return adminSocket;
}

export function disconnectAdminSocket() {
  if (adminSocket) {
    adminSocket.removeAllListeners();
    adminSocket.disconnect();
    adminSocket = null;
  }
}

export function onAdminConnect(fn) {
  connectHandlers.push(fn);
  return () => {
    connectHandlers = connectHandlers.filter((h) => h !== fn);
  };
}

export function onAdminDisconnect(fn) {
  disconnectHandlers.push(fn);
  return () => {
    disconnectHandlers = disconnectHandlers.filter((h) => h !== fn);
  };
}

export function onAdminReconnect(fn) {
  reconnectHandlers.push(fn);
  return () => {
    reconnectHandlers = reconnectHandlers.filter((h) => h !== fn);
  };
}

export function isAdminSocketConnected() {
  return adminSocket?.connected ?? false;
}
