




import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, Upload, X,
    Calendar, Clock, Users, IndianRupee, FileText, ImageIcon, CheckCircle, PartyPopper
} from 'lucide-react';
import { getAllRestaurants, createEventByAdmin } from '../../services/api';

const AddEvent = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    
    const preSelectedRestaurant = searchParams.get('restaurant');
    const preSelectedName = searchParams.get('name');

    const [loading, setLoading] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isRestaurantLocked, setIsRestaurantLocked] = useState(false);

    const [formData, setFormData] = useState({
        restaurant_id: preSelectedRestaurant || '',
        name: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        price: '',
        capacity: '',
        max_persons: '1',
        image: ''
    });

    useEffect(() => {
        fetchRestaurants();

        if (preSelectedRestaurant) {
            setIsRestaurantLocked(true);
        }
    }, [preSelectedRestaurant]);

    const fetchRestaurants = async () => {
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData(prev => ({
                    ...prev,
                    image: reader.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        setFormData(prev => ({ ...prev, image: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.restaurant_id) {
            alert('Please select a restaurant');
            return;
        }

        if (!formData.name || !formData.date || !formData.startTime || !formData.endTime || !formData.price || !formData.capacity) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                capacity: parseInt(formData.capacity),
                max_persons: parseInt(formData.max_persons),
            };

            await createEventByAdmin(payload);
            setSuccess(true);

            setTimeout(() => {
                if (preSelectedRestaurant) {
                    navigate(`/restaurants/${preSelectedRestaurant}`);
                } else {
                    navigate('/bookings/approval');
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getBackPath = () => {
        if (preSelectedRestaurant) {
            return `/restaurants/${preSelectedRestaurant}`;
        }
        return '/bookings/approval';
    };

    
    const today = new Date().toISOString().split('T')[0];

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Created!</h2>
                    <p className="text-gray-600">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {}
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
                                <h1 className="text-2xl font-bold text-gray-900">Add Event</h1>
                                {preSelectedName ? (
                                    <p className="text-sm text-gray-500">Adding to <span className="text-purple-600 font-medium">{decodeURIComponent(preSelectedName)}</span></p>
                                ) : (
                                    <p className="text-sm text-gray-500">Create a new event for any restaurant</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {}
                    {!isRestaurantLocked ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <PartyPopper className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Select Restaurant</h2>
                                    <p className="text-sm text-gray-500">Choose which restaurant is hosting this event</p>
                                </div>
                            </div>

                            <select
                                name="restaurant_id"
                                value={formData.restaurant_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-gray-900"
                            >
                                <option value="">-- Select Restaurant --</option>
                                {restaurants.map(restaurant => (
                                    <option key={restaurant.uid} value={restaurant.uid}>
                                        {restaurant.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-sm border border-purple-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Restaurant Selected</h2>
                                    <p className="text-sm text-purple-700 font-medium">{decodeURIComponent(preSelectedName || 'Restaurant')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
                                <p className="text-sm text-gray-500">Enter the event information</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Event Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Live Music Night, Wine Tasting, Chef's Special Dinner"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Describe what makes this event special, what guests can expect..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>
                                <p className="text-sm text-gray-500">Schedule the event</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Calendar size={16} /> Event Date <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    min={today}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Clock size={16} /> Start Time <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Clock size={16} /> End Time <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <IndianRupee className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Capacity & Pricing</h2>
                                <p className="text-sm text-gray-500">Set limits and price</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Users size={16} /> Total Capacity <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    placeholder="e.g., 50"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Max Persons per Booking
                                </label>
                                <input
                                    type="number"
                                    name="max_persons"
                                    value={formData.max_persons}
                                    onChange={handleChange}
                                    min="1"
                                    placeholder="e.g., 10"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price per Person (₹) <span className="text-red-500">*</span>
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
                        </div>
                    </div>

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Event Banner</h2>
                                <p className="text-sm text-gray-500">Add an attractive banner image for the event</p>
                            </div>
                        </div>

                        {imagePreview ? (
                            <div className="relative w-full max-w-lg">
                                <img
                                    src={imagePreview}
                                    alt="Event Preview"
                                    className="w-full h-56 object-cover rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all">
                                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                <span className="text-sm text-gray-500 font-medium">Click to upload event banner</span>
                                <span className="text-xs text-gray-400 mt-1">Recommended: 1200x600 pixels, PNG or JPG</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {}
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
                                    Create Event
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEvent;
