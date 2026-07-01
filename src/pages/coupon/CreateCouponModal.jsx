import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllMenusForPicker, getAllRestaurants } from '../../services/api';

const getMenuName = (menu) => menu?.menu_name || menu?.title || menu?.name || menu?.menu_uid || '';
const getMenuId = (menu) => menu?.menu_uid || menu?.menuUid || getMenuName(menu);
const getMenuCategory = (menu) => menu?.category || menu?.category_name || menu?.categoryName || '';
const getMenuRestaurantUid = (menu) => menu?.restaurant_uid || menu?.restaurantUid || menu?.restaurant?.uid || '';
const getRestaurantName = (restaurant) =>
  restaurant?.profile?.restaurant_name ||
  restaurant?.restaurant_name ||
  restaurant?.rest_name ||
  restaurant?.name ||
  restaurant?.uid ||
  restaurant?.id ||
  '';

const normalizeMenus = (response) => {
  const data = response?.data;
  if (Array.isArray(data?.data?.restaurant_menus)) return data.data.restaurant_menus;
  if (Array.isArray(data?.data?.restaurant_menu)) return data.data.restaurant_menu;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeRestaurants = (response) => {
  const data = response?.data;
  if (Array.isArray(data?.data?.restaurants)) return data.data.restaurants;
  if (Array.isArray(data?.restaurants)) return data.restaurants;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const RestaurantMultiSelect = ({ selected, onChange }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllRestaurants({})
      .then((res) => setRestaurants(normalizeRestaurants(res).filter(Boolean)))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  const options = restaurants.map((restaurant) => ({
    value: restaurant.uid || restaurant.id,
    label: getRestaurantName(restaurant),
  })).filter((option) => option.value);
  const lowerSearch = search.trim().toLowerCase();
  const visible = lowerSearch ? options.filter((option) => option.label.toLowerCase().includes(lowerSearch)) : options;
  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((id) => id !== value) : [...selected, value]);

  if (loading) {
    return <div className="px-4 py-3 text-sm text-gray-400 border border-gray-200 rounded-lg">Loading restaurants...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="p-2 border-b border-gray-200 bg-gray-50">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search restaurants..."
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white"
        />
      </div>
      <ul className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {visible.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-400 text-center">No restaurants found</li>
        ) : visible.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <li
              key={option.value}
              onClick={() => toggle(option.value)}
              className={`px-4 py-2 cursor-pointer flex items-center gap-3 hover:bg-red-50 transition-colors text-sm ${checked ? 'bg-red-50/60' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.value)}
                onClick={(event) => event.stopPropagation()}
                className="accent-red-500 w-4 h-4 flex-shrink-0 cursor-pointer"
              />
              <span className={`flex-1 truncate ${checked ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                {option.label}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="px-4 py-1.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>{selected.length ? `${selected.length} selected` : 'All restaurants'}</span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-red-400 hover:text-red-600 font-medium">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

const MenuItemPicker = ({ selected, onChange, restaurantUids = [] }) => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllMenusForPicker()
      .then((res) => setMenus(normalizeMenus(res).filter(Boolean)))
      .catch(() => setMenus([]))
      .finally(() => setLoading(false));
  }, []);

  const scopedMenus = restaurantUids.length
    ? menus.filter((menu) => restaurantUids.includes(getMenuRestaurantUid(menu)))
    : menus;

  const options = scopedMenus.map((m) => ({
    value: getMenuId(m),
    label: `${getMenuName(m)}${getMenuCategory(m) ? ` (${getMenuCategory(m)})` : ''}${m.price ? ` · ₹${m.price}` : ''}`,
  }));

  const lowerSearch = search.trim().toLowerCase();
  const visible = lowerSearch ? options.filter((o) => o.label.toLowerCase().includes(lowerSearch)) : options;

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const selectAllVisible = () => {
    const ids = visible.map((o) => o.value);
    onChange(Array.from(new Set([...selected, ...ids])));
  };

  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.includes(o.value));

  if (loading) {
    return <div className="px-4 py-3 text-sm text-gray-400 border border-gray-200 rounded-lg">Loading menu items...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Search + Select All */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items (e.g. Biryani, Paneer...)"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-white"
        />
        <button
          type="button"
          onClick={selectAllVisible}
          disabled={visible.length === 0 || allVisibleSelected}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Select All{lowerSearch ? ` "${search.trim()}"` : ''} ({visible.length})
        </button>
      </div>

      {/* List */}
      <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
        {visible.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
        ) : (
          visible.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <li
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`px-4 py-2 cursor-pointer flex items-center gap-3 hover:bg-red-50 transition-colors text-sm ${checked ? 'bg-red-50/60' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-red-500 w-4 h-4 flex-shrink-0 cursor-pointer"
                />
                <span className={`flex-1 truncate ${checked ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
              </li>
            );
          })
        )}
      </ul>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>
          {visible.length} shown{lowerSearch ? ` for "${search.trim()}"` : ''} &nbsp;·&nbsp; {options.length} total
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-red-400 hover:text-red-600 font-medium">
            Clear all ({selected.length})
          </button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="p-2 border-t border-gray-200 bg-white flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {selected.map((value) => {
            const opt = options.find((o) => o.value === value);
            return (
              <span key={value} className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {opt?.label ?? value}
                <button type="button" onClick={() => toggle(value)} className="text-red-400 hover:text-red-700 ml-0.5">
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateCouponPage = ({ onClose, onSave, initialData }) => {
  const [makeActive, setMakeActive] = useState(false);
  const [applicableMenuIds, setApplicableMenuIds] = useState([]);
  const [restaurantUids, setRestaurantUids] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    maxDiscountCap: '',
    usageLimit: '',
    usageLimitPerUser: '',
    startDate: '',
    endDate: '',
    targetAudience: 'all',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        discountType: initialData.discountType || 'percentage',
        discountValue: initialData.discountValue || '',
        minOrderValue: initialData.minOrderValue || '',
        maxDiscountCap: initialData.maxDiscountCap || '',
        usageLimit: initialData.usageLimit || '',
        usageLimitPerUser: initialData.usageLimitPerUser || '',
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
        targetAudience: initialData.targetAudience || 'all',
      });
      setMakeActive(initialData.status === 'Active');
      setApplicableMenuIds(Array.isArray(initialData.applicable_menu_ids) ? initialData.applicable_menu_ids : []);
      setRestaurantUids(Array.isArray(initialData.restaurant_uids) ? initialData.restaurant_uids : []);
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateRandom = () => {
    const randomCode = 'COUP' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData((prev) => ({ ...prev, code: randomCode }));
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.discountValue || !formData.minOrderValue) {
      toast.error('Please fill in all required fields (Name, Code, Discount, Min Order)');
      return;
    }

    const newCoupon = {
      code: formData.code,
      name: formData.name,
      description: formData.description,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue),
      maxDiscountCap: formData.maxDiscountCap ? Number(formData.maxDiscountCap) : null,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      usageLimitPerUser: formData.usageLimitPerUser ? Number(formData.usageLimitPerUser) : null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      targetAudience: formData.targetAudience,
      status: makeActive ? 'Active' : 'Inactive',
      applicable_menu_ids: applicableMenuIds,
      restaurant_uids: restaurantUids,
    };

    onSave(newCoupon);
    onClose();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{initialData ? 'Edit Coupon' : 'Coupon'}</h1>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm max-w-5xl mx-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{initialData ? 'Edit Coupon' : 'Create New Coupon'}</h2>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-12">
            {/* Left Column */}
            <div>
              <h3 className="font-semibold mb-6 text-gray-900">Basic Details &amp; Code Generation</h3>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">Coupon Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Summer Sale 25"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">Generated Code</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. SUMMER25"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleGenerateRandom}
                    className="px-6 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 whitespace-nowrap"
                  >
                    Generate Random
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">Description (Internal Notes)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-4 text-gray-900">Offer Data</h4>

                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-2">Discount Type</label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Discount Value</label>
                    <input
                      type="text"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleInputChange}
                      placeholder="e.g. 25"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Min. Order Value (Req)</label>
                    <input
                      type="text"
                      name="minOrderValue"
                      value={formData.minOrderValue}
                      onChange={handleInputChange}
                      placeholder="e.g. 100"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Max Discount Cap (Opt)</label>
                    <input
                      type="text"
                      name="maxDiscountCap"
                      value={formData.maxDiscountCap}
                      onChange={handleInputChange}
                      placeholder="e.g. 50"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Usage Limit (Total)</label>
                    <input
                      type="text"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleInputChange}
                      placeholder="e.g. 1000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Usage Limit Per User</label>
                  <input
                    type="text"
                    name="usageLimitPerUser"
                    value={formData.usageLimitPerUser}
                    onChange={handleInputChange}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="font-semibold mb-6 text-gray-900">Validity &amp; Targeting</h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-3">Target Audience</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="targetAudience"
                      value="all"
                      checked={formData.targetAudience === 'all'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-500"
                    />
                    <span className="text-sm text-gray-700">All Users</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="targetAudience"
                      value="new"
                      checked={formData.targetAudience === 'new'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-500"
                    />
                    <span className="text-sm text-gray-700">New Users Only</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-2">Restaurants (Optional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Leave empty to allow this coupon for all restaurants. Select restaurants to restrict the coupon.
                </p>
                <RestaurantMultiSelect
                  selected={restaurantUids}
                  onChange={(ids) => {
                    setRestaurantUids(ids);
                    setApplicableMenuIds([]);
                  }}
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeActive}
                    onChange={(e) => setMakeActive(e.target.checked)}
                    className="w-4 h-4 text-red-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Make Coupon Active Immediately</span>
                </label>
              </div>

              <div className="bg-red-50 border border-red-100 p-6 rounded-lg">
                <h4 className="font-semibold text-red-600 mb-4">Coupon Summary &amp; Economics</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Customer Discount (Potential Max):</span>
                    <span className="font-semibold text-red-500">-₹{formData.discountValue || '0'}.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Admin Profit/Cost:</span>
                    <span className="font-semibold text-red-600">-₹{(formData.discountValue * (formData.usageLimit || 1)) || '0'}.00</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <div className="font-semibold text-gray-900 mb-2">Final Offer Summary:</div>
                    <div className="text-gray-700 leading-relaxed">
                      {formData.discountType === 'percentage' ? `${formData.discountValue}%` : `₹${formData.discountValue}`} off on orders over ₹{formData.minOrderValue || '0'}.
                      Valid from {formData.startDate || '[Start Date]'} to {formData.endDate || '[End Date]'}.
                      Limited to {formData.usageLimit || '0'} total uses and {formData.usageLimitPerUser || '1'} per user.
                      {restaurantUids.length > 0 && ` Valid for ${restaurantUids.length} selected restaurant${restaurantUids.length > 1 ? 's' : ''}.`}
                      {applicableMenuIds.length > 0 && ` Only valid on ${applicableMenuIds.length} selected dish${applicableMenuIds.length > 1 ? 'es' : ''}.`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Applicable Dishes — full width */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900">Applicable Dishes (Optional)</h4>
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to allow coupon on any item. Select specific dishes to restrict — user must have at least one of these in their cart to apply the coupon.
              </p>
            </div>
            <MenuItemPicker selected={applicableMenuIds} onChange={setApplicableMenuIds} restaurantUids={restaurantUids} />
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-8 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium"
            >
              {initialData ? 'Update Coupon' : 'Save Coupon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCouponPage;
