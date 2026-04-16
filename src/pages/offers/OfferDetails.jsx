import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getOfferDetails, approveOffer, rejectOffer, requestChanges } from '../../services/api';

const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/admin', '').replace('/api', '') || 'http://localhost:4000';

const OfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchOfferDetails();
    // eslint-disable-next-line
  }, [id]);

  const fetchOfferDetails = async () => {
    try {
      setImageError(false); // Reset image error state
      const response = await getOfferDetails(id);
      const data = response.data;

      // Normalize the image path and construct URL
      let imageUrl = null;
      if (data.offerImage) {
        const normalizedPath = data.offerImage.replace(/\\/g, '/');
        imageUrl = normalizedPath.startsWith('offers/')
          ? `${IMAGE_BASE_URL}/uploads/${normalizedPath}`
          : `${IMAGE_BASE_URL}/${normalizedPath}`;
      } else {
        imageUrl = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/Screenshot+From+2026-01-03+21-10-52.png';
      }

      setOffer({
        ...data,
        imageUrl,
        validFrom: data.startDate?.split('T')[0],
        validTo: data.endDate?.split('T')[0],
        approvalStatus: data.status, // <--- Added mapping
      });

      if (data.adminComments) setAdminNotes(data.adminComments);
    } catch (error) {
      console.error('Error fetching offer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to update offer state locally
  const updateOfferState = (updates) => setOffer((prev) => ({ ...prev, ...updates }));

  const handleApprove = async () => {
    try {
      await approveOffer(id, adminNotes);
      updateOfferState({ adminComments: adminNotes, approvalStatus: 'APPROVED' });
    } catch (error) {
      console.error('Error approving offer:', error);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason?.trim()) return;

    try {
      await rejectOffer(id, reason);
      updateOfferState({ rejectionReason: reason, approvalStatus: 'REJECTED' });
    } catch (error) {
      console.error('Error rejecting offer:', error);
    }
  };

  const handleRequestChanges = async () => {
    if (!adminNotes?.trim()) return;

    try {
      await requestChanges(id, adminNotes);
      updateOfferState({ adminComments: adminNotes, approvalStatus: 'CHANGES_REQUESTED' });
    } catch (error) {
      console.error('Error requesting changes:', error);
    }
  };

  const getStatusBadge = () => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CHANGES_REQUESTED: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium ${colors[offer.approvalStatus] || 'bg-gray-100 text-gray-800'}`}>
        {offer.approvalStatus.replace('_', ' ')}
      </span>
    );
  };

  if (loading) return <p className="p-6 text-center">Loading offer details...</p>;
  if (!offer) return <p className="p-6 text-center">Offer not found</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button onClick={() => navigate('/offers')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ChevronLeft size={20} />
        <span>Back to Offers</span>
      </button>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{offer.title}</h1>
          {getStatusBadge()}
        </div>

        {/* Preview + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-lg mb-4">Visual Preview</h3>
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              {!imageError ? (
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  className="w-full h-64 object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100">
                  <img
                    src="https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/Screenshot+From+2026-01-03+21-10-52.png"
                    alt="Default Offer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-gray-500">Offer Name</p>
            <p className="font-medium">{offer.title}</p>

            <p className="text-gray-500">Offer Description</p>
            <p className="font-medium">{offer.description || 'No description provided'}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">Discount Type</p>
                <p className="font-medium">{offer.discountType}</p>
              </div>
              <div>
                <p className="text-gray-500">Discount Value</p>
                <p className="font-medium text-red-500 text-2xl">
                  {offer.discountValue}{offer.discountType === 'PERCENTAGE' ? '%' : '₹'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">Valid From</p>
                <p className="font-medium">{offer.validFrom}</p>
              </div>
              <div>
                <p className="text-gray-500">Valid Until</p>
                <p className="font-medium">{offer.validTo}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">Category</p>
            <p className="font-medium">{offer.categoryId || 'All Categories'}</p>

            <p className="text-gray-500">Minimum Order Value</p>
            <p className="font-medium">₹{offer.minOrderValue || 0}</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div>
          <h3 className="font-bold text-lg mb-2">Terms & Conditions</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{offer.termsConditions || 'No terms and conditions specified'}</p>
        </div>

        {/* Restaurant Details */}
        {offer.restaurant && (
          <div>
            <h3 className="font-bold text-lg mb-2">Restaurant Details</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Name:</span> {offer.restaurant?.profile?.restaurant_name || offer.restaurant?.rest_name}</p>
              <p><span className="text-gray-500">Email:</span> {offer.restaurant?.profile?.contact_email || offer.restaurant?.contact_email}</p>
              <p><span className="text-gray-500">Phone:</span> {offer.restaurant?.profile?.contact_number || offer.restaurant?.contact_number}</p>
              <p><span className="text-gray-500">Address:</span> {offer.restaurant?.address?.address_line_1 || offer.restaurant?.rest_address || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        <div>
          <h3 className="font-bold text-lg mb-2">Admin Notes</h3>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes or feedback for the restaurant..."
            className="w-full p-3 border border-gray-300 rounded-md h-32 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Previous Feedback */}
        {(offer.rejectionReason || offer.adminComments) && (
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            {offer.rejectionReason && (
              <div>
                <p className="text-sm font-medium text-red-600">Rejection Reason:</p>
                <p className="text-sm text-gray-700">{offer.rejectionReason}</p>
              </div>
            )}
            {offer.adminComments && (
              <div>
                <p className="text-sm font-medium text-blue-600">Admin Comments:</p>
                <p className="text-sm text-gray-700">{offer.adminComments}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <button onClick={() => navigate('/offers')} className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Back</button>
          {(offer.approvalStatus === 'PENDING' || offer.approvalStatus === 'CHANGES_REQUESTED') && (
            <>
              <button onClick={handleRequestChanges} className="px-6 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50">Request Changes</button>
              <button onClick={handleReject} className="px-6 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50">Reject Offer</button>
              <button onClick={handleApprove} className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Approve Offer</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferDetails;
