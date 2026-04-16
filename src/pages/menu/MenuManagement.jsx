



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Power, PowerOff, Loader2, AlertCircle, ChevronDown, Trash2, Edit } from 'lucide-react';
import { getAllMenus, getMenusByRestaurant, toggleMenuStatus, getAllRestaurants, deleteMenu } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

const MenuManagement = () => {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  useEffect(() => {
    fetchRestaurantsList();
  }, []);

  useEffect(() => {
    if (selectedRestaurant === 'all') {
      fetchMenus();
    } else {
      fetchMenusByRestaurant(selectedRestaurant);
    }
  }, [currentPage, selectedRestaurant, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setPagination({ total: 0, page: 1, limit: 10, totalPages: 1 });
  }, [searchQuery]);


  const fetchRestaurantsList = async () => {
    try {
      const response = await getAllRestaurants({ limit: 500 });
      console.log('📤 Full restaurants response:', response.data);


      let restaurantData = [];
      if (Array.isArray(response.data)) {

        restaurantData = response.data;
      } else if (response.data?.data?.restaurants) {

        restaurantData = response.data.data.restaurants;
      } else if (response.data?.restaurants) {

        restaurantData = response.data.restaurants;
      } else if (response.data?.data && Array.isArray(response.data.data)) {

        restaurantData = response.data.data;
      }

      console.log('📥 Restaurant data extracted:', restaurantData.length, 'items');


      const restaurantList = restaurantData.map(r => ({
        uid: r.uid,
        name: r.profile?.restaurant_name || r.restaurant_name || r.name || `Restaurant ${r.uid?.substring(0, 8) || 'Unknown'}`
      })).filter(r => r.uid).sort((a, b) => a.name.localeCompare(b.name));

      console.log('🏪 Restaurants loaded:', restaurantList.length);
      console.log('📋 Sample restaurant:', restaurantList[0]);
      setRestaurants(restaurantList);
    } catch (error) {
      console.error('❌ Error fetching restaurants:', error);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      console.log('📤 Fetching all menus... (Page:', currentPage, ')');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await getAllMenus(params);
      console.log('📥 Full Response:', response.data);

      let menuData = [];
      if (response.data?.data?.restaurant_menus) {
        menuData = response.data.data.restaurant_menus;
      } else if (response.data?.restaurant_menus) {
        menuData = response.data.restaurant_menus;
      }

      const meta = response.data?.meta || response.data?.data?.meta;
      if (meta) {
        setPagination(meta);
      }

      console.log('✅ Loaded menus:', menuData.length);
      setMenus(menuData);

    } catch (error) {
      console.error('❌ Error fetching menus:', error);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenusByRestaurant = async (restaurantUid) => {
    try {
      setLoading(true);
      console.log('📤 Fetching menus for restaurant:', restaurantUid, '(Page:', currentPage, ')');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await getMenusByRestaurant(restaurantUid, params);
      console.log('📥 Response:', response.data);

      let menuData = [];
      if (response.data?.data?.restaurant_menus) {
        menuData = response.data.data.restaurant_menus;
      } else if (response.data?.restaurant_menus) {
        menuData = response.data.restaurant_menus;
      }

      const meta = response.data?.meta || response.data?.data?.meta;
      if (meta) {
        setPagination(meta);
      }

      console.log('✅ Loaded menus:', menuData.length);
      setMenus(menuData);

    } catch (error) {
      console.error('❌ Error fetching menus:', error);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantFilter = (restaurantUid) => {
    setSelectedRestaurant(restaurantUid);
    setCurrentPage(1);
    setPagination({ total: 0, page: 1, limit: 10, totalPages: 1 });
  };

  const handleToggleStatus = async (menuUid, currentStatus) => {
    try {
      console.log('🔄 Toggling menu UID:', menuUid);


      await toggleMenuStatus(menuUid, !currentStatus);

      alert(`✅ Menu ${currentStatus ? 'deactivated' : 'activated'} successfully!`);

      if (selectedRestaurant === 'all') {
        fetchMenus();
      } else {
        fetchMenusByRestaurant(selectedRestaurant);
      }
    } catch (error) {
      console.error('❌ Error toggling menu:', error);
      alert(`❌ Failed to toggle: ${error.message}`);
    }
  };

  const handleDeleteMenu = async (menuUid, menuName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${menuName}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      console.log('🗑️ Deleting menu UID:', menuUid);

      await deleteMenu(menuUid);

      alert(`✅ Menu "${menuName}" deleted successfully!`);

      if (selectedRestaurant === 'all') {
        fetchMenus();
      } else {
        fetchMenusByRestaurant(selectedRestaurant);
      }
    } catch (error) {
      console.error('❌ Error deleting menu:', error);
      alert(`❌ Failed to delete menu: ${error.message}`);
    }
  };

  const getFirstImage = (images) => {
    if (!images) return null;
    if (Array.isArray(images) && images.length > 0) {
      return getImageUrl(images[0]);
    }
    return null;
  };


  const getRestaurantName = (uid) => {
    const restaurant = restaurants.find(r => r.uid === uid);
    return restaurant ? restaurant.name : uid;
  };

  // Use server-side pagination data
  const currentMenus = menus;

  const getStatusBadge = (isActive) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      setSearchQuery(searchTerm);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      { }
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Menu Management</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/menu/bulk-upload')}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
            >
              Bulk Upload
            </button>
            <button
              onClick={() => navigate('/menu/add')}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              Add Menu
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        { }
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by menu name, category, cuisine, or restaurant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            { }
            <div className="relative min-w-[250px] z-50">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <span className="truncate text-gray-700 font-medium">
                  {selectedRestaurant === 'all'
                    ? `All Restaurants (${restaurants.length})`
                    : (restaurants.find(r => r.uid === selectedRestaurant)?.name || 'Select Restaurant')}
                </span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                    <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search restaurants..."
                          value={restaurantSearch}
                          onChange={(e) => setRestaurantSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <div
                        className={`px-4 py-2 hover:bg-red-50 cursor-pointer text-sm ${selectedRestaurant === 'all' ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                        onClick={() => {
                          handleRestaurantFilter('all');
                          setDropdownOpen(false);
                          setRestaurantSearch('');
                        }}
                      >
                        All Restaurants ({restaurants.length})
                      </div>
                      {filteredRestaurants.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500 text-sm text-center">No restaurants found</div>
                      ) : (
                        filteredRestaurants.map(restaurant => (
                          <div
                            key={restaurant.uid}
                            className={`px-4 py-2 hover:bg-red-50 cursor-pointer text-sm border-t border-gray-50 ${selectedRestaurant === restaurant.uid ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                            onClick={() => {
                              handleRestaurantFilter(restaurant.uid);
                              setDropdownOpen(false);
                              setRestaurantSearch('');
                            }}
                          >
                            {restaurant.name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 text-red-500 border border-red-500 rounded-md hover:bg-red-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        { }
        <div className="mb-4 text-sm text-gray-600">
          Showing {currentMenus.length} of {pagination.total} menu items
          {selectedRestaurant !== 'all' && (
            <span className="ml-2 text-red-600 font-medium">
              • {getRestaurantName(selectedRestaurant)}
            </span>
          )}
        </div>

        { }
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
              <p className="text-sm text-gray-500">Loading menu items...</p>
            </div>
          ) : currentMenus.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">No menu items found</p>
              <p className="text-xs text-gray-400 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Menu Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cuisine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentMenus.map((menu) => (
                      <tr key={menu.menu_uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                            {getFirstImage(menu.images) ? (
                              <img
                                src={getFirstImage(menu.images)}
                                alt={menu.menu_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23e5e7eb" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <span className="text-xs text-gray-400 text-center p-2">No Image</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{menu.menu_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {menu.description ? menu.description.substring(0, 50) + (menu.description.length > 50 ? '...' : '') : '-'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">₹{menu.price}</div>
                          {menu.discount > 0 && (
                            <div className="text-xs text-green-600">{menu.discount}% off</div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {menu.cuisine_type ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              {menu.cuisine_type}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {menu.category ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {menu.category}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(menu.isActive)}`}>
                            {menu.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/menu/view/${menu.menu_uid}`)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => navigate(`/menu/edit/${menu.menu_uid}`)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Menu"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(menu.menu_uid, menu.isActive)}
                              className={`p-2 rounded-lg transition-colors ${menu.isActive
                                ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                }`}
                              title={menu.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {menu.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>

                            <button
                              onClick={() => handleDeleteMenu(menu.id, menu.menu_name)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Menu"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              { }
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>

                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        const startPage = Math.max(
                          1,
                          Math.min(currentPage - 2, pagination.totalPages - 4)
                        );
                        return startPage + i;
                      }
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${currentPage === page
                            ? "bg-red-500 text-white"
                            : "border border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    {pagination.totalPages > 5 && currentPage < pagination.totalPages - 2 && (
                      <span className="px-2">...</span>
                    )}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;