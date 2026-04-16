import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, X } from 'lucide-react';

const AddEditDish = () => {
  const navigate = useNavigate();
  const { restaurantId, categoryId, dishId } = useParams();
  const isEdit = !!dishId;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    cuisineType: '',
    dishType: 'Vegetarian',
    allergens: '',
    makeAvailable: true,
  });

  const [customizations, setCustomizations] = useState([
    { name: 'Size', type: 'single', options: [{ name: 'Small', price: 0, available: true }] },
  ]);

  const addCustomizationGroup = () => {
    setCustomizations([
      ...customizations,
      { name: '', type: 'single', options: [{ name: '', price: 0, available: true }] },
    ]);
  };

  const addOption = (groupIndex) => {
    const newCustomizations = [...customizations];
    newCustomizations[groupIndex].options.push({ name: '', price: 0, available: true });
    setCustomizations(newCustomizations);
  };

  const removeOption = (groupIndex, optionIndex) => {
    const newCustomizations = [...customizations];
    newCustomizations[groupIndex].options.splice(optionIndex, 1);
    setCustomizations(newCustomizations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form data:', formData);
    console.log('Customizations:', customizations);
    // Add API call here
    navigate(`/menu/categories/${restaurantId}/items/${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(`/menu/categories/${restaurantId}/items/${categoryId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Dish' : 'Food Items'}
        </h1>
      </div>

      <div className="p-6">
        <div className="max-w-2xl bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            {/* Dish Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dish Details</h3>

              {/* Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dish Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                </div>
              </div>

              {/* Dish Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dish Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter dish name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dish Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter dish description"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Price */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Main Course">Main Course</option>
                  <option value="Appetizers">Appetizers</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>

              {/* Cuisine Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine Type</label>
                <select
                  value={formData.cuisineType}
                  onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Cuisine Type</option>
                  <option value="Indian">Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                </select>
              </div>

              {/* Dish Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dish Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="dishType"
                      value="Vegetarian"
                      checked={formData.dishType === 'Vegetarian'}
                      onChange={(e) => setFormData({ ...formData, dishType: e.target.value })}
                      className="mr-2"
                    />
                    Vegetarian
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="dishType"
                      value="Non-Vegetarian"
                      checked={formData.dishType === 'Non-Vegetarian'}
                      onChange={(e) => setFormData({ ...formData, dishType: e.target.value })}
                      className="mr-2"
                    />
                    Non-Vegetarian
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="dishType"
                      value="Eggitarian"
                      checked={formData.dishType === 'Eggitarian'}
                      onChange={(e) => setFormData({ ...formData, dishType: e.target.value })}
                      className="mr-2"
                    />
                    Eggitarian
                  </label>
                </div>
              </div>

              {/* Allergens */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm font-medium text-red-500">Contains Allergens</span>
                </label>
                <input
                  type="text"
                  placeholder="Nuts, Soy"
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Make Available */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.makeAvailable}
                    onChange={(e) => setFormData({ ...formData, makeAvailable: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Make Available</span>
                </label>
              </div>
            </div>

            {/* Customization Options */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Add Customization Options (e.g., Size, Spice Level, Add-ons)
              </h3>
              <button
                type="button"
                onClick={addCustomizationGroup}
                className="text-red-500 text-sm hover:text-red-600 mb-4"
              >
                + Add New Option Group
              </button>

              {customizations.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Size Options</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newCustomizations = customizations.filter((_, i) => i !== groupIndex);
                        setCustomizations(newCustomizations);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {group.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="grid grid-cols-12 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Option Group Name"
                        className="col-span-4 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <select className="col-span-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                        <option>single</option>
                        <option>multiple</option>
                      </select>
                      <input
                        type="number"
                        placeholder="₹ 0"
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <label className="col-span-2 flex items-center">
                        <input type="checkbox" checked={option.available} className="mr-2" />
                        <span className="text-xs">Available</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOption(groupIndex, optionIndex)}
                        className="col-span-1 text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOption(groupIndex)}
                    className="text-red-500 text-sm hover:text-red-600 mt-2"
                  >
                    + Add Option
                  </button>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/menu/categories/${restaurantId}/items/${categoryId}`)}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditDish;