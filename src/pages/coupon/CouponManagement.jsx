import React, { useEffect, useState, useCallback } from 'react';
import { Search, Edit2, Trash2, UserMinus, Download, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import CreateCouponPage from './CreateCouponModal';
import {
  getAllCoupons, createCoupon, updateCoupon, deleteCoupon, downloadCouponReport,
  getReferralAdminStats, getReferralAdminList, getReferralAdminById, exportReferralsData,
} from '../../services/api';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => n != null ? `₹${Number(n).toFixed(0)}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ value, map }) => {
  const cfg = map[value] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{value || '—'}</span>;
};

const referralStatusMap = {
  Successful: { bg: 'bg-green-100', text: 'text-green-700' },
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Failed: { bg: 'bg-red-100', text: 'text-red-700' },
};
const rewardStatusMap = {
  Credited: { bg: 'bg-green-100', text: 'text-green-700' },
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Expired: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

// ─── Referral Detail Modal ───────────────────────────────────────────────────

const ReferralDetailModal = ({ id, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReferralAdminById(id)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load referral details'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Referral Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : !data ? (
          <div className="p-8 text-center text-gray-500">Not found</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Referrer */}
            <Section title="Referrer Information">
              <Row label="Name" value={data.referrer_name} />
              <Row label="Mobile" value={data.referrer_phone || '—'} />
              <Row label="Referral Code" value={data.refer_code || '—'} mono />
              <Row label="Total Rewards Earned" value={data.referrer_total_rewards != null ? `${data.referrer_total_rewards} reward(s)` : '—'} />
            </Section>

            {/* Referred */}
            <Section title="Referred User Information">
              <Row label="Name" value={data.referred_name} />
              <Row label="Mobile" value={data.referred_phone || '—'} />
            </Section>

            {/* Order */}
            <Section title="Order Information">
              <Row label="Order ID" value={data.order_id || 'No delivered order yet'} mono />
              <Row label="Order Amount" value={data.order_amount != null ? fmt(data.order_amount) : '—'} />
              <Row label="Order Date" value={fmtDate(data.order_date)} />
            </Section>

            {/* Reward */}
            <Section title="Reward Information">
              <Row label="Reward Amount" value={data.reward_amount != null ? fmt(data.reward_amount) : '—'} />
              <Row label="Coupon Code" value={data.reward_coupon_code || '—'} mono />
              <Row label="Reward Status">
                <StatusBadge value={data.reward_status} map={rewardStatusMap} />
              </Row>
              <Row label="Coupon Expiry" value={fmtDate(data.coupon_expiry)} />
            </Section>

            {/* Timeline */}
            <Section title="Referral Timeline">
              <TimelineItem dot="bg-green-500" label="Referral Created" value={fmtDate(data.createdAt)} />
              <TimelineItem dot={data.order_id ? 'bg-green-500' : 'bg-gray-300'} label="First Order Completed" value={data.order_date ? fmtDate(data.order_date) : 'Pending'} />
              <TimelineItem dot={data.is_rewarded ? 'bg-green-500' : 'bg-gray-300'} label="Reward Credited" value={data.is_rewarded ? (data.coupon_expiry ? `Expires ${fmtDate(data.coupon_expiry)}` : 'Credited') : 'Pending'} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Row = ({ label, value, mono, children }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    {children || <span className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>}
  </div>
);

const TimelineItem = ({ dot, label, value }) => (
  <div className="flex items-center gap-3 py-1">
    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
    <span className="text-sm text-gray-700 flex-1">{label}</span>
    <span className="text-sm text-gray-500">{value}</span>
  </div>
);

// ─── Referrals Tab ───────────────────────────────────────────────────────────

const ReferralsTab = () => {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ data: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'All', rewardStatus: 'All', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [modalId, setModalId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const r = await getReferralAdminStats();
      setStats(r.data);
    } catch {
      toast.error('Failed to load referral stats');
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'All') params.status = filters.status;
      if (filters.rewardStatus !== 'All') params.rewardStatus = filters.rewardStatus;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const r = await getReferralAdminList(params);
      setList(r.data);
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const t = setTimeout(fetchList, 400);
    return () => clearTimeout(t);
  }, [fetchList]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleExport = async (format = 'excel') => {
    setExporting(true);
    try {
      const params = {};
      if (filters.status !== 'All') params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const r = await exportReferralsData(params);
      const rows = r.data;

      const headers = [
        'Created Date', 'Referral Code', 'Referrer Name', 'Referrer Mobile',
        'Referred Name', 'Referred Mobile', 'Order ID', 'Order Amount (₹)',
        'Reward Amount (₹)', 'Referral Status', 'Reward Status',
      ];
      const data = rows.map(row => [
        fmtDate(row.createdAt), row.refer_code || '', row.referrer_name || '', row.referrer_phone || '',
        row.referred_name || '', row.referred_phone || '', row.order_id || '',
        row.order_amount != null ? Number(row.order_amount) : '',
        row.reward_amount != null ? Number(row.reward_amount) : '',
        row.referral_status || '', row.reward_status || '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [14, 16, 20, 16, 20, 16, 18, 16, 16, 14, 14].map(w => ({ wch: w }));

      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        saveAs(new Blob([csv], { type: 'text/csv' }), `referrals_${Date.now()}.csv`);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Referrals');
        XLSX.writeFile(wb, `referrals_${Date.now()}.xlsx`);
      }
      toast.success('Referral report downloaded');
    } catch {
      toast.error('Failed to export referrals');
    } finally {
      setExporting(false);
    }
  };

  const statCards = stats ? [
    { label: 'Total Referrals', value: stats.total_referrals, color: 'text-red-500' },
    { label: 'Successful Referrals', value: stats.successful_referrals, color: 'text-green-600' },
    { label: 'Total Rewards Given', value: stats.total_rewards_given, color: 'text-blue-600' },
    { label: 'Referral Revenue', value: fmt(stats.referral_revenue), color: 'text-purple-600' },
    { label: 'Conversion Rate', value: `${stats.conversion_rate ?? 0}%`, color: 'text-orange-500' },
    { label: 'Avg Order Value', value: fmt(stats.avg_order_value), color: 'text-teal-600' },
    { label: 'Rewards Distributed', value: fmt((stats.total_rewards_given || 0) * 50), color: 'text-indigo-600' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">{c.label}</div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Referrers */}
      {stats?.top_referrers?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Top Referrers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Referral Code</th>
                  <th className="px-4 py-3 font-medium">Total Referrals</th>
                  <th className="px-4 py-3 font-medium">Successful</th>
                  <th className="px-4 py-3 font-medium">Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_referrers.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red-600">{r.refer_code || '—'}</td>
                    <td className="px-4 py-3">{r.total_referrals}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{r.successful}</td>
                    <td className="px-4 py-3 font-medium">{fmt(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search name, mobile, code, order ID…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
          >
            <option value="All">Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Successful">Successful</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={filters.rewardStatus}
            onChange={e => handleFilterChange('rewardStatus', e.target.value)}
          >
            <option value="All">Reward: All</option>
            <option value="Credited">Credited</option>
            <option value="Pending">Pending</option>
            <option value="Expired">Expired</option>
          </select>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={filters.startDate}
            onChange={e => handleFilterChange('startDate', e.target.value)}
          />
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={filters.endDate}
            onChange={e => handleFilterChange('endDate', e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="px-3 py-2 border border-red-500 text-red-500 rounded-md text-sm hover:bg-red-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3 py-2 border border-gray-400 text-gray-600 rounded-md text-sm hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">Referral Code</th>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Referred User</th>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Order Amt</th>
                <th className="px-4 py-3 font-medium">Reward</th>
                <th className="px-4 py-3 font-medium">Reward Status</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : list.data.length === 0 ? (
                <tr><td colSpan="10" className="py-10 text-center text-gray-400">No referrals found</td></tr>
              ) : (
                list.data.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-red-600 font-medium">{row.refer_code || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.referrer_name}</div>
                      <div className="text-xs text-gray-500">{row.referrer_phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.referred_name}</div>
                      <div className="text-xs text-gray-500">{row.referred_phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">{row.order_id || '—'}</td>
                    <td className="px-4 py-3">{row.order_amount != null ? fmt(row.order_amount) : '—'}</td>
                    <td className="px-4 py-3">{row.reward_amount != null ? fmt(row.reward_amount) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge value={row.reward_status} map={rewardStatusMap} /></td>
                    <td className="px-4 py-3"><StatusBadge value={row.referral_status} map={referralStatusMap} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModalId(row.id)}
                        className="text-gray-500 hover:text-red-500"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {list.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, list.total)} of {list.total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(list.totalPages, p + 1))}
                disabled={page === list.totalPages}
                className="p-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalId && <ReferralDetailModal id={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const CouponManagement = () => {
  const [activeTab, setActiveTab] = useState('coupons');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [totalCost] = useState(0);
  const [usedCoupons] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'All') params.status = filters.status;
      const response = await getAllCoupons(params);
      const data = response.data || [];
      setCoupons(data);
      const active = data.filter(c => c.status === 'Active').length;
      setActiveCount(active);
      setInactiveCount(data.length - active);
    } catch {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchCoupons, 500);
    return () => clearTimeout(t);
  }, [filters]);

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleSaveCoupon = async (couponData) => {
    try {
      if (selectedCoupon) {
        await updateCoupon(selectedCoupon.id, couponData);
        toast.success('Coupon updated successfully');
      } else {
        await createCoupon(couponData);
        toast.success('Coupon created successfully');
      }
      fetchCoupons();
      setShowCreatePage(false);
      setSelectedCoupon(null);
    } catch {
      toast.error('Failed to save coupon');
    }
  };

  const handleEdit = (coupon) => { setSelectedCoupon(coupon); setShowCreatePage(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
      await updateCoupon(coupon.id, { status: newStatus });
      toast.success(`Coupon ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await downloadCouponReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'coupons_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch {
      toast.error('Failed to download report');
    }
  };

  if (showCreatePage) {
    return (
      <CreateCouponPage
        onClose={() => { setShowCreatePage(false); setSelectedCoupon(null); }}
        onSave={handleSaveCoupon}
        initialData={selectedCoupon}
      />
    );
  }

  const usageData = [];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coupon &amp; Referral Management</h1>
        {activeTab === 'coupons' && (
          <div className="flex gap-3">
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 flex items-center gap-2"
            >
              <Download size={16} /> Download Report
            </button>
            <button
              onClick={() => setShowCreatePage(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Create New Coupon
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {['coupons', 'referrals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'coupons' ? 'Coupons' : 'Referrals'}
          </button>
        ))}
      </div>

      {/* ── Coupons Tab ── */}
      {activeTab === 'coupons' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Active Coupons Count</div>
              <div className="text-3xl font-bold text-red-500">{activeCount}</div>
              <div className="text-sm text-green-600 mt-1">-</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Inactive Coupons Count</div>
              <div className="text-3xl font-bold text-gray-900">{inactiveCount}</div>
              <div className="text-sm text-green-600 mt-1">-</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Total Cost of Coupon Code</div>
              <div className="text-3xl font-bold text-green-500">₹{totalCost}</div>
              <div className="text-sm text-green-600 mt-1">-</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Current Used Coupons</div>
              <div className="text-3xl font-bold text-gray-900">{usedCoupons}</div>
              <div className="text-sm text-green-600 mt-1">-</div>
            </div>
          </div>

          {/* Created Coupon Codes */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Created Coupon Codes</h2>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by Coupon Code or Name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-md"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                    <th className="pb-3 font-medium">CODE</th>
                    <th className="pb-3 font-medium">NAME</th>
                    <th className="pb-3 font-medium">DISCOUNT VALUE</th>
                    <th className="pb-3 font-medium">VALID UNTIL</th>
                    <th className="pb-3 font-medium">REDEMPTIONS</th>
                    <th className="pb-3 font-medium">STATUS</th>
                    <th className="pb-3 font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500">
                        {loading ? 'Loading…' : 'No coupons created yet. Click "Create New Coupon" to get started.'}
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-4 text-sm">{coupon.code}</td>
                        <td className="py-4 text-sm">{coupon.name}</td>
                        <td className="py-4 text-sm">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% OFF`
                            : `₹${coupon.discountValue} Flat`}
                        </td>
                        <td className="py-4 text-sm">{coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-4 text-sm">
                          {coupon.redemptionCount || 0} / {coupon.usageLimit || '∞'}
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${coupon.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {coupon.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={coupon.status === 'Active'}
                                onChange={() => handleToggleStatus(coupon)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                            <button onClick={() => handleEdit(coupon)} className="text-gray-600 hover:text-red-500">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(coupon.id)} className="text-gray-600 hover:text-red-500">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Current Coupon Usage & Holders */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Current Coupon Usage &amp; Holders</h2>
            </div>
            <div className="p-5">
              <div className="relative w-80 mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by Coupon Code or Name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                    <th className="pb-3 font-medium">USER NAME</th>
                    <th className="pb-3 font-medium">COUPON CODE</th>
                    <th className="pb-3 font-medium">LAST USED DATE</th>
                    <th className="pb-3 font-medium">TOTAL SAVINGS</th>
                    <th className="pb-3 font-medium">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">No coupon usage data available.</td>
                    </tr>
                  ) : (
                    usageData.map((usage, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-4 text-sm text-red-500">{usage.user}</td>
                        <td className="py-4 text-sm text-red-500">{usage.code}</td>
                        <td className="py-4 text-sm">{usage.lastUsed}</td>
                        <td className="py-4 text-sm">{usage.savings}</td>
                        <td className="py-4">
                          <button className="text-red-500 hover:text-red-600"><UserMinus size={18} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Referrals Tab ── */}
      {activeTab === 'referrals' && <ReferralsTab />}
    </div>
  );
};

export default CouponManagement;
