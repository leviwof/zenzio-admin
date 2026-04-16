import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

const CreatePlanPage = ({ onClose, onSave }) => {
  const [features, setFeatures] = useState(['']);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '1 Month'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const removeFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const planData = {
      ...formData,
      features: features.filter(f => f.trim() !== '')
    };
    
    // Call parent function to add plan
    if (onSave) {
      onSave(planData);
    }
    
    onClose();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plan</h1>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow-sm max-w-3xl mx-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Create New Plan</h2>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <label className="block text-sm text-gray-700 mb-2">Plan Name</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Premium Annual" 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-700 mb-2">Plan Features</label>
            <div className="space-y-3">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Feature/Benefit" 
                    value={feature}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                  />
                  {features.length > 1 && (
                    <button 
                      onClick={() => removeFeature(idx)}
                      className="text-red-500 hover:text-red-600 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={addFeature}
                className="text-red-500 text-sm hover:text-red-600 font-medium"
              >
                + Add Feature
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-700 mb-2">Plan Description</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4" 
              placeholder="Enter a short description for the plan"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Price (₹)</label>
              <input 
                type="number" 
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Duration / Cycle</label>
              <select 
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option>1 Month</option>
                <option>1 Week</option>
                <option>3 Months</option>
                <option>6 Months</option>
                <option>1 Year</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Plan Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan Name:</span>
                <span className="font-semibold">{formData.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-red-500">₹{formData.price || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{formData.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Features Added:</span>
                <span className="font-semibold">{features.filter(f => f.trim() !== '').length}</span>
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
              Save Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanPage;