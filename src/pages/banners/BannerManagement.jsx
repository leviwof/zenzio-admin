import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  createDynamicBanner,
  deleteBanner,
  deleteDynamicBanner,
  getBannerRestaurantOptions,
  getBanners,
  getDynamicBannersAdmin,
  updateDynamicBanner,
  updateDynamicBannerStatus,
  uploadBanner,
} from '../../services/api';

const tabs = [
  { id: 'image', label: 'Image Banners' },
  { id: 'promotional', label: 'Promotional Banners', bannerType: 'PROMOTIONAL' },
  { id: 'restaurant', label: 'Restaurant Offer Banners', bannerType: 'RESTAURANT_OFFER' },
];

const DEFAULT_THEME_COLOR = '#ec4899';
const DEFAULT_THEME_COLORS = ['#ec4899', '#f97316', '#9333ea'];
const legacyThemeColors = {
  pink: '#ec4899',
  orange: '#f97316',
  purple: '#9333ea',
};

const isHexColor = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '').trim());

const resolveThemeColor = (value, fallback = DEFAULT_THEME_COLOR) => {
  const theme = String(value || fallback).trim().toLowerCase();
  const resolved = legacyThemeColors[theme] || theme;
  return isHexColor(resolved) ? resolved : fallback;
};

const getThemeColorStops = (value) => {
  const rawTheme = String(value || '').trim();
  const colorMatches = rawTheme.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})/gi) || [];
  const colors = colorMatches.length > 0
    ? colorMatches.map((color, index) => resolveThemeColor(color, DEFAULT_THEME_COLORS[index] || DEFAULT_THEME_COLOR))
    : [resolveThemeColor(rawTheme)];

  while (colors.length < 3) {
    colors.push(DEFAULT_THEME_COLORS[colors.length] || colors[colors.length - 1] || DEFAULT_THEME_COLOR);
  }

  return colors.slice(0, 3);
};

const buildThemeGradient = (colors) => {
  const [first, second, third] = getThemeColorStops(colors?.join?.(',') || colors);
  return `linear-gradient(135deg, ${first} 0%, ${second} 52%, ${third} 100%)`;
};

const resolveThemeBackground = (value) => {
  const rawTheme = String(value || '').trim();
  if (/^linear-gradient\(/i.test(rawTheme) && getThemeColorStops(rawTheme).length >= 3) {
    return buildThemeGradient(getThemeColorStops(rawTheme));
  }

  return isHexColor(rawTheme) || legacyThemeColors[rawTheme.toLowerCase()]
    ? resolveThemeColor(rawTheme)
    : buildThemeGradient(DEFAULT_THEME_COLORS);
};

const getThemeLabel = (value) => {
  const rawTheme = String(value || '').trim();
  if (/^linear-gradient\(/i.test(rawTheme)) {
    return getThemeColorStops(rawTheme).join(' + ');
  }

  return resolveThemeColor(rawTheme);
};

const getColorLuminance = (hexColor) => {
  const normalized = resolveThemeColor(hexColor).replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
};

const getReadableTextColor = (theme) => {
  const colors = getThemeColorStops(theme);
  const luminance = colors.reduce((total, color) => total + getColorLuminance(color), 0) / colors.length;
  return luminance > 150 ? '#111827' : '#ffffff';
};

const ctaOptions = ['View Offer', 'Order Now'];

const getApiErrorMessage = (error, fallback) => {
  const responseMessage = error?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(', ');
  if (responseMessage) return responseMessage;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return fallback;
};

const emptyForm = {
  restaurant_uid: '',
  offer_tag: '',
  offer_title: '',
  offer_description: '',
  coupon_code: '',
  offer_amount: '',
  theme: DEFAULT_THEME_COLOR,
  theme_colors: DEFAULT_THEME_COLORS,
  priority: '1',
  is_active: true,
  cta_label: 'View Offer',
};

const BannerManagement = () => {
  const [activeTab, setActiveTab] = useState('image');
  const [banners, setBanners] = useState([]);
  const [dynamicBanners, setDynamicBanners] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState(null);

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const isRestaurantOffer = currentTab.bannerType === 'RESTAURANT_OFFER';
  const selectedThemeColors = Array.isArray(formData.theme_colors)
    ? formData.theme_colors
    : getThemeColorStops(formData.theme_colors);
  const selectedThemePreviewColors = selectedThemeColors.map((color, index) =>
    resolveThemeColor(color, DEFAULT_THEME_COLORS[index]),
  );
  const selectedThemeBackground = buildThemeGradient(selectedThemePreviewColors);
  const selectedThemeTextColor = getReadableTextColor(selectedThemePreviewColors);
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.restaurant_uid === formData.restaurant_uid),
    [restaurants, formData.restaurant_uid],
  );

  useEffect(() => {
    if (activeTab === 'image') {
      fetchImageBanners();
    } else {
      fetchDynamicBanners();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'image') return undefined;
    const timer = setTimeout(fetchDynamicBanners, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!modalOpen || !isRestaurantOffer) return undefined;
    const timer = setTimeout(() => fetchRestaurants(restaurantSearch), 300);
    return () => clearTimeout(timer);
  }, [modalOpen, restaurantSearch, isRestaurantOffer]);

  const fetchImageBanners = async () => {
    try {
      setLoading(true);
      const response = await getBanners();
      setBanners(response.data || []);
    } catch (error) {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicBanners = async () => {
    try {
      setDynamicLoading(true);
      const response = await getDynamicBannersAdmin({
        page: 1,
        limit: 50,
        banner_type: currentTab.bannerType,
        search: search.trim() || undefined,
        status: 'all',
      });
      setDynamicBanners(response.data?.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load dynamic banners'));
    } finally {
      setDynamicLoading(false);
    }
  };

  const fetchRestaurants = async (query = '') => {
    try {
      const response = await getBannerRestaurantOptions({
        search: query.trim() || undefined,
        limit: 30,
      });
      setRestaurants(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load restaurants');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    if (banners.length >= 3) {
      toast.error('Maximum 3 image banners allowed');
      return;
    }

    try {
      setUploading(true);
      const payload = new FormData();
      payload.append('image', selectedFile);
      await uploadBanner(payload);
      toast.success('Banner uploaded successfully');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchImageBanners();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload banner'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Delete this image banner?')) return;
    try {
      await deleteBanner(id);
      toast.success('Banner deleted successfully');
      fetchImageBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData(emptyForm);
    setRestaurantSearch('');
    setRestaurants([]);
    setDeleteConfirmBanner(null);
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setDeleteConfirmBanner(null);
    setFormData({
      restaurant_uid: banner.restaurant_uid || '',
      offer_tag: banner.offer_tag || '',
      offer_title: banner.offer_title || '',
      offer_description: banner.offer_description || '',
      coupon_code: banner.coupon_code || '',
      offer_amount: banner.offer_amount || '',
      theme: banner.theme || DEFAULT_THEME_COLOR,
      theme_colors: getThemeColorStops(banner.theme),
      priority: String(banner.priority || 1),
      is_active: Boolean(banner.is_active),
      cta_label: banner.cta_label || 'View Offer',
    });
    setRestaurantSearch(banner.restaurant_name || banner.restaurant_uid || '');
    if (banner.restaurant_uid) {
      setRestaurants([{ restaurant_uid: banner.restaurant_uid, restaurant_name: banner.restaurant_name }]);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBanner(null);
    setFormData(emptyForm);
    setRestaurantSearch('');
    setRestaurants([]);
  };

  const validateDynamicForm = () => {
    if (isRestaurantOffer && !formData.restaurant_uid) {
      toast.error('Restaurant is required');
      return false;
    }

    if (!formData.offer_title.trim()) {
      toast.error('Offer title is required');
      return false;
    }

    if (!selectedThemeColors.every(isHexColor)) {
      toast.error('All 3 theme colors must be valid hex colors');
      return false;
    }

    const priority = Number(formData.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 6) {
      toast.error('Priority must be between 1 and 6');
      return false;
    }

    return true;
  };

  const buildDynamicPayload = () => ({
    banner_type: currentTab.bannerType,
    restaurant_uid: isRestaurantOffer ? formData.restaurant_uid : undefined,
    offer_tag: isRestaurantOffer ? undefined : formData.offer_tag.trim(),
    offer_title: formData.offer_title.trim(),
    offer_description: formData.offer_description.trim(),
    coupon_code: isRestaurantOffer ? undefined : formData.coupon_code.trim(),
    offer_amount: isRestaurantOffer ? undefined : formData.offer_amount.trim(),
    theme: buildThemeGradient(selectedThemePreviewColors),
    priority: Number(formData.priority),
    is_active: Boolean(formData.is_active),
    cta_label: isRestaurantOffer ? formData.cta_label : undefined,
  });

  const handleDynamicSubmit = async (event) => {
    event.preventDefault();
    if (!validateDynamicForm()) return;

    try {
      setSaving(true);
      if (editingBanner) {
        await updateDynamicBanner(editingBanner.id, buildDynamicPayload());
        toast.success('Banner updated');
      } else {
        await createDynamicBanner(buildDynamicPayload());
        toast.success('Banner created');
      }
      closeModal();
      fetchDynamicBanners();
    } catch (error) {
      console.error('Dynamic banner save failed:', error?.response?.data || error);
      toast.error(getApiErrorMessage(error, 'Failed to save banner'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDynamicStatus = async (banner) => {
    const nextStatus = !banner.is_active;
    try {
      await updateDynamicBannerStatus(banner.id, nextStatus);
      toast.success(nextStatus ? 'Banner activated' : 'Banner deactivated');
      fetchDynamicBanners();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update status'));
    }
  };

  const handleDeleteDynamic = async (banner) => {
    try {
      await deleteDynamicBanner(banner.id);
      toast.success('Banner deleted');
      setDeleteConfirmBanner(null);
      fetchDynamicBanners();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete banner'));
    }
  };

  const renderImageBanners = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-5 w-5 text-red-500" />
          Add Image Banner
        </h2>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="w-full md:w-1/2">
            <label className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${previewUrl ? 'border-red-200 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-40 rounded-md object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <ImageIcon className="mb-3 h-10 w-10 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-400">PNG, JPG or JPEG, max 5MB</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>

          <div className="w-full space-y-4 md:w-1/2">
            <div className="flex gap-3 rounded-lg bg-orange-50 p-4 text-sm text-orange-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>Existing image banners continue to work as before. Maximum 3 active image banners.</p>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || banners.length >= 3}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${uploading || !selectedFile || banners.length >= 3 ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'bg-red-500 text-white shadow-md hover:bg-red-600'}`}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {uploading ? 'Uploading...' : 'Upload Banner'}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <h2 className="font-semibold text-gray-800">Active Image Banners ({banners.length}/3)</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-red-500" />
            <p>Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ImageIcon className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No image banners uploaded yet.</p>
          </div>
        ) : (
          banners.map((banner, index) => (
            <div key={banner.id} className="flex items-center gap-6 border-b border-gray-100 p-6 last:border-b-0 hover:bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-500">{index + 1}</div>
              <img src={banner.imageUrl} alt={`Banner ${banner.id}`} className="h-32 flex-1 rounded-lg border border-gray-200 object-cover shadow-sm" />
              <button
                onClick={() => handleDeleteImage(banner.id)}
                className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                title="Delete banner"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderDynamicBanners = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search offer title, tag, or restaurant..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600"
          >
            <Plus size={18} />
            Add Banner
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Offer Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Restaurant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Theme</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dynamicLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                    Loading banners...
                  </td>
                </tr>
              ) : dynamicBanners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    No dynamic banners found.
                  </td>
                </tr>
              ) : (
                dynamicBanners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{banner.banner_type}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{banner.offer_title}</p>
                      <p className="text-xs text-gray-500">{banner.offer_tag || banner.cta_label || banner.coupon_code || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{banner.restaurant_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-gray-200"
                          style={{ background: resolveThemeBackground(banner.theme) }}
                        />
                        {getThemeLabel(banner.theme)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600">{banner.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(banner)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleDynamicStatus(banner)}
                          className={`rounded-lg p-2 ${banner.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={banner.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {banner.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                        </button>
                        <div className="relative">
                          {deleteConfirmBanner?.id === banner.id && (
                            <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg">
                              <p className="mb-3 text-sm font-medium text-gray-800">
                                Delete &quot;{banner.offer_title}&quot;?
                              </p>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmBanner(null)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDynamic(banner)}
                                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => setDeleteConfirmBanner(banner)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Banner Management</h1>
          <p className="text-gray-600">Manage image banners and dynamic offer slider cards.</p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'image' ? renderImageBanners() : renderDynamicBanners()}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDynamicSubmit} className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                {isRestaurantOffer && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Search Restaurant</label>
                      <input
                        type="text"
                        value={restaurantSearch}
                        onChange={(event) => setRestaurantSearch(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                        placeholder="Restaurant name or UID"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Restaurant</label>
                      <select
                        value={formData.restaurant_uid}
                        onChange={(event) => setFormData((current) => ({ ...current, restaurant_uid: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                      >
                        <option value="">Choose restaurant</option>
                        {restaurants.map((restaurant) => (
                          <option key={restaurant.restaurant_uid} value={restaurant.restaurant_uid}>
                            {restaurant.restaurant_name || restaurant.restaurant_uid}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {!isRestaurantOffer && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Offer Tag</label>
                    <input
                      type="text"
                      value={formData.offer_tag}
                      onChange={(event) => setFormData((current) => ({ ...current, offer_tag: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                      placeholder="HOT DEAL"
                      maxLength={60}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Offer Title</label>
                  <input
                    type="text"
                    value={formData.offer_title}
                    onChange={(event) => setFormData((current) => ({ ...current, offer_title: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder={isRestaurantOffer ? 'Flat Rs 100 Off' : 'Meals Under Rs 149'}
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Offer Description</label>
                  <textarea
                    value={formData.offer_description}
                    onChange={(event) => setFormData((current) => ({ ...current, offer_description: event.target.value }))}
                    className="min-h-20 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder="Valid on orders above Rs 499"
                    maxLength={240}
                  />
                </div>

                {!isRestaurantOffer && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Coupon Code</label>
                      <input
                        type="text"
                        value={formData.coupon_code}
                        onChange={(event) => setFormData((current) => ({ ...current, coupon_code: event.target.value.toUpperCase() }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                        placeholder="SAVE100"
                        maxLength={40}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Offer Amount</label>
                      <input
                        type="text"
                        value={formData.offer_amount}
                        onChange={(event) => setFormData((current) => ({ ...current, offer_amount: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                        placeholder="Rs 100, Rs 149, 50%"
                        maxLength={40}
                      />
                    </div>
                  </div>
                )}

                {isRestaurantOffer && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">CTA</label>
                    <select
                      value={formData.cta_label}
                      onChange={(event) => setFormData((current) => ({ ...current, cta_label: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    >
                      {ctaOptions.map((cta) => <option key={cta} value={cta}>{cta}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Theme Colors</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {selectedThemeColors.map((color, index) => (
                        <div key={`theme-color-${index}`} className="flex gap-2">
                          <input
                            type="color"
                            value={resolveThemeColor(color, DEFAULT_THEME_COLORS[index])}
                            onChange={(event) => {
                              const nextColors = [...selectedThemeColors];
                              nextColors[index] = event.target.value;
                              setFormData((current) => ({
                                ...current,
                                theme_colors: nextColors,
                                theme: buildThemeGradient(nextColors),
                              }));
                            }}
                            className="h-10 w-12 rounded-lg border border-gray-300 bg-white p-1"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(event) => {
                              const nextColors = [...selectedThemeColors];
                              nextColors[index] = event.target.value;
                              setFormData((current) => ({ ...current, theme_colors: nextColors }));
                            }}
                            onBlur={() => {
                              const nextColors = selectedThemeColors.map((currentColor, colorIndex) =>
                                resolveThemeColor(currentColor, DEFAULT_THEME_COLORS[colorIndex])
                              );
                              setFormData((current) => ({
                                ...current,
                                theme_colors: nextColors,
                                theme: buildThemeGradient(nextColors),
                              }));
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                            placeholder={DEFAULT_THEME_COLORS[index]}
                            maxLength={7}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    >
                      {Array.from({ length: 6 }, (_, index) => String(index + 1)).map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(event) => setFormData((current) => ({ ...current, is_active: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl p-5 shadow-sm" style={{ background: selectedThemeBackground, color: selectedThemeTextColor }}>
                  <p className="text-xs font-bold uppercase tracking-wide">{isRestaurantOffer ? selectedRestaurant?.restaurant_name || 'Restaurant Offer' : formData.offer_tag || 'Offer Tag'}</p>
                  <h3 className="mt-3 text-2xl font-bold">{formData.offer_title || 'Offer Title'}</h3>
                  <p className="mt-2 text-sm opacity-90">{formData.offer_description || 'Offer description appears here'}</p>
                  {!isRestaurantOffer && formData.coupon_code && (
                    <p className="mt-4 rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold">Coupon: {formData.coupon_code}</p>
                  )}
                  {isRestaurantOffer && formData.cta_label && (
                    <p className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900">{formData.cta_label}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingBanner ? 'Save Changes' : 'Create Banner'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
