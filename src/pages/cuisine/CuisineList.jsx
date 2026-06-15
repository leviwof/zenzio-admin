import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, X, AlertCircle, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllCuisineCategories,
  createCuisineCategory,
  updateCuisineCategory,
  deleteCuisineCategory,
} from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const getType = (cat) => {
  if (!cat) return 'Unknown';
  if (cat.father_id === 0 && cat.parent_id === 0) return 'Main Category';
  if (cat.father_id !== 0 && cat.parent_id === 0) return 'Category Group';
  return 'Subcategory';
};

const TYPE_STYLE = {
  'Main Category':   'bg-purple-100 text-purple-700',
  'Category Group':  'bg-blue-100 text-blue-700',
  'Subcategory':     'bg-green-100 text-green-700',
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const CuisineModal = ({ categories, editing, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: editing?.name || '',
    father_id: editing?.father_id ?? 0,
    parent_id: editing?.parent_id ?? 0,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const mainCategories = useMemo(() => categories.filter(c => c.father_id === 0 && c.parent_id === 0), [categories]);
  const subOptions = useMemo(() => {
    if (form.father_id === 0) return [];
    return categories.filter(c => c.father_id === form.father_id || c.id === form.father_id);
  }, [categories, form.father_id]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    else if (form.name.trim().length < 2) e.name = 'Must be at least 2 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        father_id: parseInt(form.father_id) || 0,
        parent_id: parseInt(form.parent_id) || 0,
      };
      if (editing) {
        await updateCuisineCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await createCuisineCategory(payload);
        toast.success('Category created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Edit Cuisine Category' : 'Add Cuisine Category'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: null })); }}
              placeholder="e.g., North Indian, Chinese, Biryani"
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Main Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Main Category</label>
            <select
              value={form.father_id}
              onChange={e => setForm(f => ({ ...f, father_id: parseInt(e.target.value) || 0, parent_id: 0 }))}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value={0}>None — this is a Main Category</option>
              {mainCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Leave as "None" to create a top-level main category</p>
          </div>

          {/* Parent Category (only when father_id is set) */}
          {form.father_id !== 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Category</label>
              <select
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: parseInt(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={form.father_id}>Same as Main (creates a Category Group)</option>
                {subOptions.filter(c => c.id !== form.father_id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Type hint */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium text-purple-700">Main Category</span> — top-level (e.g., Indian, Chinese)</p>
            <p><span className="font-medium text-blue-700">Category Group</span> — groups under a main category</p>
            <p><span className="font-medium text-green-700">Subcategory</span> — specific types under a group</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : editing ? 'Update Category' : 'Create Category'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CuisineList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | category-object (for edit)

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [mainFilter, setMainFilter] = useState('');  // father_id value
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Build id→name lookup
  const nameMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);

  const mainCategories = useMemo(() => categories.filter(c => c.father_id === 0 && c.parent_id === 0), [categories]);

  // Stats
  const stats = useMemo(() => ({
    total: categories.length,
    main: categories.filter(c => c.father_id === 0 && c.parent_id === 0).length,
    groups: categories.filter(c => c.father_id !== 0 && c.parent_id === 0).length,
    sub: categories.filter(c => c.father_id !== 0 && c.parent_id !== 0).length,
  }), [categories]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...categories];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(c => c.name?.toLowerCase().includes(q) || String(c.id).includes(q));
    if (typeFilter !== 'All') list = list.filter(c => getType(c) === typeFilter);
    if (mainFilter) list = list.filter(c => c.father_id === Number(mainFilter) || c.id === Number(mainFilter));
    return list;
  }, [categories, search, typeFilter, mainFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, typeFilter, mainFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getAllCuisineCategories();
      setCategories(res.data?.data || []);
    } catch {
      toast.error('Failed to fetch categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    try {
      await deleteCuisineCategory(cat.id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const clearFilters = () => { setSearch(''); setTypeFilter('All'); setMainFilter(''); setPage(1); };
  const hasFilters = search || typeFilter !== 'All' || mainFilter;

  // Parent label for table
  const getParentLabel = (cat) => {
    if (cat.father_id === 0) return '—';
    const fatherName = nameMap[cat.father_id];
    if (cat.parent_id === 0 || cat.parent_id === cat.father_id) return fatherName || `#${cat.father_id}`;
    const parentName = nameMap[cat.parent_id];
    return parentName || `#${cat.parent_id}`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuisine Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage food categories shown in the app</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> Add Cuisine
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Categories', value: stats.total, color: 'text-gray-900', dot: 'bg-gray-400' },
          { label: 'Main Categories', value: stats.main, color: 'text-purple-600', dot: 'bg-purple-400' },
          { label: 'Category Groups', value: stats.groups, color: 'text-blue-600', dot: 'bg-blue-400' },
          { label: 'Subcategories', value: stats.sub, color: 'text-green-600', dot: 'bg-green-400' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.dot} bg-opacity-20 flex items-center justify-center`}>
              <UtensilsCrossed size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="flex flex-wrap gap-3 items-center p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setMainFilter(''); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="All">Type: All</option>
            <option value="Main Category">Main Categories</option>
            <option value="Category Group">Category Groups</option>
            <option value="Subcategory">Subcategories</option>
          </select>

          {/* Main Category filter (hidden when Main Category type selected) */}
          {typeFilter !== 'Main Category' && (
            <select
              value={mainFilter}
              onChange={e => setMainFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Main Category: All</option>
              {mainCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              <X size={14} /> Clear
            </button>
          )}

          <span className="ml-auto text-sm text-gray-500">
            {filtered.length} of {categories.length} categories
          </span>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs">
                Search: "{search}" <button onClick={() => setSearch('')}><X size={11} /></button>
              </span>
            )}
            {typeFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs">
                {typeFilter} <button onClick={() => setTypeFilter('All')}><X size={11} /></button>
              </span>
            )}
            {mainFilter && (
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs">
                Under: {nameMap[mainFilter] || `#${mainFilter}`} <button onClick={() => setMainFilter('')}><X size={11} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3">
            <div className="animate-spin w-8 h-8 border-2 border-gray-200 border-t-red-500 rounded-full" />
            <p className="text-sm text-gray-500">Loading categories…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-2">
            <UtensilsCrossed size={40} className="text-gray-300" />
            <p className="text-gray-500 text-sm font-medium">No categories found</p>
            <p className="text-gray-400 text-xs">
              {categories.length === 0 ? 'Click "Add Cuisine" to create your first category' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((cat) => {
                const type = getType(cat);
                const isProtected = ['Category', 'Cuisine'].includes(cat.name);
                return (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-gray-500 font-mono">#{cat.id}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${TYPE_STYLE[type] || 'bg-gray-100 text-gray-700'}`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{getParentLabel(cat)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{fmtDate(cat.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {isProtected ? (
                        <span className="text-xs text-gray-400 italic">Protected</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal(cat)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium border transition-colors ${
                        page === item
                          ? 'bg-red-500 text-white border-red-500'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <CuisineModal
          categories={categories}
          editing={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchCategories(); }}
        />
      )}
    </div>
  );
};

export default CuisineList;
