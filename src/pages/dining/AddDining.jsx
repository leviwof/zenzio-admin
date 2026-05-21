




import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, Upload, X,
    Armchair, Users, Clock, FileText, ImageIcon, CheckCircle
} from 'lucide-react';
import { getAllRestaurants, createDiningByAdmin } from '../../services/api';

const AddDining = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    
    const preSelectedRestaurant = searchParams.get('restaurant');
    const preSelectedName = searchParams.get('name');

    const [loading, setLoading] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [success, setSuccess] = useState(false);
    const [isRestaurantLocked, setIsRestaurantLocked] = useState(false);

    const [formData, setFormData] = useState({
        restaurantId: preSelectedRestaurant || '',
        areaName: '',
        seatingCapacity: '',
        description: '',
        startTime: '',
        endTime: '',
        photoUrls: []
    });

    const [timeError, setTimeError] = useState('');

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

    const convertTo12Hour = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
    };

    const formatBookingTimeSlot = (start, end) => {
        const startFormatted = convertTo12Hour(start);
        const endFormatted = convertTo12Hour(end);
        return `${startFormatted} - ${endFormatted}`;
    };

    const validateTimes = () => {
        if (!formData.startTime || !formData.endTime) {
            setTimeError('Please select both start and end times');
            return false;
        }
        if (formData.startTime >= formData.endTime) {
            setTimeError('End time must be after start time');
            return false;
        }
        setTimeError('');
        return true;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setTimeError('');
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
                setFormData(prev => ({
                    ...prev,
                    photoUrls: [...prev.photoUrls, reader.result]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({
            ...prev,
            photoUrls: prev.photoUrls.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.restaurantId) {
            alert('Please select a restaurant');
            return;
        }

        if (!formData.areaName || !formData.seatingCapacity) {
            alert('Please fill in required fields');
            return;
        }

        if (!validateTimes()) {
            return;
        }

        try {
            setLoading(true);

            const payload = {
                ...formData,
                seatingCapacity: parseInt(formData.seatingCapacity),
                bookingTimeSlot: formatBookingTimeSlot(formData.startTime, formData.endTime)
            };
            
            delete payload.startTime;
            delete payload.endTime;

            await createDiningByAdmin(payload);
            setSuccess(true);

            setTimeout(() => {
                if (preSelectedRestaurant) {
                    navigate(`/restaurants/${preSelectedRestaurant}`);
                } else {
                    navigate('/bookings/approval');
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to create dining space:', error);
            alert('Failed to create dining space: ' + (error.response?.data?.message || error.message));
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

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Dining Space Added!</h2>
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
                                <h1 className="text-2xl font-bold text-gray-900">Add Dining Space</h1>
                                {preSelectedName ? (
                                    <p className="text-sm text-gray-500">Adding to <span className="text-blue-600 font-medium">{decodeURIComponent(preSelectedName)}</span></p>
                                ) : (
                                    <p className="text-sm text-gray-500">Create a new dining area for any restaurant</p>
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
                                    <Armchair className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Select Restaurant</h2>
                                    <p className="text-sm text-gray-500">Choose which restaurant this dining space belongs to</p>
                                </div>
                            </div>

                            <select
                                name="restaurantId"
                                value={formData.restaurantId}
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
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-sm border border-blue-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Restaurant Selected</h2>
                                    <p className="text-sm text-blue-700 font-medium">{decodeURIComponent(preSelectedName || 'Restaurant')}</p>
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
                                <h2 className="text-lg font-semibold text-gray-900">Dining Area Details</h2>
                                <p className="text-sm text-gray-500">Enter the dining space information</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Area Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="areaName"
                                    value={formData.areaName}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Rooftop Terrace, Private Dining Room"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Users size={16} /> Seating Capacity <span className="text-red-500">*</span>
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    name="seatingCapacity"
                                    value={formData.seatingCapacity}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    placeholder="e.g., 20"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                />
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
                                placeholder="Describe the ambiance, features, view, etc..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                            />
                        </div>
                    </div>

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Booking Settings</h2>
                                <p className="text-sm text-gray-500">Configure booking time slots</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {timeError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{timeError}</p>
                                </div>
                            )}

                            {formData.startTime && formData.endTime && !timeError && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-700">
                                        <span className="font-medium">Booking slot:</span> {formatBookingTimeSlot(formData.startTime, formData.endTime)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Dining Space Photos</h2>
                                <p className="text-sm text-gray-500">Add photos of the dining area</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all">
                                <Upload className="w-8 h-8 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Add Photo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
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
                                    Create Dining Space
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDining;
