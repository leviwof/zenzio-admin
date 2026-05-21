export const ROLES = {
  ZENZIO_ADMIN: 'zenzio_admin',
  RESTAURANT_ADMIN: 'restaurant_admin',
};

const RESTAURANT_ROLE_VALUES = new Set([
  '2',
  'restaurant',
  'restaurant_admin',
  'restaurant-admin',
  'restaurant admin',
]);

const ZENZIO_ROLE_VALUES = new Set([
  '1',
  'admin',
  'superadmin',
  'super_admin',
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
  return value || ROLES.ZENZIO_ADMIN;
};

export const getCurrentUserRole = () => {
  const loginRole = normalizeRole(localStorage.getItem('loginRole'));
  if (loginRole === ROLES.RESTAURANT_ADMIN) return loginRole;
  return normalizeRole(localStorage.getItem('adminRole') || localStorage.getItem('loginRole'));
};

export const isRestaurantAdmin = () => getCurrentUserRole() === ROLES.RESTAURANT_ADMIN;

export const isZenzioAdmin = () => !isRestaurantAdmin();

export const getCurrentRestaurantUid = () => (
  localStorage.getItem('restaurantUid') ||
  localStorage.getItem('restaurant_uid') ||
  localStorage.getItem('restaurantId') ||
  localStorage.getItem('restaurant_id') ||
  (isRestaurantAdmin() ? localStorage.getItem('adminId') : '')
);

export const extractRestaurantUid = (user = {}) => (
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
  return allowedRoles.includes(getCurrentUserRole());
};
