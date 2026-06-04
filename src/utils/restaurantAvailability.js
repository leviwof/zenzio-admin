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

  const isOpen =
    pickFirstBool(
      restaurant.isOpen,
      availability.isOpen,
      canAcceptOrders,
      isOnlineFromResponse,
    ) ?? (accountIsActive && !isManuallyOff);

  const isOnline =
    isOnlineFromResponse ?? (accountIsActive && !isManuallyOff);

  const normalizedCanAcceptOrders =
    canAcceptOrders ?? (accountIsActive && !isManuallyOff && isOpen);

  const statusLabel =
    restaurant.statusLabel ||
    availability.statusLabel ||
    (!accountIsActive ? 'BLOCKED' : isManuallyOff || isOpen === false ? 'OFF' : 'ON');

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
