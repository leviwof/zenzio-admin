import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { createOfferByAdmin, getAllRestaurants, getMenuCategories } from '../../services/api';

const OfferConfiguration = () => {
  const navigate = useNavigate();

  // ✅ FIX: Initialize as empty arrays
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    restaurantId: '',
    categoryId: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderValue: '',
    maxUsagePerUser: '1',
    totalUsageLimit: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    termsConditions: '',
    description: '',
    adminCommission: '15',
    isCommissionAuto: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setFetchingData(true);
    await Promise.all([fetchRestaurants(), fetchCategories()]);
    setFetchingData(false);
  };

  const fetchRestaurants = async () => {
    try {
      const response = await getAllRestaurants();
      console.log('Restaurants response:', response.data);

      // Handle nested structure: data.data.restaurants
      let restaurantData = [];

      if (response.data?.data?.restaurants) {
        // Structure: { data: { restaurants: [...] } }
        restaurantData = response.data.data.restaurants;
      } else if (response.data?.restaurants) {
        // Structure: { restaurants: [...] }
        restaurantData = response.data.restaurants;
      } else if (Array.isArray(response.data?.data)) {
        // Structure: { data: [...] }
        restaurantData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Structure: [...]
        restaurantData = response.data;
      }

      setRestaurants(Array.isArray(restaurantData) ? restaurantData : []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setRestaurants([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getMenuCategories();
      console.log('Categories response:', response.data);

      let categoryData = [];

      // Handle different response structures
      if (Array.isArray(response.data?.data)) {
        // Structure: { data: [...] }
        categoryData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Structure: [...]
        categoryData = response.data;
      } else if (response.data?.categories && Array.isArray(response.data.categories)) {
        // Structure: { categories: [...] }
        categoryData = response.data.categories;
      }

      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title) {
      alert('Please enter offer title');
      return;
    }

    if (!formData.discountValue) {
      alert('Please enter discount value');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();

      // Add all form fields
      Object.keys(formData).forEach(key => {
        // Skip keys with empty string values
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      // Add image if selected
      if (imageFile) {
        data.append('image', imageFile);
      }

      await createOfferByAdmin(data);
      alert('Offer created successfully!');
      navigate('/offers/existing');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      restaurantId: '',
      categoryId: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderValue: '',
      maxUsagePerUser: '1',
      totalUsageLimit: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      termsConditions: '',
      description: '',
      adminCommission: '15',
      isCommissionAuto: true
    });
    setImageFile(null);
    setImagePreview(null);
  };

  // Show loading state while fetching initial data
  if (fetchingData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate('/offers/existing')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft size={20} />
        <span>Back</span>
      </button>

      <h1 className="text-3xl font-bold mb-6">Offer Configuration</h1>

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
                    {Array.isArray(restaurants) && restaurants.map(restaurant => (
                      <option key={restaurant.uid || restaurant.id} value={restaurant.uid || restaurant.id}>
                        {restaurant.profile?.restaurant_name || restaurant.rest_name || restaurant.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Leave empty for global offer</p>
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
                    {Array.isArray(categories) && categories.map((category, index) => (
                      <option key={index} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Leave empty for all categories</p>
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
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Offer'}
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
              {formData.title || 'Weekend Bonanza'}
            </p>

            <p className="text-sm text-gray-600">
              Restaurant: {restaurants.find(r => (r.uid === formData.restaurantId || r.id === formData.restaurantId))?.profile?.restaurant_name || restaurants.find(r => (r.uid === formData.restaurantId || r.id === formData.restaurantId))?.rest_name || 'All Restaurants'}
            </p>

            <p className="text-sm text-gray-600">
              Category: {formData.categoryId || 'All Categories'}
            </p>

            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-red-500 font-bold text-xl">
                Discount: {formData.discountValue || '20'}{formData.discountType === 'PERCENTAGE' ? '%' : '₹'}
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
    </div>
  );
};

export default OfferConfiguration;