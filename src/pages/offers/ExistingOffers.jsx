import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Edit, Trash2, Eye, Image, CheckCircle, XCircle } from 'lucide-react';
import { getAdminOffers, deleteAdminOffer, getAllOffers } from '../../services/api';

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in z-50`}>
      <Icon size={20} />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 hover:opacity-80">
        <XCircle size={18} />
      </button>
    </div>
  );
};

const PAGE_SIZE = 10;
const IMAGE_PLACEHOLDER = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/Screenshot+From+2026-01-03+21-10-52.png';

const ExistingOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'all'
  const [toast, setToast] = useState(null);

  const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/admin', '') || 'http://localhost:5000';

  const showToast = (message, type = 'success') => setToast({ message, type });

  const getImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('offers/') ? `${IMAGE_BASE_URL}/uploads/${path}` : `${IMAGE_BASE_URL}/${path}`;
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const apiCall = activeTab === 'admin' ? getAdminOffers : getAllOffers;
      const response = await apiCall({ search: searchText, page, pageSize: PAGE_SIZE });
      const offersData = response.data?.data || [];
      const totalCount = response.data?.count || 0;
      setTotalPages(Math.ceil(totalCount / PAGE_SIZE));
      console.log(offersData, "offersData")
      const mappedOffers = offersData.map(offer => ({
        id: offer.id,
        name: offer.title,
        restaurantName: offer.restaurant?.profile?.restaurant_name || offer.restaurant?.rest_name || 'All Restaurants',
        categoryName: offer.categoryId || 'All Categories',
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        startDate: offer.startDate?.split('T')[0],
        endDate: offer.endDate?.split('T')[0],
        status: offer.status,
        minOrderValue: offer.minOrderValue,
        adminCommission: offer.adminCommission,
        offerImage: offer.offerImage,
        approvalStatus: offer.status, // <--- Fixed: Map status to approvalStatus
        createdBy: offer.createdBy || 'admin'
      }));

      setOffers(mappedOffers);
    } catch (error) {
      console.error(error);
      // showToast('Failed to load offers', 'error');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [searchText, page, activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await deleteAdminOffer(id);
      showToast('Offer deleted successfully!', 'success');
      fetchOffers();
    } catch (error) {
      console.error(error);
      showToast('Failed to delete offer', 'error');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearchText('');
  };
  console.log(activeTab, "activeTab");
  // Pagination buttons logic
  const renderPageButtons = () => {
    const buttons = [];
    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded transition-colors ${i === page ? 'bg-red-500 text-white' : 'border hover:bg-gray-50'}`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Offers Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs & Create Button */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex space-x-2">
            {['admin', 'all'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
              >
                {tab === 'admin' ? 'Admin Created Offers' : 'All Offers'}
              </button>
            ))}
          </div>
          {activeTab === 'admin' && (
            <button
              onClick={() => navigate('/offers/create')}
              className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center space-x-2 transition-colors"
            >
              <span>+</span> <span>Create New Offer</span>
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Search & Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Offer Name or Restaurant"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2 transition-colors">
              <Filter size={16} /> <span>Filter</span>
            </button>
          </div>

          {/* Loading / No Offers */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
              <p className="mt-4 text-gray-600">Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl">No offers found</p>
              {activeTab === 'admin' && (
                <button
                  onClick={() => navigate('/offers/create')}
                  className="mt-4 px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Create Your First Offer
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Offers Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Image', 'Offer Name', 'Restaurant', 'Category', 'Discount', 'Min Order', 'Valid Until', 'Status', 'Approval', 'Actions'].map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          {offer.offerImage ? (
                            <img
                              src={getImageUrl(offer.offerImage)}
                              alt={offer.name}
                              className="w-16 h-16 rounded object-cover"
                              onError={(e) => (e.target.src = IMAGE_PLACEHOLDER)}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                              <Image src={getImageUrl(offer.offerImage)} className="text-gray-400" size={24} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 font-medium">{offer.name}</td>
                        <td className="px-4 py-4 text-sm">{offer.restaurantName}</td>
                        <td className="px-4 py-4 text-sm">{offer.categoryName}</td>
                        <td className="px-4 py-4 text-sm font-medium text-red-500">
                          {offer.discountValue}{offer.discountType === 'PERCENTAGE' ? '%' : '₹'} OFF
                        </td>
                        <td className="px-4 py-4 text-sm">₹{offer.minOrderValue || 0}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{offer.endDate}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${offer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {offer.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-4 py-2 rounded-full text-xs font-medium ${{
                            PENDING: 'bg-yellow-100 text-yellow-800',
                            APPROVED: 'bg-green-100 text-green-800',
                            REJECTED: 'bg-red-100 text-red-800',
                            CHANGES_REQUESTED: 'bg-blue-100 text-blue-800',
                          }[offer.approvalStatus] || 'bg-gray-100 text-gray-800'
                            }`}>
                            {offer.approvalStatus?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => navigate(activeTab === 'admin' ? `/offers/admin/${offer.id}` : `/offers/${offer.id}`)} className="text-blue-500 hover:text-blue-700 p-1 transition-colors" title="View Details">
                              <Eye size={18} />
                            </button>
                            {activeTab === 'admin' && (
                              <>
                                <button onClick={() => navigate(`/offers/edit/${offer.id}`)} className="text-yellow-500 hover:text-yellow-700 p-1 transition-colors" title="Edit Offer">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(offer.id)} className="text-red-500 hover:text-red-700 p-1 transition-colors" title="Delete Offer">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing page {page} of {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      Previous
                    </button>
                    {renderPageButtons()}
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default ExistingOffers;
