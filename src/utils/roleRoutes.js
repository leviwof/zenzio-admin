export const isRestaurantAdminRole = (role) =>
  role === 'RESTAURANT_ADMIN' || role === '2';

export const toRoleRoute = (path, role) => {
  if (!isRestaurantAdminRole(role)) return path;
  if (!path || path === '/') return '/restaurant/dashboard';
  if (path.startsWith('/restaurant/')) return path;
  return `/restaurant${path}`;
};
