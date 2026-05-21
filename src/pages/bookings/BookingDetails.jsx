// =============================================
// FILE: src/pages/bookings/BookingDetails.jsx
// VIEW ONLY - No action buttons
// =============================================
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ChevronLeft, Calendar, Users, Mail, Phone, MapPin, Clock, CheckCircle, Circle, Printer } from 'lucide-react';
import { getBookingById } from '../../services/api';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Booking_${booking?.bookingNumber || id}`,
  });

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await getBookingById(id);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      CONFIRMED: 'text-green-600',
      ADMIN_VERIFIED: 'text-green-600',
      PENDING: 'text-yellow-600',
      COMPLETED: 'text-blue-600',
      CANCELLED: 'text-red-600',
      SEATED: 'text-purple-600',
    };
    return colors[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
          Booking not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 no-print"
      >
        <ChevronLeft size={20} />
        <span className="ml-1">
          Booking Details - #{booking.bookingNumber || `BOOK${id.substring(0, 5)}`}
        </span>
      </button>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Status Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h1 className={`text-3xl font-bold ${getStatusColor(booking.status)}`}>
            {booking.status}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last Updated: {formatDateTime(booking.updatedAt)}
          </p>

          {booking.eventId && booking.event && (
            <div
              className={`mt-4 border-l-4 p-4 ${booking.event.isAdminVerified
                  ? 'bg-green-50 border-green-400'
                  : 'bg-yellow-50 border-yellow-400'
                }`}
            >
              <p
                className={`font-medium ${booking.event.isAdminVerified ? 'text-green-800' : 'text-yellow-800'
                  }`}
              >
                {booking.event.isAdminVerified ? '✓ Event Verified' : '⚠️ Event Not Verified'}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Event: {booking.event.eventName || 'N/A'}
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Booking Overview</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="text-red-500 mt-1" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Date & Time</p>
                  <p className="font-medium text-gray-900">
                    {booking.bookingDate} at {booking.bookingTime}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="text-red-500 mt-1" size={20} />
                <div>
                  <p className="text-gray-500 text-sm">Number of Guests</p>
                  <p className="font-medium text-gray-900">{booking.numberOfGuests} Guests</p>
                </div>
              </div>
              {booking.specialRequests && (
                <div className="flex items-start space-x-3">
                  <Clock className="text-red-500 mt-1" size={20} />
                  <div>
                    <p className="text-gray-500 text-sm">Special Requests</p>
                    <p className="font-medium text-gray-900">{booking.specialRequests}</p>
                  </div>
                </div>
              )}
              {booking.diningArea && (
                <div>
                  <p className="text-gray-500 text-sm">Dining Area</p>
                  <p className="font-medium text-gray-900">{booking.diningArea.areaName}</p>
                </div>
              )}
              {booking.event && (
                <div>
                  <p className="text-gray-500 text-sm">Event Type</p>
                  <p className="font-medium text-gray-900">{booking.event.eventName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Customer Information</h3>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg text-gray-900">
                  {booking.user?.name || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Customer ID: {booking.user?.id || 'N/A'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="text-red-500" size={16} />
                <p className="text-sm text-gray-700">{booking.user?.email || 'N/A'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="text-red-500" size={16} />
                <p className="text-sm text-gray-700">{booking.user?.mobile || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Restaurant Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Restaurant Information</h3>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg text-gray-900">
                  {booking.restaurant?.rest_name || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  Restaurant ID: {booking.restaurant?.id || 'N/A'}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Mail className="text-red-500 mt-1" size={16} />
                <p className="text-sm text-gray-700">
                  {booking.restaurant?.contact_email || 'N/A'}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Phone className="text-red-500 mt-1" size={16} />
                <p className="text-sm text-gray-700">
                  {booking.restaurant?.contact_number || 'N/A'}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="text-red-500 mt-1" size={16} />
                <p className="text-sm text-gray-700">
                  {booking.restaurant?.rest_address || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Timeline */}
          {booking.timeline?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Booking Timeline</h3>
              <div className="space-y-4">
                {booking.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${item.status === 'completed' ? 'bg-red-100' : 'bg-gray-100'
                        }`}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle className="text-red-500" size={16} />
                      ) : (
                        <Circle className="text-gray-400" size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.event}</p>
                      <p className="text-sm text-gray-500">
                        {item.timestamp ? formatDateTime(item.timestamp) : '[Pending]'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Button */}
      <div className="flex justify-center mt-6 no-print">
        <button
          onClick={handlePrint}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2"
        >
          <Printer size={16} /> Print Details
        </button>
      </div>
    </div>
  );
};

export default BookingDetails;