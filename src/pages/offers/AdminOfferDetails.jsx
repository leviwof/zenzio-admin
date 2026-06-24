import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Loader2, Calendar, Clock, Store, Tag,
  Percent, IndianRupee, Gift, ShoppingCart, ImageOff, X,
  CheckCircle2, XCircle, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminOfferById, deleteAdminOffer } from '../../services/api';

const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?.replace('/api/admin', '')
  .replace('/api', '')
  .replace(/\/+$/, '');

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('offers/')) return `${IMAGE_BASE_URL}/uploads/${path}`;
  return `${IMAGE_BASE_URL}/${path}`;
};

const OFFER_TYPE_LABELS = {
  PERCENTAGE_DISCOUNT: 'Percentage Discount',
  FIXED_AMOUNT_DISCOUNT: 'Fixed Amount',
  BUY_ONE_GET_ONE: 'Buy 1 Get 1',
  BUY_X_GET_Y: 'Buy X Get Y',
  FREE_ITEM_CART_VALUE: 'Free Item (Cart)',
  FREE_ITEM_CATEGORY: 'Free Item (Category)',
  FREE_ITEM_OFFER: 'Free Item',
  CART_VALUE_OFFER: 'Cart Value',
  FESTIVAL_OFFER: 'Festival Offer',
  PLATFORM_CAMPAIGN: 'Platform Campaign',
};

const STATUS_STYLE = {
  ACTIVE:    { pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  INACTIVE:  { pill: 'bg-gray-100 text-gray-500',  dot: 'bg-gray-400' },
  EXPIRED:   { pill: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
  SCHEDULED: { pill: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-500' },
};

const Row = ({ label, value }) => value == null || value === '' ? null : (
  <div className="flex items-start justify-between gap-4 py-3">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-right text-sm font-medium text-gray-800">{value}</span>
  </div>
);

const ConfirmDialog = ({ title, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <Trash2 size={22} className="text-red-500" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-gray-900">Delete Offer?</h3>
      <p className="mb-5 text-sm text-gray-500">
        "<span className="font-medium text-gray-700">{title}</span>" will be permanently deleted.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
          Delete
        </button>
      </div>
    </div>
  </div>
);

const AdminOfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchOffer(); }, [id]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const res = await getAdminOfferById(id);
      setOffer(res.data);
    } catch {
      toast.error('Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAdminOffer(id);
      toast.success('Offer deleted');
      navigate('/offers/existing');
    } catch {
      toast.error('Failed to delete offer');
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const getDiscountLabel = () => {
    if (!offer) return '';
    const t = offer.discountType;
    if (t === 'PERCENTAGE') return `${offer.discountValue}% OFF`;
    if (t === 'FLAT') return `₹${offer.discountValue} OFF`;
    if (t === 'BOGO') return 'Buy 1 Get 1';
    if (t === 'BUY_X_GET_Y') return 'Buy X Get Y';
    if (t === 'FREE_ITEM_CART' || t === 'FREE_ITEM_CATEGORY') return 'Free Item';
    return offer.discountValue ? `${offer.discountValue} OFF` : t;
  };

  const getItemNames = () => {
    if (!offer) return [];
    const bogo = offer.conditions?.bogoItems || offer.rewards?.bogoItems;
    if (Array.isArray(bogo) && bogo.length) {
      return [...new Set(bogo.flatMap(c => [c.buyItemName, c.freeItemName].filter(Boolean)))];
    }
    const names = [
      offer.discountItemNames?.buyItem,
      offer.discountItemNames?.freeItem,
      ...(offer.discountItemNames?.applicableItems || []),
      ...(offer.applicableItemNames || []),
    ].filter(Boolean);
    return [...new Set(names)];
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-red-400" />
          <p className="mt-3 text-sm text-gray-400">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <X className="mx-auto mb-4 h-12 w-12 text-red-300" />
          <h2 className="mb-4 text-xl font-bold text-gray-800">Offer not found</h2>
          <button onClick={() => navigate('/offers/existing')} className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  const imgUrl = getImageUrl(offer.offerImage);
  const statusStyle = STATUS_STYLE[offer.status] || STATUS_STYLE.INACTIVE;
  const itemNames = getItemNames();
  const offerTypeLabel = OFFER_TYPE_LABELS[offer.offerType] || offer.offerType?.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showDelete && (
        <ConfirmDialog
          title={offer.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/offers/existing')}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDelete(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-500 shadow-sm hover:bg-red-50"
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            onClick={() => navigate(`/offers/edit/${id}`)}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
          >
            <Edit size={15} /> Edit Offer
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* Left */}
        <div className="space-y-5">

          {/* Hero card */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {imgUrl && (
              <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                <img
                  src={imgUrl}
                  alt={offer.title}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
            {!imgUrl && (
              <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <Gift size={40} className="text-red-200" />
              </div>
            )}

            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{offer.title}</h1>
                  {offer.offerCode && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-500">
                      <Tag size={13} /> {offer.offerCode}
                    </span>
                  )}
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                  {offer.status}
                </span>
              </div>

              {offer.description && (
                <p className="mb-5 text-sm leading-relaxed text-gray-500">{offer.description}</p>
              )}

              {/* Metric pills */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-red-50 p-4 text-center">
                  <p className="text-xl font-bold text-red-500">{getDiscountLabel()}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Discount</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-xl font-bold text-blue-600">
                    {offer.minOrderValue ? `₹${offer.minOrderValue}` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Min Order</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-4 text-center">
                  <p className="text-xl font-bold text-purple-600">
                    {offer.maxUsagePerUser ?? '∞'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Per User</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-4 text-center">
                  <p className="text-sm font-bold text-orange-600 leading-snug">{offerTypeLabel || '—'}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Type</p>
                </div>
              </div>

              {/* Item chips */}
              {itemNames.length > 0 && (
                <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400">Applicable Items</p>
                  <div className="flex flex-wrap gap-2">
                    {itemNames.map(name => (
                      <span key={name} className="rounded-full border border-orange-100 bg-white px-3 py-1 text-xs font-medium text-orange-700">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          {offer.termsConditions && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Terms & Conditions</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{offer.termsConditions}</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Details */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Offer Details</p>
            <div className="divide-y divide-gray-50">
              <Row
                label="Restaurant"
                value={offer.restaurant?.profile?.restaurant_name || offer.restaurant?.rest_name || 'All Restaurants'}
              />
              <Row label="Category" value={offer.categoryId || 'All Categories'} />
              <Row label="Discount Type" value={offer.discountType === 'PERCENTAGE' ? 'Percentage (%)' : offer.discountType === 'FLAT' ? 'Flat (₹)' : offer.discountType} />
              <Row label="Total Usage Limit" value={offer.totalUsageLimit ?? 'Unlimited'} />
              <Row label="Is Active" value={
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${offer.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                  {offer.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {offer.isActive ? 'Active' : 'Inactive'}
                </span>
              } />
            </div>
          </div>

          {/* Validity */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Validity</p>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center gap-2 py-3 text-sm">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-400">Start</span>
                <span className="ml-auto font-medium text-gray-800">{offer.startDate?.split('T')[0] || '—'}</span>
              </div>
              <div className="flex items-center gap-2 py-3 text-sm">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-400">End</span>
                <span className="ml-auto font-medium text-gray-800">{offer.endDate?.split('T')[0] || '—'}</span>
              </div>
              {(offer.startTime || offer.endTime) && (
                <div className="flex items-center gap-2 py-3 text-sm">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-400">Time</span>
                  <span className="ml-auto font-medium text-gray-800">
                    {offer.startTime || '00:00'} – {offer.endTime || '23:59'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Edit CTA */}
          <button
            onClick={() => navigate(`/offers/edit/${id}`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
          >
            <Edit size={16} /> Edit This Offer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOfferDetails;
