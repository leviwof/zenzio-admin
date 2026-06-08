export const RECENT_NOTIFICATION_WINDOW_MS = 10 * 60 * 1000;
const FUTURE_CLOCK_SKEW_MS = 2 * 60 * 1000;

export const getNotificationTimestamp = (item = {}) => {
  const raw =
    item.createdAt ??
    item.created_at ??
    item.timestamp ??
    item.time ??
    item.data?.createdAt ??
    item.data?.created_at ??
    item.data?.timestamp;

  if (raw == null) return null;

  const ms = typeof raw === "number"
    ? raw < 1_000_000_000_000 ? raw * 1000 : raw
    : Date.parse(raw);

  return Number.isFinite(ms) ? ms : null;
};

export const isRecentNotification = (item = {}, now = Date.now()) => {
  const timestamp = getNotificationTimestamp(item);
  if (timestamp == null) return true;

  return (
    timestamp >= now - RECENT_NOTIFICATION_WINDOW_MS &&
    timestamp <= now + FUTURE_CLOCK_SKEW_MS
  );
};

export const filterRecentNotifications = (items = [], now = Date.now()) =>
  Array.isArray(items) ? items.filter(item => isRecentNotification(item, now)) : [];
