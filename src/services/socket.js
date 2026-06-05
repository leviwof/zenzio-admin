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
  if (adminSocket?.connected) return adminSocket;

  const token = getStoredAccessToken();
  if (!token) return null;

  const uid = localStorage.getItem('adminId') || '';
  const role = localStorage.getItem('adminRole') || localStorage.getItem('loginRole') || '';

  adminSocket = io(`${normalizedBaseUrl}/admin-notifications`, {
    auth: { token, uid, role },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 10000,
    forceNew: true,
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
