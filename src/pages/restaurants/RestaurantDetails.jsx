




import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Building2, FileText, Image as ImageIcon, Download, ShoppingBag, IndianRupee, Calendar, Tag, X, CheckCircle, Edit } from 'lucide-react';
import { getRestaurantById, toggleRestaurantActive, getRestaurantAdminStats, updateRestaurantProfileAdmin, updateRestaurantAddressAdmin, uploadRestaurantLogoAdmin, updateRestaurantDocumentsAdmin, uploadRestaurantDocumentFileAdmin, deleteRestaurantDocumentAdmin, deleteRestaurantDocumentFileAdmin } from '../../services/api';
import { getRestaurantImageUrl, getRestaurantLogoUrl } from '../../utils/imageUtils'; 
import { saveAs } from 'file-saver';

const RestaurantDetails = () => {
  const { uid } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    bookings: 0,
    active_offers: 0
  });

  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Modal states for editing
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [profileFormData, setProfileFormData] = useState({});
  const [addressFormData, setAddressFormData] = useState({});

  // Document edit state
  const [isEditDocsOpen, setIsEditDocsOpen] = useState(false);
  const [isUpdatingDocs, setIsUpdatingDocs] = useState(false);
  const [docsFormData, setDocsFormData] = useState({});

  const displayEmail =
    restaurant?.profile?.contact_email ||
    restaurant?.contact?.encryptedEmail ||
    restaurant?.contact?.email ||
    restaurant?.contact?.encryptedUsername ||
    'Not provided';

  const displayPhone =
    restaurant?.profile?.contact_number ||
    restaurant?.contact?.encryptedPhone ||
    restaurant?.contact?.phone ||
    '-';

  useEffect(() => {
    if (!uid || uid === 'undefined') {
      setError('Invalid restaurant ID');
      setLoading(false);
      return;
    }
    fetchRestaurantDetails();
  }, [uid]);

  
  useEffect(() => {
    if (uid && startDate && endDate) {
      fetchStats();
    }
  }, [uid, startDate, endDate]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getRestaurantById(uid);

      let restaurantData = null;

      if (response.data?.data?.restaurant) {
        restaurantData = response.data.data.restaurant;
      } else if (response.data?.restaurant) {
        restaurantData = response.data.restaurant;
      } else if (response.data?.data) {
        restaurantData = response.data.data;
      }

      if (!restaurantData) {
        throw new Error('Restaurant data not found');
      }

      console.log('✅ Restaurant loaded:', restaurantData);
      setRestaurant(restaurantData);

      
      fetchStats();

      
      

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsRes = await getRestaurantAdminStats(uid, { startDate, endDate });
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('❌ Stats error:', err);
    }
  };

  const handleToggleActive = async () => {
    if (!restaurant.uid) return;

    try {
      await toggleRestaurantActive(restaurant.uid);
      alert(`✅ Restaurant ${restaurant.isActive ? 'blocked' : 'unblocked'} successfully!`);
      fetchRestaurantDetails();
    } catch (err) {
      console.error('❌ Toggle error:', err);
      alert(`❌ Failed: ${err.message}`);
    }
  };

  // Edit Profile Handlers
  const handleOpenEditProfile = () => {
    setProfileFormData({
      restaurant_name: restaurant?.profile?.restaurant_name || '',
      contact_person: restaurant?.profile?.contact_person || '',
      contact_number: restaurant?.profile?.contact_number || '',
      contact_email: restaurant?.profile?.contact_email || ''
    });
    setIsEditProfileOpen(true);
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileFormData.restaurant_name || !profileFormData.contact_number) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      await updateRestaurantProfileAdmin(uid, profileFormData);
      setSuccessMessage('✅ Profile updated successfully!');
      setIsEditProfileOpen(false);
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Edit Address Handlers
  const handleOpenEditAddress = () => {
    setAddressFormData({
      address: restaurant?.address?.address || '',
      city: restaurant?.address?.city || '',
      state: restaurant?.address?.state || '',
      pincode: restaurant?.address?.pincode || '',
      lat: restaurant?.address?.lat || '',
      lng: restaurant?.address?.lng || ''
    });
    setIsEditAddressOpen(true);
  };

  const handleAddressFormChange = (e) => {
    const { name, value } = e.target;
    setAddressFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitAddressUpdate = async (e) => {
    e.preventDefault();
    if (!addressFormData.address || !addressFormData.city || !addressFormData.pincode) {
      alert('Please fill in required fields');
      return;
    }

    try {
      setIsUpdatingAddress(true);
      let requestData = {
        ...addressFormData,
        lat: Number(addressFormData.lat),
        lng: Number(addressFormData.lng),
      }
      await updateRestaurantAddressAdmin(uid, requestData);
      setSuccessMessage('✅ Address updated successfully!');
      setIsEditAddressOpen(false);
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Failed to update address: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  // Logo Upload Handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ Image size must be less than 5MB');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      
      await uploadRestaurantLogoAdmin(uid, file);
      setSuccessMessage('✅ Logo updated successfully!');
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Failed to upload logo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingProfile(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  // Edit Documents handlers
  const handleOpenEditDocs = () => {
    const doc = restaurant?.documents?.[0];
    setDocsFormData({
      fssai_number: doc?.fssai_number || '',
      gst_number: doc?.gst_number || '',
      trade_license_number: doc?.trade_license_number || '',
    });
    setIsEditDocsOpen(true);
  };

  const handleDocsFormChange = (e) => {
    const { name, value } = e.target;
    setDocsFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitDocsUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingDocs(true);
      await updateRestaurantDocumentsAdmin(uid, docsFormData);
      setSuccessMessage('✅ Document numbers updated successfully!');
      setIsEditDocsOpen(false);
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Failed to update documents: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingDocs(false);
    }
  };

  const handleFileUpload = async (event, docType) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      await uploadRestaurantDocumentFileAdmin(uid, docType, files);
      setSuccessMessage(`✅ ${docType.toUpperCase()} file uploaded successfully!`);
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(`❌ Failed to upload ${docType} file: ` + (err.response?.data?.message || err.message));
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  // Delete entire document type (number + all files)
  const handleDeleteDocType = async (docType, label) => {
    if (!window.confirm(`Remove all ${label} documents including the license number? This cannot be undone.`)) return;
    try {
      await deleteRestaurantDocumentAdmin(uid, docType);
      setSuccessMessage(`✅ ${label} removed successfully!`);
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(`❌ Failed to remove ${label}: ` + (err.response?.data?.message || err.message));
    }
  };

  // Delete a single document file
  const handleDeleteDocFile = async (docType, filename) => {
    if (!window.confirm('Remove this file? This cannot be undone.')) return;
    try {
      await deleteRestaurantDocumentFileAdmin(uid, docType, filename);
      setSuccessMessage('✅ File removed successfully!');
      fetchRestaurantDetails();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert('❌ Failed to remove file: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExportStats = () => {
    const csvContent = [
      ["Restaurant Name", restaurant?.profile?.restaurant_name || "Unknown"],
      ["Report Period", `${startDate} to ${endDate}`],
      ["Metric", "Value"],
      ["Total Sales", stats.sales],
      ["Total Orders", stats.orders],
      ["Total Bookings", stats.bookings],
      ["Active Offers", stats.active_offers],
      ["Generated At", new Date().toLocaleString()]
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `restaurant-stats-${uid}-${startDate}-${endDate}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/restaurants')}
          className="text-red-600 hover:text-red-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Details</h2>
            <p className="text-gray-600 mb-6">{error || 'Restaurant not found'}</p>
            <button
              onClick={() => navigate('/restaurants')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { profile, contact, address, documents } = restaurant;
  const doc = documents && documents.length > 0 ? documents[0] : null;

  const renderDocument = (file, index, label) => {
    const url = getRestaurantImageUrl(file);
    const ext = file.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" key={index}>
          <img
            src={url}
            alt={`${label} ${index + 1}`}
            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EError%3C/text%3E%3C/svg%3E';
            }}
          />
        </a>
      );
    }

    return (
      <a
        key={index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
      >
        <FileText className="w-8 h-8 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
        <span className="text-xs text-gray-600 font-medium">View {ext.toUpperCase()}</span>
      </a>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {}
      <div className="mb-6">
        <button
          onClick={() => navigate('/restaurants')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          Restaurant Details
          <span className="text-gray-400 font-normal text-lg ml-2">
            • {profile?.restaurant_name || 'Restaurant'}
          </span>
        </h1>

      </div>

      {}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <button
          onClick={handleExportStats}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.photo?.length > 0 ? (
              <img
                src={getRestaurantLogoUrl(profile.photo[profile.photo.length -1])} 
                alt="Restaurant Logo"
                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                onError={(e) => {
                  console.error('❌ Logo failed to load:', profile.photo[profile.photo.length -1]);
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23e5e7eb" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <Building2 className="w-10 h-10 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">No Logo</span>
              </div>
            )}
            {/* Upload button overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-50 rounded-xl cursor-pointer transition-all opacity-0 hover:opacity-100">
              <ImageIcon className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUpdatingProfile}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile?.restaurant_name || 'Restaurant'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {restaurant.uid} • {displayEmail}
            </p>
            <p className="text-xs text-gray-400 mt-2">Hover over logo to upload new image</p>
          </div>

          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
              {restaurant.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.sales}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.orders}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.bookings}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Offers</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.active_offers}</h3>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-2 space-y-6">
          {}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                Basic Information
              </h3>
              <button
                onClick={handleOpenEditProfile}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Restaurant Name</label>
                <p className="text-gray-900 mt-1">{profile?.restaurant_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 mt-1">{displayEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 mt-1">{displayPhone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Person</label>
                <p className="text-gray-900 mt-1">{profile?.contact_person || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <button
                    onClick={handleOpenEditAddress}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit Address
                  </button>
                </div>
                <p className="text-gray-900 mt-1">
                  {address?.address || '-'}, {address?.city || '-'}, {address?.state || '-'} - {address?.pincode || '-'}
                </p>
              </div>
            </div>
          </div>



          {}
          {doc && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Documents
                </h3>
                <button
                  onClick={handleOpenEditDocs}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" /> Edit Numbers
                </button>
              </div>

              {/* FSSAI */}
              {doc.fssai_number && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">FSSAI License - {doc.fssai_number}</h4>
                    <div className="flex items-center gap-2">
                      <label className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer border border-blue-200 rounded">
                        Upload New
                        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'fssai')} />
                      </label>
                      <button
                        onClick={() => handleDeleteDocType('fssai', 'FSSAI')}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        title="Remove FSSAI license number and all files"
                      >
                        Remove All
                      </button>
                    </div>
                  </div>
                  {doc.file_fssai && doc.file_fssai.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doc.file_fssai.map((file, index) => (
                        <div key={index} className="relative group">
                          {renderDocument(file, index, 'FSSAI')}
                          <button
                            onClick={() => handleDeleteDocFile('fssai', file)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* GST */}
              {doc.gst_number && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">GST Certificate - {doc.gst_number}</h4>
                    <div className="flex items-center gap-2">
                      <label className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer border border-blue-200 rounded">
                        Upload New
                        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'gst')} />
                      </label>
                      <button
                        onClick={() => handleDeleteDocType('gst', 'GST')}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        title="Remove GST number and all files"
                      >
                        Remove All
                      </button>
                    </div>
                  </div>
                  {doc.file_gst && doc.file_gst.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doc.file_gst.map((file, index) => (
                        <div key={index} className="relative group">
                          {renderDocument(file, index, 'GST')}
                          <button
                            onClick={() => handleDeleteDocFile('gst', file)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Trade License */}
              {doc.trade_license_number && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">Trade License - {doc.trade_license_number}</h4>
                    <div className="flex items-center gap-2">
                      <label className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer border border-blue-200 rounded">
                        Upload New
                        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'trade')} />
                      </label>
                      <button
                        onClick={() => handleDeleteDocType('trade', 'Trade License')}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        title="Remove Trade License number and all files"
                      >
                        Remove All
                      </button>
                    </div>
                  </div>
                  {doc.file_trade_license && doc.file_trade_license.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doc.file_trade_license.map((file, index) => (
                        <div key={index} className="relative group">
                          {renderDocument(file, index, 'Trade License')}
                          <button
                            onClick={() => handleDeleteDocFile('trade', file)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Other Documents */}
              {doc.otherDocumentType && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">Other Documents - {doc.otherDocumentType}</h4>
                    <div className="flex items-center gap-2">
                      <label className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer border border-blue-200 rounded">
                        Upload New
                        <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'other')} />
                      </label>
                      <button
                        onClick={() => handleDeleteDocType('other', 'Other Documents')}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        title="Remove other documents and all files"
                      >
                        Remove All
                      </button>
                    </div>
                  </div>
                  {doc.file_other_doc && doc.file_other_doc.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {doc.file_other_doc.map((file, index) => (
                        <div key={index} className="relative group">
                          {renderDocument(file, index, 'Other Doc')}
                          <button
                            onClick={() => handleDeleteDocFile('other', file)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this file"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <p className={`mt-1 font-semibold ${restaurant.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                  {restaurant.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/menu/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || 'Restaurant')}`)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium text-sm transition-colors"
              >
                + Add Menu Item
              </button>
              <button
                onClick={() => navigate(`/dining/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || 'Restaurant')}`)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium text-sm transition-colors"
              >
                + Add Dining Space
              </button>
              <button
                onClick={() => navigate(`/events/add?restaurant=${restaurant.uid}&name=${encodeURIComponent(profile?.restaurant_name || 'Restaurant')}`)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 font-medium text-sm transition-colors"
              >
                + Add Event
              </button>
              <button
                onClick={() => navigate(`/menu`)}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors"
              >
                Manage All Menus
              </button>
              <button
                onClick={handleToggleActive}
                className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${restaurant.isActive
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
              >
                {restaurant.isActive ? 'Block Restaurant' : 'Unblock Restaurant'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                disabled={isUpdatingProfile}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitProfileUpdate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Restaurant Name *</label>
                <input
                  type="text"
                  name="restaurant_name"
                  value={profileFormData.restaurant_name || ''}
                  onChange={handleProfileFormChange}
                  disabled={isUpdatingProfile}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={profileFormData.contact_person || ''}
                  onChange={handleProfileFormChange}
                  disabled={isUpdatingProfile}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Contact Number *</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={profileFormData.contact_number || ''}
                  onChange={handleProfileFormChange}
                  disabled={isUpdatingProfile}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="contact_email"
                  value={profileFormData.contact_email || ''}
                  onChange={handleProfileFormChange}
                  disabled={isUpdatingProfile}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isUpdatingProfile}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <>
                      <span className="animate-spin">⏳</span> Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {isEditAddressOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit Address</h2>
              <button
                onClick={() => setIsEditAddressOpen(false)}
                disabled={isUpdatingAddress}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAddressUpdate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={addressFormData.address || ''}
                  onChange={handleAddressFormChange}
                  disabled={isUpdatingAddress}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">City *</label>
                <input
                  type="text"
                  name="city"
                  value={addressFormData.city || ''}
                  onChange={handleAddressFormChange}
                  disabled={isUpdatingAddress}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={addressFormData.state || ''}
                  onChange={handleAddressFormChange}
                  disabled={isUpdatingAddress}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={addressFormData.pincode || ''}
                  onChange={handleAddressFormChange}
                  disabled={isUpdatingAddress}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    name="lat"
                    value={addressFormData.lat || ''}
                    onChange={handleAddressFormChange}
                    disabled={isUpdatingAddress}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                    placeholder="Optional"
                    step="0.0001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    name="lng"
                    value={addressFormData.lng || ''}
                    onChange={handleAddressFormChange}
                    disabled={isUpdatingAddress}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                    placeholder="Optional"
                    step="0.0001"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditAddressOpen(false)}
                  disabled={isUpdatingAddress}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingAddress ? (
                    <>
                      <span className="animate-spin">⏳</span> Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Documents Modal */}
      {isEditDocsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit Document Numbers</h2>
              <button
                onClick={() => setIsEditDocsOpen(false)}
                disabled={isUpdatingDocs}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitDocsUpdate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">FSSAI Number</label>
                <input
                  type="text"
                  name="fssai_number"
                  value={docsFormData.fssai_number || ''}
                  onChange={handleDocsFormChange}
                  disabled={isUpdatingDocs}
                  placeholder="e.g. 11224999000456"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">GST Number</label>
                <input
                  type="text"
                  name="gst_number"
                  value={docsFormData.gst_number || ''}
                  onChange={handleDocsFormChange}
                  disabled={isUpdatingDocs}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Trade License Number</label>
                <input
                  type="text"
                  name="trade_license_number"
                  value={docsFormData.trade_license_number || ''}
                  onChange={handleDocsFormChange}
                  disabled={isUpdatingDocs}
                  placeholder="e.g. TL-2024-XXXXX"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditDocsOpen(false)}
                  disabled={isUpdatingDocs}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDocs}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingDocs ? (
                    <><span className="animate-spin">⏳</span> Updating...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Update</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
};

export default RestaurantDetails;
