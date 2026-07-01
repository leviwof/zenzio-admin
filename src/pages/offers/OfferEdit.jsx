import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Tag, Calendar, Clock, Image as ImageIcon,
  Loader2, Save, RotateCcw, X, Store, Percent, IndianRupee,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  updateAdminOffer, getAdminOfferById, getAllRestaurants, getMenuCategories,
  updateRestaurantOffer, getOfferDetails, updateAnyOfferByAdmin,
} from '../../services/api';

const SECTION = ({ number, title, children }) => (
  <div>
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-500">
        {number}
      </span>
      {title}
    </p>
    <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
      {children}
    </div>
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      {hint && <span className="ml-1 font-normal text-gray-400">({hint})</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100';

const getRestaurantName = (restaurant) =>
  restaurant?.profile?.restaurant_name ||
  restaurant?.restaurant_name ||
  restaurant?.rest_name ||
  restaurant?.name ||
  restaurant?.uid ||
  restaurant?.id;

const SearchableRestaurantSelect = ({ restaurants, values = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const selectedValues = Array.isArray(values) ? values.filter(Boolean) : [];
  const selectedRestaurants = restaurants.filter((restaurant) =>
    selectedValues.includes(restaurant.uid || restaurant.id),
  );
  const filteredRestaurants = restaurants.filter((restaurant) =>
    String(getRestaurantName(restaurant) || '').toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${inputCls} flex items-center justify-between gap-2 pl-9 text-left`}
      >
        <span className={selectedValues.length ? 'text-gray-900' : 'text-gray-400'}>
          {selectedValues.length === 0
            ? 'All Restaurants'
            : selectedValues.length === 1
            ? getRestaurantName(selectedRestaurants[0]) || 'Selected Restaurant'
            : `${selectedValues.length} Restaurants selected`}
        </span>
        <span className="text-xs text-gray-400">Search</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search restaurant..."
            className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              onChange([]);
              setOpen(false);
              setSearch('');
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50"
          >
            All Restaurants
          </button>
          <div className="max-h-56 overflow-y-auto">
            {filteredRestaurants.map((restaurant) => (
              <button
                key={restaurant.uid || restaurant.id}
                type="button"
                onClick={() => {
                  const restaurantId = restaurant.uid || restaurant.id;
                  onChange(
                    selectedValues.includes(restaurantId)
                      ? selectedValues.filter((id) => id !== restaurantId)
                      : [...selectedValues, restaurantId],
                  );
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50"
              >
                <span>{getRestaurantName(restaurant)}</span>
                {selectedValues.includes(restaurant.uid || restaurant.id) && (
                  <span className="text-xs font-semibold text-red-500">Selected</span>
                )}
              </button>
            ))}
            {filteredRestaurants.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400">No restaurants found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const emptyForm = {
  title: '',
  restaurantId: '',
  restaurantIds: [],
  categoryId: '',
  offerCode: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderValue: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  termsConditions: '',
  isActive: true,
  allowFreeDelivery: false,
  usageLimitPerUser: '',
};

const OfferEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope');
  const isRestaurantScope = scope === 'restaurant';
  const isAdminRestaurantScope = scope === 'admin-restaurant';

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      setFetching(true);
      setFetchError(null);
      const offerFetch = (isRestaurantScope || isAdminRestaurantScope)
        ? getOfferDetails(id)
        : getAdminOfferById(id);
      const [restRes, catRes, offerRes] = await Promise.all([
        getAllRestaurants(),
        getMenuCategories(),
        offerFetch,
      ]);

      let restaurantData = restRes.data?.restaurants || restRes.data || [];
      setRestaurants(Array.isArray(restaurantData) ? restaurantData : []);

      let categoryData = catRes.data?.data || catRes.data?.categories || catRes.data || [];
      setCategories(Array.isArray(categoryData) ? categoryData : []);

      const offer = offerRes.data;
      if (!offer) throw new Error('Offer data not found');

      setFormData({
        title: offer.title || '',
        restaurantId: offer.restaurantId || '',
        restaurantIds: offer.restaurantIds?.length
          ? offer.restaurantIds
          : offer.restaurantId
          ? [offer.restaurantId]
          : [],
        categoryId: offer.categoryId || '',
        offerCode: offer.offerCode || '',
        description: offer.description || '',
        discountType: offer.discountType || 'PERCENTAGE',
        discountValue: offer.discountValue ?? '',
        minOrderValue: offer.minOrderValue ?? '',
        startDate: (offer.startDate || '').split('T')[0],
        endDate: (offer.endDate || '').split('T')[0],
        startTime: offer.startTime || '',
        endTime: offer.endTime || '',
        termsConditions: offer.termsConditions || '',
        isActive: offer.isActive !== false,
        allowFreeDelivery: offer.allowFreeDelivery === true,
        usageLimitPerUser: offer.usageLimitPerUser ?? '',
      });

      if (offer.offerImage) {
        setImagePreview(offer.offerImage.startsWith('http') ? offer.offerImage : `/${offer.offerImage}`);
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to load offer');
    } finally {
      setFetching(false);
    }
  };

  const set = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Offer title is required'); return; }
    if (formData.discountValue === '' || formData.discountValue === undefined || formData.discountValue === null) {
      toast.error('Discount value is required');
      return;
    }
    if (!formData.startDate || !formData.endDate) { toast.error('Start and end dates are required'); return; }
    if (formData.usageLimitPerUser && Number(formData.usageLimitPerUser) < 1) {
      toast.error('Usage limit per user must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      const allowed = ['title', 'restaurantId', 'categoryId', 'offerCode', 'description',
        'discountType', 'discountValue', 'minOrderValue', 'startDate', 'endDate',
        'startTime', 'endTime', 'termsConditions', 'isActive', 'allowFreeDelivery',
        'usageLimitPerUser'];
      allowed.forEach((key) => {
        const val = formData[key];
        if (val !== '' && val !== undefined && val !== null) data.append(key, val);
      });
      data.append('restaurantIds', JSON.stringify(formData.restaurantIds || []));
      if (imageFile) data.append('image', imageFile);

      if (isRestaurantScope) {
        await updateRestaurantOffer(id, data);
      } else if (isAdminRestaurantScope) {
        await updateAnyOfferByAdmin(id, data);
      } else {
        await updateAdminOffer(id, data);
      }
      toast.success('Offer updated successfully');
      setTimeout(() => navigate(isRestaurantScope ? '/offers' : '/offers/existing'), 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update offer');
    } finally {
      setLoading(false);
    }
  };

  const selectedRestaurant = restaurants.find(
    (r) => r.uid === formData.restaurantId || r.id === formData.restaurantId,
  );

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-red-500" />
          <p className="mt-3 text-sm text-gray-500">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <X className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">Failed to Load</h2>
          <p className="mb-6 text-sm text-gray-500">{fetchError}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Go Back
            </button>
            <button onClick={fetchAll} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Offer</h1>
            <p className="text-sm text-gray-400">
              {isAdminRestaurantScope ? 'Restaurant Offer (Admin Edit)' : isRestaurantScope ? 'Restaurant Offer' : 'Admin Offer'} · {id}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <RotateCcw size={15} /> Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left: form */}
          <div className="space-y-5">

            {/* Section 1: Basic Info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="1" title="Basic Info">
                <Field label="Offer Title" required>
                  <div className="relative">
                    <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.title}
                      onChange={set('title')}
                      placeholder="e.g. Weekend Bonanza"
                      className={`${inputCls} pl-9`}
                      maxLength={120}
                    />
                  </div>
                </Field>
                <Field label="Offer Code" hint="optional">
                  <input
                    type="text"
                    value={formData.offerCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, offerCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE100"
                    className={`${inputCls} font-mono tracking-wider`}
                    maxLength={40}
                  />
                </Field>
                <Field label="Description" hint="optional">
                  <textarea
                    value={formData.description}
                    onChange={set('description')}
                    placeholder="Briefly describe the offer..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                    maxLength={500}
                  />
                </Field>
              </SECTION>
            </div>

            {/* Section 2: Targeting */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="2" title="Targeting">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Restaurant" hint="optional">
                    <div className="relative">
                      <Store size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <SearchableRestaurantSelect
                        restaurants={restaurants}
                        values={formData.restaurantIds || []}
                        onChange={(restaurantIds) =>
                          setFormData((prev) => ({
                            ...prev,
                            restaurantIds,
                            restaurantId: restaurantIds[0] || '',
                          }))
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Category" hint="optional">
                    <select value={formData.categoryId} onChange={set('categoryId')} className={inputCls}>
                      <option value="">All Categories</option>
                      {categories.map((c, i) => (
                        <option key={i} value={c.name || c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </SECTION>
            </div>

            {/* Section 3: Discount */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="3" title="Discount">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Discount Type" required>
                    <select value={formData.discountType} onChange={set('discountType')} className={inputCls}>
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat Amount (₹)</option>
                      <option value="BOGO">Buy One Get One</option>
                      <option value="BUY_X_GET_Y">Buy X Get Y</option>
                      <option value="FREE_ITEM_CART">Free Item (Cart)</option>
                      <option value="FREE_ITEM_CATEGORY">Free Item (Category)</option>
                      <option value="PLATFORM_CAMPAIGN">Platform Campaign</option>
                    </select>
                  </Field>
                  <Field label="Discount Value" required>
                    <div className="relative">
                      {formData.discountType === 'PERCENTAGE'
                        ? <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        : <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={set('discountValue')}
                        placeholder="e.g. 20"
                        min="0"
                        step="0.01"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </Field>
                </div>
                <Field label="Minimum Order Value (₹)" hint="optional">
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.minOrderValue}
                      onChange={set('minOrderValue')}
                      placeholder="e.g. 199"
                      min="0"
                      step="0.01"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </Field>
                <Field label="Usage Limit Per User" hint="leave empty for unlimited">
                  <input
                    type="number"
                    value={formData.usageLimitPerUser}
                    onChange={set('usageLimitPerUser')}
                    placeholder="e.g. 1"
                    min="1"
                    step="1"
                    className={inputCls}
                  />
                </Field>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                      <Truck size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Free Delivery</p>
                      <p className="text-xs text-gray-500">Waive delivery fee when this offer is applied.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, allowFreeDelivery: !prev.allowFreeDelivery }))}
                    className={`relative h-6 w-11 rounded-full transition-colors ${formData.allowFreeDelivery ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    aria-pressed={formData.allowFreeDelivery}
                    aria-label="Toggle free delivery"
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.allowFreeDelivery ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </SECTION>
            </div>

            {/* Section 4: Validity */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="4" title="Validity">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date" required>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={set('startDate')}
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </Field>
                  <Field label="End Date" required>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={set('endDate')}
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Time" hint="optional">
                    <div className="relative">
                      <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="time" value={formData.startTime} onChange={set('startTime')} className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                  <Field label="End Time" hint="optional">
                    <div className="relative">
                      <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="time" value={formData.endTime} onChange={set('endTime')} className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                </div>
              </SECTION>
            </div>

            {/* Section 5: Terms & Image */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="5" title="Terms & Image">
                <Field label="Terms & Conditions" hint="optional">
                  <textarea
                    value={formData.termsConditions}
                    onChange={set('termsConditions')}
                    placeholder="Enter terms and conditions..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
                <Field label="Offer Image" hint="optional">
                  <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${imagePreview ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/10'}`}>
                    {imagePreview ? (
                      <div className="w-full">
                        <img src={imagePreview} alt="Preview" className="mx-auto mb-2 max-h-32 w-full rounded-lg object-cover" />
                        <p className="text-xs font-medium text-red-500">Click to change image</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">Click to upload image</p>
                        <p className="text-xs text-gray-400">PNG, JPG — max 2MB, recommended 800×400</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    >
                      <X size={12} /> Remove image
                    </button>
                  )}
                </Field>
              </SECTION>
            </div>

            {/* Section 6: Status */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <SECTION number="6" title="Status">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active</p>
                    <p className="text-xs text-gray-400">Offer is visible and applicable to users</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${formData.isActive ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </SECTION>
            </div>
          </div>

          {/* Right: sticky preview */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Preview</p>

              {imagePreview && (
                <img src={imagePreview} alt="Offer" className="mb-4 h-32 w-full rounded-xl object-cover" />
              )}

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{formData.title || 'Offer Title'}</h3>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${formData.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {formData.offerCode && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1">
                    <Tag size={11} className="text-orange-500" />
                    <span className="font-mono text-xs font-bold text-orange-600">{formData.offerCode}</span>
                  </div>
                )}

                <div className="rounded-xl bg-red-50 px-3 py-2.5">
                  <p className="text-xl font-bold text-red-500">
                    {formData.discountValue || '0'}
                    {formData.discountType === 'PERCENTAGE' ? '% OFF' : formData.discountType === 'FLAT' ? '₹ OFF' : ` ${formData.discountType}`}
                  </p>
                  {formData.minOrderValue && (
                    <p className="mt-0.5 text-xs text-red-400">Min order ₹{formData.minOrderValue}</p>
                  )}
                  {formData.usageLimitPerUser && (
                    <p className="mt-0.5 text-xs text-red-400">
                      Limit {formData.usageLimitPerUser} use{Number(formData.usageLimitPerUser) === 1 ? '' : 's'} per user
                    </p>
                  )}
                </div>

                {formData.allowFreeDelivery && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Truck size={12} />
                    Free delivery enabled
                  </div>
                )}

                {selectedRestaurant && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <Store size={13} className="text-blue-500" />
                    <span className="text-xs font-medium text-blue-700">
                      {getRestaurantName(selectedRestaurant) || 'Restaurant'}
                    </span>
                  </div>
                )}

                {(formData.startDate || formData.endDate) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>
                      {formData.startDate || '—'} → {formData.endDate || '—'}
                    </span>
                  </div>
                )}

                {formData.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{formData.description}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferEdit;
