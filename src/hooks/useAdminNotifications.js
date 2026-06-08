// =============================================================================
// useAdminNotifications.js — Production-grade notification hook
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAdminSocket, onAdminReconnect } from '../services/socket';
import { getNotifications } from '../services/api';
import {
  buildDesktopNotificationContent,
  claimAlert,
  getNotificationId,
  getStoredLastNotificationId,
  getStoredLastNotificationTime,
  hasSoundPlayed,
  isImportantAdminNotification,
  isNotificationNewer,
  markSoundPlayed,
  rememberLastNotification,
  requestDesktopNotificationPermissionOnce,
  seedAlertedIds,
  showDesktopNotification,
  tryAcquireAudioLock,
  getPermissionState,
} from '../services/desktopNotificationService';

const FALLBACK_POLL_INTERVAL = 5000;
const RECONNECT_FETCH_DELAY  = 800;

function getNotifTime(n) {
  n = n || {};
  var t = Date.parse(n.createdAt || n.created_at || n.timestamp || '');
  return Number.isFinite(t) ? t : 0;
}

function compareNotifs(a, b) {
  var aId = Number(getNotificationId(a));
  var bId = Number(getNotificationId(b));
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return getNotifTime(a) - getNotifTime(b);
}

function getLatestNotif(list) {
  list = list || [];
  return [...list].sort(compareNotifs).at(-1);
}

function normalizeNotif(raw) {
  if (!raw) return raw;
  var base = (raw.message !== undefined && !raw.body)
    ? Object.assign({}, raw, { body: raw.message })
    : Object.assign({}, raw);
  base.type = base.type || (base.data && base.data.type) || 'GENERAL';
  return base;
}

export default function useAdminNotifications(opts) {
  opts = opts || {};
  var onNotification    = opts.onNotification;
  var onSoundTrigger    = opts.onSoundTrigger;
  var onNewNotification = opts.onNewNotification;

  var socketConnectedState = useState(false);
  var socketConnected      = socketConnectedState[0];
  var setSocketConnected   = socketConnectedState[1];

  var permState        = useState(function() { return getPermissionState(); });
  var permissionState  = permState[0];
  var setPermissionState = permState[1];

  var onNotificationRef    = useRef(onNotification);
  var onSoundTriggerRef    = useRef(onSoundTrigger);
  var onNewNotificationRef = useRef(onNewNotification);

  useEffect(function() {
    onNotificationRef.current    = onNotification;
    onSoundTriggerRef.current    = onSoundTrigger;
    onNewNotificationRef.current = onNewNotification;
  });

  var initializedRef    = useRef(false);
  var lastIdRef         = useRef(getStoredLastNotificationId());
  var lastTimeRef       = useRef(getStoredLastNotificationTime());
  var localSeenIds      = useRef(new Set());
  var localNotifsRef    = useRef([]);
  var audioRef          = useRef(null);
  var audioUnlockedRef  = useRef(false);
  var pendingSoundRef   = useRef(null);
  var bcRef             = useRef(null);
  var fallbackTimerRef  = useRef(null);
  var mountedRef        = useRef(true);
  var socketHandlersRef = useRef(null);

  var notifsState   = useState([]);
  var notifications = notifsState[0];
  var setNotifications = notifsState[1];

  var playSound = useCallback(async function(notifId) {
    notifId = notifId != null ? notifId : null;
    if (!audioRef.current) return false;
    if (notifId != null && hasSoundPlayed(notifId)) return true;
    var hasLock = await tryAcquireAudioLock();
    if (!hasLock) return true;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      if (notifId != null) markSoundPlayed(notifId);
      audioUnlockedRef.current = true;
      return true;
    } catch (e) {
      pendingSoundRef.current = notifId;
      return false;
    }
  }, []);

  var handleNewNotification = useCallback(function(rawNotif, opts2) {
    opts2 = opts2 || {};
    var alert         = opts2.alert !== false;
    var fromBroadcast = opts2.fromBroadcast === true;

    if (!mountedRef.current) return;

    var notif = normalizeNotif(rawNotif);
    var id    = getNotificationId(notif);
    var idStr = id != null ? String(id) : null;

    if (idStr && localSeenIds.current.has(idStr)) return;
    if (idStr) localSeenIds.current.add(idStr);

    localNotifsRef.current = [notif].concat(localNotifsRef.current).slice(0, 100);
    setNotifications(localNotifsRef.current.slice());

    if (onNotificationRef.current)    onNotificationRef.current(notif);
    if (onNewNotificationRef.current) onNewNotificationRef.current(notif);

    if (alert && !fromBroadcast && isImportantAdminNotification(notif) && claimAlert(notif)) {
      var content = buildDesktopNotificationContent(notif);
      var body    = content.body;

      playSound(idStr).then(function() {
        showDesktopNotification(body, {
          notification:   notif,
          notificationId: id,
          type:           notif.type,
        });
      });
      if (onSoundTriggerRef.current) onSoundTriggerRef.current(notif);
      setPermissionState(getPermissionState());
    }

    rememberLastNotification(notif);
    lastIdRef.current   = getStoredLastNotificationId();
    lastTimeRef.current = getStoredLastNotificationTime();
  }, [playSound]);

  var fetchAndProcess = useCallback(async function() {
    try {
      var response = await getNotifications();
      var docs = [];
      if      (Array.isArray(response.data && response.data.data))          docs = response.data.data;
      else if (Array.isArray(response.data && response.data.notifications)) docs = response.data.notifications;
      else if (Array.isArray(response.data))                                docs = response.data;
      if (!Array.isArray(docs)) docs = [];

      if (!initializedRef.current) {
        docs.forEach(function(n) {
          var nid = getNotificationId(n);
          if (nid != null) localSeenIds.current.add(String(nid));
        });
        seedAlertedIds(docs);
        localNotifsRef.current = docs.slice(0, 100);
        setNotifications(localNotifsRef.current.slice());
        var latest = getLatestNotif(docs);
        if (latest) {
          rememberLastNotification(latest);
          lastIdRef.current   = getStoredLastNotificationId();
          lastTimeRef.current = getStoredLastNotificationTime();
        }
        initializedRef.current = true;
        setPermissionState(getPermissionState());
        return;
      }

      var missed = docs.filter(function(n) {
        var nid = getNotificationId(n);
        if (nid == null) return false;
        if (localSeenIds.current.has(String(nid))) return false;
        return isNotificationNewer(n, lastIdRef.current, lastTimeRef.current);
      });

      if (missed.length > 0) {
        missed.slice().sort(compareNotifs).forEach(function(n) {
          handleNewNotification(n, { alert: true });
        });
      }
    } catch (e) {
      // non-fatal
    }
  }, [handleNewNotification]);

  var pollFallback = useCallback(async function() {
    await fetchAndProcess();
  }, [fetchAndProcess]);

  useEffect(function() {
    mountedRef.current = true;

    var soundPath = (import.meta.env.BASE_URL || '/') + 'notification.mp3';
    audioRef.current = new Audio(soundPath);
    audioRef.current.preload = 'auto';

    var unlockAudio = async function() {
      requestDesktopNotificationPermissionOnce({ fromUserGesture: true })
        .then(function() { setPermissionState(getPermissionState()); })
        .catch(function() {});

      if (!audioUnlockedRef.current) {
        try {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;

          if (pendingSoundRef.current != null) {
            var queuedId = pendingSoundRef.current;
            pendingSoundRef.current = null;
            var hasLock = await tryAcquireAudioLock();
            if (hasLock) {
              try {
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                if (queuedId != null) markSoundPlayed(queuedId);
              } catch (e2) {}
            }
          }
        } catch (e) {}
      }
    };

    document.addEventListener('click',      unlockAudio, { passive: true });
    document.addEventListener('mousedown',  unlockAudio, { passive: true });
    document.addEventListener('keydown',    unlockAudio, { passive: true });
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    requestDesktopNotificationPermissionOnce()
      .then(function() { setPermissionState(getPermissionState()); })
      .catch(function() {});

    try {
      bcRef.current = new BroadcastChannel('admin_notifications');
      bcRef.current.onmessage = function(event) {
        if (!event.data || event.data.type !== 'new_notif') return;
        var raw = event.data.notification;
        if (!raw || !mountedRef.current) return;
        handleNewNotification(raw, { alert: true, fromBroadcast: true });
      };
    } catch (e) {}

    fetchAndProcess();

    var unsubReconnect = onAdminReconnect(function() {
      setTimeout(function() { fetchAndProcess(); }, RECONNECT_FETCH_DELAY);
    });

    return function() {
      mountedRef.current = false;
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('mousedown',  unlockAudio);
      document.removeEventListener('keydown',    unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      unsubReconnect();
      if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  var connectSocket = useCallback(function() {
    var socket = getAdminSocket();
    if (!socket) return;

    if (socketHandlersRef.current) {
      socket.off('connect',          socketHandlersRef.current.onConnect);
      socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
      socket.off('new_notification', socketHandlersRef.current.onNewNotif);
    }

    var onConnect    = function() { if (mountedRef.current) setSocketConnected(true); };
    var onDisconnect = function() { if (mountedRef.current) setSocketConnected(false); };
    var onNewNotif   = function(rawNotif) {
      handleNewNotification(rawNotif, { alert: true });
      try {
        if (bcRef.current) bcRef.current.postMessage({ type: 'new_notif', notification: rawNotif });
      } catch (e) {}
    };

    socketHandlersRef.current = { onConnect: onConnect, onDisconnect: onDisconnect, onNewNotif: onNewNotif };

    if (socket.connected) setSocketConnected(true);
    socket.on('connect',          onConnect);
    socket.on('disconnect',       onDisconnect);
    socket.on('new_notification', onNewNotif);
  }, [handleNewNotification]);

  useEffect(function() {
    connectSocket();
    fallbackTimerRef.current = setInterval(pollFallback, FALLBACK_POLL_INTERVAL);

    return function() {
      var socket = getAdminSocket();
      if (socket && socketHandlersRef.current) {
        socket.off('connect',          socketHandlersRef.current.onConnect);
        socket.off('disconnect',       socketHandlersRef.current.onDisconnect);
        socket.off('new_notification', socketHandlersRef.current.onNewNotif);
        socketHandlersRef.current = null;
      }
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
    };
  }, [connectSocket, pollFallback]);

  return { notifications: notifications, socketConnected: socketConnected, playSound: playSound, permissionState: permissionState };
}
