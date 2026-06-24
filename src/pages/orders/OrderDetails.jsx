import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Mail, Phone, MapPin, CheckCircle, Circle, Printer,
  AlertTriangle, X, Navigation, Store, User, Bike, ChevronDown,
  IndianRupee, Clock, RefreshCw, Download, Ban, RotateCcw,
  Copy, Check, CreditCard, ShoppingBag, FileText, Eye, Loader2,
} from 'lucide-react';
import { getOrderDetails, updateDeliveryStatusByAdmin, getAllDeliveryPartners, reassignOrder, updateOrderStatus, reconcilePayment, refundOrder } from '../../services/api';
import DeliveryMap from '../../components/DeliveryMap';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { isRestaurantAdmin } from '../../utils/auth';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { shouldRunSharedPoll } from '../../utils/requestCoordinator';

const ORDER_REFRESH_INTERVAL = 15000;

const ORDER_TIMELINE_STEPS = [
  { status: 'PLACED', message: 'Order placed successfully' },
  { status: 'ACCEPTED', message: 'Order accepted by restaurant' },
  { status: 'PREPARING', message: 'Restaurant is preparing your order' },
  { status: 'READY', message: 'Order is ready for pickup' },
  { status: 'ASSIGNED', message: 'Delivery executive assigned' },
  { status: 'ON_THE_WAY_TO_RESTAURANT', message: 'Delivery executive is on the way to restaurant' },
  { status: 'REACHED_RESTAURANT', message: 'Delivery executive has reached the restaurant' },
  { status: 'PICKED_UP', message: 'Order picked up by delivery executive' },
  { status: 'ON_THE_WAY', message: 'Delivery executive is on the way to customer' },
  { status: 'DELIVERED', message: 'Order delivered successfully' },
];

const STATUS_ALIASES = {
  NEW: 'PLACED', PENDING: 'PLACED', PENDING_PAYMENT: 'PLACED', CONFIRMED: 'PLACED',
  RESTAURANT_ACCEPTED: 'ACCEPTED', ACCEPTED_BY_RESTAURANT: 'ACCEPTED',
  FOOD_PREPARING: 'PREPARING', BEING_PREPARED: 'PREPARING',
  READY_FOR_PICKUP: 'READY', READY_TO_PICKUP: 'READY',
  PARTNER_ASSIGNED: 'ASSIGNED', DELIVERY_ASSIGNED: 'ASSIGNED',
  ON_WAY_TO_RESTAURANT: 'ON_THE_WAY_TO_RESTAURANT',
  ARRIVED_AT_RESTAURANT: 'REACHED_RESTAURANT', REACHED_PICKUP: 'REACHED_RESTAURANT',
  PICKED: 'PICKED_UP', ORDER_PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'ON_THE_WAY', ON_THE_WAY_TO_CUSTOMER: 'ON_THE_WAY',
  ON_THE_WAY_TO_DELIVERY: 'ON_THE_WAY',
  COMPLETED: 'DELIVERED',
};

const TERMINAL_STATUSES = new Set(['DELIVERED', 'COMPLETED', 'CANCELLED', 'ADMIN_CANCELLED', 'REJECTED', 'FAILED']);
const STATUS_PRIORITY = ORDER_TIMELINE_STEPS.reduce((acc, step, index) => {
  acc[step.status] = index;
  return acc;
}, {});

const LIFECYCLE_STEPS = [
  { status: 'PLACED', label: 'New Order' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'PREPARING', label: 'Preparing' },
  { status: 'READY', label: 'Ready For Pickup' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'ON_THE_WAY_TO_RESTAURANT', label: 'On The Way' },
  { status: 'REACHED_RESTAURANT', label: 'Reached' },
  { status: 'PICKED_UP', label: 'Picked Up' },
  { status: 'ON_THE_WAY', label: 'On The Way' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const ORDER_ACTION_CONFIG = {
  PLACED: {
    restaurant: [
      { label: 'Accept Order', apiStatus: 'accepted', variant: 'primary' },
      { label: 'Reject Order', apiStatus: 'cancelled', variant: 'danger' },
    ],
  },
  ACCEPTED: {
    restaurant: [
      { label: 'Preparing Done', apiStatus: 'preparing', variant: 'primary' },
    ],
    rollback: [
      { label: 'Go Back', apiStatus: 'new_order', variant: 'ghost' },
    ],
  },
  PREPARING: {
    restaurant: [
      { label: 'Ready For Pickup', apiStatus: 'ready_for_pickup', variant: 'primary' },
    ],
    rollback: [
      { label: 'Go Back', apiStatus: 'accepted', variant: 'ghost' },
    ],
  },
  READY: {
    admin: [
      { label: 'Assign Executive', apiStatus: 'assigned', variant: 'primary' },
    ],
  },
  ASSIGNED: {
    admin: [
      { label: 'On The Way To Restaurant', apiStatus: 'on_the_way_to_restaurant', variant: 'primary' },
    ],
  },
  ON_THE_WAY_TO_RESTAURANT: {
    admin: [
      { label: 'Reached Restaurant', apiStatus: 'reached_restaurant', variant: 'primary' },
    ],
  },
  REACHED_RESTAURANT: {
    admin: [
      { label: 'Picked Up', apiStatus: 'picked_up', variant: 'primary' },
    ],
  },
  PICKED_UP: {
    admin: [
      { label: 'Out For Delivery', apiStatus: 'out_for_delivery', variant: 'primary' },
    ],
  },
  ON_THE_WAY: {
    admin: [
      { label: 'Delivered', apiStatus: 'delivered', variant: 'primary' },
    ],
  },
};

const DELIVERY_STATUSES = [
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  { value: 'on_the_way_to_restaurant', label: 'On Way to Restaurant', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'reached_restaurant', label: 'Reached Restaurant', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'picked_up', label: 'Picked Up', color: 'bg-orange-100 text-orange-700' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-100 text-purple-700' },
  { value: 'on_the_way_to_customer', label: 'On Way to Customer', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
];

const CANCEL_REASONS = [
  { label: "Delivery executive unavailable", value: "delivery_executive_unavailable" },
  { label: "Order cannot be fulfilled", value: "order_cannot_be_fulfilled" },
  { label: "Cancelled by admin", value: "cancelled_by_admin" },
  { label: "Customer requested cancellation", value: "customer_requested_cancellation" },
  { label: "Restaurant closed/unavailable", value: "restaurant_closed" },
  { label: "Payment failed", value: "payment_failed" },
  { label: "Suspected fraud", value: "suspected_fraud" },
  { label: "Duplicate order", value: "duplicate_order" },
  { label: "Other", value: "other" },
];

const parseBackendDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) return date;
  const value = String(date).trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : value.replace(' ', 'T'));
};

const formatDateTime = (date) => {
  const parsed = parseBackendDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

const formatTime = (date) => {
  const parsed = parseBackendDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = parseBackendDate(dateStr);
  if (!date || Number.isNaN(date.getTime())) return '';
  const diffMs = now - date;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const toNullableNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatMinutes = (value) => {
  const minutes = toNullableNumber(value);
  if (minutes === null) return '—';
  if (minutes <= 0) return '0 mins';
  return `${minutes} min${minutes === 1 ? '' : 's'}`;
};

const formatVariance = (value) => {
  const minutes = toNullableNumber(value);
  if (minutes === null) return '—';
  if (minutes === 0) return 'On time';
  return `${minutes > 0 ? '+' : ''}${minutes} mins`;
};

const getAppliedDiscount = (order) => order?.applied_discount || order?.appliedDiscount || null;

const getDiscountAmount = (order, priceSummary = {}) => {
  const appliedDiscount = getAppliedDiscount(order);
  // Coupon discounts are stored directly; try those first
  const couponDiscount = Number(
    priceSummary.discount ?? priceSummary.couponDiscount ?? order?.coupon_discount ?? 0,
  );
  if (couponDiscount > 0) return couponDiscount;
  // Offer discounts are stored in applied_discount JSONB (coupon_discount stays 0 for offers)
  return Number(
    appliedDiscount?.billingDiscountAmount ??
      appliedDiscount?.discountAmount ??
      appliedDiscount?.value ??
      0,
  ) || 0;
};

const getStoredTaxAmount = (order, priceSummary = {}) =>
  Number(priceSummary.tax ?? priceSummary.taxes ?? order?.taxes ?? 0) || 0;

const getStoredOrderTotal = (order, priceSummary = {}) =>
  Number(priceSummary.total ?? order?.price ?? order?.totalAmount ?? 0) || 0;

const cleanDisplayValue = (value) => {
  const text = String(value || '').trim();
  if (!text || ['N/A', 'NA', 'NULL', 'UNDEFINED', '-', '—'].includes(text.toUpperCase())) return '';
  return text;
};

const looksLikeCustomerId = (value) => {
  const text = cleanDisplayValue(value);
  if (!text || text.includes('@') || /\s/.test(text)) return false;
  if (/^\+?\d{8,15}$/.test(text)) return false;
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  const lowercaseCount = (text.match(/[a-z]/g) || []).length;
  const digitCount = (text.match(/\d/g) || []).length;
  return text.length >= 8 && lowercaseCount > 0 && (uppercaseCount >= 2 || digitCount > 0);
};

const getCustomerDisplayName = (order) => {
  const info = order?.customerInformation || {};
  const email = cleanDisplayValue(info.email || order?.customer_email || order?.email);
  const customerId = cleanDisplayValue(
    info.customerId || order?.customer || order?.customer_uid || order?.user_uid,
  );
  const rawName = cleanDisplayValue(
    info.name || order?.customer_name || order?.customerName || order?.customer,
  );
  const genericNames = new Set(['CUSTOMER', 'GUEST', 'USER']);
  const emailPrefix = email.includes('@') ? email.split('@')[0] : '';
  const nameIsFallback =
    !rawName ||
    genericNames.has(rawName.toUpperCase()) ||
    rawName === customerId ||
    Boolean(emailPrefix && rawName.toLowerCase() === emailPrefix.toLowerCase()) ||
    looksLikeCustomerId(rawName);

  if (!nameIsFallback) return rawName;
  return email || 'Guest';
};

const usesFinalPriceTaxModel = (order, priceSummary = {}) => {
  const tax = getStoredTaxAmount(order, priceSummary);
  const subtotal = Number(priceSummary.subtotal ?? order?.item_total ?? 0) || 0;
  const discount = getDiscountAmount(order, priceSummary);
  const expectedTax = Number((Math.max(subtotal - discount, 0) * 0.05).toFixed(2));
  return tax > 0 && Math.abs(tax - expectedTax) < 0.02;
};

const getTimelineEntry = (timeline = [], statuses = []) => {
  const statusSet = new Set(statuses.map((status) => String(status).toUpperCase()));
  return timeline.find((entry) => statusSet.has(String(entry?.status || '').toUpperCase()));
};

const getRejectionReason = (order, timeline = []) => {
  const rejectedEntry = getTimelineEntry(timeline, ['REJECTED', 'CANCELLED', 'ADMIN_CANCELLED']);
  return (
    order?.rejectionReason ||
    order?.rejection_reason ||
    order?.rejectReason ||
    order?.reject_reason ||
    order?.cancellationReason ||
    order?.cancellation_reason ||
    order?.cancelReason ||
    order?.cancel_reason ||
    rejectedEntry?.reason ||
    rejectedEntry?.remarks ||
    rejectedEntry?.note ||
    rejectedEntry?.message ||
    ''
  );
};

const ORDER_STATUS_TOOLTIP_MESSAGES = {
  PLACED: 'Waiting for restaurant acceptance.',
  ACCEPTED: 'Accepted by restaurant.',
  PREPARING: 'Food is being prepared.',
  READY: 'Ready for pickup.',
  ASSIGNED: 'Executive assigned.',
  ON_THE_WAY_TO_RESTAURANT: 'Executive is going to restaurant.',
  REACHED_RESTAURANT: 'Executive reached restaurant.',
  PICKED_UP: 'Order picked up.',
  ON_THE_WAY: 'Executive is going to customer.',
  CANCELLED: 'Order cancelled.',
  ADMIN_CANCELLED: 'Cancelled by admin.',
  FAILED: 'Order failed.',
  PENDING_PAYMENT: 'Waiting for payment.',
};

const getOrderStatusTooltip = (order, currentStatus, timeline = []) => {
  if (!order) return '';
  const status = String(currentStatus || '').toUpperCase();

  if (status === 'REJECTED') {
    const reason = getRejectionReason(order, timeline);
    return `Rejected: ${reason || 'No reason provided.'}`;
  }

  if (status === 'DELIVERED' || status === 'COMPLETED') {
    const executiveName =
      order?.deliveryPartnerInformation?.name ||
      order?.deliveryPartnerInformation?.fullName ||
      order?.partner?.label ||
      order?.partner?.name ||
      'the assigned delivery executive';
    return `Delivered by ${executiveName}`;
  }

  return ORDER_STATUS_TOOLTIP_MESSAGES[status] || status.replace(/_/g, ' ').toLowerCase();
};

const getDeliveryExecutiveName = (order) =>
  order?.deliveryPartnerInformation?.name ||
  order?.deliveryPartnerInformation?.fullName ||
  order?.deliveryPartnerName ||
  order?.partner?.label ||
  order?.partner?.name ||
  '';

const getOfferDiscountLabel = (appliedDiscount) => {
  if (!appliedDiscount || appliedDiscount.source !== 'offer') return 'Offer Discount';
  const title = appliedDiscount.title || '';
  const offerType = appliedDiscount.offerType || '';
  const discountType = (appliedDiscount.discountType || '').toUpperCase();
  const discountValue = Number(appliedDiscount.discountValue || 0);
  let suffix = '';
  if (discountValue > 0) {
    const isPercentage =
      discountType === 'PERCENTAGE' ||
      ['PERCENTAGE_DISCOUNT', 'PLATFORM_CAMPAIGN', 'FESTIVAL_OFFER'].includes(offerType);
    suffix = isPercentage ? ` (${discountValue}% off)` : ` (₹${discountValue} off)`;
  }
  return title ? `Offer – ${title}${suffix}` : `Offer${suffix}`;
};

const getFreeOfferItems = (order) => {
  const appliedDiscount = getAppliedDiscount(order);
  return Array.isArray(appliedDiscount?.freeItems) ? appliedDiscount.freeItems : [];
};

const getDeliveryTipAmount = (order, priceSummary = {}) =>
  Number(
    priceSummary.deliveryTip ??
      priceSummary.delivery_tip ??
      order?.deliveryTip ??
      order?.delivery_tip ??
      0,
  ) || 0;

const getItemDisplayName = (item) =>
  item?.name || item?.menu_name || item?.menuName || item?.menu_uid || 'Item';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-gray-400" />}
    </button>
  );
};

const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const prevValue = useRef(0);
  useEffect(() => {
    const start = prevValue.current;
    const end = Number(value);
    const duration = 800;
    const startTime = Date.now();
    prevValue.current = end;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span ref={ref}>{prefix}{Number(display).toFixed(decimals)}{suffix}</span>;
};

const StatusBadge = ({ status, tooltip }) => {
  const map = {
    PLACED: { label: 'Placed', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    ACCEPTED: { label: 'Accepted', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    PREPARING: { label: 'Preparing', color: 'bg-sky-50 text-sky-700 border border-sky-200' },
    READY: { label: 'Ready', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
    ASSIGNED: { label: 'Assigned', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
    ON_THE_WAY_TO_RESTAURANT: { label: 'On Way to Restaurant', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    REACHED_RESTAURANT: { label: 'Reached Restaurant', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    PICKED_UP: { label: 'Picked Up', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
    ON_THE_WAY: { label: 'On Way to Customer', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
    DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border border-red-200' },
    ADMIN_CANCELLED: { label: 'Admin Cancelled', color: 'bg-red-50 text-red-700 border border-red-200' },
    REJECTED: { label: 'Rejected', color: 'bg-red-50 text-red-700 border border-red-200' },
    FAILED: { label: 'Failed', color: 'bg-red-50 text-red-700 border border-red-200' },
    NONE: { label: 'None', color: 'bg-gray-50 text-gray-500 border border-gray-200' },
    REFUNDED: { label: 'Refunded', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    REFUND_FAILED: { label: 'Refund Failed', color: 'bg-red-50 text-red-700 border border-red-200' },
  };
  const s = String(status || '').toUpperCase();
  const info = map[s] || { label: s, color: 'bg-gray-50 text-gray-600 border border-gray-200' };
  return (
    <span className="relative inline-flex group">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${info.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${info.color.includes('emerald') ? 'bg-emerald-500' : info.color.includes('red') ? 'bg-red-500' : info.color.includes('blue') ? 'bg-blue-500' : info.color.includes('indigo') ? 'bg-indigo-500' : info.color.includes('sky') ? 'bg-sky-500' : info.color.includes('purple') ? 'bg-purple-500' : info.color.includes('yellow') ? 'bg-yellow-500' : info.color.includes('orange') ? 'bg-orange-500' : info.color.includes('cyan') ? 'bg-cyan-500' : 'bg-gray-400'}`} />
        {info.label}
      </span>
      {tooltip && (
        <span className="pointer-events-none absolute left-1/2 top-full z-[80] mt-2 w-56 -translate-x-1/2 whitespace-normal rounded-xl border border-gray-200 bg-white p-2.5 text-left opacity-0 shadow-lg shadow-gray-200/60 transition-opacity duration-150 group-hover:opacity-100">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Status Update
          </span>
          <span className="mt-1 block text-[11px] font-medium leading-snug text-gray-700">
            {tooltip}
          </span>
        </span>
      )}
    </span>
  );
};

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStatus, setCancelStatus] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [partnerLocation, setPartnerLocation] = useState(null);
  const [lastPartnerUpdate, setLastPartnerUpdate] = useState(null);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableExecutives, setAvailableExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [loadingExecutives, setLoadingExecutives] = useState(false);
  const reassignPanelRef = useRef(null);

  const [lifecycleUpdating, setLifecycleUpdating] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);

  useEffect(() => {
    if (!proofPreviewUrl) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [proofPreviewUrl]);

  const handleSyncPayment = async () => {
    const razorpayOrderId = order?.razorpay_order_id;
    if (!razorpayOrderId) return;
    setSyncingPayment(true);
    try {
      const res = await reconcilePayment(razorpayOrderId);
      const data = res?.data;
      if (data?.reconciled) {
        toast.success('Payment synced — order marked as paid.');
      } else if (data?.paymentStatus === 'success') {
        toast.success('Payment was already captured.');
      } else {
        toast.error(`Payment not yet captured (status: ${data?.paymentStatus || 'unknown'})`);
      }
      await fetchOrderDetails({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to sync payment status.');
    } finally {
      setSyncingPayment(false);
    }
  };

  const handleConfirmRefund = async () => {
    setRefundLoading(true);
    try {
      await refundOrder(order.orderId);
      toast.success('Refund initiated successfully. Funds will be returned to the customer.');
      setShowRefundModal(false);
      await fetchOrderDetails({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process refund.');
    } finally {
      setRefundLoading(false);
    }
  };

  useEffect(() => {
    if (showReassignModal && reassignPanelRef.current) {
      setTimeout(() => reassignPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  }, [showReassignModal]);

  const normalizeStatus = (status) => {
    const normalized = String(status || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return STATUS_ALIASES[normalized] || normalized;
  };

  const getCurrentOrderStatus = (orderData) => {
    const candidates = [
      orderData?.deliveryPartnerStatus,
      orderData?.deliveryStatus,
      orderData?.restaurantStatus,
      orderData?.orderStatus,
      orderData?.status,
    ];
    const fieldStatuses = candidates
      .map(normalizeStatus)
      .filter((s) => ORDER_TIMELINE_STEPS.some((step) => step.status === s) || TERMINAL_STATUSES.has(s));

    const timeline = Array.isArray(orderData?.orderTimeline) ? orderData.orderTimeline : [];
    const timelineStatuses = timeline
      .map((entry) => normalizeStatus(entry.status))
      .filter((s) => ORDER_TIMELINE_STEPS.some((step) => step.status === s) || TERMINAL_STATUSES.has(s));

    const allStatuses = [...fieldStatuses, ...timelineStatuses];
    const terminal = allStatuses.find((s) => TERMINAL_STATUSES.has(s));
    if (terminal) return terminal;

    const advanced = allStatuses
      .filter((s) => STATUS_PRIORITY[s] !== undefined)
      .sort((a, b) => STATUS_PRIORITY[b] - STATUS_PRIORITY[a])[0];
    if (advanced) return advanced;

    for (const entry of timeline) {
      const s = normalizeStatus(entry.status);
      if (TERMINAL_STATUSES.has(s)) return s;
    }

    return 'PLACED';
  };

  const isActiveOrder = (orderData) => {
    const status = getCurrentOrderStatus(orderData);
    return !TERMINAL_STATUSES.has(status);
  };

  const buildOrderTimeline = (orderData) => {
    const backendTimeline = Array.isArray(orderData?.orderTimeline) ? orderData.orderTimeline : [];
    const timelineByStatus = backendTimeline.reduce((acc, item) => {
      const status = normalizeStatus(item.status);
      acc[status] = item;
      return acc;
    }, {});

    const currentStatus = getCurrentOrderStatus(orderData);
    const currentIndex = ORDER_TIMELINE_STEPS.findIndex((step) => step.status === currentStatus);
    const completedUntil = currentIndex >= 0 ? currentIndex : -1;
    const orderPlacementTimestamp = orderData?.orderSummary?.orderPlacement || orderData?.time || orderData?.createdAt;

    return ORDER_TIMELINE_STEPS.map((step, index) => {
      const backendItem = timelineByStatus[step.status];
      const backendTimestamp = backendItem?.timestamp || backendItem?.createdAt || backendItem?.time || backendItem?.updatedAt || null;
      const isCompleted = Boolean(backendTimestamp) || (completedUntil >= 0 && index <= completedUntil);
      const timestamp = backendTimestamp || (step.status === 'PLACED' ? orderPlacementTimestamp : null);
      return {
        status: step.status,
        message: backendItem?.message || step.message,
        timestamp,
        isCompleted,
        isCurrent: index === currentIndex,
      };
    });
  };

  const fetchOrderDetails = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await getOrderDetails(orderId);
      if (response?.data) {
        setOrder(response.data);
        if (response.data?.partner) {
          setPartnerLocation(response.data.partner);
          setLastPartnerUpdate(Date.now());
        }
      } else {
        setError('Order data not found in response');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to load order details');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchOrderDetails();
    else { setError('No order ID provided'); setLoading(false); }
  }, [orderId, fetchOrderDetails]);

  useEffect(() => {
    if (!orderId || !order || !isActiveOrder(order)) return;
    const pollKey = `order-details-${orderId}`;
    const poll = () => {
      if (shouldRunSharedPoll(pollKey, ORDER_REFRESH_INTERVAL - 1000)) {
        fetchOrderDetails({ silent: true });
      }
    };
    const intervalId = setInterval(poll, ORDER_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [orderId, order, fetchOrderDetails]);

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    try {
      await updateDeliveryStatusByAdmin(orderId, selectedStatus, '');
      await fetchOrderDetails();
      setShowStatusModal(false);
      setSelectedStatus('');
      toast.success('Delivery status updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    const finalStatus = cancelStatus || 'cancelled_by_admin';
    const finalReason = finalStatus === 'other' && customCancelReason.trim() ? customCancelReason.trim() : CANCEL_REASONS.find(r => r.value === finalStatus)?.label || finalStatus;
    if (!finalReason.trim()) { toast.error('Please select or enter a reason'); return; }
    setIsUpdating(true);
    try {
      await updateDeliveryStatusByAdmin(orderId, finalStatus, finalReason);
      await fetchOrderDetails();
      setShowCancelModal(false);
      setCancelStatus('');
      setCustomCancelReason('');
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrderDetails();
      toast.success('Order details refreshed');
    } catch {
      toast.error('Failed to refresh order');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAvailableExecutives = async () => {
    try {
      setLoadingExecutives(true);
      const res = await getAllDeliveryPartners({ status: 'on-duty', limit: 100 });
      setAvailableExecutives(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching partners:", err);
    } finally {
      setLoadingExecutives(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedExecutive) return;
    setIsUpdating(true);
    try {
      await reassignOrder(orderId, selectedExecutive, reassignReason);
      await fetchOrderDetails();
      setShowReassignModal(false);
      setSelectedExecutive('');
      setReassignReason('');
      toast.success('Order successfully reassigned!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    if (!order) return;
    const receiptWindow = window.open('', '_blank');
    const doc = receiptWindow.document;
    const ps = order.priceSummary || {};
    const deliveryTip = getDeliveryTipAmount(order, ps);
    const taxAmount = getStoredTaxAmount(order, ps);
    const finalAmount = getStoredOrderTotal(order, ps);
    const discountAmount = getDiscountAmount(order, ps);
    const taxLabel = usesFinalPriceTaxModel(order, ps) ? 'Tax 5% on final item price' : 'Tax';
    const customerDisplayName = getCustomerDisplayName(order);
    const appliedDiscount = getAppliedDiscount(order);
    const freeItems = getFreeOfferItems(order);
    const printIsOfferDiscount = appliedDiscount?.source === 'offer';
    const printOriginalItemTotal = printIsOfferDiscount
      ? Number(appliedDiscount?.originalItemTotal) || (Number(ps.subtotal || 0) + discountAmount)
      : 0;
    const itemsHtml = (order.items || []).map(item => `
      <tr>
        <td>${getItemDisplayName(item)}${item.variant ? ` (${item.variant})` : ''}</td>
        <td style="text-align:center">x${item.qty}</td>
        <td style="text-align:right">₹${(item.price * item.qty).toFixed(2)}</td>
      </tr>
    `).join('');
    const freeItemsHtml = freeItems.map(item => `
      <tr>
        <td>${item.name || item.menu_name || item.menu_uid || 'Free item'} <span style="font-size:10px;color:#059669;">(Offer free item)</span></td>
        <td style="text-align:center">x${item.qty || 1}</td>
        <td style="text-align:right">FREE</td>
      </tr>
    `).join('');

    const content = `
      <html>
      <head><title>Invoice - #${order.orderId}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 20px; font-size: 12px; }
        h1 { font-size: 16px; text-align: center; }
        .line { border-bottom: 1px dashed #999; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .total { font-size: 14px; font-weight: bold; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #666; }
        @media print { @page { margin: 0; } body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>Zenzio</h1>
        <p style="text-align:center">Order Invoice</p>
        <div class="line"></div>
        <p><strong>Order ID:</strong> #${order.orderId}</p>
        <p><strong>Date:</strong> ${formatDateTime(order.orderSummary?.orderPlacement)}</p>
        <p><strong>Restaurant:</strong> ${order.restaurant_name || ''}</p>
        <div class="line"></div>
        <p><strong>Customer:</strong> ${customerDisplayName}</p>
        <p><strong>Phone:</strong> ${order.customerInformation?.mobile || ''}</p>
        <p><strong>Address:</strong> ${order.customerInformation?.deliveryAddress || ''}</p>
        <div class="line"></div>
        <table>${itemsHtml}${freeItemsHtml}</table>
        ${freeItems.length > 0 ? `<p style="font-size:11px;color:#059669;"><strong>Offer:</strong> ${appliedDiscount?.title || appliedDiscount?.code || 'Free item offer applied'}</p>` : ''}
        <div class="line"></div>
        <table>
          ${printIsOfferDiscount && printOriginalItemTotal > 0 ? `
            <tr><td>Item Total</td><td class="right">₹${printOriginalItemTotal.toFixed(2)}</td></tr>
            <tr style="color:#059669"><td>${getOfferDiscountLabel(appliedDiscount)}</td><td class="right">-₹${discountAmount.toFixed(2)}</td></tr>
            <tr><td>After Offer</td><td class="right">₹${Number(ps.subtotal || 0).toFixed(2)}</td></tr>
          ` : ps.subtotal ? `<tr><td>Subtotal</td><td class="right">₹${ps.subtotal}</td></tr>` : ''}
          ${taxAmount ? `<tr><td>${taxLabel}</td><td class="right">₹${taxAmount}</td></tr>` : ''}
          ${ps.deliveryFee ? `<tr><td>Delivery</td><td class="right">₹${ps.deliveryFee}</td></tr>` : ''}
          ${!printIsOfferDiscount && discountAmount > 0 ? `<tr style="color:#059669"><td>${appliedDiscount?.code ? `Coupon – ${appliedDiscount.code}` : 'Discount'}</td><td class="right">-₹${discountAmount.toFixed(2)}</td></tr>` : ''}
          <tr class="total"><td>TOTAL</td><td class="right">₹${finalAmount}</td></tr>
          ${deliveryTip > 0 ? `<tr><td>Delivery Tip</td><td class="right">${formatCurrency(deliveryTip)}</td></tr>` : ''}
        </table>
        <div class="line"></div>
        <p><strong>Payment:</strong> ${order.paymentMethod || 'N/A'} - ${order.paymentStatus || 'N/A'}</p>
        <div class="footer">Thank you for ordering from Zenzio!</div>
        <script>window.onload=function(){window.print();window.close()}</script>
      </body>
      </html>`;
    doc.write(content);
    doc.close();
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    const ps = order.priceSummary || {};
    const deliveryTip = getDeliveryTipAmount(order, ps);
    const taxAmount = getStoredTaxAmount(order, ps);
    const finalAmount = getStoredOrderTotal(order, ps);
    const discountAmount = getDiscountAmount(order, ps);
    const taxLabel = usesFinalPriceTaxModel(order, ps) ? 'Tax 5% on final item price' : 'Tax';
    const customerDisplayName = getCustomerDisplayName(order);
    const appliedDiscount = getAppliedDiscount(order);
    const freeItems = getFreeOfferItems(order);
    const dlIsOfferDiscount = appliedDiscount?.source === 'offer';
    const dlOriginalItemTotal = dlIsOfferDiscount
      ? Number(appliedDiscount?.originalItemTotal) || (Number(ps.subtotal || 0) + discountAmount)
      : 0;
    const items = (order.items || []).map(item =>
      `${item.qty}x ${item.name}${item.addOns?.length ? ' (+ ' + item.addOns.join(', ') + ')' : ''} - ₹${(item.price * item.qty).toFixed(2)}`
    ).join('\n');
    const freeItemLines = freeItems.map(item =>
      `${item.qty || 1}x ${item.name || item.menu_name || item.menu_uid || 'Free item'} - FREE`
    ).join('\n');
    const invoice = [
      `ZENZIO ORDER INVOICE`,
      `================================`,
      `Order ID: #${order.orderId}`,
      `Date: ${formatDateTime(order.orderSummary?.orderPlacement)}`,
      `Restaurant: ${order.restaurant_name || 'N/A'}`,
      `================================`,
      `CUSTOMER`,
      `Name: ${customerDisplayName}`,
      `Phone: ${order.customerInformation?.mobile || 'N/A'}`,
      `Address: ${order.customerInformation?.deliveryAddress || 'N/A'}`,
      `================================`,
      `ITEMS`,
      items,
      freeItems.length > 0 ? `FREE ITEMS FROM OFFER` : '',
      freeItemLines,
      freeItems.length > 0 ? `Offer: ${appliedDiscount?.title || appliedDiscount?.code || 'Free item offer applied'}` : '',
      `================================`,
      `BILLING`,
      dlIsOfferDiscount && dlOriginalItemTotal > 0
        ? `Item Total: ₹${dlOriginalItemTotal.toFixed(2)}`
        : `Subtotal: ₹${ps.subtotal || 0}`,
      dlIsOfferDiscount && discountAmount > 0
        ? `${getOfferDiscountLabel(appliedDiscount)}: -₹${discountAmount.toFixed(2)}`
        : null,
      dlIsOfferDiscount && dlOriginalItemTotal > 0
        ? `After Offer: ₹${Number(ps.subtotal || 0).toFixed(2)}`
        : null,
      `${taxLabel}: ₹${taxAmount}`,
      `Delivery Fee: ₹${ps.deliveryFee || 0}`,
      !dlIsOfferDiscount && discountAmount > 0
        ? `${appliedDiscount?.code ? `Coupon – ${appliedDiscount.code}` : 'Discount'}: -₹${discountAmount.toFixed(2)}`
        : null,
      `Packaging Charge: ${formatCurrency(ps.packingCharge || 0)}`,
      deliveryTip > 0 ? `Delivery Tip: ${formatCurrency(deliveryTip)}` : '',
      `--------------------------------`,
      `TOTAL: ₹${finalAmount}`,
      `================================`,
      `Payment: ${order.paymentMethod || 'N/A'} - ${order.paymentStatus || 'N/A'}`,
      ``,
      `Thank you for ordering from Zenzio!`,
    ].filter(Boolean).join('\n');

    const blob = new Blob([invoice], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `invoice_${order.orderId}_${new Date().toISOString().split('T')[0]}.txt`);
    toast.success('Invoice downloaded');
  };

  const getLifecycleIndex = (status) => {
    const idx = LIFECYCLE_STEPS.findIndex((step) => step.status === normalizeStatus(status));
    if (idx !== -1) return idx;
    return -1;
  };

  const buildLifecycleTimeline = () => {
    const idx = getLifecycleIndex(currentStatus);
    const isCancelled = TERMINAL_STATUSES.has(currentStatus) && currentStatus !== 'DELIVERED' && currentStatus !== 'COMPLETED';
    const timelineByStatus = {};
    (orderTimeline || []).forEach(step => { timelineByStatus[normalizeStatus(step.status)] = step; });
    return LIFECYCLE_STEPS.map((step, i) => {
      const matched = timelineByStatus[step.status];
      const isCompleted = Boolean(matched?.isCompleted || matched?.timestamp) || (idx >= 0 && i <= idx && !isCancelled);
      const isCurrent = i === idx && !isCancelled;
      return { ...step, timestamp: matched?.timestamp || null, isCompleted, isCurrent };
    });
  };

  const handleOrderAction = async (apiStatus) => {
    setLifecycleUpdating(true);
    try {
      await updateOrderStatus(orderId, apiStatus);
      await fetchOrderDetails();
      const action = Object.values(ORDER_ACTION_CONFIG).flatMap(c => [...(c.restaurant || []), ...(c.admin || [])]).find(a => a.apiStatus === apiStatus);
      toast.success(action?.label ? `${action.label} successfully` : 'Status updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setLifecycleUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-100 animate-skeleton" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-100 rounded animate-skeleton" />
            <div className="h-3 w-32 bg-gray-100 rounded animate-skeleton" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-sm text-gray-500 mb-2">{error || 'The order could not be found.'}</p>
            <p className="text-xs text-gray-400 mb-6">Order ID: {orderId}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={() => navigate('/orders')}>
                <ArrowLeft size={16} /> Back to Orders
              </Button>
              <Button variant="outline" onClick={() => fetchOrderDetails()}>
                <RefreshCw size={16} /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDeliveryPartner = order.deliveryPartnerInformation !== null;
  const currentStatus = getCurrentOrderStatus(order);
  const currentDeliveryStatus = currentStatus.toLowerCase();
  const orderTimeline = buildOrderTimeline(order);
  const orderStatusTooltip = getOrderStatusTooltip(
    order,
    currentStatus,
    orderTimeline,
  );
  const isTerminal = TERMINAL_STATUSES.has(currentStatus);

  const ps = order.priceSummary || {};
  const appliedDiscount = getAppliedDiscount(order);
  const freeItems = getFreeOfferItems(order);
  const deliveryTip = getDeliveryTipAmount(order, ps);
  const taxAmount = getStoredTaxAmount(order, ps);
  const finalAmount = getStoredOrderTotal(order, ps);
  const discountAmount = getDiscountAmount(order, ps);
  const isOfferDiscount = appliedDiscount?.source === 'offer';
  const originalItemTotal = isOfferDiscount
    ? Number(appliedDiscount?.originalItemTotal) || (Number(ps.subtotal || 0) + discountAmount)
    : 0;
  const taxLabel = usesFinalPriceTaxModel(order, ps) ? 'Tax 5% on final item price' : 'Tax';
  const customerDisplayName = getCustomerDisplayName(order);
  const hasJourneyPricing = Boolean(order.delivery_pricing_version);
  const restaurantToCustomerKm = order.restaurant_to_customer_km ?? order.restaurantToCustomerDistance ?? null;
  const totalJourneyKm = order.total_journey_km ?? null;
  const chargedDeliveryFee = order.delivery_charge ?? ps.deliveryFee ?? ps.deliveryCharge ?? 0;
  const eta = order.eta || {};
  const estimatedMinutes = eta.estimatedMinutes ?? order.estimatedMinutes ?? order.estimatedTotalMinutes;
  const remainingMinutes = eta.remainingMinutes ?? order.remainingMinutes;
  const estimatedDeliveryAt = eta.estimatedDeliveryAt ?? order.estimatedDeliveryAt;
  const actualMinutes = eta.actualMinutes ?? order.actualMinutes;
  const varianceMinutes = eta.varianceMinutes ?? order.varianceMinutes;
  const etaDisplay = estimatedMinutes != null
    ? (remainingMinutes != null && !isTerminal ? formatMinutes(remainingMinutes) : formatMinutes(estimatedMinutes))
    : order.deliveryTime;

  const lifecycleSteps = buildLifecycleTimeline();
  const statusConfig = ORDER_ACTION_CONFIG[currentStatus];
  const isAfterAssign = ['READY', 'ASSIGNED', 'ON_THE_WAY_TO_RESTAURANT', 'REACHED_RESTAURANT', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'].includes(currentStatus);
  const deliveryExecutiveName = getDeliveryExecutiveName(order);
  const getConnectorProgress = (step, nextStep, isOrderCancelled) => {
    if (isOrderCancelled) return 0;
    if (nextStep?.isCompleted) return 100;
    if (step?.status === 'ASSIGNED' && step?.isCurrent && deliveryExecutiveName) return 50;
    return 0;
  };
  const currentActions = restaurantAdmin
    ? [...(statusConfig?.restaurant || []), ...(statusConfig?.rollback || [])]
    : (statusConfig?.admin || statusConfig?.restaurant || []);

  // Online order not yet paid — block all actions until payment confirmed
  const isAwaitingPayment =
    (order.payment_mode || '').toUpperCase() === 'ONLINE' &&
    (order.restaurantStatus || '').toLowerCase() === 'pending_payment';

  const showActionCenter = !isTerminal && (currentActions.length > 0 || (restaurantAdmin && isAfterAssign) || isAwaitingPayment);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Awaiting Payment Banner */}
      {isAwaitingPayment && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Awaiting Payment Confirmation</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This online order has not been paid yet. It will appear in the restaurant queue and allow status changes only after payment is confirmed.
            </p>
          </div>
          {order.razorpay_order_id && (
            <button
              onClick={handleSyncPayment}
              disabled={syncingPayment}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 transition-colors border border-amber-300"
            >
              {syncingPayment ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {syncingPayment ? 'Checking…' : 'Check Payment'}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Order #{orderId}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={currentStatus} tooltip={orderStatusTooltip} />
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} />
                Updated {formatRelativeTime(order.lastUpdated || order.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleForceRefresh} loading={refreshing}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
            Print
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadInvoice}>
            Invoice
          </Button>
        </div>
        {/* Mobile actions */}
        <div className="sm:hidden flex items-center gap-1">
          <button onClick={handleForceRefresh} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Refresh">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={handlePrint} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Print">
            <Printer size={16} />
          </button>
          <button onClick={handleDownloadInvoice} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Download Invoice">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* ── Order Summary + Quick Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <Card hover>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Order Summary</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Full order lifecycle and billing information</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">₹<AnimatedCounter value={finalAmount} /></p>
                  <p className="text-xs text-gray-400">{order.paymentMethod || 'N/A'} • {order.paymentStatus || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Order Date</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDateTime(order.orderSummary?.orderPlacement)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Delivery Time</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{etaDisplay || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Payment</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Delivery Status</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 uppercase">{currentDeliveryStatus.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h4>
              <div className="space-y-1.5">
                <motion.button whileHover={{ x: 2 }} onClick={() => { setShowReassignModal(true); fetchAvailableExecutives(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <User size={15} /> {hasDeliveryPartner ? 'Reassign Executive' : 'Assign Executive'}
                </motion.button>
                <motion.button whileHover={{ x: 2 }} onClick={() => setShowStatusModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <RefreshCw size={15} /> Change Delivery Status
                </motion.button>
                <motion.button whileHover={{ x: 2 }} onClick={handleForceRefresh}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                  <RotateCcw size={15} /> Force Refresh Status
                </motion.button>
                <motion.button whileHover={{ x: 2 }} onClick={() => setShowCancelModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                  <Ban size={15} /> Cancel Order
                </motion.button>
                <motion.button whileHover={{ x: 2 }} onClick={handleDownloadInvoice}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  <Download size={15} /> Download Invoice
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Order Action Center ── */}
      {showActionCenter && (
        <div className="mb-6">
          <Card className={isAwaitingPayment ? 'opacity-50 pointer-events-none select-none' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <RefreshCw size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Order Action Center</h3>
                  <p className="text-[11px] text-gray-400">
                    {isAwaitingPayment ? 'Locked — awaiting payment' : restaurantAdmin ? 'Restaurant Controls' : 'Delivery Controls'}
                  </p>
                </div>
              </div>

              {currentStatus === 'PLACED' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Customer</span>
                    <span className="text-sm font-semibold text-gray-900">{customerDisplayName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Items</span>
                    <span className="text-sm font-semibold text-gray-900">{(order.items || []).length} item(s)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-sm font-bold text-gray-900">₹{finalAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Payment</span>
                    <span className="text-sm font-semibold text-gray-900">{order.paymentMethod || '—'}</span>
                  </div>
                  {order.customerInformation?.deliveryAddress && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                      <p className="text-sm text-gray-700">{order.customerInformation.deliveryAddress}</p>
                    </div>
                  )}
                </div>
              )}

              {isAwaitingPayment ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-amber-800">Actions locked until payment is confirmed.</p>
                  <p className="text-xs text-amber-600 mt-1">Once the customer completes payment, this order will become active automatically.</p>
                </div>
              ) : restaurantAdmin && isAfterAssign ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-amber-800">Waiting for delivery executive to accept this order.</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {currentActions.map((action) => (
                    <Button
                      key={action.apiStatus}
                      variant={action.variant}
                      size="sm"
                      onClick={() => handleOrderAction(action.apiStatus)}
                      loading={lifecycleUpdating}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Order Lifecycle Timeline ── */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock size={16} className="text-indigo-500" />
              Order Lifecycle Timeline
            </h3>
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {(() => {
                const isOrderCancelled = TERMINAL_STATUSES.has(currentStatus) && currentStatus !== 'DELIVERED' && currentStatus !== 'COMPLETED';
                return lifecycleSteps.map((step, idx) => {
                  const isAssignedStep = step.status === 'ASSIGNED';
                  const showExecutiveTooltip = isAssignedStep && Boolean(deliveryExecutiveName);
                  const nextStep = lifecycleSteps[idx + 1];
                  const connectorProgress = getConnectorProgress(step, nextStep, isOrderCancelled);

                  return (
                  <React.Fragment key={step.status}>
                    <div
                      className="relative group flex flex-col items-center min-w-[90px]"
                      title={showExecutiveTooltip ? `Delivery executive: ${deliveryExecutiveName}` : undefined}
                    >
                      <motion.div
                        animate={step.isCurrent && !isOrderCancelled ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={step.isCurrent && !isOrderCancelled ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.isCompleted
                          ? 'bg-green-500 text-white'
                          : step.isCurrent && !isOrderCancelled
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                          : isOrderCancelled
                          ? 'bg-red-100 text-red-400'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step.isCurrent && !isOrderCancelled && (
                          <>
                            <motion.span
                              className="absolute inset-0 rounded-full bg-green-400/40"
                              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <motion.span
                              className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300/60"
                              animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          </>
                        )}
                        {step.isCompleted ? <Check size={16} /> : idx + 1}
                      </motion.div>
                      {showExecutiveTooltip && (
                        <div className="pointer-events-none absolute left-1/2 top-[-54px] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-xl group-hover:block">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Delivery Executive</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-900">{deliveryExecutiveName}</p>
                          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-slate-200 bg-white" />
                        </div>
                      )}
                      <p className={`text-[11px] mt-1.5 text-center font-medium leading-tight ${
                        step.isCompleted
                          ? 'text-green-700'
                          : step.isCurrent && !isOrderCancelled
                          ? 'text-blue-700'
                          : isOrderCancelled
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-[9px] text-gray-400 text-center mt-0.5 whitespace-nowrap">
                          {formatTime(step.timestamp)}
                        </p>
                      )}
                      {showExecutiveTooltip && (
                        <p className="mt-0.5 max-w-[82px] truncate text-center text-[9px] font-medium text-emerald-600">
                          Hover for executive
                        </p>
                      )}
                    </div>
                    {idx < lifecycleSteps.length - 1 && (
                      <div className={`relative flex-1 min-w-[16px] h-1 mt-5 overflow-hidden rounded-full ${
                        isOrderCancelled ? 'bg-red-100' : 'bg-gray-200'
                      }`}>
                        {connectorProgress > 0 && (
                          <motion.span
                            className="absolute inset-y-0 left-0 rounded-full bg-green-400"
                            initial={false}
                            animate={{ width: `${connectorProgress}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                          />
                        )}
                        {step.status === 'ASSIGNED' && step.isCurrent && !isOrderCancelled && deliveryExecutiveName && (
                          <motion.span
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-300 via-emerald-500 to-green-300"
                            animate={{ opacity: [0.45, 0.95, 0.45] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ width: '50%' }}
                          />
                        )}
                        {step.isCurrent && !isOrderCancelled && (
                          <motion.span
                            className="absolute inset-y-0 left-0 w-8 rounded-full bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
                            animate={{ x: ['-100%', '220%'] }}
                            transition={{ duration: 1.25, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Delivery Executive Control + Map ── */}
      {hasDeliveryPartner && !restaurantAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 mb-6 items-stretch">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-base text-gray-800 flex items-center gap-2 mb-3">
                <Bike size={18} className="text-indigo-500" />
                Delivery Executive
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Bike size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.deliveryPartnerInformation?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{order.deliveryPartnerInformation?.mobile || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <span className="text-gray-400">Vehicle</span>
                    <p className="font-semibold text-gray-700 mt-0.5">{order.deliveryPartnerInformation?.vehicleType || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <span className="text-gray-400">Number</span>
                    <p className="font-semibold text-gray-700 mt-0.5">{order.deliveryPartnerInformation?.vehicleNumber || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Delivery Status</p>
                    <p className="font-bold text-indigo-700 text-sm mt-0.5 uppercase">{currentDeliveryStatus.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${currentStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {currentStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 min-h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-800">Delivery Route Map</h3>
              <div className="flex items-center gap-2">
                {lastPartnerUpdate && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-live-pulse" />
                    LIVE
                  </span>
                )}
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                  {hasJourneyPricing ? 'Journey pricing' : 'Route view'}
                </span>
              </div>
            </div>
            <DeliveryMap
              partner={partnerLocation || order.partner}
              restaurant={order.restaurant}
              customer={order.customer}
              totalDistance={totalJourneyKm ?? order.totalDistance}
              height="280px"
            />
          </div>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Restaurant Information */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Store size={16} className="text-orange-500" />
                Restaurant Information
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Store size={22} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.restaurant_name || '—'}</p>
                  <p className="text-xs text-gray-500">Restaurant</p>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-gray-700 truncate">{order.restaurantInformation?.email || '—'}</span>
                    <CopyButton text={order.restaurantInformation?.email || ''} />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">{order.restaurantInformation?.mobile || '—'}</span>
                    <CopyButton text={order.restaurantInformation?.mobile || ''} />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{order.restaurantInformation?.address || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                Customer Information
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{customerDisplayName}</p>
                  <p className="text-xs text-gray-500">Customer</p>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-gray-700 truncate">{order.customerInformation?.email || '—'}</span>
                    <CopyButton text={order.customerInformation?.email || ''} />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">{order.customerInformation?.mobile || '—'}</span>
                    <CopyButton text={order.customerInformation?.mobile || ''} />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{order.customerInformation?.deliveryAddress || '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items + Pricing */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-500" />
                Order Items
              </h3>
            </CardHeader>
            <CardContent>
              {(order.items || []).length > 0 ? (
                <div className="space-y-2">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="text-gray-400 mr-1">{item.qty}x</span> {item.name}
                        </p>
                        {item.addOns?.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5">+ {item.addOns.join(', ')}</p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[11px] text-amber-600 mt-0.5 italic">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 ml-4">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No items data available</p>
              )}

              {freeItems.length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      Free item added from offer
                    </p>
                    {(appliedDiscount?.title || appliedDiscount?.code) && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-100 px-2 py-0.5 rounded-full">
                        {appliedDiscount.title || appliedDiscount.code}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {freeItems.map((item, idx) => (
                      <div key={`${item.menu_uid || item.name || 'free'}-${idx}`} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-emerald-900">
                            <span className="text-emerald-600 mr-1">{item.qty || 1}x</span>
                            {item.name || item.menu_name || item.menu_uid || 'Free item'}
                          </p>
                          {item.price > 0 && (
                            <p className="text-[11px] text-emerald-600 mt-0.5">
                              Display value {formatCurrency(item.price)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-white border border-emerald-100 px-2 py-1 rounded-full">
                          FREE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              {ps.subtotal !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
                  {isOfferDiscount && originalItemTotal > 0 ? (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>Item Total</span>
                        <span>₹{originalItemTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>{getOfferDiscountLabel(appliedDiscount)}</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>After Offer</span>
                        <span>₹{Number(ps.subtotal || 0).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{ps.subtotal || 0}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>{taxLabel}</span>
                    <span>₹{taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>₹{chargedDeliveryFee}</span>
                  </div>
                  {ps.packingCharge > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Packaging Charge</span>
                      <span>₹{ps.packingCharge}</span>
                    </div>
                  )}
                  {deliveryTip > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Tip</span>
                      <span>{formatCurrency(deliveryTip)}</span>
                    </div>
                  )}
                  {!isOfferDiscount && discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>
                        {appliedDiscount?.code
                          ? `Coupon – ${appliedDiscount.code}`
                          : 'Discount'}
                      </span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2 text-base">
                    <span>Final Amount</span>
                    <span>₹{finalAmount}</span>
                  </div>
                </div>
              )}

              {/* Distance info */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {restaurantToCustomerKm !== null && (
                  <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600">Restaurant → Customer</p>
                    <p className="text-lg font-bold text-green-700">{Number(restaurantToCustomerKm).toFixed(2)} km</p>
                  </div>
                )}
                {totalJourneyKm !== null && (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Total Journey</p>
                    <p className="text-lg font-bold text-blue-700">{Number(totalJourneyKm).toFixed(2)} km</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-5">

          {/* Current Status */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Status</h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Order Status</span>
                  <StatusBadge status={currentStatus} tooltip={orderStatusTooltip} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Delivery</span>
                  <span className="text-xs font-semibold text-gray-700">{hasDeliveryPartner ? 'Assigned' : 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment</span>
                  <span className={`text-xs font-semibold ${(order.paymentStatus || '').toLowerCase() === 'success' ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {(order.paymentStatus || '').toLowerCase() === 'success' ? 'Paid' : order.paymentStatus || 'Pending'}
                  </span>
                </div>
                {order.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Order ID</span>
                    <span className="text-xs font-mono font-semibold text-gray-700">#{order.orderId}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Executive Info (when no map) */}
          {(!hasDeliveryPartner || restaurantAdmin) && order.deliveryPartnerInformation && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Delivery Executive</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Bike size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.deliveryPartnerInformation?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{order.deliveryPartnerInformation?.mobile || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400">Vehicle</span>
                    <p className="font-semibold text-gray-700">{order.deliveryPartnerInformation?.vehicleType || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-400">Number</span>
                    <p className="font-semibold text-gray-700">{order.deliveryPartnerInformation?.vehicleNumber || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Proof */}
          {order.deliveryProof && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Delivery Proof</h4>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={order.deliveryProof}
                    alt="Delivery Proof"
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setProofPreviewUrl(order.deliveryProof)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-500" />
                Payment Details
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Final Amount</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(finalAmount)}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">Payment Method</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || order.payment_mode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">Payment Status</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.paymentStatus || 'PENDING'} />
                      {order.razorpay_order_id && (order.paymentStatus || '').toLowerCase() !== 'success' && (
                        <button
                          onClick={handleSyncPayment}
                          disabled={syncingPayment}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                          title="Check Razorpay and mark as paid if captured"
                        >
                          {syncingPayment ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                          {syncingPayment ? 'Syncing…' : 'Sync'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">Transaction ID</span>
                    <span className="max-w-[160px] truncate text-xs font-mono font-semibold text-gray-900">
                      {order.transactionId || order.paymentTransactionId || order.razorpay_payment_id || '—'}
                    </span>
                  </div>
                  {order.razorpay_order_id && (
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-xs text-gray-500">Razorpay Order</span>
                      <span className="max-w-[160px] truncate text-xs font-mono font-semibold text-gray-900">
                        {order.razorpay_order_id}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">Refund Status</span>
                    <StatusBadge status={order.refundStatus || 'NONE'} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Map for restaurant admin or when no delivery partner ── */}
      {(restaurantAdmin || !hasDeliveryPartner) && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-gray-800">Delivery Route Map</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Delivery Executive to Restaurant to Customer</p>
                </div>
                <div className="flex items-center gap-2">
                  {lastPartnerUpdate && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-live-pulse" />
                      LIVE
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {hasJourneyPricing ? 'Final journey pricing' : 'Route view'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-stretch">
                <DeliveryMap
                  partner={partnerLocation || order.partner}
                  restaurant={order.restaurant}
                  customer={order.customer}
                  totalDistance={totalJourneyKm ?? order.totalDistance}
                />
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">DE</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Delivery Executive</p>
                      <p className="font-semibold text-gray-900 truncate">{order.deliveryPartnerInformation?.name || order.partner?.label || 'Executive'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">R</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Restaurant</p>
                      <p className="font-semibold text-gray-900 truncate">{order.restaurant_name || 'Restaurant'}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{order.restaurantInformation?.address || ''}</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">C</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Customer</p>
                      <p className="font-semibold text-gray-900 truncate">{customerDisplayName}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{order.customerInformation?.deliveryAddress || ''}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-3 space-y-2">
                    {restaurantToCustomerKm !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Restaurant to Customer</span>
                        <span className="font-bold text-green-700">{Number(restaurantToCustomerKm).toFixed(2)} km</span>
                      </div>
                    )}
                    {(totalJourneyKm !== null) && (
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-100">
                        <span className="text-gray-500">Total Journey</span>
                        <span className="font-bold text-indigo-700">{Number(totalJourneyKm).toFixed(2)} km</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500">Delivery charge</span>
                      <span className="font-bold text-gray-900">₹{chargedDeliveryFee}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Cancel Order Modal ── */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto px-4 py-8" onClick={() => { setShowCancelModal(false); setCancelStatus(''); setCustomCancelReason(''); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-red-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Cancel Order</h3>
                    <p className="text-sm text-gray-500 mt-1">This will notify all connected parties.</p>
                  </div>
                </div>
                <button onClick={() => { setShowCancelModal(false); setCancelStatus(''); setCustomCancelReason(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm text-gray-600">Order ID: <span className="font-semibold text-gray-900">#{order?.orderId}</span></p>
                  <p className="text-sm text-gray-600">Customer: <span className="font-semibold text-gray-900">{customerDisplayName}</span></p>
                  <p className="text-sm text-gray-600">Amount: <span className="font-semibold text-gray-900">₹{finalAmount}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cancellation Reason <span className="text-red-500">*</span></label>
                  <select
                    value={cancelStatus}
                    onChange={(e) => setCancelStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Select a reason</option>
                    {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {cancelStatus === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Specify reason</label>
                    <textarea value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30" placeholder="Enter cancellation reason..." />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => { setShowCancelModal(false); setCancelStatus(''); setCustomCancelReason(''); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" disabled={isUpdating}>Close</button>
                <button onClick={handleCancelOrder} disabled={!cancelStatus.trim() || isUpdating} className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {isUpdating && <Loader2 size={14} className="animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Change Status Modal ── */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto px-4 py-8" onClick={() => { setShowStatusModal(false); setSelectedStatus(''); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <RefreshCw className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Change Delivery Status</h3>
                    <p className="text-sm text-gray-500 mt-1">Update the order state with a clear admin note.</p>
                  </div>
                </div>
                <button onClick={() => { setShowStatusModal(false); setSelectedStatus(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select New Status</label>
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white">
                    <option value="">Select status</option>
                    {DELIVERY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    Status change will notify all connected parties.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => { setShowStatusModal(false); setSelectedStatus(''); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" disabled={isUpdating}>Cancel</button>
                <button onClick={handleStatusChange} disabled={!selectedStatus || isUpdating}
                  className="px-4 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {isUpdating ? 'Updating...' : 'Confirm Change'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* ── Reassign Modal ── */}
      <AnimatePresence>
        {showReassignModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 px-4 py-8" onClick={() => { setShowReassignModal(false); setSelectedExecutive(''); setReassignReason(''); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto flex flex-col max-h-[calc(100vh-4rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <User className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Reassign Order</h3>
                    <p className="text-sm text-gray-500 mt-1">Select a new delivery executive and provide a reason.</p>
                  </div>
                </div>
                <button onClick={() => { setShowReassignModal(false); setSelectedExecutive(''); setReassignReason(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] flex-1 min-h-0 overflow-hidden">
                <div ref={reassignPanelRef} className="p-5 space-y-5 overflow-y-auto border-r border-gray-100">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Order</p>
                    <p className="font-bold text-gray-900 mt-1">#{order.orderId}</p>
                    <p className="text-sm text-gray-600 mt-1 truncate">{customerDisplayName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Store size={16} className="text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-orange-600 font-semibold uppercase">Restaurant</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{order.restaurant_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Bike size={16} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Current</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{order.deliveryPartnerInformation?.name || 'Not assigned'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select New Executive</label>
                    {loadingExecutives ? (
                      <div className="border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm text-gray-500">Loading...</div>
                    ) : (
                      <select value={selectedExecutive} onChange={(e) => setSelectedExecutive(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 bg-white">
                        <option value="">Select delivery executive</option>
                        {availableExecutives.map((p) => (
                          <option key={p.uid} value={p.uid}>
                            {p.profile?.first_name} {p.profile?.last_name} ({p.isActive ? 'Online' : 'Offline'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (Optional)</label>
                    <textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} rows={3} placeholder="Example: executive unavailable, order delayed..."
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30" />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-blue-800 font-semibold flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Previous executive will be notified about the reassignment.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setShowReassignModal(false); setSelectedExecutive(''); setReassignReason(''); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" disabled={isUpdating}>Cancel</button>
                    <button onClick={handleReassign} disabled={!selectedExecutive || isUpdating} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                      {isUpdating ? 'Reassigning...' : 'Confirm Reassign'}
                    </button>
                  </div>
                </div>

                <div className="min-h-0 bg-gray-50 p-4">
                  <div className="h-full rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    <DeliveryMap
                      partner={partnerLocation || order.partner}
                      restaurant={order.restaurant}
                      customer={order.customer}
                      totalDistance={totalJourneyKm ?? order.totalDistance}
                      height="100%"
                      className="h-full min-h-[360px]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delivery Proof Preview */}
      <AnimatePresence>
        {proofPreviewUrl && (
          <div
            className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setProofPreviewUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[82vh] overflow-hidden flex flex-col"
            >
              <div className="h-12 px-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Delivery Proof</p>
                  <p className="text-[11px] text-gray-400">Order #{order?.orderId}</p>
                </div>
                <button
                  onClick={() => setProofPreviewUrl(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  src={proofPreviewUrl}
                  title="Delivery proof preview"
                  scrolling="auto"
                  className="block h-full w-full bg-gray-50"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Confirmation Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => !refundLoading && setShowRefundModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <RotateCcw size={22} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center mb-1">Issue Full Refund</h3>
              <p className="text-sm text-gray-500 text-center mb-1">
                Refund <span className="font-semibold text-gray-900">{formatCurrency(order?.price)}</span> for order{' '}
                <span className="font-mono font-semibold text-gray-900">#{order?.orderId}</span>
              </p>
              {(order?.paymentStatus || '').toLowerCase() !== 'success' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center mb-2">
                  Payment not yet confirmed. Refund will only proceed if payment was captured.
                </p>
              )}
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center mb-5">
                This action is permanent and cannot be undone. The customer will receive a full refund to their original payment method.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  disabled={refundLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRefund}
                  disabled={refundLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refundLoading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  {refundLoading ? 'Processing…' : 'Confirm Refund'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderDetails;
