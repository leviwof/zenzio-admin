import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Upload, Download, Loader2, CheckCircle,
    AlertCircle, Search, ChevronDown, UtensilsCrossed, FileSpreadsheet
} from 'lucide-react';
import { getAllRestaurants, bulkUploadMenu, downloadMenuTemplate } from '../../services/api';

const BulkUploadMenu = () => {
    const navigate = useNavigate();
    const topRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    
    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [restaurantSearch, setRestaurantSearch] = useState('');
    
    const [formData, setFormData] = useState({
        restaurant_uid: '',
        file: null
    });
    
    const [uploadResult, setUploadResult] = useState(null);

    useEffect(() => {
        fetchRestaurants();
    }, []);

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

    const handleDownloadTemplate = async () => {
        try {
            setDownloading(true);
            const response = await downloadMenuTemplate();
            
            // Create a blob from the response
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            
            // Create temporary link to trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'menu_upload_template.xlsx');
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download template:', error);
            alert('Failed to download template. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (fileExt !== 'xlsx' && fileExt !== 'csv') {
                alert('Only Excel (.xlsx) and CSV (.csv) files are allowed.');
                e.target.value = null;
                return;
            }
            setFormData(prev => ({ ...prev, file }));
            setUploadResult(null); // Reset previous results on new file select
        }
    };

    const removeFile = () => {
        setFormData(prev => ({ ...prev, file: null }));
        setUploadResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.restaurant_uid) {
            alert('Please select a restaurant first.');
            return;
        }

        if (!formData.file) {
            alert('Please attach an Excel or CSV file.');
            return;
        }

        try {
            setLoading(true);
            setUploadResult(null);

            const submitData = new FormData();
            submitData.append('restaurant_uid', formData.restaurant_uid);
            submitData.append('file', formData.file);

            const response = await bulkUploadMenu(submitData);
            
            setUploadResult({
                success: true,
                created: response.data.data.created,
                failed_count: response.data.data.failed_count,
                failed_rows: response.data.data.failed_rows,
                message: response.data.message
            });
            
            if (response.data.data.failed_count === 0) {
                // Clear file on full success
                setFormData(prev => ({ ...prev, file: null }));
            }
            
            if (topRef.current) {
                topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } catch (error) {
            console.error('Bulk upload failed:', error);
            setUploadResult({
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to upload menu items.'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredRestaurants = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
    );

    return (
        <div ref={topRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/menu')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Bulk Menu Upload</h1>
                                <p className="text-sm text-gray-500">Fastest way to onboard hundreds of menu items</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            disabled={downloading}
                            className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                        >
                            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Download Template
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {uploadResult && uploadResult.success && (
                    <div className={`mb-6 p-4 border rounded-xl flex flex-col gap-2 ${uploadResult.failed_count === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                        <div className="flex items-center gap-3 font-medium">
                            {uploadResult.failed_count === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span>{uploadResult.message}</span>
                        </div>
                        {uploadResult.failed_count > 0 && (
                            <div className="mt-2 bg-white rounded-lg border border-yellow-200 p-4 max-h-60 overflow-auto">
                                <h4 className="text-sm font-semibold mb-2">Errors in your file:</h4>
                                <ul className="text-sm space-y-2">
                                    {uploadResult.failed_rows.map((err, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="font-medium text-red-600 min-w-[60px]">Row {err.row}:</span>
                                            <span className="text-gray-700">{err.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                {uploadResult && !uploadResult.success && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-700 font-medium">{uploadResult.message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Restaurant Selector */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <UtensilsCrossed className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Select Restaurant</h2>
                                <p className="text-sm text-gray-500">Menu items will be added to this restaurant</p>
                            </div>
                        </div>

                        <div className="relative z-50">
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                            >
                                <span className={`${formData.restaurant_uid ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {formData.restaurant_uid
                                        ? (restaurants.find(r => r.uid === formData.restaurant_uid)?.name || 'Selected Restaurant')
                                        : '-- Select Target Restaurant --'}
                                </span>
                                <ChevronDown size={20} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                                        <div className="p-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
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

                    {/* File Upload Area */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Upload Spreadsheet</h2>
                                <p className="text-sm text-gray-500">Must be an Excel (.xlsx) or CSV (.csv) file</p>
                            </div>
                        </div>

                        {formData.file ? (
                            <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="font-semibold text-green-800">{formData.file.name}</p>
                                        <p className="text-xs text-green-600 font-medium">
                                            {(formData.file.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Remove File
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all">
                                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="font-medium text-gray-700 mb-1">Click to select an Excel or CSV file</span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Supports: .xlsx, .csv</span>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                        
                        <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">Important Instructions:</h4>
                            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                <li><strong>Menu Name</strong> and <strong>Price</strong> are strictly required.</li>
                                <li>Do not modify the column headers from the template.</li>
                                <li>Only 1 worksheet (the first tab) will be scanned.</li>
                                <li>Images cannot be uploaded in bulk — edit items later to add photos.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/menu')}
                            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors mr-3"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.file || !formData.restaurant_uid}
                            className={`px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-lg flex items-center gap-2 transition-all
                                ${(loading || !formData.file || !formData.restaurant_uid)
                                    ? 'opacity-50 cursor-not-allowed border-red-300' 
                                    : 'hover:from-red-600 hover:to-red-700 hover:shadow-red-500/30 border border-transparent'}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing Upload...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    Start Bulk Import
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkUploadMenu;
