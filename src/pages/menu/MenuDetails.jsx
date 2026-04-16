



import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, IndianRupee, Tag, Utensils, Calendar, Image as ImageIcon, Power, PowerOff } from 'lucide-react';
import { getMenuByUid, toggleMenuStatus } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

const MenuDetails = () => {
  const { menuUid } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);
  const [toggling, setToggling] = useState(false);

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
      
      const response = await getMenuByUid(menuUid);
      console.log('📦 Full Response:', response);
      
      const menuData = response?.data?.data?.restaurant_menu;
      
      if (!menuData) {
        console.error('❌ Menu data not found');
        throw new Error('Menu data not found in response');
      }
      
      console.log('✅ Menu data extracted:', menuData);
      
      
      setMenu({
        ...menuData,
        isActive: Boolean(menuData.isActive === 1 || menuData.isActive === true)
      });
    } catch (err) {
      console.error('❌ Error fetching menu:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch menu details');
    } finally {
      setLoading(false);
    }
  };

  
  const handleToggleStatus = async () => {
    try {
      setToggling(true);
      const newStatus = !menu.isActive;
      
      console.log('🔄 Toggling menu status:', {
        menuUid,
        currentStatus: menu.isActive,
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
        
        setMenu(prev => ({
          ...prev,
          isActive: newStatus
        }));
        
        alert(`✅ Menu ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      } else {
        throw new Error('Toggle failed - unexpected response');
      }
      
    } catch (error) {
      console.error('❌ Error toggling menu:', error);
      console.error('Error response:', error.response?.data);
      alert(`❌ Failed to toggle: ${error.response?.data?.message || error.message}`);
      
      
      fetchMenuDetails();
    } finally {
      setToggling(false);
    }
  };

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
            <Link to="/menu" className="text-red-600 hover:text-red-700">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-lg font-bold text-gray-800">Menu Details</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="text-red-500 mb-3" size={48} />
            <p className="text-gray-600 mb-2 font-medium">{error || 'Menu not found'}</p>
            <p className="text-sm text-gray-400 mb-4">UID: {menuUid}</p>
            <Link
              to="/menu"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Menu List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/menu" className="text-red-600 hover:text-red-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h2 className="text-lg font-bold text-gray-800">Menu Details</h2>
          </div>
          
          {}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              menu.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {menu.isActive ? 'Active' : 'Inactive'}
            </span>
            
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                menu.isActive
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={menu.isActive ? 'Deactivate Menu' : 'Activate Menu'}
            >
              {toggling ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </>
              ) : (
                <>
                  {menu.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                  <span className="text-sm font-medium">
                    {menu.isActive ? 'Deactivate' : 'Activate'}
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{menu.price}</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Discount</label>
              <p className="text-2xl font-bold text-green-600 mt-1">{menu.discount}%</p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Final Price</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{(menu.price - (menu.price * menu.discount / 100)).toFixed(2)}
              </p>
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