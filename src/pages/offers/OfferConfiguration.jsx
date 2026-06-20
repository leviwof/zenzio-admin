import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, Filter, Gift, ImagePlus, Loader2, RotateCcw, Save, Store, Tag, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  createOffer,
  createOfferByAdmin,
  getAllMenus,
  getAllRestaurants,
  getMenuCategories,
} from "../../services/api";
import { getCurrentRestaurantUid, isRestaurantAdmin } from "../../utils/auth";

const OFFER_TYPES = [
  { label: "Percentage Discount", value: "PERCENTAGE_DISCOUNT" },
  { label: "Fixed Amount Discount", value: "FIXED_AMOUNT_DISCOUNT" },
  { label: "Buy 1 Get 1", value: "BUY_ONE_GET_ONE" },
  { label: "Buy X Get Y", value: "BUY_X_GET_Y" },
  { label: "Free Item On Cart Value", value: "FREE_ITEM_CART_VALUE" },
  { label: "Free Item On Category", value: "FREE_ITEM_CATEGORY" },
  { label: "Festival Offer", value: "FESTIVAL_OFFER" },
  { label: "Platform Campaign Offer", value: "PLATFORM_CAMPAIGN" },
];

const TYPE_TO_DISCOUNT = {
  PERCENTAGE_DISCOUNT: "PERCENTAGE",
  FIXED_AMOUNT_DISCOUNT: "FLAT",
  BUY_ONE_GET_ONE: "BOGO",
  BUY_X_GET_Y: "BUY_X_GET_Y",
  FREE_ITEM_CART_VALUE: "FREE_ITEM_CART",
  FREE_ITEM_CATEGORY: "FREE_ITEM_CATEGORY",
  FESTIVAL_OFFER: "PLATFORM_CAMPAIGN",
  PLATFORM_CAMPAIGN: "PLATFORM_CAMPAIGN",
};

const emptyRules = {
  buyCategory: "",
  buyItem: "",
  buyQuantity: "1",
  freeCategory: "",
  freeItem: "",
  freeQuantity: "1",
  minimumCartAmount: "",
  triggerCategory: "",
};

const initialForm = {
  title: "",
  offerCode: "",
  restaurantId: "",
  categoryId: "",
  offerType: "PERCENTAGE_DISCOUNT",
  discountValue: "",
  minOrderValue: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  termsConditions: "",
  description: "",
  rules: emptyRules,
  offer_scope: "ALL_MENU",
  included_category_ids: [],
  included_menu_ids: [],
  excluded_category_ids: [],
  excluded_menu_ids: [],
};

const normalizeArray = (response) => {
  const data = response?.data;
  if (Array.isArray(data?.data?.restaurants)) return data.data.restaurants;
  if (Array.isArray(data?.restaurants)) return data.restaurants;
  if (Array.isArray(data?.data?.restaurant_menus)) return data.data.restaurant_menus;
  if (Array.isArray(data?.data?.restaurant_menu)) return data.data.restaurant_menu;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data)) return data;
  return [];
};

const getRestaurantName = (restaurant) =>
  restaurant?.profile?.restaurant_name || restaurant?.restaurant_name || restaurant?.name || restaurant?.uid || restaurant?.id;

const getMenuName = (menu) => menu?.menu_name || menu?.title || menu?.name || menu?.menuUid || menu?.menu_uid;
const getMenuId = (menu) => menu?.menu_uid || menu?.menuUid || getMenuName(menu);
const getMenuCategory = (menu) => menu?.category || menu?.categoryName || menu?.category_name || "Uncategorized";

const getCategoryName = (category) => category?.name || category?.category || category?.id || category;

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const OfferConfiguration = () => {
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const ownRestaurantUid = getCurrentRestaurantUid();
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [formData, setFormData] = useState({
    ...initialForm,
    restaurantId: restaurantAdmin ? ownRestaurantUid : "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bogoItems, setBogoItems] = useState([{ buyItem: "", freeItem: "" }]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setFetchingData(true);
      try {
        const requests = [
          getMenuCategories().catch(() => ({ data: [] })),
          getAllMenus({ restaurant: restaurantAdmin ? ownRestaurantUid : undefined, limit: 1000 }).catch(() => ({ data: [] })),
        ];
        if (!restaurantAdmin) requests.unshift(getAllRestaurants({}).catch(() => ({ data: [] })));
        const responses = await Promise.all(requests);
        if (!restaurantAdmin) {
          setRestaurants(normalizeArray(responses[0]));
          setCategories(normalizeArray(responses[1]));
          setMenus(normalizeArray(responses[2]));
        } else {
          setCategories(normalizeArray(responses[0]));
          setMenus(normalizeArray(responses[1]));
        }
      } finally {
        setFetchingData(false);
      }
    };
    fetchInitialData();
  }, [restaurantAdmin, ownRestaurantUid]);

  useEffect(() => {
    const fetchMenusForRestaurant = async () => {
      try {
        const params = formData.restaurantId && formData.restaurantId !== "all"
          ? { restaurant: formData.restaurantId, limit: 1000 }
          : { limit: 1000 };
        const response = await getAllMenus(params);
        setMenus(normalizeArray(response));
      } catch {
        setMenus([]);
      }
    };
    fetchMenusForRestaurant();
  }, [formData.restaurantId]);

  const selectedRestaurantName = useMemo(() => {
    if (restaurantAdmin) return ownRestaurantUid || "Own Restaurant";
    if (!formData.restaurantId) return "All Restaurants";
    return getRestaurantName(restaurants.find((restaurant) => [restaurant.uid, restaurant.id].includes(formData.restaurantId))) || "Selected Restaurant";
  }, [formData.restaurantId, ownRestaurantUid, restaurantAdmin, restaurants]);

  const selectedType = OFFER_TYPES.find((type) => type.value === formData.offerType)?.label || "Offer";
  const menuOptions = menus.filter(Boolean);
  const itemOfferTypes = ["BUY_ONE_GET_ONE", "BUY_X_GET_Y", "FREE_ITEM_CART_VALUE", "FREE_ITEM_CATEGORY"];
  const itemOfferNeedsRestaurant = !restaurantAdmin && itemOfferTypes.includes(formData.offerType) && !formData.restaurantId;
  const menuCategoryOptions = useMemo(() => {
    const names = menuOptions
      .map(getMenuCategory)
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => String(a).localeCompare(String(b)));
  }, [menuOptions]);

  const categoryOptions = useMemo(() => {
    const names = [
      ...categories.map(getCategoryName),
      ...menuCategoryOptions,
    ].filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => String(a).localeCompare(String(b)));
  }, [categories, menuCategoryOptions]);

  const getFilteredMenus = (category) => {
    if (!category) return menuOptions;
    return menuOptions.filter((menu) => getMenuCategory(menu) === category);
  };

  const categorySelectOptions = categoryOptions.map((c) => ({ label: c, value: c }));
  const menuSelectOptions = menuOptions.map((m) => ({
    label: `${getMenuName(m)}${m.price ? ` · ₹${m.price}` : ""}${getMenuCategory(m) !== "Uncategorized" ? ` (${getMenuCategory(m)})` : ""}`,
    value: getMenuId(m),
  }));

  const scopeNeedsInclusion = formData.offer_scope === "SELECTED_CATEGORIES" || formData.offer_scope === "SELECTED_ITEMS";
  const hasExclusions = (formData.excluded_category_ids.length + formData.excluded_menu_ids.length) > 0;

  const addBogoItem = () => setBogoItems((prev) => [...prev, { buyItem: "", freeItem: "" }]);
  const removeBogoItem = (idx) => setBogoItems((prev) => prev.filter((_, i) => i !== idx));
  const updateBogoItem = (idx, field, value) =>
    setBogoItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "offerType" ? { rules: { ...emptyRules } } : {}),
      ...(name === "restaurantId" ? { rules: { ...prev.rules, buyCategory: "", buyItem: "", freeCategory: "", freeItem: "", triggerCategory: "" } } : {}),
    }));
    if (name === "offerType" || name === "restaurantId") {
      setBogoItems([{ buyItem: "", freeItem: "" }]);
    }
  };

  const handleRuleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [name]: value,
        ...(name === "buyCategory" ? { buyItem: "" } : {}),
        ...(name === "freeCategory" ? { freeItem: "" } : {}),
      },
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const getSelectedMenu = (menuId) => menuOptions.find((menu) => getMenuId(menu) === menuId);

  const buildItemSnapshot = (menuId) => {
    const menu = getSelectedMenu(menuId);
    if (!menuId) return null;
    return {
      menu_uid: menuId,
      name: getMenuName(menu) || menuId,
      category: menu ? getMenuCategory(menu) : undefined,
      price: menu?.price,
      restaurant_uid: menu?.restaurant_uid || menu?.restaurantUid || formData.restaurantId || undefined,
    };
  };

  const buildRulePayload = () => {
    const rules = formData.rules;
    const buyItem = buildItemSnapshot(rules.buyItem);
    const freeItem = buildItemSnapshot(rules.freeItem);

    if (formData.offerType === "BUY_ONE_GET_ONE") {
      const combos = bogoItems.map((combo) => {
        const buySnap = buildItemSnapshot(combo.buyItem);
        const freeSnap = buildItemSnapshot(combo.freeItem);
        return {
          buyItem: combo.buyItem,
          buyItemName: buySnap?.name,
          buyCategory: buySnap?.category,
          buyQty: 1,
          freeItem: combo.freeItem,
          freeItemName: freeSnap?.name,
          freeCategory: freeSnap?.category,
          freeQty: 1,
        };
      });
      return {
        conditions: { bogoItems: combos },
        rewards: { bogoItems: combos },
      };
    }
    if (formData.offerType === "BUY_X_GET_Y") {
      return {
        conditions: {
          buyProduct: rules.buyItem,
          buyProductName: buyItem?.name,
          buyCategory: rules.buyCategory || buyItem?.category,
          buyQuantity: Number(rules.buyQuantity || 1),
        },
        rewards: {
          freeProduct: rules.freeItem,
          freeProductName: freeItem?.name,
          freeCategory: rules.freeCategory || freeItem?.category,
          freeQuantity: Number(rules.freeQuantity || 1),
        },
      };
    }
    if (formData.offerType === "FREE_ITEM_CART_VALUE") {
      return {
        conditions: { minimumCartAmount: Number(rules.minimumCartAmount || formData.minOrderValue || 0) },
        rewards: {
          freeItem: rules.freeItem,
          freeItemName: freeItem?.name,
          freeCategory: rules.freeCategory || freeItem?.category,
          freeQuantity: Number(rules.freeQuantity || 1),
        },
      };
    }
    if (formData.offerType === "FREE_ITEM_CATEGORY") {
      return {
        conditions: { triggerCategory: rules.triggerCategory },
        rewards: {
          freeItem: rules.freeItem,
          freeItemName: freeItem?.name,
          freeCategory: rules.freeCategory || freeItem?.category,
          freeQuantity: Number(rules.freeQuantity || 1),
        },
      };
    }
    return {
      conditions: { minimumCartAmount: Number(formData.minOrderValue || 0), categoryId: formData.categoryId || null },
      rewards: { discountType: TYPE_TO_DISCOUNT[formData.offerType], discountValue: Number(formData.discountValue || 0) },
    };
  };

  const validate = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.title.trim()) return "Please enter offer name";
    if (!formData.offerCode.trim()) return "Please enter offer code";
    if (!formData.startDate || !formData.endDate) return "Please select start and end dates";
    if (start < today) return "Start date cannot be in the past";
    if (end < start) return "End date cannot be before start date";
    if (restaurantAdmin && formData.restaurantId !== ownRestaurantUid) return "Restaurant admins can only create offers for their own restaurant";
    if (restaurantAdmin && formData.offerType === "PLATFORM_CAMPAIGN") return "Platform campaign offers can only be created by Zenzio Admin";

    const discountTypes = ["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "FESTIVAL_OFFER", "PLATFORM_CAMPAIGN"];
    if (discountTypes.includes(formData.offerType) && Number(formData.discountValue) < 0) return "Discount cannot be negative";

    if (formData.offerType === "BUY_ONE_GET_ONE") {
      if (!restaurantAdmin && !formData.restaurantId) return "Please select a restaurant before choosing menu items";
      if (menuOptions.length === 0) return "No menu items are available for the selected restaurant";
      for (let i = 0; i < bogoItems.length; i++) {
        const n = bogoItems.length > 1 ? ` (combo ${i + 1})` : "";
        if (!bogoItems[i].buyItem) return `Please select an item${n}`;
        if (!getSelectedMenu(bogoItems[i].buyItem)) return `Item${n} is not a valid menu item`;
      }
      return null;
    }

    const needsFreeItem = ["BUY_X_GET_Y", "FREE_ITEM_CART_VALUE", "FREE_ITEM_CATEGORY"].includes(formData.offerType);
    const needsBuyItem = ["BUY_X_GET_Y"].includes(formData.offerType);
    if ((needsFreeItem || needsBuyItem) && !restaurantAdmin && !formData.restaurantId) return "Please select a restaurant before choosing menu items";
    if ((needsFreeItem || needsBuyItem) && menuOptions.length === 0) return "No menu items are available for the selected restaurant";
    if (needsFreeItem && !formData.rules.freeItem) return "Please select the free item";
    if (needsBuyItem && !formData.rules.buyItem) return "Please select the buy item";
    if (needsBuyItem && !getSelectedMenu(formData.rules.buyItem)) return "Please select a valid buy item from the menu list";
    if (needsFreeItem && !getSelectedMenu(formData.rules.freeItem)) return "Please select a valid free item from the menu list";
    if (formData.offerType === "FREE_ITEM_CATEGORY" && !formData.rules.triggerCategory) return "Please select trigger category";
    if (formData.offerType === "FREE_ITEM_CART_VALUE" && Number(formData.rules.minimumCartAmount || formData.minOrderValue) <= 0) return "Please enter minimum cart amount";
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const { conditions, rewards } = buildRulePayload();
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("offerCode", formData.offerCode.trim().toUpperCase());
      data.append("offerType", formData.offerType);
      data.append("discountType", TYPE_TO_DISCOUNT[formData.offerType]);
      data.append("discountValue", String(formData.discountValue || 0));
      data.append("minOrderValue", String(formData.minOrderValue || formData.rules.minimumCartAmount || 0));
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("ruleConfig", JSON.stringify(
        formData.offerType === "BUY_ONE_GET_ONE"
          ? {
              type: formData.offerType,
              bogoItems: bogoItems.map((combo) => ({
                buyItem: combo.buyItem,
                buyItemName: buildItemSnapshot(combo.buyItem)?.name,
                buyQty: 1,
                freeItem: combo.freeItem,
                freeItemName: buildItemSnapshot(combo.freeItem)?.name,
                freeQty: 1,
              })),
            }
          : {
              type: formData.offerType,
              ...formData.rules,
              buyItemDetails: buildItemSnapshot(formData.rules.buyItem),
              freeItemDetails: buildItemSnapshot(formData.rules.freeItem),
            }
      ));
      data.append("conditions", JSON.stringify(conditions));
      data.append("rewards", JSON.stringify(rewards));

      if (formData.restaurantId) data.append("restaurantId", formData.restaurantId);
      if (formData.categoryId) data.append("categoryId", formData.categoryId);
      if (formData.startTime) data.append("startTime", formData.startTime);
      if (formData.endTime) data.append("endTime", formData.endTime);
      if (formData.description) data.append("description", formData.description);
      if (formData.termsConditions) data.append("termsConditions", formData.termsConditions);
      if (imageFile) data.append("image", imageFile);
      data.append("offer_scope", formData.offer_scope || "ALL_MENU");
      data.append("included_category_ids", JSON.stringify(formData.included_category_ids || []));
      data.append("included_menu_ids", JSON.stringify(formData.included_menu_ids || []));
      data.append("excluded_category_ids", JSON.stringify(formData.excluded_category_ids || []));
      data.append("excluded_menu_ids", JSON.stringify(formData.excluded_menu_ids || []));

      if (restaurantAdmin) await createOffer(data);
      else await createOfferByAdmin(data);

      toast.success(restaurantAdmin ? "Offer submitted for approval" : "Offer created successfully");
      navigate("/offers");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create offer");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...initialForm, restaurantId: restaurantAdmin ? ownRestaurantUid : "", offer_scope: "ALL_MENU", included_category_ids: [], included_menu_ids: [], excluded_category_ids: [], excluded_menu_ids: [] });
    setBogoItems([{ buyItem: "", freeItem: "" }]);
    setImageFile(null);
    setImagePreview(null);
  };

  const selectedBuyItemName = buildItemSnapshot(formData.rules.buyItem)?.name;
  const selectedFreeItemName = buildItemSnapshot(formData.rules.freeItem)?.name;

  const CategorySelect = ({ name, value, placeholder = "All categories" }) => (
    <select
      name={name}
      value={value}
      onChange={handleRuleChange}
      disabled={itemOfferNeedsRestaurant}
      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white disabled:bg-gray-100 disabled:text-gray-400"
    >
      <option value="">{itemOfferNeedsRestaurant ? "Select restaurant first" : placeholder}</option>
      {categoryOptions.map((category) => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>
  );

  const MenuSelect = ({ name, value, placeholder, category, onChange: onChangeProp }) => {
    const filteredMenus = getFilteredMenus(category);
    const disabled = itemOfferNeedsRestaurant || filteredMenus.length === 0;
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handleOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const lowerSearch = search.trim().toLowerCase();
    const visibleMenus = lowerSearch
      ? filteredMenus.filter((m) =>
          getMenuName(m)?.toLowerCase().includes(lowerSearch) ||
          getMenuCategory(m)?.toLowerCase().includes(lowerSearch)
        )
      : filteredMenus;

    const selectedMenu = filteredMenus.find((m) => getMenuId(m) === value);
    const selectedLabel = selectedMenu
      ? `${getMenuName(selectedMenu)}${selectedMenu.price ? ` · ₹${selectedMenu.price}` : ""}`
      : "";

    const handleSelect = (menuId) => {
      if (onChangeProp) onChangeProp(menuId);
      else handleRuleChange({ target: { name, value: menuId } });
      setOpen(false);
      setSearch("");
    };

    const handleClear = (e) => {
      e.stopPropagation();
      if (onChangeProp) onChangeProp("");
      else handleRuleChange({ target: { name, value: "" } });
      setSearch("");
    };

    if (disabled) {
      return (
        <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-400 text-sm">
          {itemOfferNeedsRestaurant ? "Select restaurant first" : "No menu items found"}
        </div>
      );
    }

    return (
      <div ref={ref} className="relative">
        <div
          onClick={() => setOpen((o) => !o)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-indigo-400 transition-colors"
        >
          <span className={`flex-1 truncate text-sm ${value ? "text-gray-800" : "text-gray-400"}`}>
            {value ? selectedLabel : placeholder}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && (
              <button type="button" onClick={handleClear} className="text-gray-400 hover:text-red-500 text-xs w-4 h-4 flex items-center justify-center">✕</button>
            )}
            <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or category..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {visibleMenus.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
              ) : (
                visibleMenus.map((menu) => {
                  const id = getMenuId(menu);
                  const isSelected = id === value;
                  return (
                    <li
                      key={id}
                      onClick={() => handleSelect(id)}
                      className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-2 hover:bg-indigo-50 ${isSelected ? "bg-indigo-50 text-indigo-700" : "text-gray-700"}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{getMenuName(menu)}</div>
                        {getMenuCategory(menu) && (
                          <div className="text-xs text-gray-400">{getMenuCategory(menu)}</div>
                        )}
                      </div>
                      {menu.price && (
                        <span className="text-xs font-medium text-gray-600 flex-shrink-0">₹{menu.price}</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
            <div className="px-4 py-1.5 border-t border-gray-100 text-xs text-gray-400 text-right">
              {visibleMenus.length} of {filteredMenus.length} items
            </div>
          </div>
        )}
      </div>
    );
  };

  const MultiSelectDropdown = ({ options, selected, onChange, placeholder = "Select…", disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);
    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    const visible = search.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
      : options;
    const toggle = (value) => {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    };
    return (
      <div ref={ref} className="relative">
        <div
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`min-h-[38px] w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white flex flex-wrap gap-1.5 items-center cursor-pointer hover:border-indigo-400 transition-colors ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          {selected.length === 0 && <span className="text-sm text-gray-400 py-0.5">{placeholder}</span>}
          {selected.map((value) => {
            const opt = options.find((o) => o.value === value);
            return (
              <span key={value} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {opt?.label ?? value}
                <button type="button" onClick={(e) => { e.stopPropagation(); toggle(value); }} className="text-indigo-400 hover:text-indigo-700"><X size={10} /></button>
              </span>
            );
          })}
          <span className="ml-auto text-gray-400 text-xs flex-shrink-0">{open ? "▲" : "▼"}</span>
        </div>
        {open && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {visible.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
              ) : visible.map((opt) => (
                <li key={opt.value} onClick={() => toggle(opt.value)} className={`px-4 py-2.5 cursor-pointer flex items-center justify-between text-sm hover:bg-indigo-50 ${selected.includes(opt.value) ? "text-indigo-700 bg-indigo-50" : "text-gray-700"}`}>
                  <span>{opt.label}</span>
                  {selected.includes(opt.value) && <span className="text-indigo-500 text-xs">✓</span>}
                </li>
              ))}
            </ul>
            <div className="px-4 py-1.5 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
              <span>{selected.length} selected</span>
              {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="text-red-400 hover:text-red-600">Clear all</button>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const SearchableSelect = ({ options, value, onChange, placeholder = "Select…", emptyLabel, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);
    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); } };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    const lower = search.trim().toLowerCase();
    const visible = lower ? options.filter((o) => o.label.toLowerCase().includes(lower)) : options;
    const selected = options.find((o) => o.value === value);
    const handleSelect = (val) => { onChange(val); setOpen(false); setSearch(""); };
    return (
      <div ref={ref} className="relative">
        <div
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`w-full px-4 py-2 border border-gray-200 rounded-lg bg-white flex items-center justify-between gap-2 transition-colors ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "cursor-pointer hover:border-indigo-400"} ${open ? "border-indigo-400 ring-2 ring-indigo-400/30" : ""}`}
        >
          <span className={`flex-1 truncate text-sm ${selected || value === "" ? "text-gray-800" : "text-gray-400"}`}>
            {selected ? selected.label : (value === "" && emptyLabel ? emptyLabel : placeholder)}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && value !== "" && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }} className="text-gray-400 hover:text-red-500 text-xs w-4 h-4 flex items-center justify-center">✕</button>
            )}
            <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
          </div>
        </div>
        {open && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {emptyLabel && (
                <li onClick={() => handleSelect("")} className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-indigo-50 ${value === "" ? "text-indigo-700 bg-indigo-50" : "text-gray-500 italic"}`}>
                  {emptyLabel}
                </li>
              )}
              {visible.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
              ) : visible.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-4 py-2.5 cursor-pointer text-sm hover:bg-indigo-50 flex items-center justify-between ${value === opt.value ? "text-indigo-700 bg-indigo-50 font-medium" : "text-gray-700"}`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <span className="text-indigo-500 text-xs">✓</span>}
                </li>
              ))}
            </ul>
            <div className="px-4 py-1.5 border-t border-gray-100 text-xs text-gray-400 text-right">
              {visible.length} option{visible.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRuleFields = () => {
    if (["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "FESTIVAL_OFFER", "PLATFORM_CAMPAIGN"].includes(formData.offerType)) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Discount Value" required>
            <input type="number" name="discountValue" value={formData.discountValue} onChange={handleChange} min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
          <Field label="Minimum Order Value">
            <input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleChange} min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
        </div>
      );
    }

    if (formData.offerType === "BUY_ONE_GET_ONE") {
      return (
        <div className="space-y-3">
          {itemOfferNeedsRestaurant && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Select a restaurant first to pick menu items.
            </p>
          )}
          <p className="text-xs text-gray-400">Each combo: buy 1 → get 1 of the same item free.</p>
          {bogoItems.map((combo, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-xs font-bold text-indigo-600 flex-shrink-0 w-14">
                Combo {idx + 1}
              </span>
              <div className="flex-1">
                <MenuSelect
                  name={`bogo_item_${idx}`}
                  value={combo.buyItem}
                  placeholder="Select item (buy 1 get 1 free)"
                  onChange={(val) => {
                    updateBogoItem(idx, "buyItem", val);
                    updateBogoItem(idx, "freeItem", val);
                  }}
                />
              </div>
              {combo.buyItem && (
                <span className="text-xs text-indigo-500 flex-shrink-0 font-medium whitespace-nowrap">
                  Buy 1 → Free 1
                </span>
              )}
              {bogoItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBogoItem(idx)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove combo"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addBogoItem}
            disabled={itemOfferNeedsRestaurant || menuOptions.length === 0}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            + Add Another Combo
          </button>
        </div>
      );
    }

    if (formData.offerType === "BUY_X_GET_Y") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Buy Product Category" hint="Filter the buy item list by category">
            <CategorySelect name="buyCategory" value={formData.rules.buyCategory} />
          </Field>
          <Field label="Buy Product" required>
            <MenuSelect name="buyItem" value={formData.rules.buyItem} placeholder="Select buy item" category={formData.rules.buyCategory} />
          </Field>
          <Field label="Quantity Required" required>
            <input type="number" name="buyQuantity" value={formData.rules.buyQuantity} onChange={handleRuleChange} min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
          <Field label="Free Product Category" hint="Filter the free item list by category">
            <CategorySelect name="freeCategory" value={formData.rules.freeCategory} />
          </Field>
          <Field label="Free Product" required>
            <MenuSelect name="freeItem" value={formData.rules.freeItem} placeholder="Select free item" category={formData.rules.freeCategory} />
          </Field>
          <Field label="Free Quantity" required>
            <input type="number" name="freeQuantity" value={formData.rules.freeQuantity} onChange={handleRuleChange} min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
        </div>
      );
    }

    if (formData.offerType === "FREE_ITEM_CART_VALUE") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Minimum Cart Amount" required>
            <input type="number" name="minimumCartAmount" value={formData.rules.minimumCartAmount} onChange={handleRuleChange} min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
          <Field label="Free Item Category" hint="Filter the free item list by category">
            <CategorySelect name="freeCategory" value={formData.rules.freeCategory} />
          </Field>
          <Field label="Free Item" required>
            <MenuSelect name="freeItem" value={formData.rules.freeItem} placeholder="Select free item" category={formData.rules.freeCategory} />
          </Field>
          <Field label="Quantity" required>
            <input type="number" name="freeQuantity" value={formData.rules.freeQuantity} onChange={handleRuleChange} min="1" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
          </Field>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Trigger Category" required>
          <select name="triggerCategory" value={formData.rules.triggerCategory} onChange={handleRuleChange} disabled={itemOfferNeedsRestaurant} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white disabled:bg-gray-100 disabled:text-gray-400">
            <option value="">{itemOfferNeedsRestaurant ? "Select restaurant first" : "Select category"}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Free Item Category" hint="Filter the free item list by category">
          <CategorySelect name="freeCategory" value={formData.rules.freeCategory} />
        </Field>
        <Field label="Free Item" required>
          <MenuSelect name="freeItem" value={formData.rules.freeItem} placeholder="Select free item" category={formData.rules.freeCategory} />
        </Field>
      </div>
    );
  };

  if (fetchingData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-indigo-500" size={36} />
          <p className="mt-4 text-gray-600">Loading offer setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50/80 min-h-screen">
      <button onClick={() => navigate("/offers")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ChevronLeft size={18} />
        Back to Offers
      </button>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Create Offer</h1>
        <p className="text-sm text-gray-500 mt-1">{restaurantAdmin ? "Restaurant offers are submitted for Zenzio approval" : "Create restaurant-specific or platform-wide campaigns"}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Tag size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Offer Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Offer Name" required>
                <input name="title" value={formData.title} onChange={handleChange} placeholder="Weekend Special" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
              <Field label="Offer Code" required>
                <input name="offerCode" value={formData.offerCode} onChange={handleChange} placeholder="WEEKEND50" className="w-full px-4 py-2 border border-gray-200 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
              <Field label="Offer Type" required>
                <SearchableSelect
                  options={OFFER_TYPES.filter((type) => !restaurantAdmin || type.value !== "PLATFORM_CAMPAIGN")}
                  value={formData.offerType}
                  onChange={(val) => val && handleChange({ target: { name: "offerType", value: val, type: "select", checked: false } })}
                  placeholder="Select offer type…"
                />
              </Field>
              <Field label="Restaurant" hint={restaurantAdmin ? "Locked to your restaurant" : "Leave empty for platform-wide offer"}>
                {restaurantAdmin ? (
                  <input value={ownRestaurantUid || "Own Restaurant"} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500" />
                ) : (
                  <SearchableSelect
                    options={restaurants.map((r) => ({ label: getRestaurantName(r), value: r.uid || r.id }))}
                    value={formData.restaurantId}
                    onChange={(val) => handleChange({ target: { name: "restaurantId", value: val ?? "", type: "select", checked: false } })}
                    placeholder="Search restaurant…"
                    emptyLabel="All Restaurants (platform-wide)"
                  />
                )}
              </Field>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Gift size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Discount Logic</h2>
            </div>
            {renderRuleFields()}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Menu Applicability</h2>
            </div>
            <div className="space-y-4">
              <Field label="Offer Scope" hint="Control which menu items this offer applies to">
                <select
                  value={formData.offer_scope}
                  onChange={(e) => setFormData((prev) => ({ ...prev, offer_scope: e.target.value, included_category_ids: e.target.value === "SELECTED_CATEGORIES" ? [...categoryOptions] : [], included_menu_ids: [] }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white"
                >
                  <option value="ALL_MENU">Entire Menu</option>
                  <option value="SELECTED_CATEGORIES">Selected Categories Only</option>
                  <option value="SELECTED_ITEMS">Selected Menu Items Only</option>
                </select>
              </Field>

              {formData.offer_scope === "SELECTED_CATEGORIES" && (
                <Field label="Included Categories" required hint="Offer applies only to items in these categories">
                  <MultiSelectDropdown
                    options={categorySelectOptions}
                    selected={formData.included_category_ids}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, included_category_ids: vals }))}
                    placeholder="Select categories…"
                    disabled={menuOptions.length === 0}
                  />
                </Field>
              )}

              {formData.offer_scope === "SELECTED_ITEMS" && (
                <Field label="Included Menu Items" required hint="Offer applies only to these specific items">
                  <MultiSelectDropdown
                    options={menuSelectOptions}
                    selected={formData.included_menu_ids}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, included_menu_ids: vals }))}
                    placeholder="Search and select items…"
                    disabled={menuOptions.length === 0}
                  />
                </Field>
              )}

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Exclusion Rules</span>
                  <span className="text-xs text-gray-400">Optional — remove specific items from offer eligibility</span>
                </div>
                <Field label="Excluded Categories" hint="Items in these categories will be skipped even if the offer applies">
                  <MultiSelectDropdown
                    options={categorySelectOptions}
                    selected={formData.excluded_category_ids}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, excluded_category_ids: vals }))}
                    placeholder="e.g. Starters, Beverages…"
                    disabled={menuOptions.length === 0}
                  />
                </Field>
                <Field label="Excluded Menu Items" hint="These specific items will never receive the discount">
                  <MultiSelectDropdown
                    options={menuSelectOptions}
                    selected={formData.excluded_menu_ids}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, excluded_menu_ids: vals }))}
                    placeholder="e.g. French Fries, Coke…"
                    disabled={menuOptions.length === 0}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Lifecycle</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Start Date" required>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
              <Field label="End Date" required>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
              <Field label="Start Time">
                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
              <Field label="End Time">
                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
              </Field>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Offer Description">
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Briefly describe the offer" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 resize-none" />
            </Field>
            <Field label="Terms & Conditions">
              <textarea name="termsConditions" value={formData.termsConditions} onChange={handleChange} rows={4} placeholder="One condition per line" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 resize-none" />
            </Field>
          </section>

          <section>
            <Field label="Offer Image">
              <label className="flex items-center justify-center gap-2 px-4 py-5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                <ImagePlus size={18} />
                Upload offer banner
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </Field>
          </section>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
              <RotateCcw size={15} />
              Reset
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {restaurantAdmin ? "Submit for Approval" : "Save Offer"}
            </button>
          </div>
        </form>

        <aside className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-fit sticky top-6">
          <h3 className="font-semibold text-gray-900 mb-4">Offer Preview</h3>
          {imagePreview ? (
            <img src={imagePreview} alt="Offer preview" className="w-full h-40 object-cover rounded-xl border border-gray-100 mb-4" />
          ) : (
            <div className="w-full h-40 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
              <ImagePlus size={36} />
            </div>
          )}
          <div className="space-y-3">
            <div>
              <p className="text-lg font-bold text-gray-900">{formData.title || "Weekend Special"}</p>
              <p className="text-xs text-gray-400">{formData.offerCode || "OFFER CODE"}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Store size={14} className="text-gray-400" />
              {selectedRestaurantName}
            </div>
            <div className="bg-indigo-50 text-indigo-700 rounded-lg p-3">
              <p className="text-xs font-medium">{selectedType}</p>
              <p className="text-xl font-bold">
                {["PERCENTAGE_DISCOUNT", "FIXED_AMOUNT_DISCOUNT", "FESTIVAL_OFFER", "PLATFORM_CAMPAIGN"].includes(formData.offerType)
                  ? `${formData.discountValue || 0}${formData.offerType === "PERCENTAGE_DISCOUNT" ? "%" : "₹"} OFF`
                  : "Free item reward"}
              </p>
              {formData.offerType === "BUY_ONE_GET_ONE" ? (
                bogoItems.map((combo, idx) => {
                  const name = buildItemSnapshot(combo.buyItem)?.name;
                  return name ? (
                    <p key={idx} className="text-xs mt-1">Buy 1 {name} → Get 1 Free</p>
                  ) : null;
                })
              ) : (
                <>
                  {selectedBuyItemName && <p className="text-xs mt-1">Buy: {selectedBuyItemName}</p>}
                  {selectedFreeItemName && <p className="text-xs mt-1">Free: {selectedFreeItemName}</p>}
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Valid: {formData.startDate || "-"} to {formData.endDate || "-"}
            </div>
            <div className="text-xs text-gray-500">
              Created by: {restaurantAdmin ? "Restaurant Admin" : "Zenzio Admin"}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OfferConfiguration;
