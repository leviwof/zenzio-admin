import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Edit, Trash2, ImageOff, Plus, RefreshCw,
  Loader2, Tag, Store, Calendar, ChevronLeft, ChevronRight,
  Gift, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminOffers, deleteAdminOffer, getAllOffers } from '../../services/api';

const PAGE_SIZE = 10;

const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?.replace('/api/admin', '')
  .replace('/api', '')
  .replace(/\/+$/, '');

const getImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path
    : path.startsWith('offers/') ? `${IMAGE_BASE_URL}/uploads/${path}`
    : `${IMAGE_BASE_URL}/${path}`;
};

const getDiscountLabel = (offer) => {
  const t = offer.discountType;
  if (t === 'PERCENTAGE') return `${offer.discountValue}% OFF`;
  if (t === 'FLAT') return `₹${offer.discountValue} OFF`;
  if (t === 'BOGO') return 'Buy 1 Get 1';
  if (t === 'BUY_X_GET_Y') return 'Buy X Get Y';
  if (t === 'FREE_ITEM_CART' || t === 'FREE_ITEM_CATEGORY') return 'Free Item';
  if (t === 'PLATFORM_CAMPAIGN') return 'Campaign';
  return offer.discountValue ? `${offer.discountValue} OFF` : t;
};

const STATUS_STYLE = {
  ACTIVE:    'bg-green-100 text-green-700',
  INACTIVE:  'bg-gray-100 text-gray-500',
  EXPIRED:   'bg-orange-100 text-orange-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  CHANGES_REQUESTED: 'bg-purple-100 text-purple-700',
};

const Badge = ({ label }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[label] || 'bg-gray-100 text-gray-500'}`}>
    {label?.replace(/_/g, ' ')}
  </span>
);

const getOfferItemSummary = (offer) => {
  const bogoItems = offer.conditions?.bogoItems || offer.rewards?.bogoItems;
  let names = [];
  if (Array.isArray(bogoItems) && bogoItems.length > 0) {
    names = [...new Set(bogoItems.flatMap(c => [c.buyItemName, c.freeItemName].filter(Boolean)))];
  } else {
    names = [
      offer.discountItemNames?.buyItem,
      offer.discountItemNames?.freeItem,
      ...(offer.discountItemNames?.applicableItems || []),
      ...(offer.applicableItemNames || []),
    ].filter(Boolean);
    names = [...new Set(names)];
  }
  if (!names.length) return null;
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  </div>
);

const ConfirmDialog = ({ offer, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <Trash2 size={22} className="text-red-500" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-gray-900">Delete Offer?</h3>
      <p className="mb-5 text-sm text-gray-500">
        "<span className="font-medium text-gray-700">{offer.name}</span>" will be permanently deleted.
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

const ExistingOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('admin');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const apiCall = activeTab === 'admin' ? getAdminOffers : getAllOffers;
      const res = await apiCall({ search: searchText, page, pageSize: PAGE_SIZE });
      const data = res.data?.data || [];
      const count = res.data?.count || 0;
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      setOffers(data.map(o => ({
        id: o.id,
        name: o.title,
        restaurantName: o.restaurant?.profile?.restaurant_name || o.restaurant?.rest_name || 'All Restaurants',
        discountType: o.discountType,
        discountValue: o.discountValue,
        startDate: o.startDate?.split('T')[0],
        endDate: o.endDate?.split('T')[0],
        status: o.status,
        minOrderValue: o.minOrderValue,
        itemSummary: getOfferItemSummary(o),
        offerImage: o.offerImage,
        offerCode: o.offerCode,
      })));
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchText, page]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearchText('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminOffer(deleteTarget.id);
      toast.success('Offer deleted');
      setDeleteTarget(null);
      fetchOffers();
    } catch {
      toast.error('Failed to delete offer');
    } finally {
      setDeleting(false);
    }
  };

  const activeOffers = offers.filter(o => o.status === 'ACTIVE').length;
  const expiredOffers = offers.filter(o => o.status === 'EXPIRED').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {deleteTarget && (
        <ConfirmDialog
          offer={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offers Management</h1>
          <p className="text-sm text-gray-400">Manage and track all promotional offers</p>
        </div>
        {activeTab === 'admin' && (
          <button
            onClick={() => navigate('/offers/create')}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
          >
            <Plus size={16} /> Create Offer
          </button>
        )}
      </div>

      {/* Stat cards — only on admin tab */}
      {activeTab === 'admin' && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Gift}         label="Total Offers"   value={totalCount}    color="bg-red-400" />
          <StatCard icon={CheckCircle2} label="Active"         value={activeOffers}  color="bg-green-500" />
          <StatCard icon={Clock}        label="Expired"        value={expiredOffers} color="bg-orange-400" />
          <StatCard icon={TrendingUp}   label="Showing Page"   value={`${page}/${totalPages}`} color="bg-blue-400" />
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-4">
          <div className="flex gap-1">
            {[
              { key: 'admin', label: 'Admin Offers' },
              { key: 'all',   label: 'All Offers' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-b-2 border-red-500 text-red-500'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOffers}
            className="mb-1 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-5 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by offer name or restaurant..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={36} className="animate-spin text-red-400" />
              <p className="mt-3 text-sm">Loading offers...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <Gift size={28} className="text-gray-300" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-gray-700">No offers found</h3>
              <p className="mb-5 text-sm text-gray-400">
                {searchText ? `No results for "${searchText}"` : 'Create your first offer to get started'}
              </p>
              {activeTab === 'admin' && !searchText && (
                <button
                  onClick={() => navigate('/offers/create')}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
                >
                  <Plus size={15} /> Create Offer
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-3 pl-5">Offer</th>
                      <th className="px-4 py-3">Restaurant</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Validity</th>
                      <th className="px-4 py-3">Status</th>
                      {activeTab === 'admin' && <th className="px-4 py-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {offers.map((offer) => {
                      const imgUrl = getImageUrl(offer.offerImage);
                      return (
                        <tr
                          key={offer.id}
                          onClick={() => navigate(activeTab === 'admin' ? `/offers/admin/${offer.id}` : `/offers/${offer.id}`)}
                          className="group cursor-pointer transition-colors hover:bg-red-50/40"
                        >
                          {/* Offer info */}
                          <td className="px-4 py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={offer.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ImageOff size={16} className="text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-800">{offer.name}</p>
                                {offer.offerCode && (
                                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-500">
                                    <Tag size={9} /> {offer.offerCode}
                                  </span>
                                )}
                                {offer.itemSummary && (
                                  <p className="truncate text-xs text-gray-400">{offer.itemSummary}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Restaurant */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Store size={13} className="flex-shrink-0 text-gray-400" />
                              <span className="max-w-[140px] truncate text-sm">{offer.restaurantName}</span>
                            </div>
                            {offer.minOrderValue > 0 && (
                              <p className="mt-0.5 text-xs text-gray-400">Min ₹{offer.minOrderValue}</p>
                            )}
                          </td>

                          {/* Discount */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-500">
                              {getDiscountLabel(offer)}
                            </span>
                          </td>

                          {/* Validity */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar size={12} className="flex-shrink-0 text-gray-400" />
                              <span>{offer.startDate || '—'}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                              <span className="ml-3.5">→ {offer.endDate || '—'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <Badge label={offer.status} />
                          </td>

                          {/* Actions — admin tab only */}
                          {activeTab === 'admin' && (
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => navigate(`/offers/edit/${offer.id}`)}
                                  title="Edit"
                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(offer)}
                                  title="Delete"
                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                  disabled={deleting}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Page <span className="font-medium text-gray-700">{page}</span> of <span className="font-medium text-gray-700">{totalPages}</span>
                    {' '}· <span className="font-medium text-gray-700">{totalCount}</span> total
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-red-500 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExistingOffers;
