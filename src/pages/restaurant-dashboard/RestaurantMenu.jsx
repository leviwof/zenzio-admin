import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  getMyMenus,
  getMenusByRestaurant,
  toggleMenuStatus,
  deleteMenu,
  bulkDeleteMenu,
} from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';

/** Normalize API rows (TypeORM uses menu_name, menu_uid) for UI + actions */
function normalizeMenuRow(m) {
  const uid = m.menu_uid || m.uid;
  const name = m.menu_name || m.name || 'Unnamed';
  const isActive =
    m.isActive !== undefined && m.isActive !== null
      ? Boolean(m.isActive)
      : m.status === 1 || m.status === true;
  return { ...m, uid, name, isActive };
}

function extractMenusFromResponse(res) {
  const body = res?.data;
  const inner = body?.data !== undefined ? body.data : body;
  let menus =
    inner?.restaurant_menus ??
    inner?.restaurantMenus ??
    (Array.isArray(inner) ? inner : null);

  if (!Array.isArray(menus)) {
    menus = [];
  }

  const meta = body?.meta ?? inner?.meta;
  return { menus, meta };
}

const PAGE_SIZE = 200;

const RestaurantMenu = () => {
  const { user, loading: authLoading } = useAuth();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUids, setSelectedUids] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const navigate = useNavigate();

  const restaurantUid = user?.restaurantUid?.trim?.() || user?.restaurantUid;

  const fetchAllMenus = useCallback(async () => {
    const collected = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await getMyMenus({ page, limit: PAGE_SIZE });
      const { menus: chunk, meta } = extractMenusFromResponse(res);
      collected.push(...chunk.map(normalizeMenuRow));
      totalPages = Math.max(1, Number(meta?.totalPages) || 1);
      page += 1;
    } while (page <= totalPages);
    return collected;
  }, []);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError('');

      let list = await fetchAllMenus();

      if (list.length === 0 && restaurantUid) {
        try {
          let page = 1;
          let totalPages = 1;
          const fromRestaurant = [];
          do {
            const res = await getMenusByRestaurant(restaurantUid, {
              page,
              limit: PAGE_SIZE,
              includeInactive: 'true',
            });
            const { menus: chunk, meta } = extractMenusFromResponse(res);
            fromRestaurant.push(...chunk.map(normalizeMenuRow));
            totalPages = Math.max(1, Number(meta?.totalPages) || 1);
            page += 1;
          } while (page <= totalPages);
          list = fromRestaurant;
        } catch (fallbackErr) {
          console.warn('Restaurant menu fallback fetch:', fallbackErr);
        }
      }

      setMenus(list);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Failed to load menus';
      setError(`Error (${status || 'unknown'}): ${msg}`);
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, restaurantUid]);

  const handleToggle = async (menuUid, currentStatus) => {
    if (!menuUid) { toast.error('Invalid menu id'); return; }
    try {
      await toggleMenuStatus(menuUid, !currentStatus);
      setMenus((prev) =>
        prev.map((m) =>
          m.uid === menuUid ? { ...m, isActive: !currentStatus, status: !currentStatus ? 1 : 0 } : m
        )
      );
      toast.success(`Menu ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const handleDelete = async (menuUid, name) => {
    if (!menuUid) return;
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteMenu(menuUid);
      setMenus((prev) => prev.filter((m) => m.uid !== menuUid));
      setSelectedUids((prev) => { const n = new Set(prev); n.delete(menuUid); return n; });
      toast.success('Menu deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleSelect = (menuUid, checked) => {
    setSelectedUids((prev) => {
      const n = new Set(prev);
      checked ? n.add(menuUid) : n.delete(menuUid);
      return n;
    });
  };

  const toggleSelectAllVisible = (checked, visibleUids) => {
    setSelectedUids(checked ? new Set(visibleUids) : new Set());
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedUids].filter(Boolean);
    if (ids.length === 0) { toast.error('Select at least one menu'); return; }
    if (!window.confirm(`Delete ${ids.length} menu item(s)? This cannot be undone.`)) return;
    try {
      setBulkLoading(true);
      await bulkDeleteMenu(ids);
      setMenus((prev) => prev.filter((m) => !ids.includes(m.uid)));
      setSelectedUids(new Set());
      toast.success('Selected menus deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return menus;
    return menus.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.menu_uid || m.uid || '').toLowerCase().includes(q) ||
        (m.food_type || '').toLowerCase().includes(q)
    );
  }, [menus, search]);

  const visibleUids = useMemo(() => filtered.map((m) => m.uid).filter(Boolean), [filtered]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
        <div className="flex items-center gap-2">
          {selectedUids.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              <Trash2 size={16} />
              Delete ({selectedUids.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/restaurant/menu/add')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            <Plus size={18} />
            Add Menu
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <button
              type="button"
              onClick={fetchMenus}
              className="text-red-600 text-xs underline mt-1 hover:text-red-800 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={visibleUids.length > 0 && visibleUids.every((id) => selectedUids.has(id))}
              onChange={(e) => toggleSelectAllVisible(e.target.checked, visibleUids)}
            />
            Select all (filtered)
          </label>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 && !error ? (
        <div className="text-center py-12 text-gray-400">No menu items found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((menu) => {
            const isActive = menu.isActive;
            const img = menu.images?.[0] || menu.image;
            const checked = menu.uid && selectedUids.has(menu.uid);
            return (
              <div
                key={menu.uid || menu.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b border-gray-50 bg-gray-50/50">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={!!checked}
                    onChange={(e) => toggleSelect(menu.uid, e.target.checked)}
                    disabled={!menu.uid}
                  />
                  <span className="text-xs text-gray-400 font-mono truncate">#{menu.uid?.slice(0, 8)}</span>
                </div>
                {img && (
                  <img
                    src={getImageUrl(img, 'menu')}
                    alt={menu.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <h3 className="font-semibold text-gray-800">{menu.name}</h3>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {menu.category && (
                    <p className="text-xs text-gray-500 mb-1">Category: {menu.category}</p>
                  )}
                  {menu.food_type && (
                    <p className="text-xs text-gray-500 mb-1">{menu.food_type}</p>
                  )}
                  {menu.price != null && (
                    <p className="text-lg font-bold text-red-500">₹{menu.price}</p>
                  )}
                  {menu.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{menu.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => handleToggle(menu.uid, isActive)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {isActive ? <PowerOff size={14} /> : <Power size={14} />}
                      {isActive ? 'Turn Off' : 'Turn On'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/restaurant/menu/edit/${menu.uid}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(menu.uid, menu.name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
