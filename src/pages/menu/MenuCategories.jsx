import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, Search } from 'lucide-react';

const MenuCategories = () => {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Empty state - Replace with API
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={20} />
          Back to Restaurant List
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Categories</h1>
            <p className="text-sm text-gray-500 mt-1">
              {restaurant?.name || 'Restaurant'} Menu
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            + Add New Category
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
            <p className="text-sm text-gray-500">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Search className="text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 text-sm">No categories found</p>
            <p className="text-xs text-gray-400 mt-2">Click "Add New Category" to create your first menu category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.itemCount || 0} Dishes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded">
                      <Edit2 size={18} />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/menu/categories/${restaurantId}/items/${category.id}`)}
                  className="w-full px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50"
                >
                  View Dishes
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuCategories;