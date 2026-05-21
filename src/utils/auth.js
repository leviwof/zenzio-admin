export const ROLES = {
  ZENZIO_ADMIN: 'zenzio_admin',
  RESTAURANT_ADMIN: 'restaurant_admin',
};

const RESTAURANT_ROLE_VALUES = new Set([
  '4',
  'user_restaurant',
  'restaurant',
  'restaurant_admin',
  'restaurant-admin',
  'restaurant admin',
]);

const ZENZIO_ROLE_VALUES = new Set([
  '0',
  '1',
  'super_admin',
  'master_admin',
  'master admin',
  'superadmin',
  'super admin',
  'zenzio_admin',
  'zenzio-admin',
  'zenzio admin',
  'platform_admin',
  'platform admin',
]);

export const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  if (RESTAURANT_ROLE_VALUES.has(value)) return ROLES.RESTAURANT_ADMIN;
  if (ZENZIO_ROLE_VALUES.has(value)) return ROLES.ZENZIO_ADMIN;
  return value;
};

export const persistAuthUser = (user = {}) => {
  if (!user || typeof user !== 'object') return;
  localStorage.setItem('authUser', JSON.stringify(user));
  if (user.role !== undefined && user.role !== null) {
    localStorage.setItem('adminRole', String(user.role));
  }
  const uid = extractRestaurantUid(user);
  if (uid) persistRestaurantUid(uid);
};

export const getAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem('authUser') || '{}');
  } catch {
    return {};
  }
};

export const getCurrentUserRole = () => {
  const backendRole = normalizeRole(getAuthUser()?.role || localStorage.getItem('adminRole'));
  if (backendRole) return backendRole;
  return normalizeRole(localStorage.getItem('loginRole'));
};

export const isRestaurantAdmin = () => getCurrentUserRole() === ROLES.RESTAURANT_ADMIN;

export const isZenzioAdmin = () => getCurrentUserRole() === ROLES.ZENZIO_ADMIN;

export const getCurrentRestaurantUid = () => (
  localStorage.getItem('restaurantUid') ||
  localStorage.getItem('restaurant_uid') ||
  localStorage.getItem('restaurantId') ||
  localStorage.getItem('restaurant_id') ||
  (isRestaurantAdmin() ? getAuthUser()?.uid : '')
);

export const extractRestaurantUid = (user = {}) => (
  user.uid ||
  user.restaurant_uid ||
  user.restaurantUid ||
  user.restaurantId ||
  user.restaurant_id ||
  user.restaurant?.uid ||
  user.restaurant?.id ||
  user.profile?.restaurant_uid ||
  user.profile?.restaurantUid ||
  ''
);

export const persistRestaurantUid = (uid) => {
  if (!uid) return;
  localStorage.setItem('restaurantUid', uid);
  localStorage.setItem('restaurant_uid', uid);
};

export const canAccessRoute = (allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const role = getCurrentUserRole();
  return allowedRoles.map(normalizeRole).includes(role);
};

export const canAccessRestaurantUid = (uid) => (
  isZenzioAdmin() || !uid || uid === getCurrentRestaurantUid()
);

export const canUseGlobalAdminApis = () => isZenzioAdmin();
