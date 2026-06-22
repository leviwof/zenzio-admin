import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChefHat, Users, CheckCircle, XCircle, AlertCircle,
  Eye, Trash2, Search, RefreshCw, Plus,
  Lock, Unlock, Star, Coffee, Sun,
  UtensilsCrossed, Moon, ChevronDown,
} from 'lucide-react';
import {
  getHomeFoodProviders,
  activateHomeFoodProvider,
  deactivateHomeFoodProvider,
  deleteHomeFoodProvider,
  rejectHomeFoodProvider,
} from '../../services/api';

// ── constants ──────────────────────────────────────────────────────────────────
const MEAL_STYLES = {
  BREAKFAST: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Coffee },
  LUNCH:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Sun },
  SNACKS:    { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: UtensilsCrossed },
  DINNER:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  icon: Moon },
};
const DAYS_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_ABBR   = { MONDAY:'Mon', TUESDAY:'Tue', WEDNESDAY:'Wed', THURSDAY:'Thu', FRIDAY:'Fri', SATURDAY:'Sat', SUNDAY:'Sun' };
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

// ── helpers ────────────────────────────────────────────────────────────────────
const fmt   = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const unwrap = (res) => res?.data?.data?.items || res?.data?.items || [];

function reviewOf(item) {
  const status = item.review_status || (item.is_active ? 'approved' : 'pending');
  const map = {
    approved: { label: 'Approved', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', icon: XCircle,    cls: 'bg-red-50 text-red-700 border-red-200' },
    pending:  { label: 'Pending',  icon: AlertCircle, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  return { status, ...(map[status] || map.pending) };
}

function menuPreview(weekly_menu) {
  if (!weekly_menu || typeof weekly_menu !== 'object') return [];
  const items = [];
  for (const day of DAYS_ORDER) {
    const meals = weekly_menu[day];
    if (!meals) continue;
    for (const [, dish] of Object.entries(meals)) {
      if (dish) items.push({ day: DAY_ABBR[day] || day, dish: String(dish) });
      if (items.length >= 5) return items;
    }
  }
  return items;
}

// ── small shared UI ────────────────────────────────────────────────────────────
function MealChip({ type }) {
  const s = MEAL_STYLES[type] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: ChefHat };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
      <Icon size={10} />
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

function StatusBadge({ item }) {
  const { label, icon: Icon, cls } = reviewOf(item);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function CapacityBar({ used, total }) {
  const cap   = Math.max(1, Number(total) || 1);
  const pct   = Math.min(100, Math.round((Number(used) || 0) / cap * 100));
  const color = pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="mt-2.5">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-500">Capacity</span>
        <span className="font-bold text-slate-700">{used || 0} / {total || 0} <span className="font-normal text-slate-400">({pct}%)</span></span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── ProviderCard ───────────────────────────────────────────────────────────────
function ProviderCard({ item, expanded, onToggle, blockLoading, onViewDetails, onBlock, onReject, onDelete }) {
  const { status } = reviewOf(item);
  const mealTypes   = Array.isArray(item.meal_types) ? item.meal_types : [];
  const preview     = menuPreview(item.weekly_menu);
  const showPreview = preview.slice(0, 3);
  const moreCount   = preview.length - showPreview.length;

  return (
    <div
      className={`self-start rounded-2xl border shadow-sm transition-[background-color,border-color,box-shadow] duration-200 ${
        expanded
          ? 'border-indigo-400 bg-indigo-50/55 shadow-lg shadow-indigo-100/70 ring-2 ring-indigo-100'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow'
      }`}
    >
      {/* header — always visible, clicking toggles only this card */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors focus:outline-none ${
          expanded ? 'bg-white/70' : ''
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors ${
            expanded ? 'bg-indigo-600 ring-indigo-500' : 'bg-indigo-50 ring-indigo-100'
          }`}
        >
          <ChefHat size={18} className={expanded ? 'text-white' : 'text-indigo-500'} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 leading-snug">
            {item.restaurant_name || item.provider_uid}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusBadge item={item} />
            <span className="text-[10px] text-slate-400">{item.active_subscribers ?? 0} subs</span>
          </div>
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      {/* animated expandable body — grid-rows trick for smooth height */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s ease',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-3.5 pt-3 pb-3 space-y-3">
            {/* quick stats */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-2 text-center">
              <div>
                <p className="text-sm font-bold text-slate-900">{item.active_subscribers ?? 0}</p>
                <p className="text-[10px] text-slate-400">Subscribers</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-sm font-bold text-slate-900">{item.capacity ?? 0}</p>
                <p className="text-[10px] text-slate-400">Capacity</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{Number(item.delivery_radius_km || 0)} km</p>
                <p className="text-[10px] text-slate-400">Radius</p>
              </div>
            </div>

            {/* meal chips */}
            {mealTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {mealTypes.map((t) => <MealChip key={t} type={t} />)}
              </div>
            )}

            {/* capacity bar */}
            <CapacityBar used={item.active_subscribers} total={item.capacity} />

            {/* weekly menu preview */}
            {showPreview.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">This Week</p>
                <ul className="space-y-1">
                  {showPreview.map((entry, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-400 w-7">{entry.day}</span>
                      <span className="truncate">{entry.dish}</span>
                    </li>
                  ))}
                </ul>
                {moreCount > 0 && (
                  <p className="mt-1.5 text-[11px] font-semibold text-indigo-500">+{moreCount} more</p>
                )}
              </div>
            )}

            {/* actions */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Eye size={13} /> View Details
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onBlock(); }}
                disabled={blockLoading}
                title={item.is_active ? 'Block provider' : 'Activate provider'}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  item.is_active
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {blockLoading ? '…' : item.is_active ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
              {status === 'pending' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
        <ChefHat size={32} className="text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-slate-700">
        {hasFilters ? 'No Providers Found' : 'No Providers Yet'}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-400">
        {hasFilters
          ? 'Try changing your filters or search query.'
          : 'Add your first home food provider to get started.'}
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Add Provider
        </button>
      )}
    </div>
  );
}

// ── SkeletonCard ───────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-100" />
        </div>
        <div className="h-4 w-4 rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ── ConfirmModal ───────────────────────────────────────────────────────────────
function ConfirmModal({ dialog, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900">{dialog.title}</h3>
          {dialog.message && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{dialog.message}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={run} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Please wait…' : (dialog.confirmLabel || 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RejectModal ────────────────────────────────────────────────────────────────
function RejectModal({ providerName, onReject, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try { await onReject(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <XCircle size={20} className="text-red-500" />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900">Reject Provider</h3>
          <p className="mt-1 text-sm text-slate-500">{providerName}</p>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection…"
            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={busy || !reason.trim()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? 'Rejecting…' : 'Reject Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconCls }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-900 leading-none">{value ?? '—'}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── ProvidersCardView ──────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function ProvidersCardView({ onAdd, reloadKey = 0 }) {
  const navigate = useNavigate();

  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading]           = useState(true);

  // filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [mealTypeFilter, setMealType] = useState('');
  const [sortBy, setSort]             = useState('newest');
  const [page, setPage]               = useState(1);


  // expanded card
  const [expandedUid, setExpandedUid] = useState(null);

  // actions
  const [blockLoading, setBlockLoading] = useState({});
  const [confirmDialog, setConfirm]     = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  // ── load ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHomeFoodProviders({ limit: 500 });
      setAllProviders(unwrap(res));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  // ── stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       allProviders.length,
    approved:    allProviders.filter((p) => p.review_status === 'approved').length,
    blocked:     allProviders.filter((p) => !p.is_active && p.review_status !== 'pending').length,
    subscribers: allProviders.reduce((s, p) => s + (Number(p.active_subscribers) || 0), 0),
    capacity:    allProviders.reduce((s, p) => s + (Number(p.capacity) || 0), 0),
  }), [allProviders]);

  // ── filter + sort ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allProviders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.restaurant_name || '').toLowerCase().includes(q) ||
        (p.provider_uid || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter === 'approved')       list = list.filter((p) => p.review_status === 'approved');
    else if (statusFilter === 'pending')   list = list.filter((p) => p.review_status === 'pending');
    else if (statusFilter === 'rejected')  list = list.filter((p) => p.review_status === 'rejected');
    else if (statusFilter === 'inactive')  list = list.filter((p) => !p.is_active);
    else if (statusFilter === 'capacity_full') {
      list = list.filter((p) => Number(p.active_subscribers) >= Number(p.capacity));
    }
    if (mealTypeFilter) {
      list = list.filter((p) => Array.isArray(p.meal_types) && p.meal_types.includes(mealTypeFilter));
    }
    if (sortBy === 'newest')      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'subscribers') list.sort((a, b) => (Number(b.active_subscribers) || 0) - (Number(a.active_subscribers) || 0));
    else if (sortBy === 'capacity')    list.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    return list;
  }, [allProviders, search, statusFilter, mealTypeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilter = (setter) => (v) => { setter(v); setPage(1); };

  // ── actions ───────────────────────────────────────────────────────
  const toggleBlock = useCallback(async (item) => {
    const uid = item.provider_uid;
    setBlockLoading((prev) => ({ ...prev, [uid]: true }));
    try {
      if (item.is_active) {
        await deactivateHomeFoodProvider(uid);
        toast.success(`${item.restaurant_name || 'Provider'} blocked`);
      } else {
        await activateHomeFoodProvider(uid);
        toast.success(`${item.restaurant_name || 'Provider'} activated`);
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBlockLoading((prev) => ({ ...prev, [uid]: false }));
    }
  }, [load]);

  const handleReject = useCallback(async (uid, reason) => {
    try {
      await rejectHomeFoodProvider(uid, reason);
      toast.success('Provider rejected');
      setRejectTarget(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  }, [load]);

  const handleDelete = useCallback((item) => {
    setConfirm({
      title:        `Delete "${item.restaurant_name || 'this provider'}"?`,
      message:      'All active subscriptions and deliveries will be cancelled. This cannot be undone.',
      confirmLabel: 'Delete Provider',
      onConfirm:    async () => {
        await deleteHomeFoodProvider(item.provider_uid);
        toast.success('Provider deleted');
        setConfirm(null);
        await load();
      },
    });
  }, [load]);

  // ── render ────────────────────────────────────────────────────────
  return (
    <div>
      {/* summary stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={ChefHat}   label="Total Providers"    value={stats.total}       iconCls="bg-indigo-50 text-indigo-600" />
        <StatCard icon={CheckCircle} label="Approved"         value={stats.approved}    iconCls="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Lock}      label="Blocked/Rejected"   value={stats.blocked}     iconCls="bg-red-50 text-red-500" />
        <StatCard icon={Users}     label="Active Subscribers" value={stats.subscribers} iconCls="bg-blue-50 text-blue-600" />
        <StatCard icon={Star}      label="Total Capacity"     value={stats.capacity}    iconCls="bg-violet-50 text-violet-600" />
      </div>

      {/* filter bar */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => updateFilter(setSearch)(e.target.value)}
              placeholder="Search provider name or UID…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => updateFilter(setStatus)(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
            <option value="capacity_full">Capacity Full</option>
          </select>
          <select
            value={mealTypeFilter}
            onChange={(e) => updateFilter(setMealType)(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All Meal Types</option>
            {MEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => updateFilter(setSort)(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="subscribers">Highest Subscribers</option>
            <option value="capacity">Highest Capacity</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">{filtered.length} provider{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { updateFilter(setSearch)(''); updateFilter(setStatus)(''); updateFilter(setMealType)(''); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Clear filters</button>
            <button onClick={load} disabled={loading} className="rounded-xl border bg-white p-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      {/* card grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : pageItems.length === 0 ? (
        <EmptyState hasFilters={!!(search || statusFilter || mealTypeFilter)} onAdd={onAdd} />
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {pageItems.map((item) => (
            <ProviderCard
              key={item.provider_uid}
              item={item}
              expanded={expandedUid === item.provider_uid}
              onToggle={() => setExpandedUid((u) => u === item.provider_uid ? null : item.provider_uid)}
              blockLoading={!!blockLoading[item.provider_uid]}
              onViewDetails={() => navigate(`/home-foods/providers/${item.provider_uid}`)}
              onBlock={() => toggleBlock(item)}
              onReject={() => setRejectTarget(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-slate-600">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}

      {/* confirm dialog */}
      {confirmDialog && (
        <ConfirmModal
          dialog={confirmDialog}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* reject dialog */}
      {rejectTarget && (
        <RejectModal
          providerName={rejectTarget.restaurant_name || rejectTarget.provider_uid}
          onReject={(reason) => handleReject(rejectTarget.provider_uid, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
