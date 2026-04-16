import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getEventForApproval, approveEvent, rejectEvent } from '../../services/api';

const EventApprovalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching event:', id);
      
      const response = await getEventForApproval(id);
      const eventData = response.data.data;
      
      setEvent(eventData);

      if (eventData.diningArea?.photos) {
        console.log('Photos:', eventData.diningArea.photos);
        eventData.diningArea.photos.forEach((photo, idx) => {
          console.log(`Photo ${idx}: http://localhost:5000${photo}`);
        });
      }

      if (eventData.rejectionReason) {
        setRejectionReason(eventData.rejectionReason);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (event.isAdminVerified) {
      alert('Already approved!');
      return;
    }
    if (!window.confirm('Approve this event?')) return;

    try {
      await approveEvent(id);
      alert('Event approved!');
      navigate('/bookings/approval');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    if (!event.isActive && !event.isAdminVerified) {
      alert('Already rejected!');
      return;
    }

    try {
      await rejectEvent(id, { reason: rejectionReason });
      alert('Event rejected');
      navigate('/bookings/approval');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to reject');
    }
  };

  const getCurrentStatus = () => {
    if (!event) return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    if (event.isAdminVerified && event.isActive) {
      return { text: 'Approved', color: 'bg-green-100 text-green-800' };
    } else if (!event.isAdminVerified && !event.isActive) {
      return { text: 'Rejected', color: 'bg-red-100 text-red-800' };
    } else {
      return { text: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const canModify = () => !event || !event.isAdminVerified;

  const handleImageError = (idx, photoPath) => {
    console.error(`Failed to load image ${idx}:`, photoPath);
    setImageErrors(prev => ({ ...prev, [idx]: true }));
  };

  const handleImageLoad = (idx) => {
    console.log(`Image ${idx} loaded successfully`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
          Event not found
        </div>
      </div>
    );
  }

  const status = getCurrentStatus();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate('/bookings/approval')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft size={20} />
        <span className="ml-1">Dining Content Approval</span>
      </button>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Review Dining Content</h2>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                #{event.id.substring(0, 8)}
              </span>
            </div>

            {event.isAdminVerified && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
                <p className="font-medium text-green-800">✓ Approved</p>
                <p className="text-sm text-green-700 mt-1">Customers can now book</p>
              </div>
            )}

            {!event.isActive && !event.isAdminVerified && event.rejectionReason && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                <p className="font-medium text-red-800">✗ Rejected</p>
                <p className="text-sm text-red-700 mt-1">Reason: {event.rejectionReason}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-blue-600 mb-1">New Marketing Event</h3>
                <p className="text-2xl font-bold text-gray-900">{event.restaurant?.rest_name || 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Event Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Event Name:</span>
                    <p className="font-medium text-gray-900">{event.eventName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p className="text-gray-700">{event.eventDescription || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <p className="font-medium text-gray-900">{event.frequency}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Day/Date:</span>
                      <p className="font-medium text-gray-900">{event.eventDay || event.eventDate || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Times:</span>
                    <p className="font-medium text-gray-900">{event.eventTimes?.join(', ') || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {event.diningArea && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Dining Area</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Area Name:</span>
                      <p className="font-medium text-gray-900">{event.diningArea.areaName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Capacity:</span>
                      <p className="font-medium text-gray-900">{event.diningArea.seatingCapacity} guests</p>
                    </div>
                    {event.diningArea.description && (
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="text-gray-700">{event.diningArea.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {event.diningArea && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Gallery</h4>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {event.diningArea.photos && Array.isArray(event.diningArea.photos) && event.diningArea.photos.length > 0 ? (
                      event.diningArea.photos.map((photo, idx) => {
                        const imageUrl = `http://localhost:5000${photo}`;
                        const hasError = imageErrors[idx];
                        
                        return (
                          <div key={idx} className="flex-shrink-0">
                            {!hasError ? (
                              <img
                                src={imageUrl}
                                alt={`Dining ${idx + 1}`}
                                className="w-24 h-24 rounded object-cover border border-gray-200"
                                onLoad={() => handleImageLoad(idx)}
                                onError={() => handleImageError(idx, photo)}
                              />
                            ) : (
                              <div className="w-24 h-24 bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center">
                                <span className="text-xs text-red-600">Failed</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">No Photos</span>
                      </div>
                    )}
                  </div>
                  {event.diningArea.photos?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">{event.diningArea.photos.length} photo(s)</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {(showRejectModal || event.rejectionReason) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {event.rejectionReason ? 'Rejection Reason' : 'Reason for Rejection'}
              </h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason..."
                disabled={!canModify()}
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Request Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Request ID:</span>
                <p className="font-medium text-gray-900">#REQ-{event.id.substring(0, 5)}</p>
              </div>
              <div>
                <span className="text-gray-600">Submitted:</span>
                <p className="font-medium text-gray-900">
                  {new Date(event.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Restaurant:</span>
                <p className="font-medium text-gray-900">{event.restaurant?.rest_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
            {canModify() ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowRejectModal(!showRejectModal)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                >
                  {showRejectModal ? 'Hide Form' : 'Request Changes'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium"
                >
                  Approve
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">
                  Event {event.isAdminVerified ? 'approved' : 'rejected'}
                </p>
                <button
                  onClick={() => navigate('/bookings/approval')}
                  className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium"
                >
                  Back to List
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && canModify() && (
        <div className="fixed bottom-6 right-6 flex space-x-3 bg-white p-4 rounded-lg shadow-lg border">
          <button
            onClick={() => {
              setShowRejectModal(false);
              if (!event.rejectionReason) setRejectionReason('');
            }}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
};

export default EventApprovalDetails;