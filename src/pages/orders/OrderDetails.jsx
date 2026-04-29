



import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, MapPin, CheckCircle, Circle, Printer, AlertTriangle, X, Navigation } from 'lucide-react';
import { getOrderDetails, updateDeliveryStatusByAdmin, getAllDeliveryPartners, reassignOrder } from '../../services/api';
import DeliveryMap from '../../components/DeliveryMap';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  
  const [contactModal, setContactModal] = useState({ show: false, title: '', data: null });

  
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [loadingPartners, setLoadingPartners] = useState(false);

  
  const DELIVERY_STATUSES = [
    { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
    { value: 'on_the_way_to_restaurant', label: 'On Way to Restaurant', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'picked_up', label: 'Picked Up', color: 'bg-orange-100 text-orange-700' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-100 text-purple-700' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancel Delivery', color: 'bg-red-100 text-red-700' },
    { value: 'admin_cancelled', label: 'Admin Cancelled', color: 'bg-red-100 text-red-700' },
  ];

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getOrderDetails(orderId);

      if (response?.data) {
        setOrder(response.data);
      } else {
        console.error('❌ No data in response:', response);
        setError('Order data not found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      setError(error.response?.data?.message || error.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setError('No order ID provided');
      setLoading(false);
    }
  }, [orderId, fetchOrderDetails]);

  const getDeliveryStatusBadge = (status) => {
    const statusConfig = DELIVERY_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'bg-gray-100 text-gray-700';
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata' 
    });
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;

    const isCancellation = selectedStatus === 'cancelled' || selectedStatus === 'admin_cancelled';
    if (isCancellation && !cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setIsUpdating(true);
    try {
      await updateDeliveryStatusByAdmin(orderId, selectedStatus, cancelReason);
      await fetchOrderDetails(); 
      setShowStatusModal(false);
      setSelectedStatus('');
      setCancelReason('');
      alert('Delivery status updated successfully! All parties have been notified.');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update delivery status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchAvailablePartners = async () => {
    try {
      setLoadingPartners(true);
      const res = await getAllDeliveryPartners({ status: 'on-duty', limit: 100 });
      setAvailablePartners(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching partners:", err);
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedPartner) return;
    setIsUpdating(true);
    try {
      await reassignOrder(orderId, selectedPartner, reassignReason);
      await fetchOrderDetails();
      setShowReassignModal(false);
      setSelectedPartner('');
      setReassignReason('');
      alert('Order successfully reassigned!');
    } catch (error) {
      console.error('Error reassigning:', error);
      alert(error.response?.data?.message || 'Failed to reassign order');
    } finally {
      setIsUpdating(false);
    }
  };

  
  const handlePrint = () => {
    if (!order) return;

    const receiptWindow = window.open('', '_blank');
    const doc = receiptWindow.document;

    const styles = `
      <style>
        body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; }
        .header { text-align: center; margin-bottom: 20px; }
        .store-name { font-size: 20px; font-weight: bold; margin: 0; }
        .store-info { font-size: 12px; margin: 5px 0; }
        .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
        .section-title { font-size: 14px; font-weight: bold; margin: 10px 0 5px; }
        .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
        .item-row { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
        .item-name { flex: 1; }
        .item-qty { width: 30px; text-align: center; }
        .item-price { width: 60px; text-align: right; }
        .total-row { font-weight: bold; font-size: 14px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        @media print {
          @page { margin: 0; }
          body { padding: 20px; }
        }
      </style>
    `;

    const itemsHtml = order.items.map(item => `
      <div class="item-row">
        <span class="item-name">${item.name} ${item.variant ? `(${item.variant})` : ''}</span>
        <span class="item-qty">x${item.qty}</span>
        <span class="item-price">₹${item.price * item.qty}</span>
      </div>
    `).join('');

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Receipt - ${order.orderId}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1 class="store-name">${order.restaurant_name}</h1>
          <p class="store-info">${order.restaurantInformation?.address || ''}</p>
          <p class="store-info">Ph: ${order.restaurantInformation?.mobile || ''}</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="info">
          <div class="row"><span>Order ID:</span> <span>${order.orderId}</span></div>
          <div class="row"><span>Date:</span> <span>${new Date(order.orderSummary.orderPlacement).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <div class="row"><span>Payment:</span> <span>${order.paymentMethod}</span></div>
        </div>

        <div class="divider"></div>

        <div class="customer">
          <div class="section-title">Customer Details</div>
          <div class="row"><span>Name:</span> <span>${order.customerInformation?.name}</span></div>
          <div class="row"><span>Phone:</span> <span>${order.customerInformation?.mobile}</span></div>
          <div class="row"><span>Address:</span> <span style="text-align:right; max-width: 60%">${order.customerInformation?.deliveryAddress}</span></div>
        </div>

        <div class="divider"></div>

        <div class="items">
          <div class="section-title">Items</div>
          ${itemsHtml}
        </div>

        <div class="divider"></div>

        <div class="billing">
          <div class="row"><span>Subtotal</span> <span>₹${order.priceSummary.subtotal}</span></div>
          <div class="row"><span>Tax (5%)</span> <span>₹${order.priceSummary.tax}</span></div>
          <div class="row"><span>Packaging</span> <span>₹${order.priceSummary.packingCharge || 10}</span></div>
          <div class="row"><span>Delivery Fee</span> <span>₹${order.priceSummary.deliveryFee}</span></div>
          ${order.priceSummary.discount > 0 ? `<div class="row"><span>Discount</span> <span>-₹${order.priceSummary.discount}</span></div>` : ''}
          
          <div class="divider"></div>
          
          <div class="row total-row">
            <span>GRAND TOTAL</span>
            <span>₹${order.priceSummary.total}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for ordering from Zenzio!</p>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    doc.write(content);
    doc.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
          <p className="text-sm text-gray-400 mt-2">Order ID: {orderId}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={20} />
          <span className="ml-1">Back to Orders</span>
        </button>

        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-2">
              {error || 'The order you are looking for could not be found.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/orders')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Orders List
              </button>
              <button
                onClick={() => fetchOrderDetails()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasDeliveryPartner = order.deliveryPartnerInformation !== null;
  const currentDeliveryStatus = order.deliveryPartnerInformation ? 'assigned' : 'pending';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {}
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft size={20} />
        <span className="ml-1">Order Details - #ORD{orderId.substring(0, 6).toUpperCase()}</span>
      </button>

      {}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            {/* <h1 className="text-3xl font-bold text-gray-900">
              {order.status.replace('_', ' ')}
            </h1> */}
            <p className="text-sm text-gray-500 mt-1">
              Last Updated: {formatDateTime(order.lastUpdated)}
            </p>
          </div>
          <div className="text-right text-sm space-y-3">
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-medium text-gray-800">{formatDateTime(order.orderSummary.orderPlacement)}</p>
            </div>
            <div>
              <p className="text-gray-500">Delivery Time</p>
              <p className="font-medium text-gray-800">{order.deliveryTime}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment Method</p>
              <p className="font-medium text-gray-800">
                {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online - UPI'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {}
      {hasDeliveryPartner && (
        <div className="bg-white rounded-lg shadow mb-6 p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Delivery Partner Control
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Admin can cancel or change the delivery status. Changes will be reflected across User, Restaurant, and Delivery Partner apps.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReassignModal(true); fetchAvailablePartners(); }}
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 transition-colors font-medium"
              >
                Reassign Partner
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
              >
                Change Delivery Status
              </button>
            </div>
          </div>

          {}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Current Delivery Status</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getDeliveryStatusBadge(currentDeliveryStatus)}`}>
                {currentDeliveryStatus.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="border-l border-gray-300 pl-4">
              <p className="text-sm text-gray-500">Assigned Partner</p>
              <p className="font-medium text-gray-800">{order.deliveryPartnerInformation?.name || 'N/A'}</p>
            </div>
            <div className="border-l border-gray-300 pl-4">
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-medium text-gray-800">
                {order.deliveryPartnerInformation?.vehicleType} • {order.deliveryPartnerInformation?.vehicleNumber}
              </p>
            </div>
          </div>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">ORD{order.orderId.substring(0, 6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Placement:</span>
              <span className="font-medium">{formatDateTime(order.orderSummary.orderPlacement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium text-lg text-gray-900">₹{order.orderSummary.totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="flex items-center">
                <span className="mr-2">💳</span>
                {order.orderSummary.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online - UPI'}
              </span>
            </div>
            {order.orderSummary.discountApplied && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount Applied:</span>
                <span className="font-medium text-green-600">-₹{order.orderSummary.discountApplied}</span>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Restaurant Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-900">{order.restaurant_name}</p>
              <p className="text-xs text-gray-500">Restaurant ID: RES-{order.orderId.substring(0, 5)}</p>
            </div>
            <div className="flex items-start space-x-2">
              <Mail size={16} className="text-red-500 mt-1" />
              <p className="font-medium text-gray-700">{order.restaurantInformation.email}</p>
            </div>
            <div className="flex items-start space-x-2">
              <Phone size={16} className="text-red-500 mt-1" />
              <p className="font-medium text-gray-700">{order.restaurantInformation.mobile}</p>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin size={16} className="text-red-500 mt-1" />
              <p className="font-medium text-gray-700">{order.restaurantInformation.address}</p>
            </div>
            {/* <button className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 mt-2 text-sm font-medium">
              Track Live on Map
            </button> */}
          </div>
        </div>

        {}
        {order.partner && order.restaurant && order.customer && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Delivery Route Map</h3>
            <DeliveryMap
              partner={order.partner}
              restaurant={order.restaurant}
              customer={order.customer}
              totalDistance={order.totalDistance}
            />
          </div>
        )}

        {}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Items Ordered</h3>
          <div className="space-y-3 text-sm mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-700">
                  {item.qty}x {item.name}
                  {item.addOns && item.addOns.length > 0 && (
                    <span className="text-xs text-gray-500 block ml-4">
                      + {item.addOns.join(', ')}
                    </span>
                  )}
                </span>
                <span className="font-medium text-gray-900">₹{item.price}</span>
              </div>
            ))}
          </div>

          {order.priceSummary && (
            <div className="border-t pt-3 mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{order.priceSummary.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax:</span>
                <span>₹{order.priceSummary.tax}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee:</span>
                <span>₹{order.priceSummary.deliveryFee}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Packaging Charge:</span>
                <span>₹{order.priceSummary.packingCharge || 10}</span>
              </div>
              {order.priceSummary.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-₹{order.priceSummary.discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 text-gray-900">
                <span>Total:</span>
                <span>₹{order.priceSummary.total}</span>
              </div>
            </div>
          )}

          {/* ===== Total Distance Traveled ===== */}
          {order.totalDistance !== null && order.totalDistance !== undefined ? (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Total Distance Traveled
              </p>
              <p className="mt-1 text-lg font-bold text-blue-600">
                {Number(order.totalDistance).toFixed(2)} km
              </p>
              <p className="mt-1 text-xs text-blue-500">
                Partner - Restaurant - Customer
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Total Distance
              </p>
              <p className="mt-1 text-lg font-bold text-gray-400">-</p>
            </div>
          )}
        </div>

        {}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Customer Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-900">{order.customerInformation.name}</p>
              <p className="text-xs text-gray-500">Customer ID: {order.customerInformation.customerId.substring(0, 12)}</p>
            </div>
            <div className="flex items-start space-x-2">
              <Mail size={16} className="text-red-500 mt-1" />
              <p className="font-medium text-gray-700">{order.customerInformation.email}</p>
            </div>
            <div className="flex items-start space-x-2">
              <Phone size={16} className="text-red-500 mt-1" />
              <p className="font-medium text-gray-700">{order.customerInformation.mobile}</p>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin size={16} className="text-red-500 mt-1" />
              <div>
                <p className="font-medium text-gray-700">{order.customerInformation.deliveryAddress}</p>
                {}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Delivery Partner Information</h3>
          {order.deliveryPartnerInformation ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900">{order.deliveryPartnerInformation.name}</p>
                <p className="text-xs text-gray-500">Partner ID: {order.deliveryPartnerInformation.partnerId.substring(0, 12)}</p>
              </div>
              <div className="flex items-start space-x-2">
                <Phone size={16} className="text-red-500 mt-1" />
                <p className="font-medium text-gray-700">{order.deliveryPartnerInformation.mobile}</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-gray-600 mt-1">🏍️</span>
                <div>
                  <p className="font-medium text-gray-700">
                    {order.deliveryPartnerInformation.vehicleType} • {order.deliveryPartnerInformation.vehicleNumber}
                  </p>
                </div>
              </div>
              {/* ===== Total Distance Display ===== */}
              {order.totalDistance !== null && order.totalDistance !== undefined ? (
                <div className="flex items-start space-x-2">
                  <Navigation size={16} className="text-blue-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Total Distance Traveled</p>
                    <p className="font-bold text-lg text-blue-600">{Number(order.totalDistance).toFixed(2)} km</p>
                    <p className="text-xs text-gray-400">Partner - Restaurant - Customer</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  <Navigation size={16} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-400">Total Distance</p>
                    <p className="font-bold text-lg text-gray-400">-</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No delivery partner assigned yet</p>
          )}
        </div>

        {}
        {order.deliveryProof && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Delivery Proof</h3>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={order.deliveryProof}
                alt="Delivery Proof"
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(order.deliveryProof, '_blank')}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Click to view full size</p>
            </div>
          </div>
        )}
      </div>

      {}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Order Timeline</h3>
        <div className="space-y-4">
          {order.orderTimeline.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.timestamp ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                {item.timestamp ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <Circle className="text-gray-400" size={20} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${item.timestamp ? 'text-gray-900' : 'text-gray-400'}`}>{item.status}</p>
                  <p className={`text-sm ${item.timestamp ? 'text-gray-500' : 'text-gray-400 italic'}`}>
                    {item.timestamp ? "" : 'Pending'}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${item.timestamp ? 'text-gray-600' : 'text-gray-400'}`}>{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="flex flex-wrap justify-end gap-3 mt-6">
        <button
          onClick={handlePrint}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-2">
          <Printer size={16} /> Print Order Summary
        </button>
        <button
          onClick={() => setContactModal({
            show: true,
            title: 'Contact Restaurant',
            data: {
              name: order.restaurant_name,
              email: order.restaurantInformation?.email || 'N/A',
              mobile: order.restaurantInformation?.mobile || 'N/A',
              address: order.restaurantInformation?.address || 'N/A'
            }
          })}
          className="px-6 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 flex items-center gap-2">
          <Phone size={16} /> Contact Restaurant
        </button>
        <button
          onClick={() => setContactModal({
            show: true,
            title: 'Contact Customer',
            data: {
              name: order.customerInformation?.name || 'Customer',
              email: order.customerInformation?.email || 'N/A',
              mobile: order.customerInformation?.mobile || 'N/A',
              address: order.customerInformation?.deliveryAddress || 'N/A'
            }
          })}
          className="px-6 py-2 border border-green-500 text-green-500 rounded-md hover:bg-green-50 flex items-center gap-2">
          <Phone size={16} /> Contact Customer
        </button>
      </div>

      {}
      {
        showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-lg text-gray-800">Change Delivery Status</h3>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus('');
                    setCancelReason('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">-- Select Status --</option>
                    {DELIVERY_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedStatus === 'cancelled' || selectedStatus === 'admin_cancelled') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter reason for cancellation..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Changing the delivery status will notify:
                  </p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                    <li>Customer (via push notification)</li>
                    <li>Restaurant (via push notification)</li>
                    <li>Delivery Partner (via push notification)</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus('');
                    setCancelReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || isUpdating}
                  className={`px-4 py-2 rounded-md text-white font-medium ${selectedStatus === 'cancelled' || selectedStatus === 'admin_cancelled'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdating ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {}
      {contactModal.show && contactModal.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">{contactModal.title}</h3>
              <button
                onClick={() => setContactModal({ show: false, title: '', data: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                  {contactModal.data.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{contactModal.data.name}</h4>
                  <span className="text-xs text-gray-500">Name</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Phone size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{contactModal.data.mobile}</p>
                  <p className="text-xs text-gray-400">Mobile</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 break-all">{contactModal.data.email}</p>
                  <p className="text-xs text-gray-400">Email</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{contactModal.data.address}</p>
                  <p className="text-xs text-gray-400">Address</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => setContactModal({ show: false, title: '', data: null })}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">Reassign Order</h3>
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedPartner('');
                  setReassignReason('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Partner
                </label>
                {loadingPartners ? (
                  <div className="text-sm text-gray-500">Loading partners...</div>
                ) : (
                  <select
                    value={selectedPartner}
                    onChange={(e) => setSelectedPartner(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Partner --</option>
                    {availablePartners.map((partner) => (
                      <option key={partner.uid} value={partner.uid}>
                        {partner.profile?.first_name} {partner.profile?.last_name} ({partner.isActive ? 'Online' : 'Offline'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Reassignment (Optional)
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Previous partner will be cancelled and notified. New partner will receive assignment Notification.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedPartner('');
                  setReassignReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedPartner || isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
