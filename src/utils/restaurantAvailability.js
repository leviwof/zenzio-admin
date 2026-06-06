const boolOrUndefined = (value) => {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on', 'open', 'active'].includes(normalized)) return true;
    if (['false', 'no', 'off', 'close', 'closed', 'inactive', 'blocked'].includes(normalized)) return false;
  }

  return undefined;
};

const pickFirstBool = (...values) => {
  for (const value of values) {
    const parsed = boolOrUndefined(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const MEAL_KEYS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const getIstMinutes = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
};

const parseTimeToMinutes = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return hour * 60 + minute;
};

const isCurrentTimeInRange = (start, end) => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return undefined;

  const currentMinutes = getIstMinutes();
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const getScheduleServiceability = (restaurant = {}) => {
  const operationalHours = restaurant.operationalHours || restaurant.operational_hours;
  const operatingHours = restaurant.operatingHours || restaurant.operating_hours;

  if (operationalHours && typeof operationalHours === 'object' && !Array.isArray(operationalHours)) {
    const mealWindows = MEAL_KEYS
      .map((key) => operationalHours[key])
      .filter((window) => window && boolOrUndefined(window.enabled) !== false);

    if (mealWindows.length > 0) {
      return mealWindows.some((window) => isCurrentTimeInRange(window.start, window.end) === true);
    }
  }

  if (Array.isArray(operationalHours) && operationalHours.length > 0) {
    const today = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    }).format(new Date()).toLowerCase();
    const todayShort = today.slice(0, 3);
    const todayWindows = operationalHours.filter((window) => {
      const day = String(window?.day || '').trim().toLowerCase();
      return boolOrUndefined(window?.enabled) !== false && (day === today || day === todayShort);
    });

    if (todayWindows.length > 0) {
      return todayWindows.some((window) => isCurrentTimeInRange(window.from, window.to) === true);
    }
  }

  if (operatingHours && typeof operatingHours === 'object') {
    return isCurrentTimeInRange(operatingHours.opening, operatingHours.closing);
  }

  return undefined;
};

export const getRestaurantAvailabilityState = (restaurant = {}) => {
  const availability = restaurant.availability || {};
  const flags = availability.flags || {};
  const reasons = availability.reasons || {};

  const accountIsActive =
    pickFirstBool(
      restaurant.accountIsActive,
      flags.isActive,
      restaurant.isAccountActive,
      restaurant.isActive,
    ) ?? true;

  const isOnlineFromResponse = pickFirstBool(
    restaurant.restaurantOnline,
    restaurant.isOnline,
    restaurant.online,
  );

  const isManuallyOff =
    pickFirstBool(
      restaurant.isManuallyOff,
      flags.isManuallyOff,
      reasons.manuallyOff,
    ) ??
    (isOnlineFromResponse === false && accountIsActive ? true : false);

  const canAcceptOrders =
    pickFirstBool(
      restaurant.canAcceptOrders,
      availability.canAcceptOrders,
      availability.isAvailable,
      restaurant.isAvailable,
    );
  const scheduleIsServiceable = getScheduleServiceability(restaurant);

  const isOpen =
    scheduleIsServiceable ??
    pickFirstBool(
      availability.isOpen,
      restaurant.isOpen,
      canAcceptOrders,
      isOnlineFromResponse,
    ) ??
    (accountIsActive && !isManuallyOff);

  const isOnline =
    isOnlineFromResponse ?? (accountIsActive && !isManuallyOff);

  const normalizedCanAcceptOrders =
    canAcceptOrders ?? (accountIsActive && !isManuallyOff && isOpen);

  const statusLabel =
    restaurant.statusLabel ||
    availability.statusLabel ||
    (!accountIsActive ? 'BLOCKED' : isManuallyOff || isOpen === false ? 'OFF' : 'ON');
  const outsideOperationalHours =
    Boolean(reasons.outsideOperationalHours) ||
    Boolean(flags.outsideOperationalHours) ||
    (accountIsActive && !isManuallyOff && isOpen === false);

  return {
    accountIsActive,
    isOnline,
    restaurantOnline: isOnline,
    isManuallyOff,
    isOpen,
    canAcceptOrders: normalizedCanAcceptOrders,
    statusLabel,
    flags: {
      ...flags,
      isActive: accountIsActive,
      isManuallyOff,
      isBlocked: !accountIsActive,
    },
    reasons: {
      ...reasons,
      inactive: !accountIsActive,
      manuallyOff: isManuallyOff,
      outsideOperationalHours,
    },
  };
};

export const normalizeRestaurantAvailability = (restaurant = {}) => {
  const state = getRestaurantAvailabilityState(restaurant);
  const availability = restaurant.availability || {};

  return {
    ...restaurant,
    isActive: state.accountIsActive,
    accountIsActive: state.accountIsActive,
    isOnline: state.isOnline,
    restaurantOnline: state.restaurantOnline,
    isManuallyOff: state.isManuallyOff,
    isOpen: state.isOpen,
    canAcceptOrders: state.canAcceptOrders,
    isAvailable: state.canAcceptOrders,
    statusLabel: state.statusLabel,
    availability: {
      ...availability,
      isAvailable: state.canAcceptOrders,
      isOpen: state.isOpen,
      canAcceptOrders: state.canAcceptOrders,
      statusLabel: state.statusLabel,
      flags: state.flags,
      reasons: state.reasons,
    },
  };
};

export const isRestaurantOnline = (restaurant = {}) => {
  const state = getRestaurantAvailabilityState(restaurant);
  return state.accountIsActive && !state.isManuallyOff;
};

export const isRestaurantCurrentlyServiceable = (restaurant = {}) => {
  const state = getRestaurantAvailabilityState(restaurant);
  return state.accountIsActive && !state.isManuallyOff && state.isOpen !== false;
};

export const isRestaurantOutsideOperationalHours = (restaurant = {}) => {
  const state = getRestaurantAvailabilityState(restaurant);
  return state.accountIsActive && !state.isManuallyOff && state.isOpen === false;
};
