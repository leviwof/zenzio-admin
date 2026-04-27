import axios from 'axios';


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




api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('access_token') || 
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken');

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





api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('🚫 Unauthorized - Token invalid or expired');
    }
    return Promise.reject(error);
  }
);




export const adminLogin = (email, password, role) =>
  api.post('/super-admin/login', { email, password, role });

export const adminRegister = (formData) =>
  api.post('/super-admin/create', formData);

export const getAdminProfile = () => api.get('/super-admin/profile');
export const updateAdminProfile = (id, data) => api.patch(`/super-admin/${id}`, data);
export const changePassword = (data) => api.patch('/auth/change-password', data);
export const changeAdminPassword = (data) => api.patch('/super-admin/auth/change-password-local', data);
export const requestOtpChangePassword = () => api.post('/super-admin/auth/request-otp');
export const verifyOtpChangePassword = (otp) => api.post('/super-admin/auth/verify-otp', { otp });
export const confirmChangePasswordOtp = (otp, newPassword) => api.patch('/super-admin/auth/reset-password-otp', { otp, newPassword });

export const requestPasswordReset = (email) => api.post('/user/auth/request-reset-password', { email });
export const confirmPasswordReset = (data) => api.post('/user/auth/confirm-reset-password', data);




export const getAllCustomers = (params) => api.get('/users', { params });
export const getCustomerStats = () => api.get('/customers/stats');
export const getCustomerById = (id) => api.get(`/users/${id}`);
export const updateCustomerStatus = (uid, payload) =>
  api.patch(`/users/${uid}/status/admin`, payload);
export const deleteCustomer = (uid) => api.delete(`/users/${uid}`);




export const getAllRestaurants = (params) => api.get('/restaurants', { params });
export const getRestaurantById = (uid) => api.get(`/restaurants/${uid}/admin`);
export const toggleRestaurantActive = (id) => api.patch(`/restaurants/${id}/toggle-active`);
export const toggleRestaurantOff = (id) => api.patch(`/restaurants/${id}/toggle-off`);
export const getRestaurantStats = () => api.get('/restaurants/stats');
export const getRestaurantAdminStats = (uid, params) => api.get(`/restaurants/${uid}/admin-stats`, { params });
export const getCuisineTypes = () => api.get('/restaurants/cuisines');


export const updateRestaurantStatus = (uid, status) =>
  api.patch(`/restaurants/${uid}/status/admin`, {
    status: status ? 1 : 0,
    isActive: status ? 1 : 0
  });

export const permanentlyDeleteRestaurant = (uid) =>
  api.delete(`/restaurants/${uid}/admin/permanent`);




export const getAllCategories = (params) => api.get('/enum', { params });
export const getCategoryById = (id) => api.get(`/categories/${id}`);
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);




export const getMenuCategories = () => api.get('/restaurant-menu/categories');

export const getAllDeliveryPartners = (params) => api.get('fleets/', { params });
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

export const getPartnerAttendance = (partnerId, params) =>
  api.get('/attendance/admin/range-summary', { params: { fleet_uid: partnerId, ...params } });
export const downloadAttendanceReport = (partnerId, params) =>
  api.get('/attendance/admin/range-summary', { params: { fleet_uid: partnerId, ...params } });

export const getLivePartnerLocations = () => api.get('/fleets/live-tracking/all');




export const getAllOrders = (params) => api.get('/orders/admin/all', { params });
export const getOrderStats = () => api.get('/orders/stats');
export const getOrderMonitoringStats = () => api.get('/orders/monitoring-stats');
export const getOrderDetails = (orderId) => api.get(`/orders/${orderId}/admin-details`);
export const updateOrderStatus = (orderId, status) => api.put(`/orders/${orderId}/status`, { status });
export const getAdminAnalytics = (period) => api.get('/orders/admin/analytics', { params: { period } });


export const updateDeliveryStatusByAdmin = (orderId, status, reason = '') =>
  api.put(`/orders/${orderId}/admin/delivery-status`, { status, reason });

export const reassignOrder = (orderId, newPartnerUid, reason = '') =>
  api.put(`/orders/${orderId}/admin/reassign`, { newPartnerUid, reason });



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
export const approveOffer = (offerId, comments = '') =>
  api.put(`/offers/${offerId}/approve`, { comments });
export const rejectOffer = (offerId, reason) =>
  api.put(`/offers/${offerId}/reject`, { reason });
export const requestChanges = (offerId, comments) =>
  api.put(`/offers/${offerId}/request-changes`, { comments });

export const getAdminOffers = (params = {}) =>
  api.get('/offers/admin-created', { params });
export const getAdminOfferById = (id) =>
  api.get(`/offers/admin-created/${id}`);
export const createOfferByAdmin = (formData) =>
  api.post('/offers/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const updateAdminOffer = (id, formData) =>
  api.put(`/offers/admin-created/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteAdminOffer = (id) => api.delete(`/offers/admin-created/${id}`);




export const getAllCuisineCategories = (params) => api.get('/restaurant_enum', { params });
export const getCuisineGroups = () => api.get('/restaurant_enum/groups');
export const getCuisineChildrenByParent = (parentId) => api.get(`/restaurant_enum/children/${parentId}`);
export const getCuisineByFatherId = (fatherId) => api.get(`/restaurant_enum/father/${fatherId}`);
export const getCuisineById = (id) => api.get(`/restaurant_enum/${id}`);
export const createCuisineCategory = (data) => api.post('/restaurant_enum', data);
export const updateCuisineCategory = (id, data) => api.put(`/restaurant_enum/${id}`, data);
export const deleteCuisineCategory = (id) => api.delete(`/restaurant_enum/${id}`);




export const getAllMenus = (params) => api.get('/restaurant-menu', { params });

export const getMenusByRestaurant = (restaurantUid, params) =>
  api.get(`/restaurant-menu/by-restaurant`, { params: { restaurant_uid: restaurantUid, includeInactive: 'true', ...params } });

export const getMenuByUid = (menuUid) => api.get(`/restaurant-menu/${menuUid}`);


export const toggleMenuStatus = (menuUid, newStatus) =>
  api.patch(`/restaurant-menu/${menuUid}/status/admin`, {
    status: newStatus ? 1 : 0,
    isActive: newStatus ? 1 : 0
  });

export const deleteMenu = (menuUid) =>
  api.delete(`/restaurant-menu/${menuUid}/soft`);




export const createMenuByAdmin = (data) => api.post('/restaurant-menu/admin-create', data);
export const createMenuByAdminWithImage = (formData) =>
  api.post('/restaurant-menu/admin-create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const editMenuByAdminWithImage = (menuUid, formData) =>
  api.patch(`/restaurant-menu/admin-edit/${menuUid}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

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

export const getGlobalSettings = () => api.get('/global-settings');
export const updateGlobalSettings = (data) => api.patch('/global-settings', data);




export default api;
