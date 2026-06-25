import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProvidersCardView from './ProvidersCardView';
import toast from 'react-hot-toast';
import {
  Activity, AlertTriangle, CalendarDays, Camera, ChefHat, CircleDollarSign,
  PackageCheck, Plus, RefreshCw, Search, Store, Trash2, Users, X,
} from 'lucide-react';
import {
  cancelHomeFoodClosure,
  createMenuByAdminWithImage,
  createCloudKitchen,
  uploadProviderProfileImage,
  createHomeFoodClosure,
  createHomeFoodPlan,
  deleteMenu,
  deleteHomeFoodDelivery,
  deleteHomeFoodPlan,
  deleteHomeFoodProvider,
  deleteHomeFoodSubscription,
  activateHomeFoodProvider,
  deactivateHomeFoodProvider,
  rejectHomeFoodProvider,
  getHomeFoodAnalytics,
  getHomeFoodClosures,
  getHomeFoodDeliveries,
  getHomeFoodKitchenMenus,
  getHomeFoodPlans,
  getHomeFoodProviderSettings,
  getHomeFoodProviders,
  getHomeFoodSubscriptions,
  saveHomeFoodProviderSettings,
  editMenuByAdminWithImage,
  updateHomeFoodDelivery,
  updateHomeFoodClosure,
  updateHomeFoodPlan,
  updateHomeFoodSubscription,
} from '../../services/api';

const sections = {
  providers: { title: 'Home Foods Providers', subtitle: 'Onboard and configure subscription kitchens.' },
  plans: { title: 'Subscription Plans', subtitle: 'Restaurant-owned plans and pricing.' },
  subscriptions: { title: 'Subscriptions', subtitle: 'Customer subscription and payment lifecycle.' },
  deliveries: { title: 'Deliveries', subtitle: 'Daily meal fulfillment operations.' },
  menus: { title: 'Kitchens Menu', subtitle: 'Search provider menus and schedule Home Foods dishes.' },
  analytics: { title: 'Home Foods Analytics', subtitle: 'Platform-wide subscription performance.' },
};

const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const planTypes = ['TRIAL', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY'];
const planDurationDays = {
  TRIAL: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  HALF_YEARLY: 180,
};
const deliveryStatuses = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'MISSED', 'SKIPPED', 'CANCELLED'];
const workingDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const mealSlotAvailability = (slot) => {
  const selected = String(slot || '').toLowerCase();
  return {
    breakfast: selected.includes('breakfast'),
    lunch: selected.includes('lunch'),
    snacks: selected.includes('snack'),
    dinner: selected.includes('dinner'),
  };
};

const unwrapItems = (response) => response?.data?.items || response?.data?.data?.items || [];
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const Status = ({ value }) => {
  const positive = ['ACTIVE', 'SUCCESS', 'DELIVERED'].includes(String(value).toUpperCase());
  const negative = ['CANCELLED', 'FAILED', 'MISSED', 'INACTIVE'].includes(String(value).toUpperCase());
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
      positive ? 'bg-emerald-50 text-emerald-700' :
      negative ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
    }`}>
      {String(value ?? '—')}
    </span>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={17} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

function useConfirm() {
  const [dialog, setDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const confirm = useCallback((config) => setDialog(config), []);
  const handleConfirm = useCallback(async () => {
    if (!dialog) return;
    setConfirmLoading(true);
    try { await dialog.onConfirm(); } finally {
      setConfirmLoading(false);
      setDialog(null);
    }
  }, [dialog]);
  const handleCancel = useCallback(() => setDialog(null), []);
  return { dialog, confirmLoading, confirm, handleConfirm, handleCancel };
}

const ConfirmDialog = ({ dialog, confirmLoading, onConfirm, onCancel }) => {
  if (!dialog) return null;
  const isDanger = dialog.danger !== false;
  const Icon = isDanger ? Trash2 : AlertTriangle;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${isDanger ? 'bg-red-50' : 'bg-amber-50'}`}>
            <Icon size={20} className={isDanger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-900">{dialog.title}</h3>
          {dialog.message && (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{dialog.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={confirmLoading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLoading ? 'Please wait…' : (dialog.confirmLabel || 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

function RejectProviderDialog({ open, onReject, onCancel }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try { await onReject(reason.trim()); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <X size={20} className="text-red-500" />
          </div>
          <h3 className="text-[15px] font-semibold text-slate-900">Reject Provider</h3>
          <p className="mt-1 text-sm text-slate-500">Provide a reason so the provider knows what to fix.</p>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Identity proof not clear"
            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={loading || !reason.trim()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Rejecting…' : 'Reject Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

const updateWeeklyMenu = (weeklyMenu, day, meal, value) => {
  const next = { ...(weeklyMenu || {}) };
  const dayMenu = { ...(next[day] || {}) };
  const normalized = value.trim();

  if (normalized) dayMenu[meal] = value;
  else delete dayMenu[meal];

  if (Object.keys(dayMenu).length) next[day] = dayMenu;
  else delete next[day];

  return next;
};

export default function HomeFoodsManagement() {
  const location = useLocation();
  const section = location.pathname.split('/').filter(Boolean).pop() || 'providers';
  const copy = sections[section] || sections.providers;
  const [homeFoodsLabel, setHomeFoodsLabel] = useState('Home Foods');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    search: '', status: '', mode: '', provider_uid: '', plan_type: '',
    payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
  });
  const [modal, setModal] = useState(null);
  const [providerReloadKey, setProviderReloadKey] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [weeklyMenuProviders, setWeeklyMenuProviders] = useState([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHomeFoodsLabel((current) => (
        current === 'Home Foods' ? 'Cloud Kitchen' : 'Home Foods'
      ));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const animatedCopy = useMemo(() => ({
    title: copy.title.replace(/Home Foods/g, homeFoodsLabel),
    subtitle: copy.subtitle.replace(/Home Foods/g, homeFoodsLabel),
  }), [copy, homeFoodsLabel]);

  useEffect(() => {
    setPage(1);
    setSelectedPlanIds([]);
    setFilters({
      search: '', status: '', provider_uid: '', plan_type: '',
      payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
    });
  }, [section]);

  const load = useCallback(async () => {
    // providers section is fully managed by ProvidersCardView
    if (section === 'providers') return;
    setLoading(true);
    try {
      if (section === 'analytics') {
        const response = await getHomeFoodAnalytics();
        setAnalytics(response.data?.data || {});
        setItems([]);
        setWeeklyMenuProviders([]);
        return;
      }
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
      );
      if (['providers', 'plans', 'deliveries'].includes(section)) {
        params.page = page;
        params.limit = pageSize;
      }
      if (section === 'deliveries' && params.status) {
        params.status = deliveryStatuses.includes(params.status) ? params.status : '';
      }
      if (section === 'menus') {
        const [providersResponse, dishesResponse] = await Promise.all([
          getHomeFoodProviders({ limit: 100 }),
          getHomeFoodKitchenMenus(params),
        ]);
        setWeeklyMenuProviders(unwrapItems(providersResponse));
        setItems(unwrapItems(dishesResponse));
        setMeta(dishesResponse.data?.meta || {});
        return;
      }
      const loaders = {
        providers: getHomeFoodProviders,
        plans: getHomeFoodPlans,
        subscriptions: getHomeFoodSubscriptions,
        deliveries: getHomeFoodDeliveries,
        closures: getHomeFoodClosures,
      };
      const response = await loaders[section](params);
      setItems(unwrapItems(response));
      setMeta(response.data?.meta || {});
      setWeeklyMenuProviders([]);
      if (section === 'plans') {
        setSelectedPlanIds((current) => {
          const visibleIds = new Set(unwrapItems(response).map((item) => item.id));
          return current.filter((id) => visibleIds.has(id));
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load Home Foods data');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, section]);

  useEffect(() => { load(); }, [load]);

  const updateFilters = useCallback((updater) => {
    setPage(1);
    setFilters(updater);
  }, []);

  const sectionModalType = {
    providers: 'provider',
    plans: 'plan',
    subscriptions: 'subscription',
    deliveries: 'delivery',
    menus: 'kitchenDish',
  }[section];
  const openCreate = () => {
    setModal({
      type: sectionModalType,
      providerUid: section === 'menus' ? filters.provider_uid : undefined,
    });
  };

  const [blockLoading, setBlockLoading] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();

  const selectablePlanIds = useMemo(
    () => section === 'plans'
      ? items
        .filter((item) => !Number(item.paid_subscriber_count || 0))
        .map((item) => item.id)
        .filter(Boolean)
      : [],
    [items, section],
  );
  const selectedPlanIdSet = useMemo(() => new Set(selectedPlanIds), [selectedPlanIds]);
  const allSelectablePlansSelected =
    selectablePlanIds.length > 0 && selectablePlanIds.every((id) => selectedPlanIdSet.has(id));
  const selectedPlanCount = selectedPlanIds.length;

  const togglePlanSelection = useCallback((planId, checked) => {
    setSelectedPlanIds((current) => {
      if (checked) return current.includes(planId) ? current : [...current, planId];
      return current.filter((id) => id !== planId);
    });
  }, []);

  const toggleAllPlans = useCallback((checked) => {
    setSelectedPlanIds(checked ? selectablePlanIds : []);
  }, [selectablePlanIds]);

  const bulkDeleteSelectedPlans = useCallback(() => {
    const plansById = new Map(items.map((item) => [item.id, item]));
    const deletableIds = selectedPlanIds.filter((id) => !Number(plansById.get(id)?.paid_subscriber_count || 0));

    if (!deletableIds.length) {
      toast.error('No deletable plans selected');
      return;
    }

    confirm({
      title: `Delete ${deletableIds.length} selected plan${deletableIds.length > 1 ? 's' : ''}?`,
      message: 'Selected plans will be permanently removed. Plans with paid subscribers are automatically protected.',
      confirmLabel: `Delete ${deletableIds.length} Plan${deletableIds.length > 1 ? 's' : ''}`,
      onConfirm: async () => {
        const failed = [];
        for (const id of deletableIds) {
          try {
            await deleteHomeFoodPlan(id);
          } catch (error) {
            failed.push(plansById.get(id)?.name || id);
          }
        }

        setSelectedPlanIds([]);
        await load();

        if (failed.length) {
          toast.error(`Could not delete: ${failed.join(', ')}`);
        } else {
          toast.success(`${deletableIds.length} plan${deletableIds.length > 1 ? 's' : ''} deleted`);
        }
      },
    });
  }, [confirm, items, load, selectedPlanIds]);

  const toggleProviderBlock = async (item) => {
    const uid = item.provider_uid;
    const isCurrentlyActive = item.is_active;
    setBlockLoading((prev) => ({ ...prev, [uid]: true }));
    try {
      if (isCurrentlyActive) {
        await deactivateHomeFoodProvider(uid);
        toast.success(`${item.restaurant_name || 'Provider'} blocked`);
      } else {
        await activateHomeFoodProvider(uid);
        toast.success(`${item.restaurant_name || 'Provider'} unblocked`);
      }
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update provider status');
    } finally {
      setBlockLoading((prev) => ({ ...prev, [uid]: false }));
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    try {
      await rejectHomeFoodProvider(rejectTarget.provider_uid, reason);
      toast.success(`${rejectTarget.restaurant_name || 'Provider'} rejected`);
      setRejectTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject provider');
    }
  };

  const updateDelivery = async (id, status) => {
    try {
      await updateHomeFoodDelivery(id, { status });
      toast.success('Delivery status updated');
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Update failed'); }
  };

  const cancelSubscription = async (id) => {
    const reason = window.prompt('Cancellation reason');
    if (!reason) return;
    await updateHomeFoodSubscription(id, { status: 'CANCELLED', reason });
    toast.success('Subscription cancelled');
    load();
  };

  const approveSubscription = (id) => {
    confirm({
      title: 'Approve this subscription?',
      message: 'Payment will be marked as successful and the subscription will become active.',
      confirmLabel: 'Approve',
      danger: false,
      onConfirm: async () => {
        try {
          await updateHomeFoodSubscription(id, { status: 'ACTIVE' });
          toast.success('Subscription approved');
          load();
        } catch (error) {
          const message = error.response?.data?.message;
          toast.error(Array.isArray(message) ? message.join(', ') : message || 'Approval failed');
        }
      },
    });
  };

  const extendSubscription = async (id) => {
    const days = Number(window.prompt('Extend by how many days?', '7'));
    if (!Number.isInteger(days) || days < 1) return;
    await updateHomeFoodSubscription(id, { extend_days: days });
    toast.success('Subscription extended');
    load();
  };

  const headers = useMemo(() => ({
    providers: ['Restaurant', 'Status', 'Mode', 'Capacity', 'Active Subscribers', 'Radius', 'Meal Types', 'Created', 'Actions'],
    plans: ['Select', 'Plan', 'Type', 'Restaurant', 'Duration', 'Price', 'Meal Types', 'Plan Menu', 'Status', 'Actions'],
    subscriptions: ['Subscription', 'Customer', 'Phone', 'Restaurant', 'Plan', 'Amount', 'Status', 'Payment', 'Dates', 'Actions'],
    deliveries: ['Delivery', 'Subscription', 'Customer', 'Restaurant', 'Meal', 'Date', 'Status', 'Actions'],
    menus: ['Image', 'Title', 'Provider', 'Description', 'Week Days', 'Meal Slot', 'Actions'],
  })[section] || [], [section]);

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Platform Control</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{animatedCopy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{animatedCopy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-xl border bg-white p-2.5 text-slate-500 hover:bg-slate-50"><RefreshCw size={17} /></button>
          {['providers', 'plans', 'menus'].includes(section) && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus size={16} /> Add {section === 'providers' ? 'Provider' : section === 'plans' ? 'Plan' : 'Dish'}
            </button>
          )}
        </div>
      </div>

      {section === 'analytics' ? (
        <Analytics data={analytics} loading={loading} />
      ) : section === 'providers' ? (
        <ProvidersCardView onAdd={openCreate} reloadKey={providerReloadKey} />
      ) : (
        <>
          <PageFilters
            section={section}
            filters={filters}
            setFilters={updateFilters}
            total={section === 'menus' ? undefined : (meta.total ?? items.length)}
            menuProviders={weeklyMenuProviders}
          />
          {section === 'plans' && selectedPlanCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-bold text-red-800">
                  {selectedPlanCount} plan{selectedPlanCount > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-red-600">Bulk delete will skip plans that have paid subscribers.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanIds([])}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={bulkDeleteSelectedPlans}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>
              </div>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b bg-slate-50/80">
                  <tr>{headers.map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {section === 'plans' && header === 'Select' ? (
                        <input
                          type="checkbox"
                          checked={allSelectablePlansSelected}
                          disabled={!selectablePlanIds.length}
                          onChange={(event) => toggleAllPlans(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                          aria-label="Select all deletable plans"
                        />
                      ) : header}
                    </th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={headers.length} className="p-12 text-center text-sm text-slate-400">Loading…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={headers.length} className="p-12 text-center text-sm text-slate-400">No records found.</td></tr>
                  ) : items.map((item) => (
                    <Row
                      key={item.id || item.provider_uid}
                      section={section}
                      item={item}
                      onEdit={() => setModal({ type: sectionModalType, item })}
                      selected={section === 'plans' && selectedPlanIdSet.has(item.id)}
                      onSelectPlan={(checked) => togglePlanSelection(item.id, checked)}
                      onDelivery={updateDelivery}
                      onCancelSubscription={cancelSubscription}
                      onApproveSubscription={approveSubscription}
                      onExtendSubscription={extendSubscription}
                      onBlockProvider={() => toggleProviderBlock(item)}
                      blockLoading={!!blockLoading[item.provider_uid]}
                      onRejectProvider={() => setRejectTarget(item)}
                      onDeleteProvider={() => confirm({
                        title: `Delete "${item.restaurant_name || 'this provider'}"?`,
                        message: 'All active subscriptions and deliveries will be cancelled. This cannot be undone.',
                        confirmLabel: 'Delete Provider',
                        onConfirm: async () => {
                          await deleteHomeFoodProvider(item.provider_uid);
                          toast.success('Provider deleted');
                          load();
                        },
                      })}
                      onDeletePlan={() => confirm({
                        title: `Delete plan "${item.name}"?`,
                        message: 'This plan will be permanently removed.',
                        confirmLabel: 'Delete Plan',
                        onConfirm: async () => {
                          try {
                            await deleteHomeFoodPlan(item.id);
                            toast.success('Plan deleted');
                            load();
                          } catch (err) {
                            const msg = err?.response?.data?.message;
                            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not delete plan');
                          }
                        },
                      })}
                      onDeleteSubscription={() => confirm({
                        title: 'Delete this subscription?',
                        message: 'Future deliveries will be cancelled.',
                        confirmLabel: 'Delete',
                        onConfirm: async () => {
                          await deleteHomeFoodSubscription(item.id);
                          toast.success('Subscription deleted');
                          load();
                        },
                      })}
                      onDeleteDelivery={() => confirm({
                        title: 'Delete this delivery record?',
                        confirmLabel: 'Delete',
                        onConfirm: async () => {
                          await deleteHomeFoodDelivery(item.id);
                          toast.success('Delivery deleted');
                          load();
                        },
                      })}
                      onCancelClosure={() => confirm({
                        title: 'Delete this closure?',
                        confirmLabel: 'Delete',
                        onConfirm: async () => {
                          await cancelHomeFoodClosure(item.id);
                          toast.success('Closure deleted');
                          load();
                        },
                      })}
                      onDeleteMenu={() => confirm({
                        title: `Delete dish "${item.menu_name}"?`,
                        message: 'This dish will be removed from the kitchen menu.',
                        confirmLabel: 'Delete Dish',
                        onConfirm: async () => {
                          await deleteMenu(item.menu_uid);
                          toast.success('Kitchen dish deleted');
                          load();
                        },
                      })}
                      onToggleHomeFoodMenu={async (enabled) => {
                        const payload = new FormData();
                        payload.append('is_home_food_item', String(enabled));
                        await editMenuByAdminWithImage(item.menu_uid, payload);
                        toast.success(enabled ? 'Dish added to Home Foods' : 'Dish removed from Home Foods');
                        load();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {section === 'menus' && (
            <ProviderWeeklyMenus providers={weeklyMenuProviders} filters={filters} />
          )}
          {['plans', 'deliveries'].includes(section) && (
            <ListPagination
              meta={meta}
              page={page}
              pageSize={pageSize}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPage(1);
                setPageSize(value);
              }}
            />
          )}
        </>
      )}

      <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
      <RejectProviderDialog open={!!rejectTarget} onReject={handleReject} onCancel={() => setRejectTarget(null)} />
      {modal?.type === 'provider' && <ProviderForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); setProviderReloadKey((k) => k + 1); }} />}
      {modal?.type === 'plan' && <PlanForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'subscription' && <SubscriptionDetail item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'delivery' && <DeliveryDetail item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'closure' && <ClosureForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'menu' && (
        <ProviderWeeklyMenuForm
          providerUid={modal.providerUid}
          providers={weeklyMenuProviders}
          onClose={() => setModal(null)}
          onSaved={(weeklyMenu) => {
            setWeeklyMenuProviders((current) => current.map((provider) => (
              provider.provider_uid === modal.providerUid
                ? { ...provider, weekly_menu: weeklyMenu }
                : provider
            )));
            setModal(null);
          }}
        />
      )}
      {modal?.type === 'kitchenDish' && (
        <KitchenMenuForm
          item={modal.item}
          initialProviderUid={modal.providerUid}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

function ListPagination({ meta, page, pageSize, loading, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Number(meta.pages || 1));
  const total = Number(meta.total || 0);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{total} records</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none"
          disabled={loading}
        >
          {[10, 20, 50].map((value) => <option key={value} value={value}>{value} per page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs font-semibold text-slate-600">Page {page} of {totalPages}</span>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ProviderWeeklyMenuForm({ providerUid, providers, onClose, onSaved }) {
  const provider = providers.find((entry) => entry.provider_uid === providerUid);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    menu_name: '',
    meal_type: provider?.meal_types?.[0] || 'LUNCH',
    week_days: provider?.working_days?.length ? [...provider.working_days] : workingDays.slice(0, 6),
  });

  const toggleDay = (day) => setForm((current) => ({
    ...current,
    week_days: current.week_days.includes(day)
      ? current.week_days.filter((value) => value !== day)
      : [...current.week_days, day],
  }));

  const submit = async (event) => {
    event.preventDefault();
    const dish = form.menu_name.trim();
    if (!dish || !form.week_days.length) {
      toast.error('Dish title and at least one week day are required');
      return;
    }

    setSaving(true);
    try {
      const response = await getHomeFoodProviderSettings(providerUid);
      const settings = response.data?.data || {};
      const weeklyMenu = { ...(settings.weekly_menu || {}) };

      form.week_days.forEach((day) => {
        const dayMenu = { ...(weeklyMenu[day] || {}) };
        const existing = String(dayMenu[form.meal_type] || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (!existing.some((value) => value.toLowerCase() === dish.toLowerCase())) {
          existing.push(dish);
        }
        dayMenu[form.meal_type] = existing.join(', ');
        weeklyMenu[day] = dayMenu;
      });

      const saveResponse = await saveHomeFoodProviderSettings({
        provider_uid: providerUid,
        is_active: settings.is_active ?? provider?.is_active ?? true,
        max_active_subscribers: Number(settings.max_active_subscribers ?? provider?.capacity ?? 100),
        delivery_radius_km: Number(settings.delivery_radius_km ?? provider?.delivery_radius_km ?? 5),
        meal_types: settings.meal_types || provider?.meal_types || mealTypes,
        delivery_slots: settings.delivery_slots || provider?.delivery_slots || [],
        working_days: settings.working_days || provider?.working_days || workingDays,
        weekly_menu: weeklyMenu,
        trial_available: settings.trial_available ?? true,
      });
      const savedWeeklyMenu = saveResponse.data?.data?.weekly_menu || weeklyMenu;
      toast.success(`Dish added to ${provider?.restaurant_name || providerUid}`);
      onSaved(savedWeeklyMenu);
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(', ') : message || 'Could not add dish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Provider Dish" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl border bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">Selected Provider</p>
          <p className="text-sm font-semibold text-slate-800">{provider?.restaurant_name || providerUid}</p>
          <p className="font-mono text-xs text-slate-400">{providerUid}</p>
        </div>
        <Field label="Dish Title">
          <input value={form.menu_name} onChange={(event) => setForm({ ...form, menu_name: event.target.value })} className={inputClass} placeholder="e.g. Idly, Sambar and Chutney" required />
        </Field>
        <Field label="Meal Type">
          <select value={form.meal_type} onChange={(event) => setForm({ ...form, meal_type: event.target.value })} className={inputClass}>
            {(provider?.meal_types?.length ? provider.meal_types : mealTypes).map((meal) => <option key={meal}>{meal}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Week Days">
            <div className="flex flex-wrap gap-2">
              {(provider?.working_days?.length ? provider.working_days : workingDays).map((day) => (
                <label key={day} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <input type="checkbox" checked={form.week_days.includes(day)} onChange={() => toggleDay(day)} />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Dish'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProviderWeeklyMenus({ providers, filters }) {
  const rows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return providers.flatMap((provider) => {
      if (filters.provider_uid && provider.provider_uid !== filters.provider_uid) return [];
      if (filters.status === 'active' && !provider.is_active) return [];
      if (filters.status === 'inactive' && provider.is_active) return [];

      const providerName = provider.restaurant_name || provider.provider_uid;
      return Object.entries(provider.weekly_menu || {}).flatMap(([day, meals]) =>
        Object.entries(meals || {}).map(([meal, dishes]) => ({
          key: `${provider.provider_uid}-${day}-${meal}`,
          providerName,
          providerUid: provider.provider_uid,
          day,
          meal,
          dishes: String(dishes || ''),
          isActive: provider.is_active,
        })),
      ).filter((row) => (
        !search
        || `${row.providerName} ${row.providerUid} ${row.day} ${row.meal} ${row.dishes}`
          .toLowerCase()
          .includes(search)
      ));
    });
  }, [providers, filters.provider_uid, filters.search, filters.status]);

  if (!rows.length) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Provider Weekly Menu</h2>
          <p className="text-xs text-slate-500">Dishes configured in each provider&apos;s weekly menu.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-600">
          {rows.length} scheduled meals
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[760px]">
          <thead className="sticky top-0 border-b bg-white">
            <tr>
              {['Provider', 'Day', 'Meal', 'Dishes', 'Status'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-indigo-50/30">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{row.providerName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{row.providerUid}</p>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-600">{row.day}</td>
                <td className="px-4 py-3"><Status value={row.meal} /></td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.dishes}</td>
                <td className="px-4 py-3"><Status value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ section, item, onEdit, selected, onSelectPlan, onDelivery, onCancelSubscription, onApproveSubscription, onExtendSubscription, onDeleteProvider, onBlockProvider, onRejectProvider, blockLoading, onDeletePlan, onDeleteSubscription, onDeleteDelivery, onCancelClosure, onDeleteMenu, onToggleHomeFoodMenu }) {
  const navigate = useNavigate();
  if (section === 'providers') {
    const reviewStatus = item.review_status || (item.is_active ? 'approved' : 'pending');
    const reviewBadge = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      rejected: 'bg-red-50 text-red-700 border-red-100',
    }[reviewStatus] ?? 'bg-slate-50 text-slate-600 border-slate-100';
    return (
      <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.restaurant_name}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${reviewBadge}`}>
            {reviewStatus}
          </span>
        </td>
        <td className="px-4 py-3">
          {item.registration_mode === 'development' ? (
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
              DEV
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              PROD
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">{item.capacity}</td><td className="px-4 py-3 text-sm">{item.active_subscribers}</td>
        <td className="px-4 py-3 text-sm">{Number(item.delivery_radius_km)} km</td>
        <td className="px-4 py-3 text-xs text-slate-500">{(() => {
          const types = item.meal_types?.length
            ? item.meal_types
            : [...new Set((item.plans || []).flatMap((p) => p.meal_types || []))];
          return types.join(', ') || '—';
        })()}</td>
        <td className="px-4 py-3 text-sm text-slate-500">{date(item.created_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/home-foods/providers/${item.provider_uid}`); }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View
            </button>
            {reviewStatus === 'pending' ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onBlockProvider(); }}
                  disabled={blockLoading}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  {blockLoading ? '…' : 'Approve'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRejectProvider(); }}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onBlockProvider(); }}
                disabled={blockLoading}
                className={`text-xs font-semibold ${reviewStatus === 'approved' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'} disabled:opacity-50`}
              >
                {blockLoading ? '…' : reviewStatus === 'approved' ? 'Block' : 'Approve'}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteProvider(); }}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  }
  if (section === 'plans') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={Boolean(selected)}
          disabled={Number(item.paid_subscriber_count || 0) > 0}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onSelectPlan?.(event.target.checked)}
          title={Number(item.paid_subscriber_count || 0) > 0 ? 'Has paid subscribers — cannot bulk delete' : 'Select plan'}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Select ${item.name}`}
        />
      </td>
      <td className="px-4 py-3 text-sm font-semibold">{item.name}</td><td className="px-4 py-3 text-xs">{item.plan_type}</td>
      <td className="px-4 py-3 text-sm">{item.restaurant_name || item.provider_uid}</td><td className="px-4 py-3 text-sm">{item.duration_days} days</td>
      <td className="px-4 py-3 text-sm font-semibold">{money(item.price)}</td><td className="px-4 py-3 text-xs">{(item.meal_types || []).join(', ')}</td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {Object.values(item.weekly_menu || {}).reduce((count, meals) => count + Object.keys(meals || {}).length, 0)} scheduled meals
      </td>
      <td className="px-4 py-3"><Status value={item.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => { event.stopPropagation(); onEdit(); }}
            className="text-xs font-semibold text-indigo-600"
          >
            Edit
          </button>
          {item.paid_subscriber_count > 0 && (
            <span className="text-[11px] text-slate-400">{item.paid_subscriber_count} paid</span>
          )}
          <button
            onClick={(event) => { event.stopPropagation(); onDeletePlan(); }}
            disabled={item.paid_subscriber_count > 0}
            title={item.paid_subscriber_count > 0 ? 'Has paid subscribers — deactivate instead' : undefined}
            className="text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
  if (section === 'subscriptions') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3 font-mono text-xs">{item.id}</td><td className="px-4 py-3 text-sm font-semibold">{item.customer_name}</td>
      <td className="px-4 py-3 text-xs">{item.phone || '—'}</td><td className="px-4 py-3 text-sm">{item.restaurant_name}</td>
      <td className="px-4 py-3 text-sm">{item.plan_name}</td><td className="px-4 py-3 text-sm">{money(item.amount_paid)}</td>
      <td className="px-4 py-3"><Status value={item.status} /></td><td className="px-4 py-3"><Status value={item.payment_status} /></td>
      <td className="px-4 py-3 text-xs">{date(item.start_date)} – {date(item.end_date)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.status === 'PENDING' && (
            <button onClick={(event) => { event.stopPropagation(); onApproveSubscription(item.id); }} className="text-xs font-semibold text-emerald-600">Approve</button>
          )}
          <button onClick={(event) => { event.stopPropagation(); onDeleteSubscription(); }} className="text-xs font-semibold text-red-600">Delete</button>
        </div>
      </td>
    </tr>
  );
  if (section === 'deliveries') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3 font-mono text-xs">{item.id}</td><td className="px-4 py-3 font-mono text-xs">{item.subscription_id}</td>
      <td className="px-4 py-3 text-sm">{item.customer_name || item.user_uid}</td><td className="px-4 py-3 text-sm">{item.restaurant_name || item.provider_uid}</td>
      <td className="px-4 py-3 text-xs font-semibold">{item.meal_type}</td><td className="px-4 py-3 text-sm">{date(item.delivery_date)}</td>
      <td className="px-4 py-3"><Status value={item.status} /></td>
      <td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); onDeleteDelivery(); }} className="text-xs font-semibold text-red-600">Delete</button></td>
    </tr>
  );
  if (section === 'menus') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3">
        {item.images?.[0] ? (
          <img src={item.images[0]} alt={item.menu_name} className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><ChefHat size={18} /></div>
        )}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.menu_name}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{item.restaurant_name}</td>
      <td className="max-w-64 px-4 py-3 text-xs text-slate-500"><p className="line-clamp-2">{item.description || '—'}</p></td>
      <td className="px-4 py-3 text-xs text-slate-500">{(item.home_food_week_days || []).map((day) => day.slice(0, 3)).join(', ') || 'All days'}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(() => {
            const slots = item.home_food_meal_slot
              ? [String(item.home_food_meal_slot).toUpperCase()]
              : Object.entries(item.meal_availability || {})
                .filter(([, active]) => active)
                .map(([slot]) => slot.toUpperCase());
            return slots.length
              ? slots.map((slot) => <Status key={slot} value={slot} />)
              : <Status value="UNASSIGNED" />;
          })()}
        </div>
      </td>
      <td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); onDeleteMenu(); }} className="text-xs font-semibold text-red-600">Delete</button></td>
    </tr>
  );
  return (
    <tr>
      <td className="px-4 py-3 text-sm">{item.restaurant_name || item.provider_uid}</td><td className="px-4 py-3 text-sm">{date(item.start_date)}</td>
      <td className="px-4 py-3 text-sm">{date(item.end_date)}</td><td className="px-4 py-3 text-sm">{item.reason}</td>
      <td className="px-4 py-3 text-sm">{item.affected_deliveries}</td><td className="px-4 py-3"><Status value={item.status} /></td>
      <td className="px-4 py-3 space-x-3">{item.status === 'ACTIVE' && <><button onClick={onEdit} className="text-xs font-semibold text-indigo-600">Edit</button><button onClick={onCancelClosure} className="text-xs font-semibold text-red-600">Delete</button></>}</td>
    </tr>
  );
}

function PageFilters({ section, filters, setFilters, total, menuProviders = [] }) {
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters({
    search: '', status: '', mode: '', provider_uid: '', plan_type: '',
    payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
  });
  const placeholders = {
    providers: 'Search restaurant name or UID',
    plans: 'Search plan, restaurant, or UID',
    subscriptions: 'Search subscription, customer, restaurant, or plan',
    deliveries: 'Search delivery, subscription, customer, or restaurant',
    menus: 'Search dish name or provider',
    closures: 'Search provider or closure reason',
  };

  return (
    <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => set('search', event.target.value)}
            className={`${inputClass} pl-9`}
            placeholder={placeholders[section]}
          />
        </div>

        <select value={filters.status} onChange={(event) => set('status', event.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          {section === 'providers' && <>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="capacity_full">Capacity Full</option>
          </>}
          {section === 'plans' && <>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </>}
          {section === 'subscriptions' && ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}
          {section === 'deliveries' && deliveryStatuses.map((value) => <option key={value}>{value}</option>)}
          {section === 'closures' && ['ACTIVE', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}
          {section === 'menus' && <>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </>}
        </select>

        {section === 'menus' && (
          <select value={filters.provider_uid} onChange={(event) => set('provider_uid', event.target.value)} className={inputClass}>
            <option value="">All providers</option>
            {menuProviders.map((p) => (
              <option key={p.provider_uid} value={p.provider_uid}>{p.restaurant_name}</option>
            ))}
          </select>
        )}
        {section === 'plans' && (
          <select value={filters.plan_type} onChange={(event) => set('plan_type', event.target.value)} className={inputClass}>
            <option value="">All plan types</option>
            {planTypes.map((value) => <option key={value}>{value}</option>)}
          </select>
        )}
        {section === 'providers' && (
          <select value={filters.mode} onChange={(event) => set('mode', event.target.value)} className={inputClass}>
            <option value="">All modes</option>
            <option value="production">Production</option>
            <option value="development">Development</option>
          </select>
        )}
        {['providers', 'plans', 'deliveries'].includes(section) && (
          <select value={filters.meal_type} onChange={(event) => set('meal_type', event.target.value)} className={inputClass}>
            <option value="">All meal types</option>
            {mealTypes.map((value) => <option key={value}>{value}</option>)}
          </select>
        )}
        {section === 'subscriptions' && (
          <select value={filters.payment_status} onChange={(event) => set('payment_status', event.target.value)} className={inputClass}>
            <option value="">All payment statuses</option>
            {['PENDING', 'SUCCESS', 'FAILED'].map((value) => <option key={value}>{value}</option>)}
          </select>
        )}
        {section === 'deliveries' && (
          <input type="date" value={filters.date} onChange={(event) => set('date', event.target.value)} className={inputClass} title="Exact delivery date" />
        )}
        {!['deliveries', 'menus'].includes(section) && (
          <>
            <input type="date" value={filters.from_date} onChange={(event) => set('from_date', event.target.value)} className={inputClass} title="From date" />
            <input type="date" value={filters.to_date} onChange={(event) => set('to_date', event.target.value)} className={inputClass} title="To date" />
          </>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">{total === undefined ? '' : `${total} records`}</span>
        <button type="button" onClick={reset} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Clear filters</button>
      </div>
    </div>
  );
}

function ProviderForm({ item, onClose, onSaved }) {
  if (!item) return <CreateCloudKitchenForm onClose={onClose} onSaved={onSaved} />;
  return <EditProviderSettingsForm item={item} onClose={onClose} onSaved={onSaved} />;
}

function CreateCloudKitchenForm({ onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [form, setForm] = useState({
    kitchen_name: '',
    kitchen_type: 'non_veg',
    owner_name: '',
    owner_phone: '',
    support_phone: '',
    support_email: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    lat: '',
    lng: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_account_type: 'savings',
    fssai_no: '',
    max_active_subscribers: 100,
    delivery_radius_km: 5,
  });

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    try {
      const res = await uploadProviderProfileImage(file);
      const url = res.data?.url || res.data?.data?.url || res.data?.fileUrl || res.data?.imageUrl;
      if (!url) throw new Error('No URL in response');
      setProfileImageUrl(url);
    } catch {
      toast.error('Image upload failed');
      setImagePreview(null);
      setProfileImageUrl('');
    } finally {
      setImageUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.kitchen_name.trim()) { toast.error('Kitchen name is required'); return; }
    setSaving(true);
    try {
      await createCloudKitchen({
        ...form,
        max_active_subscribers: Number(form.max_active_subscribers),
        delivery_radius_km: Number(form.delivery_radius_km),
        ...(form.lat ? { lat: Number(form.lat) } : {}),
        ...(form.lng ? { lng: Number(form.lng) } : {}),
        ...(profileImageUrl ? { profile_image_url: profileImageUrl } : {}),
      });
      toast.success('Cloud kitchen created');
      onSaved();
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not create kitchen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Cloud Kitchen" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
        {/* Basic Info */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Kitchen Details</p>
          <div className="mb-4 flex items-center gap-4">
            <label className="relative cursor-pointer group">
              <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center transition-colors group-hover:border-indigo-400 group-hover:bg-indigo-50">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <ChefHat size={28} className="text-slate-300" />
                )}
                {imageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 rounded-full bg-indigo-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Camera size={10} className="text-white" />
                </div>
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageSelect} disabled={imageUploading} />
            </label>
            <div className="text-xs text-slate-400">
              <p className="font-medium text-slate-600">Kitchen Photo</p>
              <p>Click to upload a logo or photo</p>
              <p className="mt-0.5">JPG, PNG, WebP · max 2 MB</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Kitchen Name *">
              <input value={form.kitchen_name} onChange={(e) => setForm({ ...form, kitchen_name: e.target.value })} className={inputClass} placeholder="e.g. Maa Ki Rasoi" required />
            </Field>
            <Field label="Kitchen Type">
              <select value={form.kitchen_type} onChange={(e) => setForm({ ...form, kitchen_type: e.target.value })} className={inputClass}>
                <option value="veg">Veg</option>
                <option value="non_veg">Non-Veg</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Owner / Contact Info */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Owner &amp; Contact</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Owner Name">
              <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inputClass} placeholder="e.g. Ramesh Kumar" />
            </Field>
            <Field label="Owner Phone *">
              <input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className={inputClass} placeholder="e.g. 9876543210" />
            </Field>
            <Field label="Support Phone">
              <input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} className={inputClass} placeholder="Support contact number" />
            </Field>
            <Field label="Support Email">
              <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className={inputClass} placeholder="support@kitchen.com" />
            </Field>
          </div>
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Address</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Full Address">
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="e.g. 123, MG Road, Near Bus Stand" />
              </Field>
            </div>
            <Field label="Locality / Area">
              <input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} className={inputClass} placeholder="e.g. Koramangala, HSR Layout" />
            </Field>
            <Field label="City">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="e.g. Bangalore" />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} placeholder="e.g. Karnataka" />
            </Field>
            <Field label="Pincode">
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inputClass} placeholder="e.g. 560001" maxLength={6} />
            </Field>
            <Field label="Latitude">
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} className={inputClass} placeholder="e.g. 12.9716" />
            </Field>
            <Field label="Longitude">
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} className={inputClass} placeholder="e.g. 77.5946" />
            </Field>
          </div>
        </div>

        {/* Bank Details */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Bank Details</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Account Number">
              <input value={form.bank_account_no} onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })} className={inputClass} placeholder="e.g. 1234567890" />
            </Field>
            <Field label="IFSC Code">
              <input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} className={inputClass} placeholder="e.g. SBIN0001234" />
            </Field>
            <Field label="Account Type">
              <select value={form.bank_account_type} onChange={(e) => setForm({ ...form, bank_account_type: e.target.value })} className={inputClass}>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Documents */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Documents</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="FSSAI Number (Optional)">
              <input value={form.fssai_no} onChange={(e) => setForm({ ...form, fssai_no: e.target.value })} className={inputClass} placeholder="14-digit FSSAI number" maxLength={14} />
            </Field>
          </div>
        </div>

        {/* Operations */}
        <div className="md:col-span-2">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">Operations</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Capacity (max subscribers)">
              <input type="number" min="1" value={form.max_active_subscribers} onChange={(e) => setForm({ ...form, max_active_subscribers: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Delivery Radius (km)">
              <input type="number" min="0.1" step="0.1" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Cloud Kitchen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProviderSettingsForm({ item, onClose, onSaved }) {
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();
  const [selectedMenuDay, setSelectedMenuDay] = useState('MONDAY');
  const [slotOptions, setSlotOptions] = useState([]);
  const [slotDraft, setSlotDraft] = useState({ start: '', end: '' });
  const [providerPlans, setProviderPlans] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planEditor, setPlanEditor] = useState({ name: '', plan_type: 'MONTHLY', duration_days: 30, price: 0, meal_types: ['LUNCH'], is_active: true });
  const [form, setForm] = useState({
    provider_uid: item.provider_uid,
    is_active: item.is_active ?? true,
    max_active_subscribers: Number(item.capacity || 100),
    delivery_radius_km: Number(item.delivery_radius_km || 5),
    meal_types: item.meal_types || mealTypes,
    working_days: workingDays,
    delivery_slots: [],
    weekly_menu: {},
  });

  const loadProviderPlans = useCallback(async (uid) => {
    try { setProviderPlans(unwrapItems(await getHomeFoodPlans({ provider_uid: uid }))); }
    catch { setProviderPlans([]); }
  }, []);

  useEffect(() => {
    getHomeFoodProviderSettings(item.provider_uid).then((res) => {
      const s = res.data?.data;
      if (s) {
        setForm((f) => ({ ...f, is_active: s.is_active ?? f.is_active, max_active_subscribers: Number(s.max_active_subscribers ?? f.max_active_subscribers), delivery_radius_km: Number(s.delivery_radius_km ?? f.delivery_radius_km), meal_types: s.meal_types || f.meal_types, delivery_slots: s.delivery_slots || [], working_days: s.working_days || f.working_days, weekly_menu: s.weekly_menu || {}, trial_available: s.trial_available ?? true }));
        setSlotOptions(s.delivery_slots || []);
        setSelectedMenuDay(s.working_days?.[0] || 'MONDAY');
      }
    }).catch(() => {});
    loadProviderPlans(item.provider_uid);
  }, [item, loadProviderPlans]);

  useEffect(() => {
    if (providerPlans.length && !providerPlans.some((p) => p.id === editingPlanId)) {
      const p = providerPlans[0];
      setEditingPlanId(p.id);
      setPlanEditor({ name: p.name || '', plan_type: p.plan_type, duration_days: Number(p.duration_days), price: Number(p.price), meal_types: p.meal_types || [], is_active: p.is_active });
    }
    if (!providerPlans.length) setEditingPlanId(null);
  }, [providerPlans, editingPlanId]);

  const activeDay = (form.working_days || []).includes(selectedMenuDay) ? selectedMenuDay : (form.working_days || [])[0] || '';

  const toggleWorkingDay = (day) => {
    const next = form.working_days.includes(day) ? form.working_days.filter((d) => d !== day) : [...form.working_days, day];
    setForm({ ...form, working_days: next });
    if (!next.includes(selectedMenuDay)) setSelectedMenuDay(next[0] || '');
  };

  const addSlot = () => {
    if (!slotDraft.start || !slotDraft.end) { toast.error('Select both times'); return; }
    if (slotDraft.start >= slotDraft.end) { toast.error('End must be after start'); return; }
    const slot = `${slotDraft.start}-${slotDraft.end}`;
    if (slotOptions.includes(slot)) { toast.error('Slot already exists'); return; }
    setSlotOptions([...slotOptions, slot]);
    setForm({ ...form, delivery_slots: [...form.delivery_slots, slot] });
    setSlotDraft({ start: '', end: '' });
  };

  const toggleSlot = (slot) => setForm({ ...form, delivery_slots: form.delivery_slots.includes(slot) ? form.delivery_slots.filter((s) => s !== slot) : [...form.delivery_slots, slot] });
  const removeSlot = (slot) => { setSlotOptions(slotOptions.filter((s) => s !== slot)); setForm({ ...form, delivery_slots: form.delivery_slots.filter((s) => s !== slot) }); };

  const providerPayload = () => ({ provider_uid: form.provider_uid, is_active: Boolean(form.is_active), max_active_subscribers: Number(form.max_active_subscribers), delivery_radius_km: Number(form.delivery_radius_km), meal_types: form.meal_types, delivery_slots: form.delivery_slots, working_days: form.working_days, weekly_menu: form.weekly_menu || {}, trial_available: form.trial_available ?? true });

  const saveProviderPlan = async () => {
    if (!planEditor.name.trim() || !planEditor.meal_types.length) { toast.error('Plan name and meal types required'); return; }
    if (!editingPlanId) return;
    setPlanSaving(true);
    try {
      await saveHomeFoodProviderSettings(providerPayload());
      await updateHomeFoodPlan(editingPlanId, planEditor);
      await loadProviderPlans(form.provider_uid);
      toast.success('Plan updated');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save plan'); }
    finally { setPlanSaving(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await saveHomeFoodProviderSettings(providerPayload());
      toast.success('Provider settings saved');
      onSaved();
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || error.message || 'Could not save');
    }
  };

  return (
    <Modal title="Provider Settings" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl bg-slate-50 border px-4 py-3">
          <p className="text-xs text-slate-500 font-medium">Kitchen</p>
          <p className="text-sm font-semibold text-slate-800">{item.restaurant_name}</p>
          <p className="text-xs text-slate-400 font-mono">{item.provider_uid}</p>
        </div>
        <Field label="Status"><select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
        <Field label="Capacity"><input type="number" min="1" value={form.max_active_subscribers} onChange={(e) => setForm({ ...form, max_active_subscribers: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Delivery Radius (km)"><input type="number" min="0.1" step="0.1" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: Number(e.target.value) })} className={inputClass} /></Field>
        <div className="md:col-span-2"><Field label="Meal Types"><div className="flex flex-wrap gap-2">{mealTypes.map((meal) => <label key={meal} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer"><input type="checkbox" checked={form.meal_types.includes(meal)} onChange={() => setForm({ ...form, meal_types: form.meal_types.includes(meal) ? form.meal_types.filter((m) => m !== meal) : [...form.meal_types, meal] })} />{meal}</label>)}</div></Field></div>
        <div className="md:col-span-2"><Field label="Working Days"><div className="flex flex-wrap gap-2">{workingDays.map((day) => <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer"><input type="checkbox" checked={form.working_days.includes(day)} onChange={() => toggleWorkingDay(day)} />{day.slice(0, 3)}</label>)}</div></Field></div>
        <div className="md:col-span-2">
          <Field label="Delivery Slots">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field label="Start"><input type="time" value={slotDraft.start} onChange={(e) => setSlotDraft({ ...slotDraft, start: e.target.value })} className={inputClass} /></Field>
                <Field label="End"><input type="time" value={slotDraft.end} onChange={(e) => setSlotDraft({ ...slotDraft, end: e.target.value })} className={inputClass} /></Field>
                <button type="button" onClick={addSlot} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={14} /> Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {slotOptions.map((slot) => {
                  const sel = form.delivery_slots.includes(slot);
                  return (
                    <div key={slot} className={`inline-flex items-center overflow-hidden rounded-xl border text-xs font-semibold ${sel ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      <button type="button" onClick={() => toggleSlot(slot)} className="flex items-center gap-2 px-3 py-2"><input type="checkbox" checked={sel} readOnly />{slot}</button>
                      <button type="button" onClick={() => removeSlot(slot)} className="border-l border-current/10 px-2 py-2 hover:bg-red-50 hover:text-red-600"><X size={12} /></button>
                    </div>
                  );
                })}
                {!slotOptions.length && <p className="text-xs text-slate-400">Add a slot above.</p>}
              </div>
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Weekly Menu">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              {form.working_days.length ? (
                <>
                  <Field label="Day"><select value={activeDay} onChange={(e) => setSelectedMenuDay(e.target.value)} className={inputClass}>{form.working_days.map((d) => <option key={d}>{d}</option>)}</select></Field>
                  {activeDay && (
                    <div className="grid gap-3 md:grid-cols-2 rounded-xl border bg-white p-3">
                      {form.meal_types.map((meal) => (
                        <Field key={`${activeDay}-${meal}`} label={meal}>
                          <input value={form.weekly_menu?.[activeDay]?.[meal] || ''} onChange={(e) => setForm({ ...form, weekly_menu: updateWeeklyMenu(form.weekly_menu, activeDay, meal, e.target.value) })} className={inputClass} placeholder={`${meal.toLowerCase()} items`} />
                        </Field>
                      ))}
                    </div>
                  )}
                </>
              ) : <p className="text-xs text-slate-400 py-3 text-center">Select working days first.</p>}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Subscription Plans">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              {providerPlans.length > 0 ? (
                <>
                  <Field label="Select Plan">
                    <select value={editingPlanId || ''} onChange={(e) => { const p = providerPlans.find((x) => x.id === e.target.value); if (p) { setEditingPlanId(p.id); setPlanEditor({ name: p.name, plan_type: p.plan_type, duration_days: Number(p.duration_days), price: Number(p.price), meal_types: p.meal_types || [], is_active: p.is_active }); } }} className={inputClass}>
                      {providerPlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.plan_type} — {money(p.price)}</option>)}
                    </select>
                  </Field>
                  {editingPlanId && (
                    <div className="grid gap-3 md:grid-cols-2 rounded-xl border border-indigo-100 bg-white p-3">
                      <Field label="Plan Name"><input value={planEditor.name} onChange={(e) => setPlanEditor({ ...planEditor, name: e.target.value })} className={inputClass} /></Field>
                      <Field label="Plan Type"><select value={planEditor.plan_type} onChange={(e) => setPlanEditor({ ...planEditor, plan_type: e.target.value, duration_days: planDurationDays[e.target.value] })} className={inputClass}>{planTypes.map((t) => <option key={t}>{t}</option>)}</select></Field>
                      <Field label="Duration Days"><input type="number" min="1" value={planEditor.duration_days} onChange={(e) => setPlanEditor({ ...planEditor, duration_days: Number(e.target.value) })} className={inputClass} /></Field>
                      <Field label="Price (₹)"><input type="number" min="0" step="0.01" value={planEditor.price} onChange={(e) => setPlanEditor({ ...planEditor, price: Number(e.target.value) })} className={inputClass} /></Field>
                      <div className="md:col-span-2"><Field label="Meals"><div className="flex flex-wrap gap-2">{mealTypes.map((meal) => <label key={meal} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer"><input type="checkbox" checked={planEditor.meal_types.includes(meal)} onChange={() => setPlanEditor({ ...planEditor, meal_types: planEditor.meal_types.includes(meal) ? planEditor.meal_types.filter((m) => m !== meal) : [...planEditor.meal_types, meal] })} />{meal}</label>)}</div></Field></div>
                      <Field label="Status"><select value={String(planEditor.is_active)} onChange={(e) => setPlanEditor({ ...planEditor, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
                      <div className="flex items-end"><button type="button" disabled={planSaving} onClick={saveProviderPlan} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{planSaving ? 'Saving…' : 'Save Plan'}</button></div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-3 text-center text-xs text-slate-400">No plans yet. Create from the Plans page.</p>
              )}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-between gap-2 border-t pt-4">
          <button type="button" onClick={() => confirm({ title: 'Delete this provider?', message: 'All subscriptions and deliveries will be cancelled. This cannot be undone.', confirmLabel: 'Delete Provider', onConfirm: async () => { await deleteHomeFoodProvider(item.provider_uid); toast.success('Provider deleted'); onSaved(); } })} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600">Delete</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>
            <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Save Settings</button>
          </div>
        </div>
      </form>
      <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Modal>
  );
}

function PlanForm({ item, onClose, onSaved }) {
  const [providers, setProviders] = useState([]);
  const [selectedMenuDay, setSelectedMenuDay] = useState(
    Object.keys(item?.weekly_menu || {})[0] || 'MONDAY',
  );
  const [saving, setSaving] = useState(false);
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();
  const [form, setForm] = useState({
    provider_uid: item?.provider_uid || '',
    name: item?.name || '',
    plan_type: item?.plan_type || 'MONTHLY',
    duration_days: Number(item?.duration_days || 30),
    price: Number(item?.price || 0),
    meal_types: item?.meal_types || ['LUNCH'],
    weekly_menu: item?.weekly_menu || {},
    is_active: item?.is_active ?? true,
  });
  useEffect(() => { getHomeFoodProviders({ limit: 100 }).then((response) => setProviders(unwrapItems(response))).catch(() => {}); }, []);
  const selectedProvider = providers.find((provider) => provider.provider_uid === form.provider_uid);
  const availableDays = selectedProvider?.working_days?.length
    ? selectedProvider.working_days
    : workingDays;
  const activeDay = availableDays.includes(selectedMenuDay)
    ? selectedMenuDay
    : availableDays[0];

  const toggleMeal = (meal) => setForm((current) => ({
    ...current,
    meal_types: current.meal_types.includes(meal)
      ? current.meal_types.filter((value) => value !== meal)
      : [...current.meal_types, meal],
  }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.meal_types.length) {
      toast.error('Select at least one meal type');
      return;
    }
    setSaving(true);
    try {
      if (item) {
        const updatePayload = { ...form };
        delete updatePayload.provider_uid;
        await updateHomeFoodPlan(item.id, updatePayload);
      }
      else await createHomeFoodPlan(form);
      toast.success('Plan saved with its weekly menu');
      onSaved();
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(', ') : message || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={item ? 'Edit Plan' : 'Create Plan'} onClose={onClose}><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <Field label="Existing Provider"><select disabled={Boolean(item)} value={form.provider_uid} onChange={(e) => { setForm({ ...form, provider_uid: e.target.value, weekly_menu: {} }); const provider = providers.find((entry) => entry.provider_uid === e.target.value); setSelectedMenuDay(provider?.working_days?.[0] || 'MONDAY'); }} className={inputClass} required><option value="">Select provider</option>{providers.map((provider) => <option key={provider.provider_uid} value={provider.provider_uid}>{provider.restaurant_name}</option>)}</select></Field>
    <Field label="Plan Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required /></Field>
    <Field label="Plan Type"><select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value, duration_days: planDurationDays[e.target.value] })} className={inputClass}>{planTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
    <Field label="Duration Days"><input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className={inputClass} /></Field>
    <Field label="Price"><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} /></Field>
    <Field label="Status"><select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
    <div className="md:col-span-2"><Field label="Meal Types"><div className="flex flex-wrap gap-2">{mealTypes.map((meal) => <label key={meal} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={form.meal_types.includes(meal)} onChange={() => toggleMeal(meal)} />{meal}</label>)}</div></Field></div>
    <div className="md:col-span-2">
      <Field label="Plan-Specific Weekly Menu">
        <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          {!form.provider_uid ? (
            <p className="py-4 text-center text-sm text-slate-400">Select an existing provider first.</p>
          ) : (
            <>
              <Field label="Day">
                <select value={activeDay} onChange={(e) => setSelectedMenuDay(e.target.value)} className={inputClass}>
                  {availableDays.map((day) => <option key={day}>{day}</option>)}
                </select>
              </Field>
              <div className="grid gap-3 rounded-xl border bg-white p-3 md:grid-cols-2">
                {form.meal_types.map((meal) => (
                  <Field key={`${activeDay}-${meal}`} label={`${meal} Dishes`}>
                    <input
                      value={form.weekly_menu?.[activeDay]?.[meal] || ''}
                      onChange={(e) => setForm({
                        ...form,
                        weekly_menu: updateWeeklyMenu(
                          form.weekly_menu,
                          activeDay,
                          meal,
                          e.target.value,
                        ),
                      })}
                      className={inputClass}
                      placeholder={`e.g. ${meal === 'LUNCH' ? 'Rice, curry, curd' : 'Plan dishes'}`}
                    />
                  </Field>
                ))}
                {!form.meal_types.length && <p className="text-xs text-slate-400">Select meal types above.</p>}
              </div>
            </>
          )}
        </div>
      </Field>
    </div>
    <div className="md:col-span-2 flex justify-between gap-2 border-t pt-4">
      {item ? <button type="button" disabled={saving} onClick={() => confirm({ title: 'Delete Plan', message: `Delete plan "${item.name}"? This cannot be undone.`, confirmLabel: 'Delete', onConfirm: async () => { await deleteHomeFoodPlan(item.id); toast.success('Plan deleted'); onSaved(); } })} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Delete</button> : <span />}
      <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Plan'}</button></div>
    </div>
  </form>
  <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
</Modal>;
}

function SubscriptionDetail({ item, onClose, onSaved }) {
  const [extendDays, setExtendDays] = useState(7);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();

  const approve = () => confirm({
    danger: false,
    title: 'Approve Subscription',
    message: 'Activates the subscription, confirms payment, and creates scheduled deliveries.',
    confirmLabel: 'Approve',
    onConfirm: async () => {
      setSaving(true);
      try {
        await updateHomeFoodSubscription(item.id, { status: 'ACTIVE' });
        toast.success('Subscription approved');
        onSaved();
      } catch (error) {
        const message = error.response?.data?.message;
        toast.error(Array.isArray(message) ? message.join(', ') : message || 'Could not approve subscription');
      } finally {
        setSaving(false);
      }
    },
  });

  const extend = async () => {
    if (!Number.isInteger(Number(extendDays)) || Number(extendDays) < 1) {
      toast.error('Extension days must be greater than zero');
      return;
    }
    setSaving(true);
    try {
      await updateHomeFoodSubscription(item.id, { extend_days: Number(extendDays) });
      toast.success('Subscription extended');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!reason.trim()) {
      toast.error('Enter a cancellation reason');
      return;
    }
    setSaving(true);
    try {
      await updateHomeFoodSubscription(item.id, {
        status: 'CANCELLED',
        reason: reason.trim(),
      });
      toast.success('Subscription cancelled');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const remove = () => confirm({
    title: 'Delete Subscription',
    message: 'Delete this subscription? Future deliveries will be cancelled.',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      setSaving(true);
      try {
        await deleteHomeFoodSubscription(item.id);
        toast.success('Subscription deleted');
        onSaved();
      } finally {
        setSaving(false);
      }
    },
  });

  return (
    <Modal title="Subscription Details" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
          <Detail label="Subscription ID" value={item.id} mono />
          <Detail label="Customer" value={item.customer_name || item.user_uid} />
          <Detail label="Phone" value={item.phone || '—'} />
          <Detail label="Restaurant" value={item.restaurant_name || item.provider_uid} />
          <Detail label="Plan" value={item.plan_name || item.plan_type} />
          <Detail label="Amount" value={money(item.amount_paid)} />
          <Detail label="Status" value={<Status value={item.status} />} />
          <Detail label="Payment" value={<Status value={item.payment_status} />} />
          <Detail label="Start Date" value={date(item.start_date)} />
          <Detail label="End Date" value={date(item.end_date)} />
        </div>

        {item.status === 'PENDING' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-semibold text-emerald-800">Approve Subscription</h3>
            <p className="mt-1 text-xs text-emerald-700">Activates the subscription, confirms payment, and creates scheduled deliveries.</p>
            <button disabled={saving} onClick={approve} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve Subscription</button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Extend Subscription</h3>
          <div className="flex gap-2">
            <input type="number" min="1" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className={inputClass} />
            <button disabled={saving} onClick={extend} className="shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Extend</button>
          </div>
        </div>

        {!['CANCELLED', 'EXPIRED'].includes(item.status) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-amber-800">Cancel Subscription</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="2" className={inputClass} placeholder="Cancellation reason" />
            <button disabled={saving} onClick={cancel} className="mt-3 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Cancel Subscription</button>
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <button disabled={saving} onClick={remove} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Close</button>
        </div>
      </div>
      <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Modal>
  );
}

function DeliveryDetail({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: item.status || 'PENDING',
    missed_reason: item.missed_reason || '',
    proof_image_url: item.proof_image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();

  const save = async () => {
    setSaving(true);
    try {
      await updateHomeFoodDelivery(item.id, form);
      toast.success('Delivery updated');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update delivery');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => confirm({
    title: 'Delete Delivery',
    message: 'Delete this delivery record?',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      setSaving(true);
      try {
        await deleteHomeFoodDelivery(item.id);
        toast.success('Delivery deleted');
        onSaved();
      } finally {
        setSaving(false);
      }
    },
  });

  return (
    <Modal title="Delivery Details" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
          <Detail label="Delivery ID" value={item.id} mono />
          <Detail label="Subscription" value={item.subscription_id} mono />
          <Detail label="Customer" value={item.customer_name || item.user_uid} />
          <Detail label="Restaurant" value={item.restaurant_name || item.provider_uid} />
          <Detail label="Meal Type" value={item.meal_type} />
          <Detail label="Delivery Date" value={date(item.delivery_date)} />
          <Detail label="Delivery Slot" value={item.delivery_slot || '—'} />
          <Detail label="Address" value={item.address_snapshot?.address || '—'} />
        </div>
        <Field label="Delivery Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            {deliveryStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Missed Reason">
          <textarea value={form.missed_reason} onChange={(e) => setForm({ ...form, missed_reason: e.target.value })} rows="2" className={inputClass} />
        </Field>
        <Field label="Proof Image URL">
          <input value={form.proof_image_url} onChange={(e) => setForm({ ...form, proof_image_url: e.target.value })} className={inputClass} placeholder="https://..." />
        </Field>
        <div className="flex justify-between border-t pt-4">
          <button disabled={saving} onClick={remove} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Close</button>
            <button disabled={saving} onClick={save} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save Changes</button>
          </div>
        </div>
      </div>
      <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Modal>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className={`mt-1 text-sm text-slate-800 ${mono ? 'break-all font-mono text-xs' : 'font-medium'}`}>{value}</div>
    </div>
  );
}

function ClosureForm({ item, onClose, onSaved }) {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ provider_uid: item?.provider_uid || '', start_date: item?.start_date?.slice(0, 10) || '', end_date: item?.end_date?.slice(0, 10) || '', reason: item?.reason || '' });
  useEffect(() => { getHomeFoodProviders({ limit: 100 }).then((response) => setProviders(unwrapItems(response))).catch(() => {}); }, []);
  const submit = async (event) => { event.preventDefault(); item ? await updateHomeFoodClosure(item.id, { start_date: form.start_date, end_date: form.end_date, reason: form.reason }) : await createHomeFoodClosure(form); toast.success(item ? 'Closure updated' : 'Closure created and deliveries rescheduled'); onSaved(); };
  return <Modal title={item ? 'Edit Provider Closure' : 'Create Provider Closure'} onClose={onClose}><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><Field label="Provider"><select disabled={Boolean(item)} value={form.provider_uid} onChange={(e) => setForm({ ...form, provider_uid: e.target.value })} className={inputClass} required><option value="">Select provider</option>{providers.map((provider) => <option key={provider.provider_uid} value={provider.provider_uid}>{provider.restaurant_name}</option>)}</select></Field></div>
    <Field label="Start Date"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} required /></Field>
    <Field label="End Date"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} required /></Field>
    <div className="md:col-span-2"><Field label="Reason"><textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} rows="3" required /></Field></div>
    <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create Closure</button></div>
  </form></Modal>;
}

function KitchenMenuForm({ item, initialProviderUid, onClose, onSaved }) {
  const [providers, setProviders] = useState([]);
  const [providerSearch, setProviderSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { dialog: confirmDialog, confirmLoading, confirm, handleConfirm, handleCancel } = useConfirm();
  const [form, setForm] = useState({
    restaurant_uid: item?.home_food_provider_uid || item?.restaurant_uid || initialProviderUid || '',
    menu_name: item?.menu_name || '',
    description: item?.description || '',
    home_food_week_days: item?.home_food_week_days || workingDays.slice(0, 6),
    home_food_meal_slot: item?.home_food_meal_slot || 'LUNCH',
    home_food_serving_start: item?.home_food_serving_start?.slice(0, 5) || '',
    home_food_serving_end: item?.home_food_serving_end?.slice(0, 5) || '',
    isActive: item?.isActive ?? true,
  });

  useEffect(() => {
    getHomeFoodProviders({ limit: 100 })
      .then((response) => setProviders(unwrapItems(response)))
      .catch(() => setProviders([]));
  }, []);

  const filteredProviders = providers.filter((provider) => {
    const query = providerSearch.trim().toLowerCase();
    if (!query) return true;
    return `${provider.restaurant_name || ''} ${provider.provider_uid || ''}`
      .toLowerCase()
      .includes(query);
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.restaurant_uid || !form.menu_name.trim()) {
      toast.error('Provider and dish title are required');
      return;
    }
    if (
      form.home_food_serving_start
      && form.home_food_serving_end
      && form.home_food_serving_start >= form.home_food_serving_end
    ) {
      toast.error('Serving end time must be later than start time');
      return;
    }

    const payload = new FormData();
    payload.append('restaurant_uid', form.restaurant_uid);
    payload.append('menu_name', form.menu_name.trim());
    payload.append('description', form.description.trim());
    payload.append('price', '0');
    payload.append('isActive', String(form.isActive));
    payload.append('is_home_food_item', 'true');
    payload.append('home_food_week_days', JSON.stringify(form.home_food_week_days));
    payload.append('home_food_meal_slot', form.home_food_meal_slot);
    payload.append('meal_availability', JSON.stringify(mealSlotAvailability(form.home_food_meal_slot)));
    payload.append('home_food_serving_start', form.home_food_serving_start);
    payload.append('home_food_serving_end', form.home_food_serving_end);
    if (imageFile) payload.append('files', imageFile);

    setSaving(true);
    try {
      if (item?.menu_uid) await editMenuByAdminWithImage(item.menu_uid, payload);
      else await createMenuByAdminWithImage(payload);
      toast.success(item ? 'Kitchen dish updated' : 'Kitchen dish created');
      onSaved();
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(', ') : message || 'Could not save dish');
    } finally {
      setSaving(false);
    }
  };

  const imagePreview = imageFile
    ? URL.createObjectURL(imageFile)
    : item?.images?.[0] || '';

  return (
    <Modal title={item ? 'Edit Kitchen Dish' : 'Create Kitchen Dish'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Home Foods Provider">
            <div className="space-y-2">
              {!item && (
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)} className={`${inputClass} pl-9`} placeholder="Search provider name" />
                </div>
              )}
              <select disabled={Boolean(item)} value={form.restaurant_uid} onChange={(e) => setForm({ ...form, restaurant_uid: e.target.value })} className={inputClass} required>
                <option value="">Select provider</option>
                {filteredProviders.map((provider) => <option key={provider.provider_uid} value={provider.provider_uid}>{provider.restaurant_name}</option>)}
              </select>
            </div>
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Dish Image">
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              {imagePreview ? <img src={imagePreview} alt="Dish preview" className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-slate-300"><ChefHat size={25} /></div>}
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm text-slate-500" />
            </div>
          </Field>
        </div>

        <Field label="Dish Title"><input value={form.menu_name} onChange={(e) => setForm({ ...form, menu_name: e.target.value })} className={inputClass} required /></Field>
        <Field label="Meal Slot"><select value={form.home_food_meal_slot} onChange={(e) => setForm({ ...form, home_food_meal_slot: e.target.value })} className={inputClass}>{mealTypes.map((meal) => <option key={meal}>{meal}</option>)}</select></Field>
        <div className="md:col-span-2"><Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" className={inputClass} /></Field></div>
        <Field label="Serving Start"><input type="time" value={form.home_food_serving_start} onChange={(e) => setForm({ ...form, home_food_serving_start: e.target.value })} className={inputClass} /></Field>
        <Field label="Serving End"><input type="time" value={form.home_food_serving_end} onChange={(e) => setForm({ ...form, home_food_serving_end: e.target.value })} className={inputClass} /></Field>
        <div className="md:col-span-2">
          <Field label="Week Days">
            <div className="flex flex-wrap gap-2">
              {workingDays.map((day) => <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={form.home_food_week_days.includes(day)} onChange={() => setForm({ ...form, home_food_week_days: form.home_food_week_days.includes(day) ? form.home_food_week_days.filter((value) => value !== day) : [...form.home_food_week_days, day] })} />{day.slice(0, 3)}</label>)}
            </div>
          </Field>
        </div>
        <Field label="Status"><select value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
        <div className="md:col-span-2 flex justify-between gap-2 border-t pt-4">
          {item ? <button type="button" disabled={saving} onClick={() => confirm({ title: 'Delete Dish', message: `Delete dish "${item.menu_name}"? This cannot be undone.`, confirmLabel: 'Delete', onConfirm: async () => { await deleteMenu(item.menu_uid); toast.success('Kitchen dish deleted'); onSaved(); } })} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>
            <button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Dish'}</button>
          </div>
        </div>
      </form>
      <ConfirmDialog dialog={confirmDialog} confirmLoading={confirmLoading} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Modal>
  );
}

function Analytics({ data, loading }) {
  const cards = data?.cards || {};
  const definitions = [
    ['Total Providers', cards.total_providers, Store, 'bg-indigo-50 text-indigo-600'],
    ['Active Providers', cards.active_providers, ChefHat, 'bg-emerald-50 text-emerald-600'],
    ['Total Subscribers', cards.total_subscribers, Users, 'bg-sky-50 text-sky-600'],
    ['Active Subscribers', cards.active_subscribers, Activity, 'bg-violet-50 text-violet-600'],
    ['Revenue', money(cards.revenue), CircleDollarSign, 'bg-amber-50 text-amber-600'],
    ['Deliveries Today', cards.deliveries_today, PackageCheck, 'bg-teal-50 text-teal-600'],
    ['Missed Deliveries', cards.missed_deliveries, CalendarDays, 'bg-red-50 text-red-600'],
  ];
  if (loading) return <div className="rounded-2xl border bg-white p-12 text-center text-slate-400">Loading analytics…</div>;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{definitions.map(([label, value, Icon, color]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <AnalyticsTable title="Subscription Growth" rows={data?.subscriptionGrowth} />
      <AnalyticsTable title="Revenue Trend" rows={(data?.revenueTrend || []).map((row) => ({ ...row, value: money(row.value) }))} />
      <AnalyticsTable title="Popular Meal Types" rows={data?.popularMealType} />
      <AnalyticsTable title="Provider Performance" rows={(data?.providerPerformance || []).map((row) => ({ period: row.label, value: `${row.delivered} delivered / ${row.missed} missed` }))} />
    </div>
  </div>;
}

const AnalyticsTable = ({ title, rows = [] }) => <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h3 className="mb-4 font-semibold text-slate-900">{title}</h3><div className="space-y-2">{rows.length ? rows.map((row, index) => <div key={`${row.period || row.label}-${index}`} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">{row.period || row.label}</span><span className="font-semibold text-slate-800">{row.value}</span></div>) : <p className="text-sm text-slate-400">No data yet.</p>}</div></div>;
