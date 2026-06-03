import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  createTopRestaurant,
  deleteTopRestaurant,
  getTopRestaurantOptions,
  getTopRestaurantsAdmin,
  updateTopRestaurant,
  updateTopRestaurantStatus,
} from '../../services/api';
import { getRestaurantLogoUrl } from '../../utils/imageUtils';

const emptyForm = {
  restaurant_uid: '',
  priority: '1',
  is_active: true,
};

const resolveTopRestaurantImage = (image) => {
  if (!image) return null;

  const normalized = String(image)
    .trim()
    .replace(/^\/+/, '')
    .replace(/^images\/restaurant\//, '');

  return getRestaurantLogoUrl(normalized);
};

const TopRestaurantImage = ({ image, name }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = resolveTopRestaurantImage(image);

  if (!imageUrl || imageFailed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
        <Star size={18} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
      onError={() => setImageFailed(true)}
    />
  );
};

const TopRestaurantsManagement = () => {
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [restaurantOptions, setRestaurantOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const selectedRestaurant = useMemo(
    () => restaurantOptions.find((restaurant) => restaurant.restaurant_uid === formData.restaurant_uid),
    [restaurantOptions, formData.restaurant_uid],
  );

  useEffect(() => {
    fetchTopRestaurants();
  }, [page, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTopRestaurants(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const timer = setTimeout(() => {
      fetchRestaurantOptions(restaurantSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [modalOpen, restaurantSearch]);

  const fetchTopRestaurants = async (targetPage = page) => {
    try {
      setLoading(true);
      setError('');
      const response = await getTopRestaurantsAdmin({
        page: targetPage,
        limit: 10,
        search: search.trim() || undefined,
        status,
      });

      setTopRestaurants(response.data?.data || []);
      setMeta(response.data?.meta || { page: targetPage, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load top restaurants';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantOptions = async (query = '') => {
    try {
      setOptionsLoading(true);
      const response = await getTopRestaurantOptions({
        search: query.trim() || undefined,
        limit: 30,
      });
      const options = response.data?.data || [];
      setRestaurantOptions((current) => {
        if (!editingRestaurant) return options;
        const exists = options.some((restaurant) => restaurant.restaurant_uid === editingRestaurant.restaurant_uid);
        return exists
          ? options
          : [
              {
                restaurant_uid: editingRestaurant.restaurant_uid,
                restaurant_name: editingRestaurant.restaurant_name || editingRestaurant.restaurant_uid,
                image: editingRestaurant.image,
                city: editingRestaurant.city,
              },
              ...options,
            ];
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load restaurants');
    } finally {
      setOptionsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRestaurant(null);
    setFormData(emptyForm);
    setRestaurantSearch('');
    setRestaurantOptions([]);
    setModalOpen(true);
  };

  const openEditModal = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      restaurant_uid: restaurant.restaurant_uid || '',
      priority: String(restaurant.priority || 1),
      is_active: Boolean(restaurant.is_active),
    });
    setRestaurantSearch(restaurant.restaurant_name || restaurant.restaurant_uid || '');
    setRestaurantOptions([{
      restaurant_uid: restaurant.restaurant_uid,
      restaurant_name: restaurant.restaurant_name || restaurant.restaurant_uid,
      image: restaurant.image,
      city: restaurant.city,
    }]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRestaurant(null);
    setFormData(emptyForm);
    setRestaurantSearch('');
    setRestaurantOptions([]);
  };

  const validateForm = () => {
    if (!formData.restaurant_uid) {
      toast.error('Restaurant is required');
      return false;
    }

    const priority = Number(formData.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      toast.error('Priority must be between 1 and 10');
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    restaurant_uid: formData.restaurant_uid,
    priority: Number(formData.priority),
    is_active: Boolean(formData.is_active),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (editingRestaurant) {
        await updateTopRestaurant(editingRestaurant.id, buildPayload());
        toast.success('Top restaurant updated');
      } else {
        await createTopRestaurant(buildPayload());
        toast.success('Top restaurant added');
      }

      closeModal();
      fetchTopRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save top restaurant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (restaurant) => {
    const nextStatus = !restaurant.is_active;
    try {
      await updateTopRestaurantStatus(restaurant.id, nextStatus);
      toast.success(nextStatus ? 'Top restaurant enabled' : 'Top restaurant disabled');
      fetchTopRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
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
      await deleteTopRestaurant(deleteTarget.id);
      toast.success('Top restaurant removed');
      const nextPage = topRestaurants.length === 1 && page > 1 ? page - 1 : page;
      setDeleteTarget(null);
      setPage(nextPage);
      fetchTopRestaurants(nextPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete top restaurant');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Top Restaurants</h1>
            <p className="mt-1 text-sm text-gray-500">
              Priority slots for Nearby Top Restaurants discovery.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600"
          >
            <Plus size={18} />
            Add Restaurant
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
                placeholder="Search restaurant name or UID..."
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
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">UID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">City</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                      Loading top restaurants...
                    </td>
                  </tr>
                ) : topRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Star className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      No top restaurants found.
                    </td>
                  </tr>
                ) : (
                  topRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-600">
                          {restaurant.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <TopRestaurantImage
                            image={restaurant.image}
                            name={restaurant.restaurant_name || restaurant.restaurant_uid}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{restaurant.restaurant_name || restaurant.restaurant_uid}</p>
                            <p className="text-xs text-gray-500">{restaurant.food_type || 'Food type not set'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{restaurant.restaurant_uid}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{restaurant.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {Number(restaurant.rating_count || 0) >= 50
                          ? Number(restaurant.rating_avg || 0).toFixed(1)
                          : '4.0'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          restaurant.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {restaurant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(restaurant)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(restaurant)}
                            className={`rounded-lg p-2 ${
                              restaurant.is_active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={restaurant.is_active ? 'Disable' : 'Enable'}
                          >
                            {restaurant.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(restaurant)}
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
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
                disabled={page >= (meta.totalPages || 1) || loading}
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
                {editingRestaurant ? 'Edit Top Restaurant' : 'Add Top Restaurant'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Search Restaurant</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={restaurantSearch}
                    onChange={(event) => setRestaurantSearch(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder="Type restaurant name or UID"
                  />
                  {optionsLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-red-500" />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Restaurant</label>
                <select
                  value={formData.restaurant_uid}
                  onChange={(event) => setFormData((current) => ({ ...current, restaurant_uid: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Choose restaurant</option>
                  {restaurantOptions.map((restaurant) => (
                    <option key={restaurant.restaurant_uid} value={restaurant.restaurant_uid}>
                      {restaurant.restaurant_name || restaurant.restaurant_uid}
                      {restaurant.current_priority ? ` - Priority ${restaurant.current_priority}` : ''}
                    </option>
                  ))}
                </select>
                {selectedRestaurant && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedRestaurant.restaurant_uid}
                    {selectedRestaurant.city ? `, ${selectedRestaurant.city}` : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                >
                  {Array.from({ length: 10 }, (_, index) => {
                    const value = String(index + 1);
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
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
                  {editingRestaurant ? 'Save Changes' : 'Add Restaurant'}
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
                <h2 className="text-lg font-semibold text-gray-900">Delete Top Restaurant</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This will remove <span className="font-medium text-gray-900">{deleteTarget.restaurant_name || deleteTarget.restaurant_uid}</span> from admin priority slots.
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

export default TopRestaurantsManagement;
