





import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, Upload, X,
    UtensilsCrossed, IndianRupee, Tag,
    FileText, ImageIcon, CheckCircle, ChevronDown, Search, Plus, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllRestaurants, createMenuByAdminWithImage, createMenuForRestaurant, uploadMenuImages, getAllCuisineCategories } from '../../services/api';
import { getCurrentRestaurantUid, isRestaurantAdmin } from '../../utils/auth';
import {
    createEmptyMenuVariant,
    prepareMenuVariantsForSubmit,
    isCountUnit,
} from '../../utils/menuVariants';

const AddMenu = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const topRef = useRef(null);
    const restaurantAdmin = isRestaurantAdmin();
    const ownRestaurantUid = getCurrentRestaurantUid();


    const preSelectedRestaurant = searchParams.get('restaurant');
    const preSelectedName = searchParams.get('name');
    const lockedRestaurantUid = restaurantAdmin ? ownRestaurantUid : preSelectedRestaurant;
    const decodedPreSelectedName = preSelectedName ? decodeURIComponent(preSelectedName) : '';

    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cuisines, setCuisines] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [restaurantSearch, setRestaurantSearch] = useState('');
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);
    const [mealDropdownOpen, setMealDropdownOpen] = useState(false);
    const [variants, setVariants] = useState([]);

    const mealOptions = [
        { key: 'breakfast', label: 'Breakfast' },
        { key: 'lunch', label: 'Lunch' },
        { key: 'snacks', label: 'Snacks' },
        { key: 'dinner', label: 'Dinner' },
    ];

    const defaultMealAvailability = {
        breakfast: true,
        lunch: true,
        snacks: true,
        dinner: true,
    };

    const [formData, setFormData] = useState({
        restaurant_uid: lockedRestaurantUid || '',
        menu_name: '',
        price: '',
        discount: '',
        description: '',
        category: '',
        food_type: 'Veg',
        cuisine_type: '',
        isActive: true,
        meal_availability: defaultMealAvailability,
    });

    const foodTypes = ['Veg', 'Non-Veg', 'Vegan', 'Egg'];
    // cuisineTypes now fetched dynamically from API using getAllCuisineCategories
    // Filter items with fatherId=0 and name='Cuisine', then get children items
    // const cuisineTypes = ['Indian', 'South Indian', 'North Indian', 'Chinese', 'Italian', 'Mexican', 'Continental', 'Thai', 'Japanese', 'Mediterranean', 'American',
    //     'International',
    //     'Indo-Chinese',
    //     'Indian fusion',
    //     'Seafood', 'Other'];

    useEffect(() => {
        fetchRestaurants();
        fetchCategoriesAndCuisines();
    }, []);

    useEffect(() => {
        if (!lockedRestaurantUid) return;
        setFormData(prev => (
            prev.restaurant_uid === lockedRestaurantUid
                ? prev
                : { ...prev, restaurant_uid: lockedRestaurantUid }
        ));
    }, [lockedRestaurantUid]);

    const fetchRestaurants = async () => {
        if (restaurantAdmin) {
            setRestaurants(ownRestaurantUid ? [{ uid: ownRestaurantUid, name: decodedPreSelectedName || 'Your Restaurant' }] : []);
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


            const formattedRestaurants = restaurantData.map(r => ({
                uid: r.uid,
                name: r.profile?.restaurant_name || r.restaurant_name || r.name || `Restaurant ${r.uid?.substring(0, 8) || 'Unknown'}`
            })).filter(r => r.uid).sort((a, b) => a.name.localeCompare(b.name));

            setRestaurants(formattedRestaurants);
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        }
    };

    const fetchCategoriesAndCuisines = async () => {
        try {
            setIsLoading(true);
            const response = await getAllCuisineCategories();
            const allItems = response.data?.data || response.data || [];

            const categoryParent = allItems
                .find((item) => item.father_id === 0 && item.name === 'Category');
            const cuisineParent = allItems
                .find((item) => item.father_id === 0 && item.name === 'Cuisine');
            
            if (!categoryParent || !cuisineParent) {
                console.warn('Category or Cuisine parent not found in enum items');
                setIsLoading(false);
                return;
            }

            const categoriesData = allItems
                .filter((item) => item.father_id === categoryParent.id)
                .map(item => item.name);
            
            const cuisinesData = allItems
                .filter((item) => item.father_id === cuisineParent.id)
                .map(item => item.name);

            setCategories(categoriesData);
            setCuisines(cuisinesData);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to fetch categories and cuisines:', error);
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        setImageFile(null);
    };

    const addVariant = () => {
        setVariants(prev => [...prev, createEmptyMenuVariant()]);
    };

    const updateVariant = (index, field, value) => {
        setVariants(prev => prev.map((variant, currentIndex) => {
            if (currentIndex !== index) return variant;
            return { ...variant, [field]: value };
            if (false) {
                // Portion units have no quantity input — set to 1 internally
                // Switching away from portion → clear quantity so user enters it
            }
        }));
    };

    const removeVariant = (index) => {
        setVariants(prev => prev.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleMealAvailabilityChange = (mealKey) => {
        setFormData(prev => ({
            ...prev,
            meal_availability: {
                ...defaultMealAvailability,
                ...(prev.meal_availability || {}),
                [mealKey]: !(prev.meal_availability?.[mealKey] ?? true),
            },
        }));
    };

    const getMealAvailabilityLabel = () => {
        const selectedMeals = mealOptions
            .filter(meal => formData.meal_availability?.[meal.key] !== false)
            .map(meal => meal.label);

        if (selectedMeals.length === mealOptions.length) return 'All day';
        if (selectedMeals.length === 0) return 'No meal slots selected';
        return selectedMeals.join(', ');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.restaurant_uid) {
            toast.error('Please select a restaurant');
            return;
        }

        let variantPayload = [];
        try {
            variantPayload = prepareMenuVariantsForSubmit(variants);
        } catch (error) {
            toast.error(error.message);
            return;
        }

        const fallbackPrice = variantPayload[0]?.price || '';

        if (!formData.menu_name || (!formData.price && !fallbackPrice)) {
            toast.error('Please fill in the required fields');
            return;
        }

        try {
            setLoading(true);
            let createdMenuUid = null;


            if (restaurantAdmin) {
                const response = await createMenuForRestaurant({
                    menu_name: formData.menu_name,
                    price: formData.price ? parseFloat(formData.price) : fallbackPrice,
                    discount: formData.discount ? parseInt(formData.discount) : 0,
                    description: formData.description || '',
                    category: formData.category || '',
                    food_type: formData.food_type || 'Veg',
                    cuisine_type: formData.cuisine_type || '',
                    isActive: formData.isActive,
                    is_available: true,
                    meal_availability: {
                        ...defaultMealAvailability,
                        ...(formData.meal_availability || {}),
                    },
                    variants: variantPayload,
                });
                const createdMenu = response.data?.data?.restaurant_menu || response.data?.restaurant_menu || response.data?.data || response.data;
                createdMenuUid = createdMenu?.menu_uid;
                if (imageFile && createdMenuUid) {
                    await uploadMenuImages(createdMenuUid, [imageFile]);
                }
            } else {
                const submitData = new FormData();
                submitData.append('restaurant_uid', formData.restaurant_uid);
                submitData.append('menu_name', formData.menu_name);
                submitData.append('price', formData.price ? parseFloat(formData.price) : fallbackPrice);
                submitData.append('discount', formData.discount ? parseInt(formData.discount) : 0);
                submitData.append('description', formData.description || '');
                submitData.append('category', formData.category || '');
                submitData.append('food_type', formData.food_type || 'Veg');
                submitData.append('cuisine_type', formData.cuisine_type || '');
                submitData.append('isActive', formData.isActive ? '1' : '0');
                submitData.append('meal_availability', JSON.stringify({
                    ...defaultMealAvailability,
                    ...(formData.meal_availability || {}),
                }));
                submitData.append('variants', JSON.stringify(variantPayload));

                if (imageFile) {
                    submitData.append('files', imageFile);
                }

                const response = await createMenuByAdminWithImage(submitData);
                const createdMenu = response.data?.data?.restaurant_menu || response.data?.restaurant_menu || response.data?.data || response.data;
                createdMenuUid = createdMenu?.menu_uid;
            }
            toast.success('Menu item added successfully');
            navigate(getMenuListPath(formData.restaurant_uid), {
                replace: true,
                state: {
                    selectedRestaurant: formData.restaurant_uid,
                    selectedRestaurantName,
                    updatedMenuUid: createdMenuUid || undefined,
                },
            });

        } catch (error) {
            console.error('Failed to create menu:', error);
            toast.error('Failed to create menu item: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const selectedRestaurant = restaurants.find(restaurant => restaurant.uid === formData.restaurant_uid);
    const selectedRestaurantName = selectedRestaurant?.name || decodedPreSelectedName || (restaurantAdmin ? 'Your Restaurant' : 'Selected Restaurant');
    const hasRestaurantSelected = Boolean(formData.restaurant_uid);
    const isRestaurantLocked = Boolean(lockedRestaurantUid);
    const getMenuListPath = (restaurantUid = formData.restaurant_uid) => (
        restaurantUid ? `/menu?restaurant=${encodeURIComponent(restaurantUid)}` : '/menu'
    );
    const getBackPath = () => {
        if (restaurantAdmin) return getMenuListPath(ownRestaurantUid);
        if (preSelectedRestaurant) return getMenuListPath(preSelectedRestaurant);
        return getMenuListPath(formData.restaurant_uid);
    };

    const filteredRestaurants = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
    );

    if (restaurantAdmin && !ownRestaurantUid) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="bg-white border border-amber-200 rounded-xl p-6 text-amber-800">
                    Restaurant access is not linked to your account yet. Please contact Zenzio support.
                </div>
            </div>
        );
    }

    return (
        <div ref={topRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            { }
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(getBackPath())}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Add Menu Item</h1>
                                {hasRestaurantSelected ? (
                                    <p className="text-sm text-gray-500">Adding to <span className="text-red-600 font-medium">{selectedRestaurantName}</span></p>
                                ) : (
                                    <p className="text-sm text-gray-500">Choose a restaurant first, then enter the item details</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            { }
            <div className="max-w-5xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    { }
                    {!isRestaurantLocked ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <UtensilsCrossed className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Select Restaurant</h2>
                                    <p className="text-sm text-gray-500">Choose which restaurant this menu item belongs to</p>
                                </div>
                            </div>

                            { }
                            <div className="relative z-50">
                                <button
                                    type="button"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                >
                                    <span className={`text-base ${formData.restaurant_uid ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {formData.restaurant_uid
                                            ? selectedRestaurantName
                                            : '-- Select Restaurant --'}
                                    </span>
                                    <ChevronDown size={20} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setDropdownOpen(false)}
                                        ></div>
                                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                                            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search restaurants..."
                                                        value={restaurantSearch}
                                                        onChange={(e) => setRestaurantSearch(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {filteredRestaurants.length === 0 ? (
                                                    <div className="px-4 py-3 text-gray-500 text-sm text-center">No restaurants found</div>
                                                ) : (
                                                    filteredRestaurants.map(restaurant => (
                                                        <div
                                                            key={restaurant.uid}
                                                            className={`px-4 py-3 hover:bg-red-50 cursor-pointer text-base border-b border-gray-50 last:border-0 ${formData.restaurant_uid === restaurant.uid ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, restaurant_uid: restaurant.uid }));
                                                                setDropdownOpen(false);
                                                                setRestaurantSearch('');
                                                            }}
                                                        >
                                                            {restaurant.name}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Restaurant Selected</h2>
                                    <p className="text-sm text-green-700 font-medium">{selectedRestaurantName}</p>
                                    <p className="text-xs text-green-600/80 mt-0.5">This item will be saved only under this restaurant.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${!hasRestaurantSelected ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                                <p className="text-sm text-gray-500">
                                    {hasRestaurantSelected ? `Fill details for ${selectedRestaurantName}` : 'Select a restaurant to start filling item details'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Menu Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="menu_name"
                                    value={formData.menu_name}
                                    onChange={handleChange}
                                    required
                                    disabled={!hasRestaurantSelected}
                                    placeholder="e.g., Chicken Biryani"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                { }
                                <div className="relative z-40">
                                    <button
                                        type="button"
                                        disabled={!hasRestaurantSelected}
                                        onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-left disabled:cursor-not-allowed"
                                    >
                                        <span className={`text-base ${formData.category ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {formData.category || 'Select Category'}
                                        </span>
                                        <ChevronDown size={20} className={`text-gray-500 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {categoryDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-30"
                                                onClick={() => setCategoryDropdownOpen(false)}
                                            ></div>
                                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-[250px] overflow-y-auto z-40">
                                                {isLoading ? (
                                                    <div className="px-4 py-3 text-gray-500 text-sm text-center">Loading categories...</div>
                                                ) : (
                                                    categories.map((cat, index) => (
                                                        <div
                                                            key={index}
                                                            className={`px-4 py-3 hover:bg-red-50 cursor-pointer text-base border-b border-gray-50 last:border-0 ${formData.category === cat ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, category: cat }));
                                                                setCategoryDropdownOpen(false);
                                                            }}
                                                        >
                                                            {cat}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Food Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {foodTypes.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            disabled={!hasRestaurantSelected}
                                            onClick={() => setFormData(prev => ({ ...prev, food_type: type }))}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed ${formData.food_type === type
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cuisine Type
                                </label>
                                { }
                                <div className="relative z-30">
                                    <button
                                        type="button"
                                        disabled={!hasRestaurantSelected}
                                        onClick={() => setCuisineDropdownOpen(!cuisineDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-left disabled:cursor-not-allowed"
                                    >
                                        <span className={`text-base ${formData.cuisine_type ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {formData.cuisine_type || 'Select Cuisine'}
                                        </span>
                                        <ChevronDown size={20} className={`text-gray-500 transition-transform ${cuisineDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {cuisineDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-20"
                                                onClick={() => setCuisineDropdownOpen(false)}
                                            ></div>
                                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-[250px] overflow-y-auto z-30">
                                                {isLoading ? (
                                                    <div className="px-4 py-3 text-gray-500 text-sm text-center">Loading cuisines...</div>
                                                ) : (
                                                    cuisines.map((cuisine, index) => (
                                                        <div
                                                            key={index}
                                                            className={`px-4 py-3 hover:bg-red-50 cursor-pointer text-base border-b border-gray-50 last:border-0 ${formData.cuisine_type === cuisine ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'}`}
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, cuisine_type: cuisine }));
                                                                setCuisineDropdownOpen(false);
                                                            }}
                                                        >
                                                            {cuisine}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                disabled={!hasRestaurantSelected}
                                placeholder="Describe the dish, ingredients, preparation style..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <IndianRupee className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
                                <p className="text-sm text-gray-500">Set the price and discount</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price (Rs.) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        disabled={!hasRestaurantSelected}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Discount (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="discount"
                                        value={formData.discount}
                                        onChange={handleChange}
                                        disabled={!hasRestaurantSelected}
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:cursor-not-allowed"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                                    <Tag className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
                                    <p className="text-sm text-gray-500">Add quantity, unit, and price options</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addVariant}
                                disabled={!hasRestaurantSelected}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} />
                                Add Variant
                            </button>
                        </div>

                        {variants.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                                No variants added. The menu will use the base price until variants are configured.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {variants.map((variant, index) => {
                                    const isCount = isCountUnit(variant.unit);
                                    return (
                                    <div key={index} className="grid grid-cols-1 gap-3 items-end rounded-xl border border-gray-200 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit / Size</label>
                                            <input
                                                type="text"
                                                value={variant.unit}
                                                onChange={(e) => updateVariant(index, 'unit', e.target.value)}
                                                placeholder="e.g. Small, Half, 250 ml, Bowl"
                                                maxLength={50}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                required
                                            />
                                        </div>
                                        {/* Quantity — hidden for portion units */}
                                        <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {isCount ? 'Count (pcs)' : 'Quantity'}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={variant.quantity}
                                                    onChange={(e) => updateVariant(index, 'quantity', e.target.value)}
                                                    min="0"
                                                    step={isCount ? '1' : '0.001'}
                                                    placeholder={isCount ? '6' : '250'}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                    required
                                                />
                                            </div>
                                        {/* Price */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Price (Rs.)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                                                <input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="100"
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeVariant(index)}
                                            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                            aria-label="Delete variant"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Menu Image</h2>
                                <p className="text-sm text-gray-500">Add an appetizing photo of the dish (uploaded to cloud)</p>
                            </div>
                        </div>

                        {imagePreview ? (
                            <div className="relative w-full max-w-md">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-400 hover:bg-red-50/50 transition-all ${hasRestaurantSelected ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">Click to upload image</span>
                                <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={!hasRestaurantSelected}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <Tag className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Meal Availability</h2>
                                <p className="text-sm text-gray-500">Choose when this item can be ordered</p>
                            </div>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                disabled={!hasRestaurantSelected}
                                onClick={() => setMealDropdownOpen(!mealDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-left disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="text-base text-gray-900">{getMealAvailabilityLabel()}</span>
                                <ChevronDown size={20} className={`text-gray-500 transition-transform ${mealDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {mealDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setMealDropdownOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                                        {mealOptions.map((meal) => (
                                            <label
                                                key={meal.key}
                                                className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <span className="text-sm font-medium text-gray-700">{meal.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.meal_availability?.[meal.key] !== false}
                                                    onChange={() => handleMealAvailabilityChange(meal.key)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                    <Tag className="w-5 h-5 text-yellow-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Status</h2>
                                    <p className="text-sm text-gray-500">Set menu item availability</p>
                                </div>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    disabled={!hasRestaurantSelected}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                <span className="ml-3 text-sm font-medium text-gray-700">
                                    {formData.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </label>
                        </div>
                    </div>

                    { }
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(getBackPath())}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !hasRestaurantSelected}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Create Menu Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMenu;
