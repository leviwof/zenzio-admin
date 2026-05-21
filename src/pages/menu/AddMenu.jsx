





import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, Upload, X, Plus,
    UtensilsCrossed, IndianRupee, Percent, Tag,
    FileText, ImageIcon, CheckCircle, ChevronDown, Search
} from 'lucide-react';
import { getAllRestaurants, createMenuByAdminWithImage, getMenuCategories, getAllCuisineCategories } from '../../services/api';

const AddMenu = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const topRef = useRef(null);


    const preSelectedRestaurant = searchParams.get('restaurant');
    const preSelectedName = searchParams.get('name');

    const [loading, setLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cuisines, setCuisines] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isRestaurantLocked, setIsRestaurantLocked] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [restaurantSearch, setRestaurantSearch] = useState('');
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);
    const [foodTypeDropdownOpen, setFoodTypeDropdownOpen] = useState(false);

    const [formData, setFormData] = useState({
        restaurant_uid: preSelectedRestaurant || '',
        menu_name: '',
        price: '',
        discount: '',
        description: '',
        category: '',
        food_type: 'Veg',
        cuisine_type: '',
        isActive: true,
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


        if (preSelectedRestaurant) {
            setIsRestaurantLocked(true);
        }
    }, [preSelectedRestaurant]);

    const fetchRestaurants = async () => {
        try {
            const response = await getAllRestaurants({ limit: 500 });
            console.log('📤 Full restaurants response:', response.data);


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

            console.log('📥 Restaurants loaded:', formattedRestaurants.length);
            console.log('📋 Sample restaurant:', formattedRestaurants[0]);
            setRestaurants(formattedRestaurants);
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
        }
    };

    const fetchCategoriesAndCuisines = async () => {
        try {
            setIsLoading(true);
            // Fetch all enum items (categories and cuisines with fatherId structure)
            const response = await getAllCuisineCategories();
            const allItems = response.data?.data || response.data || [];
            
            console.log('📥 All enum items received:', allItems);
            
            // Filter parent items with fatherId = 0
            const categoryParent = allItems
                .find((item) => item.father_id === 0 && item.name === 'Category');
            const cuisineParent = allItems
                .find((item) => item.father_id === 0 && item.name === 'Cuisine');
            
            if (!categoryParent || !cuisineParent) {
                console.warn('⚠️ Category or Cuisine parent not found in enum items');
                setIsLoading(false);
                return;
            }
            
            console.log('📋 Category Parent ID:', categoryParent.id);
            console.log('📋 Cuisine Parent ID:', cuisineParent.id);
            
            // Filter child items by fatherId
            const categoriesData = allItems
                .filter((item) => item.father_id === categoryParent.id)
                .map(item => item.name);
            
            const cuisinesData = allItems
                .filter((item) => item.father_id === cuisineParent.id)
                .map(item => item.name);
            
            console.log('📥 Categories loaded:', categoriesData);
            console.log('📥 Cuisines loaded:', cuisinesData);
            
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.restaurant_uid) {
            alert('Please select a restaurant');
            return;
        }

        if (!formData.menu_name || !formData.price) {
            alert('Please fill in required fields');
            return;
        }

        try {
            setLoading(true);


            const submitData = new FormData();
            submitData.append('restaurant_uid', formData.restaurant_uid);
            submitData.append('menu_name', formData.menu_name);
            submitData.append('price', parseFloat(formData.price));
            submitData.append('discount', formData.discount ? parseInt(formData.discount) : 0);
            submitData.append('description', formData.description || '');
            submitData.append('category', formData.category || '');
            submitData.append('food_type', formData.food_type || 'Veg');
            submitData.append('cuisine_type', formData.cuisine_type || '');
            submitData.append('isActive', formData.isActive ? '1' : '0');


            if (imageFile) {
                submitData.append('files', imageFile);
            }

            await createMenuByAdminWithImage(submitData);
            setSuccessMessage('Menu item added successfully!');
            
            // Scroll to top using ref
            if (topRef.current) {
                topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Reset form but keep restaurant selected
            setFormData(prev => ({
                restaurant_uid: prev.restaurant_uid,
                menu_name: '',
                price: '',
                discount: '',
                description: '',
                category: '',
                food_type: 'Veg',
                cuisine_type: '',
                isActive: true,
            }));
            
            // Clear image
            setImagePreview(null);
            setImageFile(null);
            
            // Show success message for 3 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);

        } catch (error) {
            console.error('Failed to create menu:', error);
            alert('Failed to create menu item: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getBackPath = () => {
        if (preSelectedRestaurant) {
            return `/restaurants/${preSelectedRestaurant}`;
        }
        return '/menu';
    };

    const filteredRestaurants = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
    );

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
                                {preSelectedName ? (
                                    <p className="text-sm text-gray-500">Adding to <span className="text-red-600 font-medium">{decodeURIComponent(preSelectedName)}</span></p>
                                ) : (
                                    <p className="text-sm text-gray-500">Add a new dish to any restaurant's menu</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            { }
            <div className="max-w-5xl mx-auto px-6 py-8">
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">{successMessage}</span>
                    </div>
                )}
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
                                            ? (restaurants.find(r => r.uid === formData.restaurant_uid)?.name || 'Selected Restaurant')
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
                                    <p className="text-sm text-green-700 font-medium">{decodeURIComponent(preSelectedName || 'Restaurant')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                                <p className="text-sm text-gray-500">Enter the menu item details</p>
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
                                    placeholder="e.g., Chicken Biryani"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                                        onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-left"
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
                                            onClick={() => setFormData(prev => ({ ...prev, food_type: type }))}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${formData.food_type === type
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
                                        onClick={() => setCuisineDropdownOpen(!cuisineDropdownOpen)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-left"
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
                                placeholder="Describe the dish, ingredients, preparation style..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
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
                                    Price (₹) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                                        min="0"
                                        max="100"
                                        placeholder="0"
                                        className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
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
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all">
                                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">Click to upload image</span>
                                <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        )}
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
                            disabled={loading}
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
