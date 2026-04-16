import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CreateCouponPage = ({ onClose, onSave, initialData }) => {
  const [makeActive, setMakeActive] = useState(false);
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
    targetAudience: 'all'
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
        targetAudience: initialData.targetAudience || 'all'
      });
      setMakeActive(initialData.status === 'Active');
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateRandom = () => {
    const randomCode = 'COUP' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData(prev => ({ ...prev, code: randomCode }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (!formData.code || !formData.name || !formData.discountValue || !formData.minOrderValue) {
      alert("Please fill in all required fields (Name, Code, Discount, Min Order)");
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
      status: makeActive ? 'Active' : 'Inactive'
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
              <h3 className="font-semibold mb-6 text-gray-900">Basic Details & Code Generation</h3>

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
                  rows="4"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                ></textarea>
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
              <h3 className="font-semibold mb-6 text-gray-900">Validity & Targeting</h3>

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
                <h4 className="font-semibold text-red-600 mb-4">Coupon Summary & Economics</h4>
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
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