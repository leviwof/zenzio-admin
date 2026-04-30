import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Edit, Trash2, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllMenus, getMenusByRestaurant, toggleMenuStatus, bulkUpdateMenuStatus, deleteMenu, bulkDeleteMenu, getAllRestaurants } from '../../services/api';
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

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

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

      const restaurantList = restaurantData.map(r => ({
        uid: r.uid,
        name: r.profile?.restaurant_name || r.restaurant_name || r.name || `Restaurant ${r.uid?.substring(0, 8) || 'Unknown'}`
      })).filter(r => r.uid).sort((a, b) => a.name.localeCompare(b.name));

      setRestaurants(restaurantList);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await getAllMenus(params);
      let menuData = [];
      if (response.data?.data?.restaurant_menus) {
        menuData = response.data.data.restaurant_menus;
      } else if (response.data?.restaurant_menus) {
        menuData = response.data.restaurant_menus;
      }

      const meta = response.data?.meta || response.data?.data?.meta;
      if (meta) setPagination(meta);

      setMenus(menuData);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenusByRestaurant = async (restaurantUid) => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await getMenusByRestaurant(restaurantUid, params);
      let menuData = [];
      if (response.data?.data?.restaurant_menus) {
        menuData = response.data.data.restaurant_menus;
      } else if (response.data?.restaurant_menus) {
        menuData = response.data.restaurant_menus;
      }

      const meta = response.data?.meta || response.data?.data?.meta;
      if (meta) setPagination(meta);

      setMenus(menuData);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantFilter = (restaurantUid) => {
    setSelectedRestaurant(restaurantUid);
    setCurrentPage(1);
    setPagination({ total: 0, page: 1, limit: 10, totalPages: 1 });
    setSelectedIds([]);
  };

  const getRestaurantName = (uid) => {
    const restaurant = restaurants.find(r => r.uid === uid);
    return restaurant ? restaurant.name : uid;
  };

  const handleToggleStatus = async (menuUid, currentStatus) => {
    try {
      await toggleMenuStatus(menuUid, !currentStatus);
      toast.success(`Menu ${currentStatus ? 'deactivated' : 'activated'}`);
      setMenus(prev => prev.map(m => m.menu_uid === menuUid ? { ...m, isActive: !currentStatus } : m));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(menus.map(m => m.menu_uid));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (menuUid) => {
    console.log('Select One clicked:', menuUid);
    setSelectedIds(prev => {
      const newIds = prev.includes(menuUid)
        ? prev.filter(id => id !== menuUid)
        : [...prev, menuUid];
      console.log('Selected IDs after select one:', newIds);
      return newIds;
    });
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await bulkUpdateMenuStatus(selectedIds, true);
      toast.success(`${selectedIds.length} menus activated`);
      setMenus(prev => prev.map(m => selectedIds.includes(m.menu_uid) ? { ...m, isActive: true } : m));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to activate menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await bulkUpdateMenuStatus(selectedIds, false);
      toast.success(`${selectedIds.length} menus deactivated`);
      setMenus(prev => prev.map(m => selectedIds.includes(m.menu_uid) ? { ...m, isActive: false } : m));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to deactivate menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      await bulkDeleteMenu(selectedIds);
      toast.success(`${selectedIds.length} menus deleted`);
      setMenus(prev => prev.filter(m => !selectedIds.includes(m.menu_uid)));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteClick = (menuUid, menuName) => {
    setDeleteModal({ show: true, id: menuUid, name: menuName });
  };

  const confirmDelete = async () => {
    try {
      await deleteMenu(deleteModal.id);
      toast.success('Menu deleted');
      setMenus(prev => prev.filter(m => m.menu_uid !== deleteModal.id));
      setDeleteModal({ show: false, id: null, name: '' });
    } catch (error) {
      toast.error('Failed to delete menu');
    }
  };

  const getFirstImage = (images) => {
    if (!images) return null;
    if (Array.isArray(images) && images.length > 0) {
      return getImageUrl(images[0]);
    }
    return null;
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleSearchKeyPress = (e) => e.key === 'Enter' && setSearchQuery(searchTerm);
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Delete Menu</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to delete "{deleteModal.name}"?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModal({ show: false, id: null, name: '' })} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/menu/bulk-upload')} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Bulk Upload</button>
            <button onClick={() => navigate('/menu/add')} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium">+ Add Menu</button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by menu name, category, cuisine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

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
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
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
              <button onClick={handleClearSearch} className="px-4 py-2 text-red-500 border border-red-500 rounded-md hover:bg-red-50">Clear</button>
            )}
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {menus.length} of {pagination.total} menu items
          {selectedRestaurant !== 'all' && (
            <span className="ml-2 text-red-600 font-medium">
              • {getRestaurantName(selectedRestaurant)}
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-blue-700">{selectedIds.length} item(s) selected</span>
             <div className="flex gap-2">
               <button onClick={handleBulkActivate} disabled={bulkLoading} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                 {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                 Activate
               </button>
               <button onClick={handleBulkDeactivate} disabled={bulkLoading} className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  Deactivate
                </button>
                <button onClick={handleBulkDelete} disabled={bulkLoading} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  Delete
                </button>
              </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
              <p className="text-sm text-gray-500">Loading menu items...</p>
            </div>
          ) : menus.length === 0 ? (
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
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" checked={selectedIds.length === menus.length && menus.length > 0} onChange={handleSelectAll} className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuisine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {menus.map((menu) => (
                      <tr key={menu.menu_uid} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.includes(menu.menu_uid)} onChange={() => handleSelectOne(menu.menu_uid)} className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            {getFirstImage(menu.images) ? (
                              <img src={getFirstImage(menu.images)} alt={menu.menu_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{menu.menu_name}</div>
                          <div className="text-xs text-gray-500">{menu.description ? menu.description.substring(0, 40) + (menu.description.length > 40 ? '...' : '') : '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">₹{menu.finalPrice || menu.price}</div>
                          {menu.discount > 0 && <div className="text-xs text-green-600">{menu.discount}% off</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{menu.cuisine_type || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{menu.category || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={menu.isActive} onChange={() => handleToggleStatus(menu.menu_uid, menu.isActive)} className="sr-only peer" />
                            <div className={`w-11 h-6 rounded-full transition-colors peer-focus:ring-2 ${menu.isActive ? 'bg-green-500 peer-focus:ring-green-300' : 'bg-gray-300 peer-focus:ring-gray-300'} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${menu.isActive ? 'peer-checked:after:translate-x-full after:border-white' : 'after:border-gray-300'} `}></div>
                          </label>
                        </td>
                         <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => navigate(`/menu/edit/${menu.menu_uid}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                              <button onClick={() => handleDeleteClick(menu.menu_uid, menu.menu_name)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Page {currentPage} of {pagination.totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">← Prev</button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const startPage = Math.max(1, Math.min(currentPage - 2, pagination.totalPages - 4));
                      return startPage + i;
                    }).map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded ${currentPage === page ? 'bg-red-500 text-white' : 'border'}`}>{page}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next →</button>
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