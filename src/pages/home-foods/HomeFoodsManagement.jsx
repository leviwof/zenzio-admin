import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Activity, CalendarDays, ChefHat, CircleDollarSign, PackageCheck,
  Plus, RefreshCw, Search, Store, Users, X,
} from 'lucide-react';
import {
  cancelHomeFoodClosure,
  createMenuByAdminWithImage,
  createHomeFoodClosure,
  createHomeFoodPlan,
  deleteMenu,
  deleteHomeFoodDelivery,
  deleteHomeFoodPlan,
  deleteHomeFoodProvider,
  deleteHomeFoodSubscription,
  getAllRestaurants,
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
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', status: '', provider_uid: '', plan_type: '',
    payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
  });
  const [modal, setModal] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    setFilters({
      search: '', status: '', provider_uid: '', plan_type: '',
      payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
    });
  }, [section]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === 'analytics') {
        const response = await getHomeFoodAnalytics();
        setAnalytics(response.data?.data || {});
        setItems([]);
        return;
      }
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
      );
      if (section === 'deliveries' && params.status) {
        params.status = deliveryStatuses.includes(params.status) ? params.status : '';
      }
      const loaders = {
        providers: getHomeFoodProviders,
        plans: getHomeFoodPlans,
        subscriptions: getHomeFoodSubscriptions,
        deliveries: getHomeFoodDeliveries,
        closures: getHomeFoodClosures,
        menus: getHomeFoodKitchenMenus,
      };
      const response = await loaders[section](params);
      setItems(unwrapItems(response));
      setMeta(response.data?.meta || {});
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load Home Foods data');
    } finally {
      setLoading(false);
    }
  }, [filters, section]);

  useEffect(() => { load(); }, [load]);

  const sectionModalType = {
    providers: 'provider',
    plans: 'plan',
    subscriptions: 'subscription',
    deliveries: 'delivery',
    menus: 'menu',
  }[section];
  const openCreate = () => setModal({ type: sectionModalType });

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

  const extendSubscription = async (id) => {
    const days = Number(window.prompt('Extend by how many days?', '7'));
    if (!Number.isInteger(days) || days < 1) return;
    await updateHomeFoodSubscription(id, { extend_days: days });
    toast.success('Subscription extended');
    load();
  };

  const headers = useMemo(() => ({
    providers: ['Restaurant', 'Status', 'Capacity', 'Active Subscribers', 'Radius', 'Meal Types', 'Plans', 'Created', 'Actions'],
    plans: ['Plan', 'Type', 'Restaurant', 'Duration', 'Price', 'Meal Types', 'Status', 'Actions'],
    subscriptions: ['Subscription', 'Customer', 'Phone', 'Restaurant', 'Plan', 'Amount', 'Status', 'Payment', 'Dates', 'Actions'],
    deliveries: ['Delivery', 'Subscription', 'Customer', 'Restaurant', 'Meal', 'Date', 'Status', 'Actions'],
    menus: ['Image', 'Title', 'Provider', 'Description', 'Week Days', 'Meal Slot', 'Serving Time', 'Actions'],
  })[section] || [], [section]);

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Platform Control</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
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
      ) : (
        <>
          <PageFilters
            section={section}
            filters={filters}
            setFilters={setFilters}
            total={meta.total ?? items.length}
          />
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b bg-slate-50/80">
                  <tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{header}</th>)}</tr>
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
                      onDelivery={updateDelivery}
                      onCancelSubscription={cancelSubscription}
                      onExtendSubscription={extendSubscription}
                      onDeleteProvider={async () => {
                        if (!window.confirm(`Delete ${item.restaurant_name || 'this provider'} from Home Foods?`)) return;
                        await deleteHomeFoodProvider(item.provider_uid);
                        toast.success('Provider deleted');
                        load();
                      }}
                      onDeletePlan={async () => {
                        if (!window.confirm(`Delete plan "${item.name}"?`)) return;
                        await deleteHomeFoodPlan(item.id);
                        toast.success('Plan deleted');
                        load();
                      }}
                      onDeleteSubscription={async () => {
                        if (!window.confirm('Delete this subscription? Future deliveries will be cancelled.')) return;
                        await deleteHomeFoodSubscription(item.id);
                        toast.success('Subscription deleted');
                        load();
                      }}
                      onDeleteDelivery={async () => {
                        if (!window.confirm('Delete this delivery record?')) return;
                        await deleteHomeFoodDelivery(item.id);
                        toast.success('Delivery deleted');
                        load();
                      }}
                      onCancelClosure={async () => {
                        if (!window.confirm('Delete this closure?')) return;
                        await cancelHomeFoodClosure(item.id);
                        toast.success('Closure deleted');
                        load();
                      }}
                      onDeleteMenu={async () => {
                        if (!window.confirm(`Delete dish "${item.menu_name}"?`)) return;
                        await deleteMenu(item.menu_uid);
                        toast.success('Kitchen dish deleted');
                        load();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modal?.type === 'provider' && <ProviderForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'plan' && <PlanForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'subscription' && <SubscriptionDetail item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'delivery' && <DeliveryDetail item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'closure' && <ClosureForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'menu' && <KitchenMenuForm item={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

function Row({ section, item, onEdit, onDelivery, onCancelSubscription, onExtendSubscription, onDeleteProvider, onDeletePlan, onDeleteSubscription, onDeleteDelivery, onCancelClosure, onDeleteMenu }) {
  if (section === 'providers') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{item.restaurant_name}</td>
      <td className="px-4 py-3"><Status value={item.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td className="px-4 py-3 text-sm">{item.capacity}</td><td className="px-4 py-3 text-sm">{item.active_subscribers}</td>
      <td className="px-4 py-3 text-sm">{Number(item.delivery_radius_km)} km</td>
      <td className="px-4 py-3 text-xs text-slate-500">{(item.meal_types || []).join(', ')}</td>
      <td className="px-4 py-3">
        {(item.plans || []).length === 0 ? (
          <span className="text-xs text-slate-400">No plans</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(item.plans || []).slice(0, 3).map((plan, idx) => (
              <span key={idx} className="inline-flex flex-col items-start rounded-lg bg-indigo-50 px-2 py-1 text-[11px]">
                <span className="font-semibold text-indigo-700">{money(plan.price)}</span>
                <span className="text-indigo-400">{plan.plan_type}</span>
              </span>
            ))}
            {(item.plans || []).length > 3 && (
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                +{item.plans.length - 3}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">{date(item.created_at)}</td>
      <td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); onDeleteProvider(); }} className="text-xs font-semibold text-red-600">Delete</button></td>
    </tr>
  );
  if (section === 'plans') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3 text-sm font-semibold">{item.name}</td><td className="px-4 py-3 text-xs">{item.plan_type}</td>
      <td className="px-4 py-3 text-sm">{item.restaurant_name || item.provider_uid}</td><td className="px-4 py-3 text-sm">{item.duration_days} days</td>
      <td className="px-4 py-3 text-sm font-semibold">{money(item.price)}</td><td className="px-4 py-3 text-xs">{(item.meal_types || []).join(', ')}</td>
      <td className="px-4 py-3"><Status value={item.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); onDeletePlan(); }} className="text-xs font-semibold text-red-600">Delete</button></td>
    </tr>
  );
  if (section === 'subscriptions') return (
    <tr onClick={onEdit} className="cursor-pointer hover:bg-indigo-50/40">
      <td className="px-4 py-3 font-mono text-xs">{item.id}</td><td className="px-4 py-3 text-sm font-semibold">{item.customer_name}</td>
      <td className="px-4 py-3 text-xs">{item.phone || '—'}</td><td className="px-4 py-3 text-sm">{item.restaurant_name}</td>
      <td className="px-4 py-3 text-sm">{item.plan_name}</td><td className="px-4 py-3 text-sm">{money(item.amount_paid)}</td>
      <td className="px-4 py-3"><Status value={item.status} /></td><td className="px-4 py-3"><Status value={item.payment_status} /></td>
      <td className="px-4 py-3 text-xs">{date(item.start_date)} – {date(item.end_date)}</td>
      <td className="px-4 py-3"><button onClick={(event) => { event.stopPropagation(); onDeleteSubscription(); }} className="text-xs font-semibold text-red-600">Delete</button></td>
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
      <td className="px-4 py-3"><Status value={item.home_food_meal_slot || 'UNASSIGNED'} /></td>
      <td className="px-4 py-3 text-xs text-slate-600">{item.home_food_serving_start && item.home_food_serving_end ? `${item.home_food_serving_start.slice(0, 5)} – ${item.home_food_serving_end.slice(0, 5)}` : '—'}</td>
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

function PageFilters({ section, filters, setFilters, total }) {
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters({
    search: '', status: '', provider_uid: '', plan_type: '',
    payment_status: '', meal_type: '', from_date: '', to_date: '', date: '',
  });
  const placeholders = {
    providers: 'Search restaurant name or UID',
    plans: 'Search plan, restaurant, or UID',
    subscriptions: 'Search subscription, customer, restaurant, or plan',
    deliveries: 'Search delivery, subscription, customer, or restaurant',
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
        </select>

        {section === 'plans' && (
          <select value={filters.plan_type} onChange={(event) => set('plan_type', event.target.value)} className={inputClass}>
            <option value="">All plan types</option>
            {planTypes.map((value) => <option key={value}>{value}</option>)}
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
        {section !== 'deliveries' && (
          <>
            <input type="date" value={filters.from_date} onChange={(event) => set('from_date', event.target.value)} className={inputClass} title="From date" />
            <input type="date" value={filters.to_date} onChange={(event) => set('to_date', event.target.value)} className={inputClass} title="To date" />
          </>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">{total} records</span>
        <button type="button" onClick={reset} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Clear filters</button>
      </div>
    </div>
  );
}

function ProviderForm({ item, onClose, onSaved }) {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedMenuDay, setSelectedMenuDay] = useState('MONDAY');
  const [slotOptions, setSlotOptions] = useState([]);
  const [slotDraft, setSlotDraft] = useState({ start: '', end: '' });
  const [providerPlans, setProviderPlans] = useState([]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planEditor, setPlanEditor] = useState({
    name: '', plan_type: 'MONTHLY', duration_days: 30,
    price: 0, meal_types: ['LUNCH'], is_active: true,
  });
  const [form, setForm] = useState({
    provider_uid: item?.provider_uid || '', is_active: item?.is_active ?? true,
    max_active_subscribers: Number(item?.capacity || 100), delivery_radius_km: Number(item?.delivery_radius_km || 5),
    meal_types: item?.meal_types || mealTypes, working_days: workingDays, delivery_slots: [], weekly_menu: {},
  });
  const providerPayload = () => ({
    provider_uid: form.provider_uid,
    is_active: Boolean(form.is_active),
    max_active_subscribers: Number(form.max_active_subscribers),
    delivery_radius_km: Number(form.delivery_radius_km),
    meal_types: Array.isArray(form.meal_types) ? form.meal_types : [],
    delivery_slots: Array.isArray(form.delivery_slots) ? form.delivery_slots : [],
    working_days: Array.isArray(form.working_days) ? form.working_days : [],
    weekly_menu: form.weekly_menu && typeof form.weekly_menu === 'object'
      ? form.weekly_menu
      : {},
    trial_available: form.trial_available ?? true,
  });
  const validateProviderPayload = (payload) => {
    if (!Number.isInteger(payload.max_active_subscribers) || payload.max_active_subscribers < 1) {
      throw new Error('Capacity must be a whole number greater than zero');
    }
    if (
      !Number.isFinite(payload.delivery_radius_km)
      || payload.delivery_radius_km < 0.1
      || payload.delivery_radius_km > 100
    ) {
      throw new Error('Delivery radius must be between 0.1 and 100 km');
    }
  };
  const loadProviderPlans = useCallback(async (providerUid) => {
    if (!providerUid) {
      setProviderPlans([]);
      return;
    }
    try {
      const response = await getHomeFoodPlans({ provider_uid: providerUid });
      setProviderPlans(unwrapItems(response));
    } catch {
      setProviderPlans([]);
    }
  }, []);
  useEffect(() => {
    getAllRestaurants({ limit: 500 }).then((response) => {
      const rows = Array.isArray(response.data) ? response.data : response.data?.data;
      setRestaurants(Array.isArray(rows) ? rows : []);
    }).catch(() => {});
    if (item?.provider_uid) getHomeFoodProviderSettings(item.provider_uid).then((response) => {
      const settings = response.data?.data;
      if (settings) {
        setForm((current) => ({
          ...current,
          provider_uid: settings.provider_uid || current.provider_uid,
          is_active: settings.is_active ?? current.is_active,
          max_active_subscribers: Number(
            settings.max_active_subscribers ?? current.max_active_subscribers,
          ),
          delivery_radius_km: Number(
            settings.delivery_radius_km ?? current.delivery_radius_km,
          ),
          meal_types: settings.meal_types || current.meal_types,
          delivery_slots: settings.delivery_slots || [],
          working_days: settings.working_days || current.working_days,
          weekly_menu: settings.weekly_menu || {},
          trial_available: settings.trial_available ?? true,
        }));
        setSlotOptions(settings.delivery_slots || []);
        setSelectedMenuDay(settings.working_days?.[0] || 'MONDAY');
      }
    }).catch(() => {});
    if (item?.provider_uid) loadProviderPlans(item.provider_uid);
  }, [item, loadProviderPlans]);
  const toggleWorkingDay = (day) => {
    const enabled = (form.working_days || []).includes(day);
    const nextDays = enabled
      ? form.working_days.filter((value) => value !== day)
      : [...(form.working_days || []), day];
    setForm({ ...form, working_days: nextDays });
    if (enabled && selectedMenuDay === day) setSelectedMenuDay(nextDays[0] || '');
    if (!enabled && !selectedMenuDay) setSelectedMenuDay(day);
  };
  const addDeliverySlot = () => {
    if (!slotDraft.start || !slotDraft.end) {
      toast.error('Select both slot start and end times');
      return;
    }
    if (slotDraft.start >= slotDraft.end) {
      toast.error('Slot end time must be later than start time');
      return;
    }
    const slot = `${slotDraft.start}-${slotDraft.end}`;
    if (slotOptions.includes(slot)) {
      toast.error('This delivery slot already exists');
      return;
    }
    setSlotOptions([...slotOptions, slot]);
    setForm({ ...form, delivery_slots: [...(form.delivery_slots || []), slot] });
    setSlotDraft({ start: '', end: '' });
  };
  const toggleDeliverySlot = (slot) => {
    const selected = (form.delivery_slots || []).includes(slot);
    setForm({
      ...form,
      delivery_slots: selected
        ? form.delivery_slots.filter((value) => value !== slot)
        : [...(form.delivery_slots || []), slot],
    });
  };
  const removeDeliverySlot = (slot) => {
    setSlotOptions(slotOptions.filter((value) => value !== slot));
    setForm({
      ...form,
      delivery_slots: (form.delivery_slots || []).filter((value) => value !== slot),
    });
  };
  const editProviderPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanEditor({
      name: plan.name || '',
      plan_type: plan.plan_type,
      duration_days: Number(plan.duration_days),
      price: Number(plan.price),
      meal_types: plan.meal_types || [],
      is_active: plan.is_active,
    });
  };
  useEffect(() => {
    if (!providerPlans.length) {
      setEditingPlanId(null);
      return;
    }
    if (!providerPlans.some((plan) => plan.id === editingPlanId)) {
      editProviderPlan(providerPlans[0]);
    }
  }, [providerPlans, editingPlanId]);
  const saveProviderPlan = async () => {
    if (!form.provider_uid) {
      toast.error('Select a restaurant first');
      return;
    }
    if (!planEditor.name.trim() || !planEditor.meal_types.length) {
      toast.error('Plan name and at least one meal type are required');
      return;
    }
    if (!editingPlanId) {
      toast.error('Select an existing subscription plan');
      return;
    }
    setPlanSaving(true);
    try {
      // Ensures settings exist when a plan is created during initial provider onboarding.
      const payload = providerPayload();
      validateProviderPayload(payload);
      await saveHomeFoodProviderSettings(payload);
      await updateHomeFoodPlan(editingPlanId, planEditor);
      await loadProviderPlans(form.provider_uid);
      toast.success('Subscription plan updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save subscription plan');
    } finally {
      setPlanSaving(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = providerPayload();
      validateProviderPayload(payload);
      await saveHomeFoodProviderSettings(payload);
      toast.success('Provider settings saved');
      onSaved();
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message || error.message || 'Could not save provider',
      );
    }
  };
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = restaurantSearch.trim().toLowerCase();
    if (!query) return true;
    const name = restaurant.restaurant_name || restaurant.profile?.restaurant_name || '';
    return `${name} ${restaurant.uid || ''}`.toLowerCase().includes(query);
  });
  return <Modal title="Provider Settings" onClose={onClose}><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <Field label="Restaurant">
      <div className="space-y-2">
        {!item && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={restaurantSearch}
              onChange={(event) => setRestaurantSearch(event.target.value)}
              className={`${inputClass} pl-9`}
              placeholder="Search restaurant name or UID"
            />
          </div>
        )}
        <select disabled={Boolean(item)} value={form.provider_uid} onChange={(e) => { setForm({ ...form, provider_uid: e.target.value }); loadProviderPlans(e.target.value); }} className={inputClass} required>
          <option value="">Select restaurant</option>
          {filteredRestaurants.map((restaurant) => <option key={restaurant.uid} value={restaurant.uid}>{restaurant.restaurant_name || restaurant.profile?.restaurant_name || restaurant.uid} ({restaurant.uid})</option>)}
        </select>
        {!item && restaurantSearch && filteredRestaurants.length === 0 && (
          <p className="text-xs text-amber-600">No matching restaurants found.</p>
        )}
      </div>
    </Field>
    <Field label="Status"><select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
    <Field label="Capacity"><input type="number" min="1" value={form.max_active_subscribers} onChange={(e) => setForm({ ...form, max_active_subscribers: Number(e.target.value) })} className={inputClass} /></Field>
    <Field label="Delivery radius (km)"><input type="number" min="0.1" step="0.1" value={form.delivery_radius_km} onChange={(e) => setForm({ ...form, delivery_radius_km: Number(e.target.value) })} className={inputClass} /></Field>
    <div className="md:col-span-2"><Field label="Meal Types"><div className="flex flex-wrap gap-2">{mealTypes.map((meal) => <label key={meal} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={form.meal_types.includes(meal)} onChange={() => setForm({ ...form, meal_types: form.meal_types.includes(meal) ? form.meal_types.filter((value) => value !== meal) : [...form.meal_types, meal] })} />{meal}</label>)}</div></Field></div>
    <div className="md:col-span-2"><Field label="Working Days"><div className="flex flex-wrap gap-2">{workingDays.map((day) => <label key={day} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={(form.working_days || []).includes(day)} onChange={() => toggleWorkingDay(day)} />{day.slice(0, 3)}</label>)}</div></Field></div>
    <div className="md:col-span-2">
      <Field label="Delivery Slots">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Start Time"><input type="time" value={slotDraft.start} onChange={(e) => setSlotDraft({ ...slotDraft, start: e.target.value })} className={inputClass} /></Field>
            <Field label="End Time"><input type="time" value={slotDraft.end} onChange={(e) => setSlotDraft({ ...slotDraft, end: e.target.value })} className={inputClass} /></Field>
            <button type="button" onClick={addDeliverySlot} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={15} /> Add Slot</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {slotOptions.map((slot) => {
              const selected = (form.delivery_slots || []).includes(slot);
              return (
                <div key={slot} className={`inline-flex items-center overflow-hidden rounded-xl border text-xs font-semibold ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  <button type="button" onClick={() => toggleDeliverySlot(slot)} className="flex items-center gap-2 px-3 py-2">
                    <input type="checkbox" checked={selected} readOnly />
                    {slot}
                  </button>
                  <button type="button" onClick={() => removeDeliverySlot(slot)} className="border-l border-current/10 px-2 py-2 hover:bg-red-50 hover:text-red-600" title="Delete slot"><X size={13} /></button>
                </div>
              );
            })}
            {!slotOptions.length && <p className="py-2 text-xs text-slate-400">Create a delivery slot, then select it for this provider.</p>}
          </div>
        </div>
      </Field>
    </div>
    <div className="md:col-span-2">
      <Field label="Weekly Menu">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {(form.working_days || []).length ? (
            <>
              <Field label="Select Day">
                <select value={(form.working_days || []).includes(selectedMenuDay) ? selectedMenuDay : form.working_days[0]} onChange={(e) => setSelectedMenuDay(e.target.value)} className={inputClass}>
                  {form.working_days.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </Field>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">{(form.working_days || []).includes(selectedMenuDay) ? selectedMenuDay : form.working_days[0]}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {(form.meal_types || mealTypes).map((meal) => (
                    <Field key={`${selectedMenuDay}-${meal}`} label={meal}>
                    <input
                        value={form.weekly_menu?.[(form.working_days || []).includes(selectedMenuDay) ? selectedMenuDay : form.working_days[0]]?.[meal] || ''}
                      onChange={(event) => setForm({
                        ...form,
                        weekly_menu: updateWeeklyMenu(
                          form.weekly_menu,
                            (form.working_days || []).includes(selectedMenuDay) ? selectedMenuDay : form.working_days[0],
                          meal,
                          event.target.value,
                        ),
                      })}
                      className={inputClass}
                      placeholder={`Enter ${meal.toLowerCase()} items`}
                    />
                  </Field>
                ))}
              </div>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-slate-400">
              Select at least one working day to configure the menu.
            </p>
          )}
        </div>
      </Field>
    </div>
    <div className="md:col-span-2">
      <Field label="Subscription Plans">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          {providerPlans.length > 0 && (
            <div>
              <Field label="Selected Subscription Plan">
                <select
                  value={editingPlanId || ''}
                  onChange={(event) => {
                    const plan = providerPlans.find((entry) => entry.id === event.target.value);
                    if (plan) editProviderPlan(plan);
                  }}
                  className={inputClass}
                >
                  {providerPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {plan.plan_type} — {money(plan.price)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="hidden">
              {providerPlans.map((plan) => (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => editProviderPlan(plan)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') editProviderPlan(plan);
                  }}
                  className={`cursor-pointer rounded-xl border p-3 transition-all ${
                    editingPlanId === plan.id
                      ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{plan.name}</p>
                      <Status value={plan.is_active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {plan.plan_type} · {plan.duration_days} days · {money(plan.price)} · {(plan.meal_types || []).join(', ')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${editingPlanId === plan.id ? 'text-indigo-700' : 'text-slate-400'}`}>
                      {editingPlanId === plan.id ? 'Selected' : 'Click to select'}
                    </span>
                    <button
                      type="button"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await updateHomeFoodPlan(plan.id, { is_active: !plan.is_active });
                        await loadProviderPlans(form.provider_uid);
                      }}
                      className="text-xs font-semibold text-slate-600"
                    >
                      {plan.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
          {providerPlans.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">No subscription plans available.</p>
              <p className="mt-1 text-xs text-slate-400">Create plans from the dedicated Plans page.</p>
            </div>
          )}

          <div className={`${editingPlanId ? '' : 'hidden'} rounded-xl border border-indigo-100 bg-white p-3`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                Selected Plan: {planEditor.name}
              </p>
              <Status value={planEditor.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Plan Name"><input value={planEditor.name} onChange={(e) => setPlanEditor({ ...planEditor, name: e.target.value })} className={inputClass} placeholder="Monthly Lunch Plan" /></Field>
              <Field label="Plan Type"><select value={planEditor.plan_type} onChange={(e) => setPlanEditor({ ...planEditor, plan_type: e.target.value, duration_days: planDurationDays[e.target.value] })} className={inputClass}>{planTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Duration Days"><input type="number" min="1" value={planEditor.duration_days} onChange={(e) => setPlanEditor({ ...planEditor, duration_days: Number(e.target.value) })} className={inputClass} /></Field>
              <Field label="Price"><input type="number" min="0" step="0.01" value={planEditor.price} onChange={(e) => setPlanEditor({ ...planEditor, price: Number(e.target.value) })} className={inputClass} /></Field>
              <div className="md:col-span-2">
                <Field label="Included Meals">
                  <div className="flex flex-wrap gap-2">
                    {(form.meal_types || mealTypes).map((meal) => (
                      <label key={meal} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          checked={planEditor.meal_types.includes(meal)}
                          onChange={() => setPlanEditor({
                            ...planEditor,
                            meal_types: planEditor.meal_types.includes(meal)
                              ? planEditor.meal_types.filter((value) => value !== meal)
                              : [...planEditor.meal_types, meal],
                          })}
                        />
                        {meal}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Plan Status"><select value={String(planEditor.is_active)} onChange={(e) => setPlanEditor({ ...planEditor, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
              <div className="flex items-end">
                <button type="button" disabled={planSaving} onClick={saveProviderPlan} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {planSaving ? 'Saving…' : 'Save Plan Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Field>
    </div>
    <div className="md:col-span-2 flex justify-between gap-2 border-t pt-4">
      {item ? <button type="button" onClick={async () => { if (!window.confirm('Delete this Home Foods provider?')) return; await deleteHomeFoodProvider(item.provider_uid); toast.success('Provider deleted'); onSaved(); }} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600">Delete</button> : <span />}
      <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Save Provider</button></div>
    </div>
  </form></Modal>;
}

function PlanForm({ item, onClose, onSaved }) {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({ provider_uid: item?.provider_uid || '', name: item?.name || '', plan_type: item?.plan_type || 'MONTHLY', duration_days: Number(item?.duration_days || 30), price: Number(item?.price || 0), meal_types: item?.meal_types || ['LUNCH'], is_active: item?.is_active ?? true });
  useEffect(() => { getHomeFoodProviders({ limit: 100 }).then((response) => setProviders(unwrapItems(response))).catch(() => {}); }, []);
  const submit = async (event) => { event.preventDefault(); item ? await updateHomeFoodPlan(item.id, form) : await createHomeFoodPlan(form); toast.success('Plan saved'); onSaved(); };
  return <Modal title={item ? 'Edit Plan' : 'Create Plan'} onClose={onClose}><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
    <Field label="Provider"><select disabled={Boolean(item)} value={form.provider_uid} onChange={(e) => setForm({ ...form, provider_uid: e.target.value })} className={inputClass} required><option value="">Select provider</option>{providers.map((provider) => <option key={provider.provider_uid} value={provider.provider_uid}>{provider.restaurant_name}</option>)}</select></Field>
    <Field label="Plan Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required /></Field>
    <Field label="Plan Type"><select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} className={inputClass}>{planTypes.map((type) => <option key={type}>{type}</option>)}</select></Field>
    <Field label="Duration Days"><input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} className={inputClass} /></Field>
    <Field label="Price"><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} /></Field>
    <Field label="Status"><select value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className={inputClass}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
    <div className="md:col-span-2"><Field label="Meal Types"><div className="flex flex-wrap gap-2">{mealTypes.map((meal) => <label key={meal} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"><input type="checkbox" checked={form.meal_types.includes(meal)} onChange={() => setForm({ ...form, meal_types: form.meal_types.includes(meal) ? form.meal_types.filter((value) => value !== meal) : [...form.meal_types, meal] })} />{meal}</label>)}</div></Field></div>
    <div className="md:col-span-2 flex justify-between gap-2 border-t pt-4">
      {item ? <button type="button" onClick={async () => { if (!window.confirm(`Delete plan "${item.name}"?`)) return; await deleteHomeFoodPlan(item.id); toast.success('Plan deleted'); onSaved(); }} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600">Delete</button> : <span />}
      <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button><button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Save Plan</button></div>
    </div>
  </form></Modal>;
}

function SubscriptionDetail({ item, onClose, onSaved }) {
  const [extendDays, setExtendDays] = useState(7);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

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

  const remove = async () => {
    if (!window.confirm('Delete this subscription? Future deliveries will be cancelled.')) return;
    setSaving(true);
    try {
      await deleteHomeFoodSubscription(item.id);
      toast.success('Subscription deleted');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

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

  const remove = async () => {
    if (!window.confirm('Delete this delivery record?')) return;
    setSaving(true);
    try {
      await deleteHomeFoodDelivery(item.id);
      toast.success('Delivery deleted');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

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

function KitchenMenuForm({ item, onClose, onSaved }) {
  const [providers, setProviders] = useState([]);
  const [providerSearch, setProviderSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    restaurant_uid: item?.restaurant_uid || '',
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
          {item ? <button type="button" disabled={saving} onClick={async () => { if (!window.confirm(`Delete dish "${item.menu_name}"?`)) return; await deleteMenu(item.menu_uid); toast.success('Kitchen dish deleted'); onSaved(); }} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50">Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button>
            <button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Dish'}</button>
          </div>
        </div>
      </form>
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
