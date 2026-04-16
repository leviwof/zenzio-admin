import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminOfferById } from '../../services/api';
import { ChevronLeft, Calendar, Tag, Percent, ShoppingCart, Users, Clock, CheckCircle, XCircle, Edit } from 'lucide-react';

const AdminOfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/admin', '') || 'http://localhost:5000';

  useEffect(() => {
    fetchOfferDetails();
  }, [id]);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      const res = await getAdminOfferById(id);
      setOffer(res.data);
    } catch (error) {
      console.error('Error fetching offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('offers/')) {
      return `${IMAGE_BASE_URL}/uploads/${imagePath}`;
    }
    return `${IMAGE_BASE_URL}/${imagePath}`;
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">Offer not found</p>
          <button
            onClick={() => navigate('/offers/existing')}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/offers/existing')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft size={20} />
          <span className="ml-1">Back to Offers</span>
        </button>

        <button
          onClick={() => navigate(`/offers/edit/${id}`)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          <Edit size={18} />
          <span>Edit Offer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Offer Image & Title Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {offer.offerImage && (
              <div className="w-full h-64 bg-gray-100">
                <img
                  src={getImageUrl(offer.offerImage)}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/Screenshot+From+2026-01-03+21-10-52.png';
                  }}
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{offer.title}</h1>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${offer.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {offer.status === 'ACTIVE' ? <CheckCircle size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                      {offer.status}
                    </span>
                  </div>
                </div>
              </div>

              {offer.description && (
                <div className="mb-4">
                  <p className="text-gray-700">{offer.description}</p>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Percent className="text-red-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {offer.discountValue}{offer.discountType === 'PERCENTAGE' ? '%' : '₹'}
                  </p>
                  <p className="text-xs text-gray-600">Discount</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingCart className="text-blue-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">₹{offer.minOrderValue || 0}</p>
                  <p className="text-xs text-gray-600">Min Order</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="text-purple-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{offer.maxUsagePerUser}</p>
                  <p className="text-xs text-gray-600">Usage/User</p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Tag className="text-orange-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{offer.adminCommission || 15}%</p>
                  <p className="text-xs text-gray-600">Commission</p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {offer.termsConditions && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
              <div className="prose prose-sm text-gray-700 whitespace-pre-line">
                {offer.termsConditions}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Offer Details</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Restaurant</p>
                <p className="font-medium text-gray-900">
                  {offer.restaurant?.profile?.restaurant_name || offer.restaurant?.rest_name || 'All Restaurants'}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Category</p>
                <p className="font-medium text-gray-900">
                  {offer.categoryId || 'All Categories'}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Discount Type</p>
                <p className="font-medium text-gray-900">
                  {offer.discountType === 'PERCENTAGE' ? 'Percentage' : 'Flat Amount'}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">Total Usage Limit</p>
                <p className="font-medium text-gray-900">
                  {offer.totalUsageLimit || 'Unlimited'}
                </p>
              </div>
            </div>
          </div>

          {/* Validity Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Calendar size={20} className="mr-2 text-red-500" />
              Validity Period
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">
                  {offer.startDate?.split('T')[0]}
                </span>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-gray-500">End Date</span>
                <span className="font-medium text-gray-900">
                  {offer.endDate?.split('T')[0]}
                </span>
              </div>

              {(offer.startTime || offer.endTime) && (
                <>
                  <div className="border-t pt-3">
                    <div className="flex items-center mb-2">
                      <Clock size={16} className="mr-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Time Restrictions</span>
                    </div>
                    <div className="flex items-center justify-between pl-6">
                      <span className="text-sm text-gray-500">
                        {offer.startTime || '00:00'} - {offer.endTime || '23:59'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Commission Card */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow p-6 border border-yellow-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Commission Info</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Admin Commission</span>
                <span className="text-2xl font-bold text-orange-600">
                  {offer.adminCommission || 15}%
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-yellow-200 pt-3">
                <span className="text-sm text-gray-600">Calculation</span>
                <span className="text-sm font-medium text-gray-900">
                  {offer.isCommissionAuto ? 'Automatic' : 'Manual'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOfferDetails;