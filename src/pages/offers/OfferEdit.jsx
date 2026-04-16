import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { updateAdminOffer, getAdminOfferById, getAllRestaurants, getMenuCategories } from '../../services/api';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in z-50`}>
      <Icon size={20} />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 hover:opacity-80">
        <XCircle size={18} />
      </button>
    </div>
  );
};

const OfferEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/admin', '') || 'http://localhost:5000';

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchInitialData = async () => {
    try {
      setFetchingData(true);
      setError(null);
      const [restRes, catRes, offerRes] = await Promise.all([
        getAllRestaurants(),
        getMenuCategories(),
        getAdminOfferById(id),
      ]);
      console.log(restRes, "restRes")
      // Parse restaurants
      let restaurantData = [];
      if (restRes.data?.restaurants)
        restaurantData = restRes.data.restaurants;
      else if (restRes.data?.restaurants)
        restaurantData = restRes.data.restaurants;
      else if (Array.isArray(restRes.data))
        restaurantData = restRes.data;
      else if (Array.isArray(restRes.data))
        restaurantData = restRes.data;
      setRestaurants(Array.isArray(restaurantData) ? restaurantData : []);

      // Parse categories from restaurant menus
      console.log(catRes, "catRes");
      let categoryData = [];

      if (Array.isArray(catRes.data?.data)) {
        categoryData = catRes.data.data;
      } else if (Array.isArray(catRes.data)) {
        categoryData = catRes.data;
      } else if (catRes.data?.categories && Array.isArray(catRes.data.categories)) {
        categoryData = catRes.data.categories;
      }

      console.log(categoryData, "categoryData");
      setCategories(categoryData);

      // Set offer data
      const offer = offerRes.data;
      if (!offer) {
        throw new Error("Offer data not found");
      }

      setFormData({
        title: offer.title || "",
        restaurantId: offer.restaurantId || "",
        categoryId: offer.categoryId || "",
        discountType: offer.discountType || "PERCENTAGE",
        discountValue: offer.discountValue || "",
        minOrderValue: offer.minOrderValue || "",
        maxUsagePerUser: offer.maxUsagePerUser || "1",
        totalUsageLimit: offer.totalUsageLimit || "",
        startDate: (offer.startDate || "").split('T')[0],
        endDate: (offer.endDate || "").split('T')[0],
        startTime: offer.startTime || "",
        endTime: offer.endTime || "",
        termsConditions: offer.termsConditions || "",
        description: offer.description || "",
        adminCommission: offer.adminCommission || "15",
        isCommissionAuto: offer.isCommissionAuto !== undefined ? offer.isCommissionAuto : true,
      });

      if (offer.offerImage) {
        const imageUrl = offer.offerImage.startsWith('offers/')
          ? `${IMAGE_BASE_URL}/uploads/${offer.offerImage}`
          : `${IMAGE_BASE_URL}/${offer.offerImage}`;
        setImagePreview(imageUrl);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to load offer data');
      // showToast('Failed to load offer data', 'error');
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      showToast('Please enter offer title', 'error');
      return;
    }

    if (!formData.discountValue) {
      showToast('Please enter discount value', 'error');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showToast('Please select start and end dates', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== "") data.append(key, formData[key]);
      });
      if (imageFile) data.append('image', imageFile);

      await updateAdminOffer(id, data);
      showToast('Offer updated successfully!', 'success');

      // Navigate after short delay to show toast
      setTimeout(() => {
        navigate("/offers/existing");
      }, 1000);
    } catch (error) {
      console.error('Error updating offer:', error);
      showToast(error.response?.data?.message || 'Failed to update offer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    fetchInitialData();
    setImageFile(null);
    showToast('Form reset to original values', 'info');
  };

  if (fetchingData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600">Loading offer data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <div className="flex justify-center mb-4">
            <XCircle size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Offer</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/offers/existing')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={fetchInitialData}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null; // Should not happen if error handling works, but good for safety
  }


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <button
        onClick={() => navigate('/offers/existing')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft size={20} />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold mb-6">Edit Offer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Weekend Bonanza"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Restaurant
                  </label>
                  <select
                    name="restaurantId"
                    value={formData.restaurantId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Restaurants</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.uid || restaurant.id} value={restaurant.uid || restaurant.id}>
                        {restaurant.profile?.restaurant_name || restaurant.rest_name || restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Food Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    placeholder="e.g. 20"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    name="minOrderValue"
                    value={formData.minOrderValue}
                    onChange={handleChange}
                    placeholder="e.g. 500"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Usage Per User
                  </label>
                  <input
                    type="number"
                    name="maxUsagePerUser"
                    value={formData.maxUsagePerUser}
                    onChange={handleChange}
                    placeholder="e.g. 1"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  name="totalUsageLimit"
                  value={formData.totalUsageLimit}
                  onChange={handleChange}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time (Optional)
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Commission Calculation
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Auto Calculate</span>
                    <input
                      type="checkbox"
                      name="isCommissionAuto"
                      checked={formData.isCommissionAuto}
                      onChange={handleChange}
                      className="w-4 h-4 text-red-500 rounded focus:ring-2 focus:ring-red-500"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Commission (%)
                  </label>
                  <input
                    type="number"
                    name="adminCommission"
                    value={formData.adminCommission}
                    onChange={handleChange}
                    disabled={formData.isCommissionAuto}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offer Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Briefly describe the offer..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  name="termsConditions"
                  value={formData.termsConditions}
                  onChange={handleChange}
                  placeholder="Enter terms and conditions (one per line)"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Offer Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 800x400px, Max 2MB</p>
                {imagePreview && (
                  <div className="mt-3 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 rounded-md object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Offer'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
          <h3 className="font-bold text-lg mb-4">Offer Preview</h3>
          <div className="border rounded-lg p-4 space-y-3">
            {imagePreview && (
              <div className="mb-3">
                <img
                  src={imagePreview}
                  alt="Offer"
                  className="w-full h-32 rounded-md object-cover"
                />
              </div>
            )}

            <p className="font-semibold text-lg">
              {formData.title || 'Offer Title'}
            </p>

            Restaurant: {restaurants.find(r => (r.uid === formData.restaurantId || r.id === formData.restaurantId))?.profile?.restaurant_name || restaurants.find(r => (r.uid === formData.restaurantId || r.id === formData.restaurantId))?.rest_name || 'All Restaurants'}

            <p className="text-sm text-gray-600">
              Category: {formData.categoryId || 'All Categories'}
            </p>

            {formData.restaurantId && (() => {
              const selectedRestaurant = restaurants.find(r => (r.uid === formData.restaurantId || r.id === formData.restaurantId));
              return selectedRestaurant?.profile && (
                <div className="bg-blue-50 p-3 rounded-md space-y-1 mt-2">
                  <p className="text-sm font-semibold text-blue-900">Restaurant Details</p>
                  {selectedRestaurant.profile.contact_person && (
                    <p className="text-xs text-blue-700">
                      Contact: {selectedRestaurant.profile.contact_person}
                    </p>
                  )}
                  {selectedRestaurant.profile.contact_number && (
                    <p className="text-xs text-blue-700">
                      Phone: {selectedRestaurant.profile.contact_number}
                    </p>
                  )}
                  {selectedRestaurant.profile.avg_cost_for_two && (
                    <p className="text-xs text-blue-700">
                      Avg Cost for Two: ₹{selectedRestaurant.profile.avg_cost_for_two}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-red-500 font-bold text-xl">
                Discount: {formData.discountValue || '0'}{formData.discountType === 'PERCENTAGE' ? '%' : '₹'}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-gray-700 text-sm">
                Min Order: ₹{formData.minOrderValue || '0'}
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-yellow-700 font-bold">
                Admin Commission: {formData.adminCommission || '15'}%
              </p>
            </div>

            {formData.startDate && formData.endDate && (
              <div className="text-xs text-gray-600">
                Valid: {formData.startDate} to {formData.endDate}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OfferEdit;