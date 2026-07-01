import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  CalendarClock,
  Check,
  Edit2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  createPushNotificationCampaign,
  deletePushNotificationCampaign,
  getAllCustomers,
  getPushNotificationCampaign,
  getPushNotificationCampaigns,
  sendPushNotificationCampaignNow,
  updatePushNotificationCampaign,
  uploadPushNotificationImage,
} from '../../services/api';

const statuses = ['DRAFT', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'];

const emptyForm = {
  title: '',
  message: '',
  imageUrl: '',
  targetType: 'ALL_USERS',
  selectedUserUids: [],
  scheduledAt: '',
};

const statusStyles = {
  DRAFT: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  SENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  FAILED: 'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const toDatetimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const getApiErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || error?.response?.data?.error || error?.message || fallback;
};

const unwrapCampaignList = (response) => ({
  items: response?.data?.data || [],
  meta: response?.data?.meta || { page: 1, totalPages: 1, total: 0 },
});

const unwrapCampaign = (response) => response?.data?.data || response?.data || null;

const unwrapCustomers = (response) => {
  const raw = response?.data?.data || response?.data?.items || response?.data || [];
  const items = Array.isArray(raw) ? raw : raw.data || raw.items || [];
  return items.map((user) => {
    const name = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim();
    const email = user.contact?.encryptedEmail || user.contact?.email || '';
    return {
      uid: user.uid || user.customerId || user.id,
      name: name || user.name || email.split('@')[0] || user.uid || 'Customer',
      phone: user.contact?.encryptedPhone || user.contact?.phone || '',
      email,
    };
  }).filter((user) => user.uid);
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[status] || statusStyles.DRAFT}`}>
    {status}
  </span>
);

const CampaignModal = ({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initial?.title || '',
      message: initial?.message || '',
      imageUrl: initial?.imageUrl || '',
      targetType: initial?.targetType || 'ALL_USERS',
      selectedUserUids: initial?.selectedUserUids || [],
      scheduledAt: toDatetimeLocalValue(initial?.scheduledAt),
    });
    setCustomerSearch('');
    setCustomerOptions([]);
  }, [open, initial]);

  const loadCustomers = useCallback(async (search = '') => {
    setLoadingCustomers(true);
    try {
      const response = await getAllCustomers({ page: 1, limit: 25, search });
      setCustomerOptions(unwrapCustomers(response));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load users'));
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!open || form.targetType !== 'SELECTED_USERS') return;
    const timer = setTimeout(() => loadCustomers(customerSearch), 250);
    return () => clearTimeout(timer);
  }, [customerSearch, form.targetType, loadCustomers, open]);

  if (!open) return null;

  const toggleUser = (uid) => {
    setForm((current) => ({
      ...current,
      selectedUserUids: current.selectedUserUids.includes(uid)
        ? current.selectedUserUids.filter((item) => item !== uid)
        : [...current.selectedUserUids, uid],
    }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Notification image must be 2MB or smaller');
      return;
    }

    setUploadingImage(true);
    try {
      const response = await uploadPushNotificationImage(file);
      const imageUrl = response?.data?.data?.imageUrl || response?.data?.data?.url;
      if (!imageUrl) throw new Error('Upload response missing image URL');
      setForm((current) => ({ ...current, imageUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to upload image'));
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = (action) => {
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      targetType: form.targetType,
      selectedUserUids: form.targetType === 'SELECTED_USERS' ? form.selectedUserUids : [],
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      saveAsDraft: action === 'draft',
      sendNow: action === 'sendNow',
    };
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{mode === 'edit' ? 'Edit Campaign' : 'Create Push Campaign'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">FCM campaign for customer app users</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-gray-600">Notification Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                maxLength={140}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                placeholder="Baarish Special"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold text-gray-600">Notification Message</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                placeholder="Ghar baithe garma-garam pakode order karein."
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">Notification Image</span>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {form.imageUrl ? (
                  <div className="relative">
                    <img src={form.imageUrl} alt="" className="w-full h-32 object-cover bg-gray-100" />
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-gray-600 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="h-32 flex flex-col items-center justify-center gap-2 text-gray-500 cursor-pointer hover:bg-gray-50">
                    {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={22} />}
                    <span className="text-xs font-semibold">{uploadingImage ? 'Uploading image...' : 'Upload image'}</span>
                    <span className="text-[11px] text-gray-400">JPG, PNG, WebP up to 2MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}
                <div className="relative border-t border-gray-100">
                  <ImageIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((current) => ({ ...current, imageUrl: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 text-sm outline-none"
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-600">Schedule Date & Time</span>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((current) => ({ ...current, scheduledAt: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-gray-600">Target Audience</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['ALL_USERS', 'All Users', 'Send to every active customer with notifications enabled'],
                ['SELECTED_USERS', 'Selected Users', 'Pick specific customer accounts'],
              ].map(([value, label, sub]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, targetType: value }))}
                  className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                    form.targetType === value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {form.targetType === 'SELECTED_USERS' && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <Search size={15} className="text-gray-400" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="flex-1 text-sm outline-none"
                  placeholder="Search users by name, phone, or email"
                />
                <span className="text-xs font-semibold text-indigo-600">{form.selectedUserUids.length} selected</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                {loadingCustomers ? (
                  <div className="p-5 flex items-center justify-center text-gray-500 text-sm">
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading users
                  </div>
                ) : customerOptions.length === 0 ? (
                  <div className="p-5 text-center text-sm text-gray-500">No users found</div>
                ) : (
                  customerOptions.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => toggleUser(user.uid)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.phone || user.email || user.uid}</p>
                      </div>
                      <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                        form.selectedUserUids.includes(user.uid)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300'
                      }`}>
                        {form.selectedUserUids.includes(user.uid) ? <Check size={13} /> : null}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={() => submit('draft')}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={() => submit('schedule')}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <CalendarClock size={15} /> Schedule
          </button>
          {mode !== 'edit' && (
            <button
              onClick={() => submit('sendNow')}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PushNotifications = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPushNotificationCampaigns({
        ...filters,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      const result = unwrapCampaignList(response);
      setCampaigns(result.items);
      setMeta(result.meta);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load push campaigns'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(loadCampaigns, 250);
    return () => clearTimeout(timer);
  }, [loadCampaigns]);

  const stats = useMemo(() => {
    const base = Object.fromEntries(statuses.map((status) => [status, 0]));
    campaigns.forEach((campaign) => {
      base[campaign.status] = (base[campaign.status] || 0) + 1;
    });
    return base;
  }, [campaigns]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (campaign) => {
    setEditing(campaign);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) {
        const { sendNow: _sendNow, ...updatePayload } = payload;
        await updatePushNotificationCampaign(editing.uid, updatePayload);
        toast.success('Campaign updated');
      } else {
        await createPushNotificationCampaign(payload);
        toast.success(payload.sendNow ? 'Campaign sent' : 'Campaign saved');
      }
      setModalOpen(false);
      setEditing(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save campaign'));
    } finally {
      setSubmitting(false);
    }
  };

  const loadDetails = async (uid) => {
    setDetailsLoading(true);
    try {
      const response = await getPushNotificationCampaign(uid);
      setDetails(unwrapCampaign(response));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load campaign details'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const sendNow = async (campaign) => {
    if (!window.confirm(`Send "${campaign.title}" now?`)) return;
    try {
      await sendPushNotificationCampaignNow(campaign.uid);
      toast.success('Campaign sent');
      await loadCampaigns();
      if (details?.uid === campaign.uid) await loadDetails(campaign.uid);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to send campaign'));
    }
  };

  const remove = async (campaign) => {
    if (!window.confirm(`Delete "${campaign.title}"?`)) return;
    try {
      await deletePushNotificationCampaign(campaign.uid);
      toast.success('Campaign deleted');
      if (details?.uid === campaign.uid) setDetails(null);
      await loadCampaigns();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete campaign'));
    }
  };

  const canModify = (campaign) => ['DRAFT', 'SCHEDULED'].includes(campaign.status);
  const canSend = (campaign) => ['DRAFT', 'SCHEDULED', 'FAILED'].includes(campaign.status);
  const canDelete = (campaign) => !['PROCESSING', 'SENT'].includes(campaign.status);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Marketing</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Push Notifications</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCampaigns}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} /> Create Campaign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilters((current) => ({ ...current, status: current.status === status ? '' : status, page: 1 }))}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                filters.status === status ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-semibold text-gray-500">{status}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats[status] || 0}</p>
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value, page: 1 }))}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                placeholder="Search campaigns"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value, page: 1 }))}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Schedule</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Delivery</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <Loader2 size={20} className="animate-spin inline mr-2" /> Loading campaigns
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No push campaigns found</td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.uid} className="hover:bg-gray-50/70">
                      <td className="px-4 py-4 min-w-[280px]">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Bell size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{campaign.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{campaign.message}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="inline-flex items-center gap-1.5">
                          <Users size={14} className="text-gray-400" />
                          {campaign.targetType === 'ALL_USERS' ? 'All Users' : `${campaign.selectedUserUids?.length || 0} Users`}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatDateTime(campaign.scheduledAt)}</td>
                      <td className="px-4 py-4"><StatusBadge status={campaign.status} /></td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className="font-semibold text-emerald-600">{campaign.successCount || 0}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="font-semibold text-red-500">{campaign.failureCount || 0}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => loadDetails(campaign.uid)} className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" title="View">
                            <Eye size={16} />
                          </button>
                          {canModify(campaign) && (
                            <button onClick={() => openEdit(campaign)} className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canSend(campaign) && (
                            <button onClick={() => sendNow(campaign)} className="p-2 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50" title="Send now">
                              <Send size={16} />
                            </button>
                          )}
                          {canDelete(campaign) && (
                            <button onClick={() => remove(campaign)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>{meta.total || 0} campaigns</span>
            <div className="flex items-center gap-2">
              <button
                disabled={(meta.page || 1) <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs font-semibold">Page {meta.page || 1} of {meta.totalPages || 1}</span>
              <button
                disabled={(meta.page || 1) >= (meta.totalPages || 1)}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {(details || detailsLoading) && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Campaign Details</h2>
              <button onClick={() => setDetails(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            {detailsLoading ? (
              <div className="p-8 text-center text-gray-500"><Loader2 size={18} className="animate-spin inline mr-2" /> Loading details</div>
            ) : (
              <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{details.title}</h3>
                      <StatusBadge status={details.status} />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{details.message}</p>
                  </div>
                  {details.imageUrl && (
                    <img src={details.imageUrl} alt="" className="w-full max-h-64 object-cover rounded-xl border border-gray-100" />
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Target</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{details.targetType}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Scheduled</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatDateTime(details.scheduledAt)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Sent</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatDateTime(details.sentAt)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="text-sm font-bold text-gray-900 mt-1 truncate">{details.createdBy || '-'}</p>
                    </div>
                  </div>
                  {details.failureReason && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      {details.failureReason}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900">Recipients</p>
                    <p className="text-xs text-gray-500">{details.successCount || 0} sent, {details.failureCount || 0} failed</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {(details.recipients || []).length === 0 ? (
                      <div className="p-5 text-sm text-gray-500 text-center">No recipient records yet</div>
                    ) : details.recipients.map((recipient) => (
                      <div key={recipient.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">{recipient.userUid}</p>
                          <span className={`text-[11px] font-bold ${recipient.status === 'SENT' ? 'text-emerald-600' : recipient.status === 'FAILED' ? 'text-red-600' : 'text-gray-500'}`}>
                            {recipient.status}
                          </span>
                        </div>
                        {recipient.failureReason && <p className="text-xs text-red-500 mt-1">{recipient.failureReason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CampaignModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        initial={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
};

export default PushNotifications;
