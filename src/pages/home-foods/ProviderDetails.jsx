import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ChefHat, Users, RefreshCw,
  Star, CheckCircle, XCircle, AlertCircle, Save, X, Truck,
} from 'lucide-react';
import {
  getHomeFoodProviderDetail,
  updateHomeFoodProviderAdmin,
  activateHomeFoodProvider,
  deactivateHomeFoodProvider,
} from '../../services/api';

const MEAL_TYPES  = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const DAYS_ORDER  = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_ABBR    = { MONDAY:'Mon', TUESDAY:'Tue', WEDNESDAY:'Wed', THURSDAY:'Thu', FRIDAY:'Fri', SATURDAY:'Sat', SUNDAY:'Sun' };

const fmt   = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function toForm(p) {
  return {
    kitchen_name:           p?.kitchen_name        ?? '',
    contact_person:         p?.contact_person       ?? '',
    contact_number:         p?.contact_number       ?? '',
    contact_email:          p?.contact_email        ?? '',
    delivery_radius_km:     String(p?.delivery_radius_km   ?? ''),
    max_active_subscribers: String(p?.max_active_subscribers ?? ''),
    meal_types:             Array.isArray(p?.meal_types)    ? [...p.meal_types]    : [],
    working_days:           Array.isArray(p?.working_days)  ? [...p.working_days]  : [],
    address:                p?.address ?? '',
    city:                   p?.city    ?? '',
    state:                  p?.state   ?? '',
  };
}

function isDirty(form, original) {
  const orig = toForm(original);
  return Object.keys(form).some((k) => {
    if (Array.isArray(form[k])) {
      return JSON.stringify([...form[k]].sort()) !== JSON.stringify([...orig[k]].sort());
    }
    return String(form[k]) !== String(orig[k]);
  });
}

function buildPatch(form, original) {
  const orig  = toForm(original);
  const patch = {};
  Object.keys(form).forEach((k) => {
    if (Array.isArray(form[k])) {
      if (JSON.stringify([...form[k]].sort()) !== JSON.stringify([...orig[k]].sort())) {
        patch[k] = form[k];
      }
    } else if (String(form[k]) !== String(orig[k])) {
      const num = ['delivery_radius_km', 'max_active_subscribers'];
      patch[k] = num.includes(k) ? Number(form[k]) : form[k];
    }
  });
  return patch;
}

// ── small UI ──────────────────────────────────────────────────────────────────
function ReviewBadge({ status }) {
  const map = {
    approved: { icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
    rejected: { icon: XCircle,     cls: 'bg-red-50 text-red-700 border-red-200',             label: 'Rejected' },
    pending:  { icon: AlertCircle, cls: 'bg-amber-50 text-amber-700 border-amber-200',        label: 'Pending Review' },
  };
  const { icon: Icon, cls, label } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 leading-none">{value ?? '—'}</p>
        <p className="mt-0.5 text-xs text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-colors w-full';

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function ProviderDetails() {
  const { providerUid } = useParams();
  const navigate        = useNavigate();

  const [provider, setProvider]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [form, setForm]               = useState(toForm(null));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHomeFoodProviderDetail(providerUid);
      const data = res.data?.data || null;
      setProvider(data);
      setForm(toForm(data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load provider details');
    } finally {
      setLoading(false);
    }
  }, [providerUid]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => provider && isDirty(form, provider), [form, provider]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleArray = (field, value) => {
    setForm((f) => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleSave = async () => {
    if (!dirty) return;
    const patch = buildPatch(form, provider);
    if (!Object.keys(patch).length) return;
    setSaving(true);
    try {
      await updateHomeFoodProviderAdmin(providerUid, patch);
      toast.success('Provider updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setForm(toForm(provider));

  const toggleBlock = async () => {
    if (!provider) return;
    setBlockLoading(true);
    try {
      if (provider.is_active) {
        await deactivateHomeFoodProvider(providerUid);
        toast.success('Provider blocked');
      } else {
        await activateHomeFoodProvider(providerUid);
        toast.success('Provider activated');
      }
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
        <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
        <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">Provider not found.</p>
        </div>
      </div>
    );
  }

  const reviewStatus = provider.review_status || (provider.is_active ? 'approved' : 'pending');
  const displayName  = provider.restaurant_name || provider.kitchen_name || provider.provider_uid;
  const plans        = Array.isArray(provider.plans) ? provider.plans : [];

  return (
    <div className="min-h-full bg-slate-50/60 p-4 pb-24 md:p-6 md:pb-24">
      {/* top nav */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Providers
        </button>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Unsaved changes
            </span>
          )}
          <button onClick={load} disabled={loading} className="rounded-xl border bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* profile header */}
      <div className="mb-5 flex flex-wrap items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        {provider.profile_image_url ? (
          <img src={provider.profile_image_url} alt={displayName} className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
            <ChefHat size={28} className="text-indigo-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
            <ReviewBadge status={reviewStatus} />
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono">{provider.provider_uid}</p>
          {provider.rejection_reason && (
            <p className="mt-1 text-xs text-red-500">Rejection: {provider.rejection_reason}</p>
          )}
        </div>
        <button
          onClick={toggleBlock}
          disabled={blockLoading}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
            provider.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {blockLoading ? '…' : provider.is_active ? 'Block Provider' : 'Approve & Activate'}
        </button>
      </div>

      {/* stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Active Subscribers" value={provider.active_subscribers}      color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Users} label="Total Subscribers"  value={provider.total_subscribers}       color="bg-slate-100 text-slate-600" />
        <StatCard icon={Truck} label="Delivery Radius"    value={provider.delivery_radius_km ? `${Number(provider.delivery_radius_km)} km` : '—'} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Star}  label="Capacity"           value={provider.max_active_subscribers}  color="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Kitchen Info */}
        <Section title="Kitchen Info">
          <Field label="Kitchen Name">
            <input value={form.kitchen_name} onChange={set('kitchen_name')} className={inputCls} placeholder="e.g. Amma's Kitchen" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Delivery Radius (km)">
              <input type="number" min="0" value={form.delivery_radius_km} onChange={set('delivery_radius_km')} className={inputCls} />
            </Field>
            <Field label="Max Subscribers">
              <input type="number" min="0" value={form.max_active_subscribers} onChange={set('max_active_subscribers')} className={inputCls} />
            </Field>
          </div>
          <Field label="Meal Types">
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((t) => {
                const active = form.meal_types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleArray('meal_types', t)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Working Days">
            <div className="flex flex-wrap gap-2">
              {DAYS_ORDER.map((d) => {
                const active = form.working_days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleArray('working_days', d)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {DAY_ABBR[d]}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="border-t border-slate-100 pt-2 text-xs text-slate-400">
            Registered: {fmt(provider.created_at)}
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Information">
          <Field label="Contact Person">
            <input value={form.contact_person} onChange={set('contact_person')} className={inputCls} placeholder="Full name" />
          </Field>
          <Field label="Mobile Number">
            <input value={form.contact_number} onChange={set('contact_number')} className={inputCls} placeholder="+91 XXXXX XXXXX" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.contact_email} onChange={set('contact_email')} className={inputCls} placeholder="email@example.com" />
          </Field>
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field label="Street Address">
            <textarea value={form.address} onChange={set('address')} rows={2} className={`${inputCls} resize-none`} placeholder="Door no., street, area…" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input value={form.city} onChange={set('city')} className={inputCls} placeholder="City" />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={set('state')} className={inputCls} placeholder="State" />
            </Field>
          </div>
          {provider.lat && provider.lng && (
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              Coordinates: {Number(provider.lat).toFixed(5)}, {Number(provider.lng).toFixed(5)}
            </div>
          )}
        </Section>

        {/* Plans (read-only) */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">Subscription Plans ({plans.length})</h3>
          </div>
          <div className="p-5">
            {plans.length === 0 ? (
              <p className="text-sm text-slate-400">No plans configured.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <div key={plan.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-slate-800 truncate">{plan.name}</span>
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{plan.plan_type}</span>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-900">{money(plan.price)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {plan.duration_days} days &middot; {(plan.meal_types || []).join(', ')}
                      {!plan.is_active && <span className="ml-2 text-red-400">Inactive</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t border-amber-200 bg-white px-4 py-3 shadow-lg sm:px-6">
          <span className="text-sm font-semibold text-amber-700">You have unsaved changes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={14} /> Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
