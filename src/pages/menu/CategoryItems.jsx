import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, Search } from 'lucide-react';

const CategoryItems = () => {
  const navigate = useNavigate();
  const { restaurantId, categoryId } = useParams();
  const [loading, setLoading] = useState(false);

  // Empty state - Replace with API
  const [restaurant, setRestaurant] = useState(null);
  const [category, setCategory] = useState(null);
  const [dishes, setDishes] = useState([]);

  const toggleAvailability = (dishId) => {
    setDishes(dishes.map(dish =>
      dish.id === dishId ? { ...dish, available: !dish.available } : dish
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate(`/menu/categories/${restaurantId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Items</h1>
            <p className="text-sm text-gray-500 mt-1">
              for {restaurant?.name || 'Restaurant'} - {category?.name || 'Category'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/menu/categories/${restaurantId}/items/${categoryId}/add`)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Add New Dish to this Category
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
            <p className="text-sm text-gray-500">Loading dishes...</p>
          </div>
        ) : dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Search className="text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 text-sm">No dishes found</p>
            <p className="text-xs text-gray-400 mt-2">Click "Add New Dish" to add items to this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dishes.map(dish => (
              <div
                key={dish.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <img
                  src={dish.image || 'https://via.placeholder.com/100'}
                  alt={dish.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />

                {/* Details */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                  <p className="text-lg font-bold text-gray-900 mt-2">₹{dish.price}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Availability Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dish.available}
                      onChange={() => toggleAvailability(dish.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-2 text-xs text-gray-600">
                      {dish.available ? 'Available' : 'Unavailable'}
                    </span>
                  </label>

                  {/* Edit Button */}
                  <button
                    onClick={() => navigate(`/menu/categories/${restaurantId}/items/${categoryId}/edit/${dish.id}`)}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Edit2 size={18} />
                  </button>

                  {/* Delete Button */}
                  <button className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryItems;