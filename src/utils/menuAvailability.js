const boolOrUndefined = (value) => {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  return undefined;
};

const reasonLabels = {
  menuStatusDisabled: 'menu disabled by admin',
  outOfStock: 'out of stock',
  outsideMealWindow: 'outside meal window',
  menuInactive: 'menu inactive',
  menuUnavailable: 'item unavailable',
  deleted: 'deleted',
  restaurantClosed: 'restaurant closed',
};

export const extractMenuAvailabilityPayload = (payload) => {
  const data = payload?.data ?? payload;
  return data?.availability ?? data?.data?.availability ?? data?.data ?? data ?? null;
};

export const getMenuAvailabilityState = (menu = {}) => {
  const availability = menu.availability || {};
  const flags = availability.flags || {};
  const reasons = availability.reasons || {};

  const menuStatus =
    boolOrUndefined(flags.menuStatus) ??
    boolOrUndefined(menu.status) ??
    boolOrUndefined(menu.isActive) ??
    boolOrUndefined(menu.is_active) ??
    true;

  const menuIsActive =
    boolOrUndefined(flags.menuIsActive) ??
    boolOrUndefined(menu.isActive) ??
    boolOrUndefined(menu.is_active) ??
    menuStatus;

  const menuIsAvailable =
    boolOrUndefined(flags.menuIsAvailable) ??
    boolOrUndefined(menu.is_available) ??
    boolOrUndefined(menu.menuIsAvailable) ??
    true;

  const restaurantAvailable =
    boolOrUndefined(availability.restaurantAvailable) ??
    boolOrUndefined(flags.restaurantIsOpen) ??
    boolOrUndefined(menu.restaurantAvailable) ??
    true;

  const canOrder =
    boolOrUndefined(availability.canOrder) ??
    boolOrUndefined(menu.canOrder) ??
    boolOrUndefined(menu.isAvailable) ??
    (menuStatus && menuIsActive && menuIsAvailable && restaurantAvailable);

  const isAvailable = boolOrUndefined(availability.isAvailable) ?? canOrder;
  const activeReasons = Object.entries(reasons)
    .filter(([, value]) => value === true)
    .map(([key]) => reasonLabels[key] || key);

  return {
    menuStatus,
    menuIsActive,
    menuIsAvailable,
    restaurantAvailable,
    canOrder,
    isAvailable,
    currentMeal: availability.currentMeal || menu.currentMeal || null,
    flags: {
      ...flags,
      menuStatus,
      menuIsActive,
      menuIsAvailable,
      restaurantIsOpen: restaurantAvailable,
    },
    reasons,
    activeReasons,
    reasonText: activeReasons.length ? activeReasons.join(', ') : '',
  };
};

export const mergeMenuAvailability = (menu = {}, payload) => {
  const liveAvailability = extractMenuAvailabilityPayload(payload);
  const baseAvailability = liveAvailability || menu.availability || {};
  const merged = {
    ...menu,
    availability: baseAvailability,
  };
  const state = getMenuAvailabilityState(merged);

  return {
    ...merged,
    status: state.menuStatus,
    isAvailable: state.canOrder,
    canOrder: state.canOrder,
    is_available: state.menuIsAvailable,
    availability: {
      ...baseAvailability,
      isAvailable: state.isAvailable,
      canOrder: state.canOrder,
      flags: state.flags,
      reasons: state.reasons,
    },
  };
};
