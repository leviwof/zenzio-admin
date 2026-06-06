import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, Eye, Edit, Trash2, Loader2, AlertCircle,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, ArrowUpDown, RotateCcw, UtensilsCrossed,
  CheckSquare, Square, MoreVertical, RefreshCw,
  IndianRupee, Star, Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import {
  getAllMenus, getMenusByRestaurant, getMenuByUid,
  getMenuAvailability, toggleMenuStatus, toggleMenuAvailability,
  bulkUpdateMenuStatus, deleteMenu, bulkDeleteMenu,
  getAllRestaurants, exportMenus,
} from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth';
import { getMenuAvailabilityState, mergeMenuAvailability } from '../../utils/menuAvailability';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const getStatusBadge = (isActive) => {
  if (isActive) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20', dot: 'bg-emerald-500', label: 'Enabled' };
  }
  return { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-600/20', dot: 'bg-gray-400', label: 'Disabled' };
};

const getAvailBadge = (isAvailable) => {
  if (isAvailable) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20', dot: 'bg-blue-500', label: 'Orderable' };
  }
  return { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-600/20', dot: 'bg-amber-500', label: 'Blocked' };
};

const FilterDropdown = ({ label, icon: Icon, value, options, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150
          ${value && value !== 'all'
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
      >
        {Icon && <Icon size={14} />}
        {value && value !== 'all' ? options.find(o => o.value === value)?.label || label : label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors
                  ${value === opt.value
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
            {onClear && value && value !== 'all' && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { onClear(); setOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Clear filter
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionMenu = ({ menu, onView, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg shadow-gray-200/50 z-50 py-1 overflow-hidden"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(menu); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye size={14} />
              View Details
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(menu); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit size={14} />
              Edit Menu
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(menu); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete Menu
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DeleteModal = ({ open, menu, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Menu Item</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Are you sure you want to delete <span className="font-semibold text-gray-700">&ldquo;{menu?.menu_name}&rdquo;</span>?
        </p>
        <p className="text-xs text-amber-600 text-center mb-6 bg-amber-50 rounded-lg p-2.5">
          This action will soft-delete the menu item. It can be recovered later if needed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-shadow duration-200"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const MenuManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const searchInputRef = useRef(null);

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, menu: null });
  const [toggleLoading, setToggleLoading] = useState({});

  const [restaurants, setRestaurants] = useState([]);
  const [restaurantDropdownOpen, setRestaurantDropdownOpen] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');

  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  const restaurantFromUrl = new URLSearchParams(location.search).get('restaurant');
  const restaurantFromState = location.state?.selectedRestaurant;
  const [restaurantFilter, setRestaurantFilter] = useState(
    restaurantAdmin ? 'all' : (restaurantFromState || restaurantFromUrl || 'all')
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');
  const [bestsellerFilter, setBestsellerFilter] = useState('all');
  const [priceMinFilter, setPriceMinFilter] = useState('');
  const [priceMaxFilter, setPriceMaxFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);

  const hasActiveFilters = debouncedSearch ||
    restaurantFilter !== 'all' || categoryFilter !== 'all' || cuisineFilter !== 'all' ||
    foodTypeFilter !== 'all' || statusFilter !== 'all' || availFilter !== 'all' ||
    bestsellerFilter !== 'all' || priceMinFilter || priceMaxFilter ||
    ratingFilter !== 'all' || fromDateFilter || toDateFilter;

  useEffect(() => {
    fetchRestaurantsList();
  }, []);

  useEffect(() => {
    if (restaurantAdmin) return;
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('restaurant');
    const fromState = location.state?.selectedRestaurant;
    const target = fromState || fromUrl || 'all';
    if (target !== restaurantFilter) {
      setRestaurantFilter(target);
    }
  }, [location.search, location.state?.selectedRestaurant]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchRestaurantsList = async () => {
    if (restaurantAdmin) {
      setRestaurants(ownRestaurantUid ? [{ uid: ownRestaurantUid, name: 'Your Restaurant' }] : []);
      return;
    }
    try {
      const response = await getAllRestaurants({ limit: 500 });
      let restaurantData = [];
      if (Array.isArray(response.data)) {
        restaurantData = response.data;
      } else if (response.data?.data?.restaurants) {
        restaurantData = response.data.data.restaurants;
      } else if (response.data?.restaurants) {
        restaurantData = response.data.restaurants;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        restaurantData = response.data.data;
      }
      const restaurantList = restaurantData.map(r => ({
        uid: r.uid,
        name: r.profile?.restaurant_name || r.restaurant_name || r.name || `Restaurant ${r.uid?.substring(0, 8) || 'Unknown'}`
      })).filter(r => r.uid).sort((a, b) => a.name.localeCompare(b.name));
      setRestaurants(restaurantList);

      const cats = new Set();
      const cuis = new Set();
      restaurantData.forEach(r => {
        if (r.cuisines) {
          (Array.isArray(r.cuisines) ? r.cuisines : []).forEach(c => {
            if (typeof c === 'string') cuis.add(c);
            else if (c?.name) cuis.add(c.name);
          });
        }
      });
      setCuisines(Array.from(cuis).sort());
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        includeInactive: 'true',
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(restaurantFilter !== 'all' && { restaurant: restaurantFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(cuisineFilter !== 'all' && { cuisine: cuisineFilter }),
        ...(foodTypeFilter !== 'all' && { food_type: foodTypeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(availFilter !== 'all' && { availability: availFilter }),
        ...(bestsellerFilter !== 'all' && { bestseller: bestsellerFilter === 'true' ? 'true' : 'false' }),
        ...(priceMinFilter && { minPrice: priceMinFilter }),
        ...(priceMaxFilter && { maxPrice: priceMaxFilter }),
        ...(ratingFilter !== 'all' && { rating: ratingFilter }),
        ...(fromDateFilter && { fromDate: fromDateFilter }),
        ...(toDateFilter && { toDate: toDateFilter }),
      };

      const response = await getAllMenus(params);
      let menuData = [];
      if (response.data?.data?.restaurant_menus) {
        menuData = response.data.data.restaurant_menus;
      } else if (response.data?.restaurant_menus) {
        menuData = response.data.restaurant_menus;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        menuData = response.data.data;
      }

      const hydratedMenus = await hydrateMenuAvailability(menuData);

      const meta = response.data?.meta || response.data?.data?.meta;
      if (meta) setPagination(meta);

      const existingUids = new Set(menus.map(m => m.menu_uid));
      const newMenus = hydratedMenus.filter(m => m.menu_uid);
      if (newMenus.length > 0 && existingUids.size > 0) {
        const updatedMenuUid = location.state?.updatedMenuUid;
        if (updatedMenuUid && newMenus.some(m => m.menu_uid === updatedMenuUid)) {
          const updated = newMenus.find(m => m.menu_uid === updatedMenuUid);
          const rest = newMenus.filter(m => m.menu_uid !== updatedMenuUid);
          setMenus([updated, ...rest]);
        } else {
          setMenus(newMenus);
        }
      } else {
        setMenus(newMenus);
      }

      const cats = new Set();
      hydratedMenus.forEach(m => { if (m.category) cats.add(m.category); });
      if (cats.size > 0) setCategories(Array.from(cats).sort());
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, sortBy, sortOrder,
      restaurantFilter, categoryFilter, cuisineFilter, foodTypeFilter,
      statusFilter, availFilter, bestsellerFilter, priceMinFilter, priceMaxFilter,
      ratingFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const getRestaurantName = (uid) => {
    const restaurant = restaurants.find(r => r.uid === uid);
    return restaurant ? restaurant.name : uid;
  };

  const getAddMenuPath = () => {
    const targetRestaurantUid = restaurantAdmin ? ownRestaurantUid : (restaurantFilter !== 'all' ? restaurantFilter : '');
    if (!targetRestaurantUid) return '/menu/add';

    const params = new URLSearchParams({ restaurant: targetRestaurantUid });
    const restaurantName = getRestaurantName(targetRestaurantUid);
    if (restaurantName && restaurantName !== targetRestaurantUid) {
      params.set('name', restaurantName);
    }
    return `/menu/add?${params.toString()}`;
  };

  const getRestaurantScopedPath = (basePath) => {
    const targetRestaurantUid = restaurantAdmin ? ownRestaurantUid : (restaurantFilter !== 'all' ? restaurantFilter : '');
    if (!targetRestaurantUid) return basePath;

    const params = new URLSearchParams({ restaurant: targetRestaurantUid });
    const restaurantName = getRestaurantName(targetRestaurantUid);
    if (restaurantName && restaurantName !== targetRestaurantUid) {
      params.set('name', restaurantName);
    }
    return `${basePath}?${params.toString()}`;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setCurrentPage(1);
  };

  const SortHeader = ({ column, label, className }) => {
    const isActive = sortBy === column;
    return (
      <th
        className={`px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${className || ''}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (
            <ArrowUpDown size={11} className={`text-indigo-500 transition-transform ${sortOrder === 'ASC' ? 'rotate-180' : ''}`} />
          )}
        </div>
      </th>
    );
  };

  const hydrateMenuAvailability = async (menuData) => {
    return Promise.all(
      menuData.map(async (menu) => {
        if (!menu?.menu_uid) return mergeMenuAvailability(menu);

        try {
          const response = await getMenuAvailability(menu.menu_uid);
          return mergeMenuAvailability(menu, response?.data);
        } catch {
          return mergeMenuAvailability(menu);
        }
      })
    );
  };

  const handleToggleStatus = async (menu) => {
    setToggleLoading((prev) => ({ ...prev, [menu.menu_uid]: true }));
    const state = getMenuAvailabilityState(menu);
    const currentStatus = state.menuStatus;
    try {
      await toggleMenuStatus(menu.menu_uid, !currentStatus);
      toast.success(`Menu ${currentStatus ? 'disabled' : 'enabled'}`);
      fetchMenus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setToggleLoading((prev) => ({ ...prev, [menu.menu_uid]: false }));
    }
  };

  const handleToggleAvailability = async (menu) => {
    setToggleLoading((prev) => ({ ...prev, [menu.menu_uid]: true }));
    const state = getMenuAvailabilityState(menu);
    try {
      await toggleMenuAvailability(menu.menu_uid, !state.menuIsAvailable);
      toast.success(`Menu marked ${state.menuIsAvailable ? 'unavailable' : 'available'}`);
      fetchMenus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setToggleLoading((prev) => ({ ...prev, [menu.menu_uid]: false }));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === menus.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(menus.map(m => m.menu_uid)));
    }
  };

  const handleSelectOne = (menuUid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuUid)) next.delete(menuUid);
      else next.add(menuUid);
      return next;
    });
  };

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkLoading(true);
      await bulkUpdateMenuStatus(Array.from(selectedIds), true);
      toast.success(`${selectedIds.size} menus activated`);
      setSelectedIds(new Set());
      fetchMenus();
    } catch (error) {
      toast.error('Failed to activate menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkLoading(true);
      await bulkUpdateMenuStatus(Array.from(selectedIds), false);
      toast.success(`${selectedIds.size} menus deactivated`);
      setSelectedIds(new Set());
      fetchMenus();
    } catch (error) {
      toast.error('Failed to deactivate menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkLoading(true);
      await bulkDeleteMenu(Array.from(selectedIds));
      toast.success(`${selectedIds.size} menus deleted`);
      setSelectedIds(new Set());
      fetchMenus();
    } catch (error) {
      toast.error('Failed to delete menus');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteClick = (menu) => {
    setDeleteModal({ show: true, menu });
  };

  const confirmDelete = async () => {
    if (!deleteModal.menu) return;
    try {
      await deleteMenu(deleteModal.menu.menu_uid);
      toast.success('Menu deleted');
      setDeleteModal({ show: false, menu: null });
      fetchMenus();
    } catch (error) {
      toast.error('Failed to delete menu');
    }
  };

  const handleView = (menu) => {
    const selectedRestaurant = restaurantFilter !== 'all' ? restaurantFilter : undefined;
    navigate(getRestaurantScopedPath(`/menu/view/${menu.menu_uid}`), {
      state: {
        selectedRestaurant,
        selectedRestaurantName: selectedRestaurant ? getRestaurantName(selectedRestaurant) : undefined,
      }
    });
  };

  const handleEdit = (menu) => {
    const selectedRestaurant = restaurantFilter !== 'all' ? restaurantFilter : undefined;
    navigate(getRestaurantScopedPath(`/menu/edit/${menu.menu_uid}`), {
      state: {
        selectedRestaurant,
        selectedRestaurantName: selectedRestaurant ? getRestaurantName(selectedRestaurant) : undefined,
      }
    });
  };

  const handleExport = async (exportAll = false) => {
    if (!menus.length && !exportAll) {
      toast.error('No data to export');
      return;
    }
    setExportLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: exportAll ? 100000 : itemsPerPage,
        exportAll: exportAll || undefined,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(restaurantFilter !== 'all' && { restaurant: restaurantFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(cuisineFilter !== 'all' && { cuisine: cuisineFilter }),
        ...(foodTypeFilter !== 'all' && { food_type: foodTypeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(availFilter !== 'all' && { availability: availFilter }),
        ...(bestsellerFilter !== 'all' && { bestseller: bestsellerFilter }),
        ...(priceMinFilter && { minPrice: priceMinFilter }),
        ...(priceMaxFilter && { maxPrice: priceMaxFilter }),
        ...(ratingFilter !== 'all' && { rating: ratingFilter }),
        ...(fromDateFilter && { fromDate: fromDateFilter }),
        ...(toDateFilter && { toDate: toDateFilter }),
      };

      const res = await exportMenus(params);
      const csvData = res.data?.data || '';

      const filterParts = [];
      if (categoryFilter !== 'all') filterParts.push(categoryFilter);
      if (cuisineFilter !== 'all') filterParts.push(cuisineFilter);
      if (statusFilter !== 'all') filterParts.push(statusFilter);
      if (restaurantFilter !== 'all') {
        const name = getRestaurantName(restaurantFilter);
        filterParts.push(name.toLowerCase().replace(/\s+/g, '_'));
      }
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(0, 6);
      const filename = filterParts.length > 0
        ? `menu_${filterParts.join('_')}_${dateStr}.csv`
        : `menu_${dateStr}.csv`;

      saveAs(new Blob([csvData], { type: 'text/csv;charset=utf-8;' }), filename);
      toast.success(`Exported ${res.data?.meta?.exported || menus.length} menu item(s)`);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleRestaurantChange = (uid) => {
    setRestaurantFilter(uid);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setRestaurantDropdownOpen(false);
    setRestaurantSearch('');
    navigate(uid === 'all' ? '/menu' : `/menu?restaurant=${uid}`, { replace: true });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setRestaurantFilter('all');
    setCategoryFilter('all');
    setCuisineFilter('all');
    setFoodTypeFilter('all');
    setStatusFilter('all');
    setAvailFilter('all');
    setBestsellerFilter('all');
    setPriceMinFilter('');
    setPriceMaxFilter('');
    setRatingFilter('all');
    setFromDateFilter('');
    setToDateFilter('');
    setCurrentPage(1);
    setSortBy('updatedAt');
    setSortOrder('DESC');
    navigate('/menu', { replace: true });
    if (searchInputRef.current) searchInputRef.current.value = '';
  };

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages;
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) { start = 2; end = Math.min(4, totalPages - 1); }
      if (currentPage >= totalPages - 1) { start = Math.max(totalPages - 3, 2); end = totalPages - 1; }
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const getFirstImage = (images) => {
    if (!images) return null;
    if (Array.isArray(images) && images.length > 0) {
      return getImageUrl(images[0]);
    }
    return null;
  };

  const activeRestaurantName = restaurantFilter !== 'all'
    ? getRestaurantName(restaurantFilter)
    : '';

  if (restaurantAdmin && !ownRestaurantUid) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white border border-amber-200 rounded-xl p-6 text-amber-800">
          Restaurant access is not linked to your account yet. Please contact Zenzio support.
        </div>
      </div>
    );
  }

  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
          <td className="px-4 py-3"><div className="w-12 h-12 bg-gray-200 rounded-lg" /></td>
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-28 mb-1.5" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </td>
          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded-full w-16" /></td>
          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
        </tr>
      ))}
    </>
  );

  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <UtensilsCrossed className="text-gray-400" size={28} />
      </div>
      <h3 className="text-base font-semibold text-gray-600 mb-1">
        {debouncedSearch || hasActiveFilters ? 'No matching menu items' : 'No menu items yet'}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {debouncedSearch || hasActiveFilters
          ? 'Try adjusting your search or filter criteria'
          : 'Menu items will appear here once restaurants add them'}
      </p>
      {(debouncedSearch || hasActiveFilters) && (
        <button
          onClick={resetFilters}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
        >
          <RefreshCw size={15} />
          Reset Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      <AnimatePresence>
        {deleteModal.show && (
          <DeleteModal
            open
            menu={deleteModal.menu}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteModal({ show: false, menu: null })}
          />
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            {activeRestaurantName ? `${activeRestaurantName} Menu` : 'Menu Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeRestaurantName
              ? 'Manage menu items, pricing, and availability for this restaurant'
              : 'Manage menu items, pricing, availability, and categories'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!restaurantAdmin && (
            <button
              onClick={() => navigate('/menu/bulk-upload')}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Bulk Upload
            </button>
          )}
          <button
            onClick={() => navigate(getAddMenuPath())}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium"
          >
            + Add Menu
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-3 md:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                defaultValue={searchTerm}
                placeholder="Search by name, cuisine, category, restaurant..."
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-gray-50/50 hover:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>

            {!restaurantAdmin && (
              <div className="relative min-w-[200px] z-[60]">
                <button
                  onClick={() => setRestaurantDropdownOpen(!restaurantDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    restaurantFilter !== 'all'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">
                    {restaurantFilter === 'all'
                      ? `All Restaurants (${restaurants.length})`
                      : (restaurants.find(r => r.uid === restaurantFilter)?.name || 'Select Restaurant')}
                  </span>
                  <ChevronDown size={12} className={`ml-1 transition-transform shrink-0 ${restaurantDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {restaurantDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => { setRestaurantDropdownOpen(false); setRestaurantSearch(''); }}></div>
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-[65]">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="text"
                            placeholder="Search restaurants..."
                            value={restaurantSearch}
                            onChange={(e) => setRestaurantSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-xs"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto">
                        <button
                          onClick={() => handleRestaurantChange('all')}
                          className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                            restaurantFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          All Restaurants ({restaurants.length})
                        </button>
                        {filteredRestaurants.length === 0 ? (
                          <div className="px-3.5 py-2 text-xs text-gray-400 text-center">No restaurants found</div>
                        ) : (
                          filteredRestaurants.map(r => (
                            <button
                              key={r.uid}
                              onClick={() => handleRestaurantChange(r.uid)}
                              className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors border-t border-gray-50 ${
                                restaurantFilter === r.uid ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {r.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <FilterDropdown
              label="Sort"
              icon={ArrowUpDown}
              value={sortBy}
              options={[
                { label: 'Last Updated', value: 'updatedAt' },
                { label: 'Name (A-Z)', value: 'menu_name_ASC' },
                { label: 'Name (Z-A)', value: 'menu_name_DESC' },
                { label: 'Price (Low-High)', value: 'price_ASC' },
                { label: 'Price (High-Low)', value: 'price_DESC' },
                { label: 'Newest First', value: 'createdAt_DESC' },
                { label: 'Oldest First', value: 'createdAt_ASC' },
                { label: 'Highest Rated', value: 'rating_DESC' },
                { label: 'Most Ordered', value: 'orderedCount_DESC' },
              ]}
              onChange={(v) => {
                if (v.includes('_')) {
                  const [col, order] = v.split('_');
                  setSortBy(col);
                  setSortOrder(order);
                } else {
                  setSortBy(v);
                  setSortOrder('DESC');
                }
                setCurrentPage(1);
              }}
            />

            <button
              onClick={() => handleExport(false)}
              disabled={!menus.length || exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>

            <button
              onClick={() => handleExport(true)}
              disabled={!pagination.total || exportLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export all filtered results"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export All</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
              <Filter size={12} />
              Filters
            </span>

            <FilterDropdown
              label="Category"
              icon={null}
              value={categoryFilter}
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map(c => ({ label: c, value: c })),
              ]}
              onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
              onClear={() => setCategoryFilter('all')}
            />

            <FilterDropdown
              label="Cuisine"
              icon={null}
              value={cuisineFilter}
              options={[
                { label: 'All Cuisines', value: 'all' },
                ...cuisines.map(c => ({ label: c, value: c })),
              ]}
              onChange={(v) => { setCuisineFilter(v); setCurrentPage(1); }}
              onClear={() => setCuisineFilter('all')}
            />

            <FilterDropdown
              label="Food Type"
              icon={null}
              value={foodTypeFilter}
              options={[
                { label: 'All Types', value: 'all' },
                { label: 'Veg', value: 'Veg' },
                { label: 'Non-Veg', value: 'Non-Veg' },
              ]}
              onChange={(v) => { setFoodTypeFilter(v); setCurrentPage(1); }}
              onClear={() => setFoodTypeFilter('all')}
            />

            <FilterDropdown
              label="Status"
              icon={null}
              value={statusFilter}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
              onClear={() => setStatusFilter('all')}
            />

            <FilterDropdown
              label="Availability"
              icon={null}
              value={availFilter}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Available', value: 'available' },
                { label: 'Unavailable', value: 'unavailable' },
              ]}
              onChange={(v) => { setAvailFilter(v); setCurrentPage(1); }}
              onClear={() => setAvailFilter('all')}
            />

            <FilterDropdown
              label="Rating"
              icon={Star}
              value={ratingFilter}
              options={[
                { label: 'All Ratings', value: 'all' },
                { label: '4+ Stars', value: '4' },
                { label: '3+ Stars', value: '3' },
                { label: '2+ Stars', value: '2' },
                { label: '1+ Stars', value: '1' },
              ]}
              onChange={(v) => { setRatingFilter(v); setCurrentPage(1); }}
              onClear={() => setRatingFilter('all')}
            />

            <FilterDropdown
              label="Bestseller"
              icon={null}
              value={bestsellerFilter}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Bestsellers Only', value: 'true' },
              ]}
              onChange={(v) => { setBestsellerFilter(v); setCurrentPage(1); }}
              onClear={() => setBestsellerFilter('all')}
            />

            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min ₹"
                value={priceMinFilter}
                onChange={(e) => { setPriceMinFilter(e.target.value); setCurrentPage(1); }}
                className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={priceMaxFilter}
                onChange={(e) => { setPriceMaxFilter(e.target.value); setCurrentPage(1); }}
                className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              />
            </div>

            <div className="flex items-center gap-1">
              <input
                type="date"
                value={fromDateFilter}
                onChange={(e) => { setFromDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                title="From date"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="date"
                value={toDateFilter}
                onChange={(e) => { setToDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                title="To date"
              />
            </div>

            {menus.length < pagination.total && (
              <span className="text-xs text-gray-400 ml-1">
                {menus.length} of {pagination.total} results
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!restaurantAdmin && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-sm text-indigo-700 font-medium">
              <CheckSquare size={16} />
              {selectedIds.size} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkActivate}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {!restaurantAdmin && <th className="w-10 px-4 py-3.5"></th>}
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Image</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Cuisine</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Category</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Avail</th>
                  <th className="w-12 px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <TableSkeleton />
              </tbody>
            </table>
          </div>
        ) : menus.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {!restaurantAdmin && (
                      <th className="w-10 px-4 py-3.5 text-left">
                        <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {selectedIds.size === menus.length && menus.length > 0
                            ? <CheckSquare size={16} className="text-indigo-600" />
                            : <Square size={16} />
                          }
                        </button>
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                    <SortHeader column="menu_name" label="Name" />
                    <SortHeader column="price" label="Price" />
                    <SortHeader column="cuisine_type" label="Cuisine" className="hidden md:table-cell" />
                    <SortHeader column="category" label="Category" className="hidden md:table-cell" />
                    <SortHeader column="status" label="Status" />
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Avail</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="w-12 px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {menus.map((menu, idx) => {
                    const availabilityState = getMenuAvailabilityState(menu);
                    const statusBadge = getStatusBadge(availabilityState.menuStatus);
                    const availBadge = getAvailBadge(availabilityState.canOrder);
                    const selected = selectedIds.has(menu.menu_uid);
                    const unavailableTitle = availabilityState.reasonText
                      ? `Unavailable: ${availabilityState.reasonText}`
                      : availabilityState.canOrder
                        ? 'Can be ordered'
                        : 'Currently unavailable';
                    return (
                      <motion.tr
                        key={menu.menu_uid}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        onClick={() => handleView(menu)}
                        className={`group cursor-pointer transition-all duration-150
                          ${selected ? 'bg-indigo-50/40' : 'hover:bg-gray-50'}
                          ${idx % 2 === 1 && !selected ? 'bg-gray-50/30' : ''}
                        `}
                      >
                        {!restaurantAdmin && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleSelectOne(menu.menu_uid)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                              {selected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            {getFirstImage(menu.images) ? (
                              <img src={getFirstImage(menu.images)} alt={menu.menu_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <UtensilsCrossed size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px] group-hover:text-indigo-600 transition-colors">
                            {menu.menu_name}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">
                            {menu.description ? menu.description.substring(0, 50) + (menu.description.length > 50 ? '...' : '') : '-'}
                          </div>
                          {!availabilityState.canOrder && (
                            <div className="text-[10px] text-amber-600 mt-0.5 truncate max-w-[180px]" title={unavailableTitle}>
                              {unavailableTitle}
                            </div>
                          )}
                          {!restaurantAdmin && (
                            <div className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-[180px]">
                              {menu.restaurant_uid ? getRestaurantName(menu.restaurant_uid) : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            <span className="text-xs text-gray-500">₹</span>
                            {menu.price}
                          </div>
                          {menu.discount > 0 && (
                            <div className="text-[10px] text-green-600 font-medium">{menu.discount}% off</div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                            {menu.cuisine_type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {menu.category || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {restaurantAdmin ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusBadge.bg} ${statusBadge.text} ${statusBadge.ring}`}
                              title="Admin status is controlled by Zenzio Admin"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              {statusBadge.label}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(menu)}
                              disabled={toggleLoading[menu.menu_uid]}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset cursor-pointer transition-all duration-150
                                ${!toggleLoading[menu.menu_uid] ? 'hover:ring-2' : ''} disabled:opacity-50 disabled:cursor-not-allowed
                                ${statusBadge.bg} ${statusBadge.text} ${statusBadge.ring}`}
                              title={`Click to ${availabilityState.menuStatus ? 'disable' : 'enable'} admin status`}
                            >
                              {toggleLoading[menu.menu_uid] ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              )}
                              {toggleLoading[menu.menu_uid] ? 'Updating...' : statusBadge.label}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {restaurantAdmin ? (
                            <button
                              onClick={() => handleToggleAvailability(menu)}
                              disabled={toggleLoading[menu.menu_uid]}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset cursor-pointer transition-all duration-150
                                ${availBadge.bg} ${availBadge.text} ${availBadge.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={`${unavailableTitle}. Click to toggle item availability.`}
                            >
                              {toggleLoading[menu.menu_uid] ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${availBadge.dot}`} />
                              )}
                              {toggleLoading[menu.menu_uid] ? 'Updating...' : availBadge.label}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${availBadge.bg} ${availBadge.text} ${availBadge.ring}`}
                              title={unavailableTitle}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${availBadge.dot}`} />
                              {availBadge.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={11} className="text-gray-300" />
                            {formatDate(menu.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleView(menu)}
                              className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <ActionMenu
                              menu={menu}
                              onView={handleView}
                              onEdit={handleEdit}
                              onDelete={handleDeleteClick}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-gray-400">
                  {menus.length > 0
                    ? `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total}`
                    : 'No results'
                  }
                </span>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                      <span key={`e${idx}`} className="px-1.5 text-xs text-gray-300">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] h-8 text-xs font-medium rounded-lg transition-all duration-150
                          ${currentPage === page
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage >= pagination.totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;
