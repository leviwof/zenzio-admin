import axios from 'axios';
import toast from 'react-hot-toast';
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../utils/auth';


const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

const normalizedApiBaseUrl = API_BASE_URL
  ? API_BASE_URL.replace(/\/+$/, '')
  : '/';


const api = axios.create({
  baseURL: normalizedApiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'clientId': CLIENT_ID,
  },
});

const ACCESS_TOKEN_KEYS = ['access_token', 'accessToken', 'authToken', 'token'];
const AUTH_STORAGE_KEYS = [
  ...ACCESS_TOKEN_KEYS,
  'refresh_token',
  'adminId',
  'adminEmail',
  'adminRole',
  'loginRole',
  'restaurantUid',
  'restaurant_uid',
  'restaurantId',
  'restaurant_id',
  'authUser',
];
const RATE_LIMIT_MESSAGE = 'Too many requests. Please try again shortly.';
const MAX_RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_TOAST_COOLDOWN = 5000;
let lastRateLimitToastAt = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryAfterSeconds = (error) => {
  const response = error?.response;
  const retryAfter =
    response?.data?.retryAfter ||
    response?.headers?.['retry-after'] ||
    response?.headers?.['retry-after-medium'] ||
    response?.headers?.['retry-after-short'] ||
    response?.headers?.['retry-after-long'];
  const parsed = Number(retryAfter);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const isIdempotentRequest = (config = {}) => {
  const method = String(config.method || 'get').toLowerCase();
  return ['get', 'head', 'options'].includes(method);
};

const shouldRetryRateLimit = (config = {}) =>
  isIdempotentRequest(config) &&
  !config.skipRateLimitRetry &&
  (config.__rateLimitRetryCount || 0) < MAX_RATE_LIMIT_RETRIES;

const showRateLimitToast = (message = RATE_LIMIT_MESSAGE) => {
  const now = Date.now();
  if (now - lastRateLimitToastAt < RATE_LIMIT_TOAST_COOLDOWN) return;
  lastRateLimitToastAt = now;
  toast.error(message);
};

export const getStoredAccessToken = () =>
  ACCESS_TOKEN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

export const saveAccessToken = (accessToken) => {
  if (!accessToken) return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('accessToken', accessToken);
};

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.clear();
};

export const refreshAccessToken = async () => {
  const response = await axios.post('/auth/refresh', {}, {
    baseURL: normalizedApiBaseUrl,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'clientId': CLIENT_ID,
    },
  });

  const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
  if (!accessToken) {
    throw new Error('Refresh response missing access token');
  }

  saveAccessToken(accessToken);
  return accessToken;
};




api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token attached to request');
    } else {
      console.warn('⚠️ No auth token found!');
    }

    return config;
  },
  (error) => Promise.reject(error)
);





let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 429) {
      const retryAfterSeconds = getRetryAfterSeconds(error);
      showRateLimitToast(error.response?.data?.message || RATE_LIMIT_MESSAGE);

      if (shouldRetryRateLimit(originalRequest)) {
        const retryCount = originalRequest.__rateLimitRetryCount || 0;
        const exponentialDelay = Math.min(
          30000,
          Math.max(retryAfterSeconds * 1000, 1000 * 2 ** retryCount),
        );

        await delay(exponentialDelay + Math.floor(Math.random() * 250));
        originalRequest.__rateLimitRetryCount = retryCount + 1;
        return api(originalRequest);
      }

      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const accessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();

        if (window.location.pathname !== '/login') {
          window.location.href = '/login?session_expired=true';
        }

        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
);



api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (false && error.response?.status === 401) {
      console.error('🚫 Unauthorized - Token invalid or expired');

      // Clear all auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      localStorage.removeItem('loginRole');
      localStorage.removeItem('restaurantUid');
      localStorage.removeItem('restaurant_uid');
      localStorage.removeItem('restaurantId');
      localStorage.removeItem('restaurant_id');
      localStorage.removeItem('authUser');

      // Redirect to login with message
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);




export const adminLogin = (email, password, role) =>
  api.post('/super-admin/login', { email, password, role });

export const restaurantLogin = (email, password) =>
  api.post('/restaurants/auth/login/email', { email, password });

export const adminRegister = (formData) =>
  api.post('/super-admin/create', formData);

export const getAdminProfile = () => api.get('/super-admin/profile');
export const updateAdminProfile = (id, data) => api.patch(`/super-admin/${id}`, data);
export const changePassword = (data) => api.patch('/auth/change-password', data);
export const changeAdminPassword = (data) => api.patch('/super-admin/auth/change-password-local', data);
export const logout = () => api.post('/auth/logout');
export const requestOtpChangePassword = () => api.post('/super-admin/auth/request-otp');
export const verifyOtpChangePassword = (otp) => api.post('/super-admin/auth/verify-otp', { otp });
export const confirmChangePasswordOtp = (otp, newPassword) => api.patch('/super-admin/auth/reset-password-otp', { otp, newPassword });

export const requestPasswordReset = (email) => api.post('/user/auth/request-reset-password', { email });
export const confirmPasswordReset = (data) => api.post('/user/auth/confirm-reset-password', data);




const rejectRestrictedApi = (message = 'This action is restricted for restaurant admins') =>
  Promise.reject(new Error(message));

export const getAllCustomers = (params) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/users', { params });
export const getCustomerStats = () => api.get('/users/stats');
export const getCustomerById = (id) => api.get(`/users/${id}`);
export const updateCustomerStatus = (uid, payload) =>
  api.patch(`/users/${uid}/status/admin`, payload);
export const deleteCustomer = (uid) => api.delete(`/users/${uid}`);
export const getCustomerCities = () => api.get('/users/cities');
export const getCustomerStates = () => api.get('/users/states');
export const exportCustomers = (params) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/users/export', { params });
export const bulkUpdateCustomerStatus = (uids, status) =>
  api.post('/users/bulk/status', { uids, status });
export const bulkDeleteCustomers = (uids) =>
  api.post('/users/bulk/delete', { uids });
export const activateAllCustomers = () =>
  api.patch('/users/bulk/activate-all');




export const getAllRestaurants = (params) => {
  if (isRestaurantAdmin()) {
    const uid = getCurrentRestaurantUid();
    if (!uid) return rejectRestrictedApi('Restaurant account is not linked');
    return getRestaurantById(uid).then((response) => ({
      ...response,
      data: [response.data?.data?.restaurant || response.data?.restaurant || response.data?.data],
    }));
  }
  return api.get('/restaurants', { params });
};
export const getRestaurantById = (uid) => api.get(`/restaurants/${uid}/admin`);
export const updateRestaurantOperationalHours = (uid, data) =>
  api.put(`/restaurants/${uid}/operational-hours`, data);
export const toggleRestaurantActive = (id) => api.patch(`/restaurants/${id}/toggle-active`);
export const toggleRestaurantOff = (id) => api.patch(`/restaurants/${id}/toggle-off`);
export const getRestaurantStats = () => api.get('/restaurants/stats');
export const getRestaurantAdminStats = (uid, params) => api.get(`/restaurants/${uid}/admin-stats`, { params });
export const getCuisineTypes = () => api.get('/restaurants/cuisines');


export const updateRestaurantStatus = (uid, status) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.patch(`/restaurants/${uid}/status/admin`, {
    status: status ? 1 : 0,
    isActive: status ? 1 : 0
  });

export const permanentlyDeleteRestaurant = (uid) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete(`/restaurants/${uid}/admin/permanent`);




export const getAllCategories = (params) => api.get('/enum', { params });
export const getCategoryById = (id) => api.get(`/categories/${id}`);
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);




export const getMenuCategories = () => api.get('/restaurant-menu/categories');

export const getAllDeliveryPartners = (params) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('fleets/', { params });
export const getPartnerStats = () => api.get('/delivery-partners/stats');
export const getVehicleTypes = () => api.get('/delivery-partners/vehicles');
export const getDeliveryPartnerById = (id) => api.get(`/fleets/${id}`);
export const updatePartnerStatus = (id, status) =>
  api.patch(`/fleets/${id}/status`, { status });
export const permanentlyDeletePartner = (uid) =>
  api.delete(`/fleets/${uid}/admin`);

export const updatePartnerWorkTime = (uid, data) =>
  api.patch(`/fleets/${uid}/work-time`, data);

export const updatePartnerBreakTime = (uid, data) =>
  api.patch(`/fleets/${uid}/break-time`, data);

export const getWorkTypes = () => api.get('/work-types');

export const updatePartnerProfile = (uid, data) =>
  api.patch(`/fleets/${uid}/profile`, data);

// Shift Management
export const getShiftConfig = () => api.get('/shift/config');
export const getMyShift = () => api.get('/shift/my');
export const assignShift = (shiftId) => api.post('/shift/assign', { shiftId });
export const getFleetShift = (userId) => api.get(`/shift/admin/${userId}`);
export const adminUpdateShift = (userId, data) => api.put('/shift/admin/update', { userId, ...data });

export const getPartnerAttendance = (partnerId, params) =>
  api.get('/attendance/admin/range-summary', { params: { fleet_uid: partnerId, ...params } });
export const downloadAttendanceReport = (partnerId, params) =>
  api.get('/attendance/admin/range-summary', { params: { fleet_uid: partnerId, ...params } });

export const getLivePartnerLocations = () => api.get('/fleets/live-tracking/all');
export const getLiveExecutives = () => api.get('/live-tracking/executives');
export const getLiveExecutiveById = (id) => api.get(`/live-tracking/executives/${id}`);
export const postLiveLocationUpdate = (data) => api.post('/live-tracking/location-update', data);




export const getAllOrders = (params = {}) =>
  api.get('/orders/admin/all', {
    params: {
      ...params,
      ...(isRestaurantAdmin() && getCurrentRestaurantUid()
        ? { restaurant_uid: getCurrentRestaurantUid() }
        : {}),
    },
  });
export const getCustomerOrders = (customerUid, params = {}) =>
  api.get('/orders/admin/all', {
    params: { customer: customerUid, limit: 10, ...params },
  });
export const getOrderStats = () => api.get('/orders/stats');
export const getOrderMonitoringStats = () => api.get('/orders/monitoring-stats');
export const getOrderDetails = (orderId) => api.get(`/orders/${orderId}/admin-details`);
export const updateOrderStatus = (orderId, status) => api.patch(`/orders/${orderId}/status`, { status });
export const getAdminAnalytics = (period) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/orders/admin/analytics', { params: { period } });


export const updateDeliveryStatusByAdmin = (orderId, status, reason = '') =>
  api.put(`/orders/${orderId}/admin/delivery-status`, { status, reason });

export const exportOrders = (params) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/orders/export', { params });

export const reassignOrder = (orderId, newPartnerUid, reason = '') =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.put(`/orders/${orderId}/admin/reassign`, { newPartnerUid, reason });

export const deleteOrder = (orderId) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete(`/orders/${orderId}`);

export const bulkDeleteOrders = (ids) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete('/orders/bulk/delete', { data: { ids } });

export const getPendingEvents = (params = {}) => api.get('/events/pending', { params });
export const getEventForApproval = (id) => api.get(`/events/approval/${id}`);
export const approveEvent = (id) => api.put(`/events/approve/${id}`);
export const rejectEvent = (id, data) => api.put(`/events/reject/${id}`, data);
export const getAllEvents = (params = {}) => api.get('/events', { params });
export const getEventStats = (params = {}) => api.get('/events/stats', { params });




export const getAllBookings = (params = {}) => api.get('/bookings', { params });
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const getBookingStats = (params = {}) => api.get('/bookings/stats', { params });




export const getPendingOffers = () => api.get('/offers/pending');
export const getAllOffers = (params = {}) => api.get('/offers', { params });
export const getOfferDetails = (offerId) => api.get(`/offers/details/${offerId}`);
export const createOffer = (formData) => api.post('/offers', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const approveOffer = (offerId, comments = '') =>
  api.put(`/offers/${offerId}/approve`, { comments });
export const rejectOffer = (offerId, reason) =>
  api.put(`/offers/${offerId}/reject`, { reason });
export const requestChanges = (offerId, comments) =>
  api.put(`/offers/${offerId}/request-changes`, { comments });

export const getAdminOffers = (params = {}) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/offers/admin-created', { params });
export const getAdminOfferById = (id) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get(`/offers/admin-created/${id}`);
export const createOfferByAdmin = (formData) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.post('/offers/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateAdminOffer = (id, formData) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.put(`/offers/admin-created/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteAdminOffer = (id) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete(`/offers/admin-created/${id}`);




export const getAllCuisineCategories = (params) => api.get('/restaurant_enum', { params });
export const getCuisineGroups = () => api.get('/restaurant_enum/groups');
export const getCuisineChildrenByParent = (parentId) => api.get(`/restaurant_enum/children/${parentId}`);
export const getCuisineByFatherId = (fatherId) => api.get(`/restaurant_enum/father/${fatherId}`);
export const getCuisineById = (id) => api.get(`/restaurant_enum/${id}`);
export const createCuisineCategory = (data) => api.post('/restaurant_enum', data);
export const updateCuisineCategory = (id, data) => api.put(`/restaurant_enum/${id}`, data);
export const deleteCuisineCategory = (id) => api.delete(`/restaurant_enum/${id}`);




export const getAllMenus = (params = {}) => {
  if (isRestaurantAdmin()) {
    const uid = getCurrentRestaurantUid();
    if (!uid) return rejectRestrictedApi('Restaurant account is not linked');
    return getMenusByRestaurant(uid, params);
  }
  return api.get('/restaurant-menu', { params: { includeInactive: 'true', ...params } });
};

export const getMenusByRestaurant = (restaurantUid, params) =>
  api.get(`/restaurant-menu`, { params: { restaurant: restaurantUid, includeInactive: 'true', ...params } });

export const getMenuByUid = (menuUid) => api.get(`/restaurant-menu/admin/${menuUid}`);
export const getPublicMenuByUid = (menuUid) => api.get(`/restaurant-menu/${menuUid}`);


export const toggleMenuStatus = (menuUid, newStatus) =>
  isRestaurantAdmin() ? api.patch(`/restaurant-menu/${menuUid}/toggle`) : api.patch(`/restaurant-menu/${menuUid}/status/admin`, {
    status: newStatus ? 1 : 0,
    isActive: newStatus ? 1 : 0
  });

export const toggleMenuAvailability = (menuUid, isAvailable) =>
  api.patch(`/restaurant-menu/${menuUid}/availability`, { is_available: isAvailable });

export const deleteMenu = (menuUid) =>
  api.delete(`/restaurant-menu/${menuUid}/soft`);

export const bulkUpdateMenuStatus = (menuUids, newStatus) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.patch('/restaurant-menu/bulk-status', {
    ids: menuUids,
    isActive: newStatus
  });

export const bulkDeleteMenu = (menuUids) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete('/restaurant-menu/bulk-soft', { data: { ids: menuUids } });

export const exportMenus = (params) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/restaurant-menu/export', { params });




export const createMenuByAdmin = (data) => api.post('/restaurant-menu/admin-create', data);
export const createMenuForRestaurant = (data) => api.post('/restaurant-menu', data);
export const createMenuByAdminWithImage = (formData) =>
  api.post('/restaurant-menu/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const editMenuForRestaurant = (menuUid, data) =>
  api.patch(`/restaurant-menu/${menuUid}`, data);
export const editMenuByAdminWithImage = (menuUid, formData) =>
  api.patch(`/restaurant-menu/admin-edit/${menuUid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const uploadMenuImages = (menuUid, files) => {
  const formData = new FormData();
  Array.from(files || []).forEach((file) => formData.append('files', file));
  return api.post(`/restaurant-menu/upload-image/${menuUid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const bulkUploadMenu = (formData) =>
  api.post('/restaurant-menu/admin-bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const downloadMenuTemplate = () =>
  api.get('/restaurant-menu/download-template', { responseType: 'blob' });
export const createDiningByAdmin = (data) => api.post('/dining-spaces/admin-create', data);
export const createDiningByAdminWithImage = (formData) =>
  api.post('/dining-spaces/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const createEventByAdmin = (data) => api.post('/events/admin-create', data);
export const createEventByAdminWithImage = (formData) =>
  api.post('/events/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getAllDiningSpaces = (params) => api.get('/dining-spaces', { params });
export const getDiningSpacesByRestaurant = (restaurantId) => api.get(`/dining-spaces/restaurant/${restaurantId}`);




export const getAllCoupons = (params) => api.get('/coupons', { params });
export const getCouponById = (id) => api.get(`/coupons/${id}`);
export const createCoupon = (data) => api.post('/coupons', data);
export const updateCoupon = (id, data) => api.patch(`/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/coupons/${id}`);
export const downloadCouponReport = () => api.get('/coupons/report', { responseType: 'blob' });




export const getAllPlans = () => api.get('/subscriptions/plans');
export const createPlan = (data) => api.post('/subscriptions/plans', data);
export const getAllSubscriptions = () => api.get('/subscriptions');
export const getSubscriptionStats = () => api.get('/subscriptions/stats');
export const getSubscriptionHistory = (restaurantId) =>
  api.get(`/subscriptions/restaurant/${restaurantId}/history`);




export const getNotifications = () => api.get('/notifications');
export const markNotificationAsRead = (id) => api.patch(`/notifications/${id}/read`);




export const getBanners = () => api.get('/banners');
export const uploadBanner = (formData) =>
  api.post('/banners/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteBanner = (id) => api.delete(`/banners/${id}`);

export const getQuickMenusAdmin = (params = {}) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.get('/quick-search/admin/list', { params });
export const createQuickMenu = (formData) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.post('/quick-search/admin', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateQuickMenu = (id, formData) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.patch(`/quick-search/admin/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateQuickMenuStatus = (id, isActive) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.patch(`/quick-search/admin/${id}/status`, { is_active: isActive });
export const deleteQuickMenu = (id) =>
  isRestaurantAdmin() ? rejectRestrictedApi() : api.delete(`/quick-search/admin/${id}`);

// Restaurant Edit APIs
export const updateRestaurantProfileAdmin = (uid, profileData) =>
  api.put(`/restaurants/${uid}/admin/profile`, profileData);

export const updateRestaurantAddressAdmin = (uid, addressData) =>
  api.put(`/restaurants/${uid}/admin/address`, addressData);

export const uploadRestaurantLogoAdmin = (uid, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/restaurants/upload-image/${uid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};




// Restaurant Documents APIs
export const deleteRestaurantDocumentAdmin = (uid, docType) =>
  api.delete(`/restaurants/${uid}/admin/documents/${docType}`);

export const deleteRestaurantDocumentFileAdmin = (uid, docType, filename) =>
  api.delete(`/restaurants/${uid}/admin/documents/${docType}/file`, { data: { fileName: filename } });

export const updateRestaurantDocumentsAdmin = (uid, documentData) =>
  api.put(`/restaurants/${uid}/admin/documents`, documentData);

export const uploadRestaurantDocumentFileAdmin = (uid, docType, files) => {
  const formData = new FormData();
  formData.append('restaurantUid', uid);
  formData.append('docType', docType); // 'fssai' | 'gst' | 'trade' | 'other'
  Array.from(files).forEach((file) => formData.append('files', file));
  return api.post(`/restaurants/upload-documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadRestaurantSingleDocument = (uid, documentType, file) => {
  const formData = new FormData();
  formData.append('documentType', documentType);
  formData.append('file', file);
  return api.patch(`/restaurants/${uid}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteRestaurantDocumentsByType = (uid, documentType) =>
  api.delete(`/restaurants/${uid}/documents/${documentType}`);

export const getGlobalSettings = () => api.get('/global-settings');
export const updateGlobalSettings = (data) => api.patch('/global-settings', data);




export default api;
