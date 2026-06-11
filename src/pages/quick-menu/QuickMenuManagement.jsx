import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  createQuickMenu,
  deleteQuickMenu,
  getQuickMenusAdmin,
  reorderQuickMenus,
  updateQuickMenu,
  updateQuickMenuStatus,
} from '../../services/api';

const PAGE_SIZE = 10;

const emptyForm = {
  menu_name: '',
  search_keyword: '',
  priority: '',
  is_active: true,
  image: null,
};

const QuickMenuManagement = () => {
  const [quickMenus, setQuickMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [draggedMenuId, setDraggedMenuId] = useState(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  const canReorder = !search.trim() && status === 'all' && quickMenus.length > 1;

  const imagePreview = useMemo(() => {
    if (formData.image) return URL.createObjectURL(formData.image);
    return editingMenu?.menu_image || '';
  }, [formData.image, editingMenu]);

  useEffect(() => {
    return () => {
      if (formData.image && imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [formData.image, imagePreview]);

  useEffect(() => {
    fetchQuickMenus();
  }, [page, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchQuickMenus(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchQuickMenus = async (targetPage = page) => {
    try {
      setLoading(true);
      setError('');
      const response = await getQuickMenusAdmin({
        page: targetPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status,
      });

      setQuickMenus(response.data?.data || []);
      setMeta(response.data?.meta || { page: targetPage, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load quick menus';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingMenu(null);
    setFormData({
      ...emptyForm,
      priority: String((meta.total || 0) + 1),
    });
    setModalOpen(true);
  };

  const openEditModal = (quickMenu) => {
    setEditingMenu(quickMenu);
    setFormData({
      menu_name: quickMenu.menu_name || '',
      search_keyword: quickMenu.search_keyword || '',
      priority: String(quickMenu.priority || ''),
      is_active: Boolean(quickMenu.is_active),
      image: null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMenu(null);
    setFormData(emptyForm);
  };

  const validateForm = () => {
    if (!formData.menu_name.trim()) {
      toast.error('Menu name is required');
      return false;
    }

    if (!formData.search_keyword.trim()) {
      toast.error('Search keyword is required');
      return false;
    }

    const priority = Number(formData.priority);
    if (!Number.isInteger(priority) || priority < 1) {
      toast.error('Priority must be a positive number');
      return false;
    }

    if (!editingMenu && !formData.image) {
      toast.error('Menu image is required');
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append('menu_name', formData.menu_name.trim());
    payload.append('search_keyword', formData.search_keyword.trim());
    payload.append('priority', formData.priority);
    payload.append('is_active', String(formData.is_active));
    if (formData.image) payload.append('image', formData.image);
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (editingMenu) {
        await updateQuickMenu(editingMenu.id, buildPayload());
        toast.success('Quick menu updated');
      } else {
        await createQuickMenu(buildPayload());
        toast.success('Quick menu created');
      }

      closeModal();
      fetchQuickMenus();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save quick menu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (quickMenu) => {
    const nextStatus = !quickMenu.is_active;
    try {
      await updateQuickMenuStatus(quickMenu.id, nextStatus);
      toast.success(nextStatus ? 'Quick menu enabled' : 'Quick menu disabled');
      fetchQuickMenus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = (quickMenu) => {
    setDeleteTarget(quickMenu);
  };

  const getPageStartPriority = () => ((meta.page || page) - 1) * (meta.limit || PAGE_SIZE);

  const getDisplayPriority = (index) => getPageStartPriority() + index + 1;

  const applyPagePriorities = (menus) => {
    const pageStartPriority = getPageStartPriority();
    return menus.map((menu, index) => ({
      ...menu,
      priority: pageStartPriority + index + 1,
    }));
  };

  const handleDragStart = (event, quickMenu) => {
    if (!canReorder || reorderLoading) return;
    setDraggedMenuId(quickMenu.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(quickMenu.id));
  };

  const handleDragOver = (event) => {
    if (!canReorder || reorderLoading || !draggedMenuId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event, targetMenu) => {
    event.preventDefault();
    if (!canReorder || reorderLoading || !draggedMenuId || draggedMenuId === targetMenu.id) {
      setDraggedMenuId(null);
      return;
    }

    const fromIndex = quickMenus.findIndex((menu) => menu.id === draggedMenuId);
    const toIndex = quickMenus.findIndex((menu) => menu.id === targetMenu.id);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggedMenuId(null);
      return;
    }

    const previousMenus = quickMenus;
    const nextMenus = [...quickMenus];
    const [movedMenu] = nextMenus.splice(fromIndex, 1);
    nextMenus.splice(toIndex, 0, movedMenu);
    const prioritizedMenus = applyPagePriorities(nextMenus);

    setQuickMenus(prioritizedMenus);
    setDraggedMenuId(null);

    try {
      setReorderLoading(true);
      await reorderQuickMenus(prioritizedMenus.map((menu) => ({
        id: menu.id,
        priority: menu.priority,
      })));
      toast.success('Quick menu order updated');
      fetchQuickMenus();
    } catch (err) {
      setQuickMenus(previousMenus);
      toast.error(err.response?.data?.message || 'Failed to update quick menu order');
    } finally {
      setReorderLoading(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteQuickMenu(deleteTarget.id);
      toast.success('Quick menu deleted');
      const nextPage = quickMenus.length === 1 && page > 1 ? page - 1 : page;
      setDeleteTarget(null);
      setPage(nextPage);
      fetchQuickMenus(nextPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete quick menu');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Menu</h1>
            <p className="mt-1 text-sm text-gray-500">
              Search shortcut entries for customer discovery.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            <Plus size={18} />
            Add Quick Menu
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 flex-shrink-0 text-red-500" size={20} />
            <p className="flex-1 text-sm text-red-800">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu name..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {!canReorder && quickMenus.length > 1 && (
            <p className="mt-3 text-xs text-gray-500">
              Clear search and status filters to reorder quick menus.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Menu Image</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Menu Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Search Keyword</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                      Loading quick menus...
                    </td>
                  </tr>
                ) : quickMenus.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      No quick menus found.
                    </td>
                  </tr>
                ) : (
                  quickMenus.map((quickMenu, index) => (
                    <tr
                      key={quickMenu.id}
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, quickMenu)}
                      className={`hover:bg-gray-50 ${
                        draggedMenuId === quickMenu.id ? 'bg-red-50/60 opacity-70' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            draggable={canReorder && !reorderLoading}
                            onDragStart={(event) => handleDragStart(event, quickMenu)}
                            onDragEnd={() => setDraggedMenuId(null)}
                            disabled={!canReorder || reorderLoading}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                            title={canReorder ? 'Drag to reorder' : 'Clear filters to reorder'}
                          >
                            <GripVertical size={18} />
                          </button>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600">
                            {quickMenu.priority || getDisplayPriority(index)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <img
                          src={quickMenu.menu_image}
                          alt={quickMenu.menu_name}
                          className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{quickMenu.menu_name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{quickMenu.search_keyword}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          quickMenu.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {quickMenu.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(quickMenu)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(quickMenu)}
                            className={`rounded-lg p-2 ${
                              quickMenu.is_active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={quickMenu.is_active ? 'Disable' : 'Enable'}
                          >
                            {quickMenu.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                          </button>
                          <button
                            onClick={() => handleDelete(quickMenu)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
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

          <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing page {meta.page || page} of {meta.totalPages || 1} ({meta.total || 0} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page <= 1 || loading || reorderLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
                disabled={page >= (meta.totalPages || 1) || loading || reorderLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMenu ? 'Edit Quick Menu' : 'Add Quick Menu'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Menu Image</label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-red-300 hover:bg-red-50/40">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Quick menu preview" className="mb-3 h-28 w-28 rounded-lg object-cover" />
                  ) : (
                    <Upload className="mb-3 h-8 w-8 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Upload image</span>
                  <span className="mt-1 text-xs text-gray-500">PNG, JPG, JPEG, or WEBP</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(event) => setFormData((current) => ({
                      ...current,
                      image: event.target.files?.[0] || null,
                    }))}
                  />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Menu Name</label>
                <input
                  type="text"
                  value={formData.menu_name}
                  onChange={(event) => setFormData((current) => ({ ...current, menu_name: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                  placeholder="Idli"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Search Keyword</label>
                <input
                  type="text"
                  value={formData.search_keyword}
                  onChange={(event) => setFormData((current) => ({ ...current, search_keyword: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                  placeholder="Idli"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) => setFormData((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingMenu ? 'Save Changes' : 'Create Quick Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-start gap-4 border-b border-gray-200 px-6 py-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Delete Quick Menu</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This will remove <span className="font-medium text-gray-900">{deleteTarget.menu_name}</span> from customer quick menu shortcuts.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickMenuManagement;
