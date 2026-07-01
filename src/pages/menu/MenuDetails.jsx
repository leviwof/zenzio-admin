



import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, IndianRupee, Tag, Utensils, Calendar, Image as ImageIcon, Power, PowerOff } from 'lucide-react';
import { getMenuAvailability, getMenuByUid, toggleMenuAvailability, toggleMenuStatus } from '../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth';
import { getMenuAvailabilityState, mergeMenuAvailability } from '../../utils/menuAvailability';

const MenuDetails = () => {
  const { menuUid } = useParams();
  const location = useLocation();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);
  const [availabilityToggling, setAvailabilityToggling] = useState(false);

  useEffect(() => {
    console.log('🔍 MenuDetails mounted with UID:', menuUid);
    
    if (!menuUid || menuUid === 'undefined') {
      console.error('❌ Invalid menu UID:', menuUid);
      setError('Invalid menu ID');
      setLoading(false);
      return;
    }
    
    fetchMenuDetails();
  }, [menuUid]);

  const fetchMenuDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📥 Fetching menu details for UID:', menuUid);
      
      const [response, availabilityResponse] = await Promise.all([
        getMenuByUid(menuUid),
        getMenuAvailability(menuUid).catch(() => null),
      ]);
      console.log('📦 Full Response:', response);
      
      const menuData =
        response?.data?.data?.restaurant_menu ||
        response?.data?.restaurant_menu ||
        response?.data?.data ||
        response?.data;
      
      if (!menuData) {
        console.error('❌ Menu data not found');
        throw new Error('Menu data not found in response');
      }

      if (restaurantAdmin && ownRestaurantUid && menuData.restaurant_uid && menuData.restaurant_uid !== ownRestaurantUid) {
        throw new Error('You can only view menus for your own restaurant.');
      }
      
      console.log('✅ Menu data extracted:', menuData);
      
      
      setMenu(mergeMenuAvailability(menuData, availabilityResponse?.data));
    } catch (err) {
      console.error('❌ Error fetching menu:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch menu details');
    } finally {
      setLoading(false);
    }
  };

  
  const handleToggleStatus = async () => {
    try {
      setStatusToggling(true);
      const state = getMenuAvailabilityState(menu);
      const currentStatus = state.menuStatus;
      const newStatus = !currentStatus;
      
      console.log('🔄 Toggling menu status:', {
        menuUid,
        currentStatus,
        newStatus
      });
      
      
      console.log('📤 Sending to API:', {
        endpoint: `/restaurant-menu/${menuUid}/status/admin`,
        body: { status: newStatus ? 1 : 0, isActive: newStatus ? 1 : 0 }
      });
      
      const response = await toggleMenuStatus(menuUid, newStatus);
      
      
      console.log('📥 API Response:', response);
      console.log('✅ Toggle Response Data:', response.data);
      
      
      if (response.data?.status === 'success' || response.data?.code === 200) {
        await fetchMenuDetails();
        const successLabel = newStatus ? 'enabled' : 'disabled';
        toast.success(`Menu ${successLabel} successfully`);
      } else {
        throw new Error('Toggle failed - unexpected response');
      }
      
    } catch (error) {
      console.error('❌ Error toggling menu:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to toggle menu item');
      
      
      fetchMenuDetails();
    } finally {
      setStatusToggling(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setAvailabilityToggling(true);
      const state = getMenuAvailabilityState(menu);
      const currentAvailability = state.menuIsAvailable;
      const newAvailability = !currentAvailability;

      const response = await toggleMenuAvailability(menuUid, newAvailability, menu?.menu_name);

      if (response.data?.status === 'success' || response.data?.code === 200) {
        await fetchMenuDetails();
        toast.success(`Menu marked ${newAvailability ? 'available' : 'unavailable'} successfully`);
      } else {
        throw new Error('Toggle failed - unexpected response');
      }
    } catch (error) {
      console.error('Error toggling menu availability:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update menu availability');
      fetchMenuDetails();
    } finally {
      setAvailabilityToggling(false);
    }
  };

  const detailSearchParams = new URLSearchParams(location.search);
  const returnToParam = detailSearchParams.get('returnTo');
  const returnToPath = (location.state?.returnTo || returnToParam || '').startsWith('/menu')
    ? (location.state?.returnTo || returnToParam)
    : '';
  const restaurantFromUrl = detailSearchParams.get('restaurant');
  const restaurantFromState = location.state?.selectedRestaurant;
  const selectedRestaurantUid = restaurantAdmin
    ? ownRestaurantUid
    : (restaurantFromState || restaurantFromUrl || menu?.restaurant_uid);
  const menuListPath = selectedRestaurantUid
    ? (returnToPath || `/menu?restaurant=${encodeURIComponent(selectedRestaurantUid)}`)
    : (returnToPath || '/menu');
  const menuListState = returnToPath
    ? undefined
    : selectedRestaurantUid
    ? {
        selectedRestaurant: selectedRestaurantUid,
        selectedRestaurantName: location.state?.selectedRestaurantName || detailSearchParams.get('name') || undefined,
      }
    : undefined;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
          <p className="text-sm text-gray-500">Loading menu details...</p>
          <p className="text-xs text-gray-400 mt-2">UID: {menuUid}</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Link to={menuListPath} state={menuListState} className="text-red-600 hover:text-red-700">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-lg font-bold text-gray-800">Menu Details</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="text-red-500 mb-3" size={48} />
            <p className="text-gray-600 mb-2 font-medium">{error || 'Menu not found'}</p>
            <p className="text-sm text-gray-400 mb-4">UID: {menuUid}</p>
            <Link
              to={menuListPath}
              state={menuListState}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Menu List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availabilityState = getMenuAvailabilityState(menu);
  const adminStatusActive = availabilityState.menuStatus;
  const manualAvailabilityActive = availabilityState.menuIsAvailable;
  const canOrder = availabilityState.canOrder;
  const reasonText = availabilityState.reasonText || (canOrder ? 'Can be ordered' : 'Currently unavailable');
  const statusToggleLabel = adminStatusActive ? 'Turn Off' : 'Turn On';
  const availabilityToggleLabel = manualAvailabilityActive ? 'Mark Unavailable' : 'Mark Available';
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={menuListPath} state={menuListState} className="text-red-600 hover:text-red-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-lg font-bold text-gray-800">Menu Details</h2>
          </div>
          
          {}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              adminStatusActive
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              Status: {adminStatusActive ? 'On' : 'Off'}
            </span>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                canOrder ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
              }`}
              title={reasonText}
            >
              {canOrder ? 'Orderable' : 'Blocked'}
            </span>
            
            <button
              onClick={handleToggleStatus}
              disabled={statusToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                adminStatusActive
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } ${statusToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Toggle menu status"
            >
              {statusToggling ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </>
              ) : (
                <>
                  {adminStatusActive ? <PowerOff size={18} /> : <Power size={18} />}
                  <span className="text-sm font-medium">
                    {statusToggleLabel}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handleToggleAvailability}
              disabled={availabilityToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                manualAvailabilityActive
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              } ${availabilityToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Toggle temporary menu availability"
            >
              {availabilityToggling ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </>
              ) : (
                <>
                  {manualAvailabilityActive ? <PowerOff size={18} /> : <Power size={18} />}
                  <span className="text-sm font-medium">
                    {availabilityToggleLabel}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Utensils size={20} className="text-red-600" />
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Menu Name</label>
              <p className="text-base font-semibold text-gray-900 mt-1">{menu.menu_name}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Menu UID</label>
              <p className="text-base text-gray-900 mt-1 font-mono">{menu.menu_uid}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Restaurant UID</label>
              <p className="text-base text-gray-900 mt-1 font-mono">{menu.restaurant_uid}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Food Type</label>
              <p className="mt-1">
                <span className={`px-3 py-1 rounded text-sm ${
                  menu.food_type === 'Veg' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {menu.food_type}
                </span>
              </p>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <p className="text-base text-gray-900 mt-1">{menu.description || '-'}</p>
            </div>
          </div>
        </div>

        {}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag size={20} className="text-red-600" />
            Category & Cuisine
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
              <p className="mt-1">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {menu.category || '-'}
                </span>
              </p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cuisine Type</label>
              <p className="mt-1">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                  {menu.cuisine_type || '-'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <IndianRupee size={20} className="text-red-600" />
            Pricing Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price (with platform fee)</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{menu.finalPrice ?? menu.price}</p>
              {menu.basePrice != null && menu.basePrice !== menu.finalPrice && (
                <p className="text-xs text-gray-400 mt-1">Base ₹{menu.basePrice}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Discount</label>
              <p className="text-2xl font-bold text-green-600 mt-1">{menu.discount}%</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Final Price</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{menu.finalPrice ?? menu.price}</p>
              {menu.discount > 0 && (
                <p className="text-xs text-gray-400 mt-1">After {menu.discount}% discount applied</p>
              )}
            </div>

            {menu.size && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</label>
                <p className="text-base text-gray-900 mt-1">{menu.size}</p>
              </div>
            )}
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</label>
              <p className="text-base text-gray-900 mt-1">{menu.qty}</p>
            </div>
          </div>
        </div>

        {}
        {Array.isArray(menu.variants) && menu.variants.length > 0 && (
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag size={20} className="text-red-600" />
              Variants
            </h3>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {menu.variants.map((variant) => (
                    <tr key={variant.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {variant.quantity ?? variant.quantity_value}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{variant.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-700">
                        Rs. {variant.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {}
        {menu.images && menu.images.length > 0 && (
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-red-600" />
              Menu Images ({menu.images.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {menu.images.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                  <img
                    src={getImageUrl(image)}
                    alt={`${menu.menu_name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('❌ Image failed:', image);
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 pb-8 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Power size={20} className="text-red-600" />
            Availability
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Can Order</label>
              <p className={`text-base font-semibold mt-1 ${canOrder ? 'text-green-700' : 'text-amber-700'}`}>
                {canOrder ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Meal</label>
              <p className="text-base text-gray-900 mt-1">{availabilityState.currentMeal || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</label>
              <p className="text-base text-gray-900 mt-1">{reasonText}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Toggle</label>
              <p className="text-base text-gray-900 mt-1">{adminStatusActive ? 'On' : 'Off'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Restaurant Availability</label>
              <p className="text-base text-gray-900 mt-1">{manualAvailabilityActive ? 'Available' : 'Unavailable'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Restaurant Open</label>
              <p className="text-base text-gray-900 mt-1">{availabilityState.restaurantAvailable ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-red-600" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rating</label>
              <p className="text-base text-gray-900 mt-1">
                ⭐ {menu.rating || 0} / 5
              </p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders Count</label>
              <p className="text-base text-gray-900 mt-1">{menu.orderedCount || 0} orders</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created At</label>
              <p className="text-base text-gray-900 mt-1">
                {menu.createdAt 
                  ? new Date(menu.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '-'}
              </p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</label>
              <p className="text-base text-gray-900 mt-1">
                {menu.updatedAt 
                  ? new Date(menu.updatedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuDetails;
