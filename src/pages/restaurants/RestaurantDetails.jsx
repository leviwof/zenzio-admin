




import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, Building2, FileText, Image as ImageIcon,
  Download, ShoppingBag, IndianRupee, Calendar, Tag, X, CheckCircle, Edit,
  MapPin, Phone, Mail, User, Upload, Trash2
} from 'lucide-react';
import {
  getRestaurantById, toggleRestaurantActive, toggleRestaurantOff,
  getRestaurantAdminStats, updateRestaurantProfileAdmin, updateRestaurantAddressAdmin,
  uploadRestaurantLogoAdmin, updateRestaurantDocumentsAdmin,
  uploadRestaurantDocumentFileAdmin, deleteRestaurantDocumentAdmin,
  deleteRestaurantDocumentFileAdmin
} from '../../services/api';
import { getRestaurantImageUrl, getRestaurantLogoUrl } from '../../utils/imageUtils';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

const getStatusDisplay = (restaurant) => {
  if (!restaurant) return { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
  const { isOpen } = restaurant;
  if (isOpen === false) {
    return { label: 'Off', className: 'bg-gray-100 text-gray-800' };
  }
  return { label: 'On', className: 'bg-green-100 text-green-800' };
};

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
      toast.success(restaurant.isActive ? 'Restaurant blocked successfully' : 'Restaurant unblocked successfully');
      fetchRestaurantDetails();
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.response?.data?.message || 'Failed to update restaurant');
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    if (!addressFormData.address || !addressFormData.city || !addressFormData.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsUpdatingAddress(true);
      await updateRestaurantAddressAdmin(restaurant.uid, addressFormData);
      toast.success('Address updated successfully');
      await toggleRestaurantActive(restaurant.uid);
      toast.success(restaurant.isActive ? 'Restaurant blocked successfully' : 'Restaurant unblocked successfully');
      fetchRestaurantDetails();
    } catch (err) {
      console.error('Error:', err);
      toast.error(err.response?.data?.message || 'Failed to update address');
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
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      await updateRestaurantProfileAdmin(uid, profileFormData);
      toast.success('Profile updated successfully');
      setIsEditProfileOpen(false);
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
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
      toast.error('Please fill in all required fields');
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
      toast.success('Address updated successfully');
      setIsEditAddressOpen(false);
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
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
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      
      await uploadRestaurantLogoAdmin(uid, file);
      toast.success('Logo updated successfully');
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
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
      toast.success('Document details updated successfully');
      setIsEditDocsOpen(false);
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update documents');
    } finally {
      setIsUpdatingDocs(false);
    }
  };

  const handleFileUpload = async (event, docType) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      await uploadRestaurantDocumentFileAdmin(uid, docType, files);
      toast.success(`${docType.toUpperCase()} file uploaded successfully`);
      fetchRestaurantDetails();
    } catch (err) {
      console.error('File upload error:', err);
      toast.error(err.response?.data?.message || `Failed to upload ${docType} file`);
    }
  };

  // Delete entire document type (number + all files)
  const handleDeleteDocType = async (docType, label) => {
    if (!window.confirm(`Remove all ${label} documents including the license number? This cannot be undone.`)) return;
    try {
      await deleteRestaurantDocumentAdmin(uid, docType);
      toast.success(`${label} removed successfully`);
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to remove ${label}`);
    }
  };

  // Delete a single document file
  const handleDeleteDocFile = async (docType, filename) => {
    if (!window.confirm('Remove this file? This cannot be undone.')) return;
    try {
      await deleteRestaurantDocumentFileAdmin(uid, docType, filename);
      toast.success('File removed successfully');
      fetchRestaurantDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove file');
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/restaurants')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Restaurants
          </button>
          <div className="max-w-xl mx-auto mt-16">
            <div className="bg-white rounded-3xl border border-red-100 p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Details</h2>
              <p className="text-gray-500 mb-8">{error || 'Restaurant not found'}</p>
              <button
                onClick={() => navigate('/restaurants')}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Back to List
              </button>
            </div>
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
        <a href={url} target="_blank" rel="noopener noreferrer" key={index} className="block group">
          <img
            src={url}
            alt={`${label} ${index + 1}`}
            className="w-full h-32 object-cover rounded-xl border border-gray-200 group-hover:opacity-85 transition-opacity"
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
        className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all group"
      >
        <FileText className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
        <span className="text-xs text-gray-500 font-medium">View {ext.toUpperCase()}</span>
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/restaurants')}
              className="mt-1 inline-flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Restaurant Details</h1>
              <p className="text-lg text-gray-500 mt-1.5">{profile?.restaurant_name || 'Restaurant'}</p>
            </div>
          </div>
          <button
            onClick={handleExportStats}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/30"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* ── Date Filter ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ── Hero / Restaurant Overview ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group shrink-0">
              {profile?.photo?.length > 0 ? (
                <img
                  src={getRestaurantLogoUrl(profile.photo[profile.photo.length - 1])}
                  alt="Restaurant Logo"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-100"
                  onError={(e) => {
                    console.error('Logo failed to load:', profile.photo[profile.photo.length - 1]);
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23e5e7eb" width="96" height="96"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-gray-300" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-2xl cursor-pointer transition-all opacity-0 group-hover:opacity-100">
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6 text-white drop-shadow" />
                  <span className="text-[10px] text-white font-medium drop-shadow">Change</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUpdatingProfile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{profile?.restaurant_name || 'Restaurant'}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="font-mono text-xs text-gray-400">ID: {restaurant.uid?.slice(0, 12)}...</span>
                    <span className="text-gray-300">|</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusDisplay(restaurant).className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDisplay(restaurant).label === 'On' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {getStatusDisplay(restaurant).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {displayEmail}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {displayPhone}
                </span>
                {profile?.contact_person && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" /> {profile.contact_person}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Sales', value: `₹${stats.sales ?? 0}`, icon: IndianRupee, color: 'green' },
            { label: 'Total Orders', value: stats.orders ?? 0, icon: ShoppingBag, color: 'blue' },
            { label: 'Total Bookings', value: stats.bookings ?? 0, icon: Calendar, color: 'purple' },
            { label: 'Active Offers', value: stats.active_offers ?? 0, icon: Tag, color: 'orange' },
          ].map(({ label, value, icon: Icon, color }) => {
            const colors = {
              green: 'bg-emerald-50 text-emerald-600',
              blue: 'bg-blue-50 text-blue-600',
              purple: 'bg-violet-50 text-violet-600',
              orange: 'bg-orange-50 text-orange-600',
            };
            return (
              <div
                key={label}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">{label}</span>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
              </div>
            );
          })}
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column (Basic Info + Docs) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Basic Information */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-red-600" />
                  </span>
                  Basic Information
                </h3>
                <button
                  onClick={handleOpenEditProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Restaurant Name</p>
                  <p className="text-sm font-semibold text-gray-900">{profile?.restaurant_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-gray-900">{displayEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm text-gray-900">{displayPhone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Contact Person</p>
                  <p className="text-sm text-gray-900">{profile?.contact_person || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Address</p>
                    <button
                      onClick={handleOpenEditAddress}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      Edit Address
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {address?.address || '-'}
                        {address?.city ? `, ${address.city}` : ''}
                        {address?.state ? `, ${address.state}` : ''}
                        {address?.pincode ? ` — ${address.pincode}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            {doc && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                    <span className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-600" />
                    </span>
                    Documents
                  </h3>
                  <button
                    onClick={handleOpenEditDocs}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Numbers
                  </button>
                </div>

                <div className="space-y-5">
                  {/* FSSAI */}
                  {doc.fssai_number && (
                    <div className="border border-gray-100 rounded-3xl p-5 bg-gray-50/50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">FSSAI License</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{doc.fssai_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'fssai')} />
                          </label>
                          <button
                            onClick={() => handleDeleteDocType('fssai', 'FSSAI')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                      {doc.file_fssai && doc.file_fssai.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {doc.file_fssai.map((file, index) => (
                            <div key={index} className="relative group">
                              {renderDocument(file, index, 'FSSAI')}
                              <button
                                onClick={() => handleDeleteDocFile('fssai', file)}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
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
                    <div className="border border-gray-100 rounded-3xl p-5 bg-gray-50/50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">GST Certificate</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{doc.gst_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'gst')} />
                          </label>
                          <button
                            onClick={() => handleDeleteDocType('gst', 'GST')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                      {doc.file_gst && doc.file_gst.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {doc.file_gst.map((file, index) => (
                            <div key={index} className="relative group">
                              {renderDocument(file, index, 'GST')}
                              <button
                                onClick={() => handleDeleteDocFile('gst', file)}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
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
                    <div className="border border-gray-100 rounded-3xl p-5 bg-gray-50/50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Trade License</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{doc.trade_license_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'trade')} />
                          </label>
                          <button
                            onClick={() => handleDeleteDocType('trade', 'Trade License')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                      {doc.file_trade_license && doc.file_trade_license.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {doc.file_trade_license.map((file, index) => (
                            <div key={index} className="relative group">
                              {renderDocument(file, index, 'Trade License')}
                              <button
                                onClick={() => handleDeleteDocFile('trade', file)}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
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
                    <div className="border border-gray-100 rounded-3xl p-5 bg-gray-50/50">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.otherDocumentType}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Other Document</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'other')} />
                          </label>
                          <button
                            onClick={() => handleDeleteDocType('other', 'Other Documents')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                      {doc.file_other_doc && doc.file_other_doc.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {doc.file_other_doc.map((file, index) => (
                            <div key={index} className="relative group">
                              {renderDocument(file, index, 'Other Doc')}
                              <button
                                onClick={() => handleDeleteDocFile('other', file)}
                                className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700"
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
              </div>
            )}
          </div>

          {/* ── Right Column (empty — Status & Quick Actions removed) ── */}
          <div className="space-y-6" />
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
