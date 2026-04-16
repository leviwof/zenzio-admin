import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { getBanners, uploadBanner, deleteBanner } from '../../services/api';
import toast from 'react-hot-toast';

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await getBanners();
            setBanners(response.data);
        } catch (error) {
            console.error('Error fetching banners:', error);
            toast.error('Failed to load banners');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size should be less than 5MB');
                return;
            }
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select an image first');
            return;
        }

        if (banners.length >= 3) {
            toast.error('Maximum 3 banners allowed. Delete one to add more.');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('image', selectedFile);

            await uploadBanner(formData);
            toast.success('Banner uploaded successfully');
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchBanners();
        } catch (error) {
            console.error('Error uploading banner:', error);
            toast.error(error.response?.data?.message || 'Failed to upload banner');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;

        try {
            await deleteBanner(id);
            toast.success('Banner deleted successfully');
            fetchBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            toast.error('Failed to delete banner');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Home Screen Banners</h1>
                    <p className="text-gray-600">Manage the promotional slider images for the user app (Max 3).</p>
                </header>

                {/* Upload Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-red-500" />
                        Add New Banner
                    </h2>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-full md:w-1/2">
                            <label
                                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                  ${previewUrl ? 'border-red-200 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="h-40 object-contain rounded-md" />
                                    ) : (
                                        <>
                                            <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-gray-400">PNG, JPG or JPEG (Max. 5MB)</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>

                        <div className="w-full md:w-1/2 space-y-4">
                            <div className="p-4 bg-orange-50 rounded-lg flex gap-3 text-orange-700 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>Upload high-quality images with an aspect ratio of approximately 3:1 (e.g., 1200x400) for best appearance.</p>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={uploading || !selectedFile || banners.length >= 3}
                                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                  ${uploading || !selectedFile || banners.length >= 3
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg'}`}
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                {uploading ? 'Uploading...' : 'Upload Banner'}
                            </button>

                            {banners.length >= 3 && (
                                <p className="text-xs text-red-500 text-center font-medium">
                                    Maximum limit reached. Remove an existing banner to add a new one.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Banners List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-semibold text-gray-800">Active Banners ({banners.length}/3)</h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-500" />
                                <p>Loading banners...</p>
                            </div>
                        ) : banners.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No banners uploaded yet. Add your first banner above.</p>
                            </div>
                        ) : (
                            banners.map((banner, index) => (
                                <div key={banner.id} className="p-6 flex items-center gap-6 group hover:bg-gray-50 transition-colors">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-medium">
                                        {index + 1}
                                    </div>

                                    <div className="flex-1">
                                        <img
                                            src={banner.imageUrl}
                                            alt={`Banner ${banner.id}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm transition-transform group-hover:scale-[1.01]"
                                        />
                                    </div>

                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            Active
                                        </span>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete banner"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BannerManagement;
