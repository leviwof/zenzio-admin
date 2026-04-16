import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { getAllOffers, approveOffer, rejectOffer } from '../../services/api';

const PAGE_SIZE = 6;
const BACKEND_URL = 'http://localhost:5000';

const OffersList = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchText, setSearchText] = useState('');
  const [offerType, setOfferType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchText, offerType, page]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = { approvalStatus: activeTab, search: searchText, offerType, page, pageSize: PAGE_SIZE };
      const response = await getAllOffers(params);
      const backendOffers = response.data?.data || [];
      const totalCount = response.data?.count || 0;
      setTotalPages(Math.ceil(totalCount / PAGE_SIZE));

      const mappedOffers = backendOffers.map((offer) => {
        // Normalize the image path (replace backslashes with forward slashes for URL)
        const normalizedImagePath = offer.offerImage?.replace(/\\/g, '/');

        return {
          id: offer.id,
          title: offer.title,
          discount: offer.discountValue,
          discountType: offer.discountType,
          image: normalizedImagePath
            ? `${BACKEND_URL}/${normalizedImagePath}`
            : 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/Screenshot+From+2026-01-03+21-10-52.png',
          restaurantName: offer.restaurant?.profile?.restaurant_name || offer.restaurant?.rest_name || 'All Restaurants',
          categoryName: offer.categoryId || 'All Categories',
          validFrom: offer.startDate?.split('T')[0],
          validTo: offer.endDate?.split('T')[0],
          termsCount: offer.termsConditions?.split('\n').length || 0,
          approvalStatus: offer.approvalStatus,
          minOrderValue: offer.minOrderValue,
        };
      });

      setOffers(mappedOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (offerId) => {
    try {
      await approveOffer(offerId);
      fetchOffers(); // Refresh list silently
    } catch (error) {
      console.error('Failed to approve offer:', error);
    }
  };

  const handleReject = async (offerId) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason?.trim()) return;
    try {
      await rejectOffer(offerId, reason);
      fetchOffers(); // Refresh list silently
    } catch (error) {
      console.error('Failed to reject offer:', error);
    }
  };

  const tabs = [
    { label: 'Pending Review', value: 'PENDING' },
    { label: 'Approved Offers', value: 'APPROVED' },
    { label: 'Rejected Offers', value: 'REJECTED' },
  ];

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Offer Approval</h1>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b px-6 py-4 flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPage(1); }}
              className={`px-4 py-2 rounded-full font-medium transition ${activeTab === tab.value
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-6 flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search restaurants or offer name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-md"
            value={offerType}
            onChange={(e) => setOfferType(e.target.value)}
          >
            <option value="">All Offer Types</option>
            <option value="Percentage">Percentage</option>
            <option value="Flat Amount">Flat Amount</option>
          </select>

          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
            <Filter size={16} />
            <span>More Filters</span>
          </button>
        </div>

        {/* Offers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            <p className="mt-4 text-gray-600">Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">No offers found</p>
            <p className="mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {offers.map((offer) => (
                <div key={offer.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition bg-white">
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{offer.restaurantName}</h3>
                    <p className="text-xs text-gray-500 mb-2">{offer.categoryName}</p>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">{offer.title}</p>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-red-500 font-bold text-xl">
                        {offer.discount}{offer.discountType === 'PERCENTAGE' ? '%' : '₹'} OFF
                      </span>
                      <span className="text-xs text-gray-500">Min: ₹{offer.minOrderValue || 0}</span>
                    </div>

                    <span className="text-xs text-gray-500 mb-3 block">
                      Valid: {offer.validFrom} to {offer.validTo}
                    </span>

                    <p className="text-xs text-gray-500 mb-3">{offer.termsCount} terms & conditions apply</p>

                    {activeTab === 'PENDING' && (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(offer.id)}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(offer.id)}
                            className="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                        <button
                          onClick={() => navigate(`/offers/${offer.id}`)}
                          className="w-full text-red-500 text-sm hover:underline font-medium"
                        >
                          Request Changes
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/offers/${offer.id}`)}
                      className="w-full mt-2 text-red-500 text-sm hover:underline font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 p-4 border-t">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 rounded ${pageNum === page ? 'bg-red-500 text-white' : 'border hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OffersList;
