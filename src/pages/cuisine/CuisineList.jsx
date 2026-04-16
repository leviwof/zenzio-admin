import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, Search, Filter, X, AlertCircle } from 'lucide-react';
import {
  getAllCuisineCategories,
  getCuisineGroups,
  getCuisineChildrenByParent,
  getCuisineByFatherId,
  createCuisineCategory,
  updateCuisineCategory,
  deleteCuisineCategory
} from '../../services/api';

const CuisineList = () => {
  const [view, setView] = useState('list');
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    father_id: 0,
    parent_id: 0
  });

  const [formErrors, setFormErrors] = useState({});


  useEffect(() => {
    console.log('🚀 Component mounted, fetching categories...');
    fetchCategories();
  }, []);


  useEffect(() => {
    console.log('🔍 Applying filters... categories:', categories.length, 'searchTerm:', searchTerm);
    applyFilters();
  }, [categories, searchTerm]);


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Calling getAllCuisineCategories API...');
      const response = await getAllCuisineCategories();

      console.log('📦 Raw API Response:', response);
      console.log('📦 response.data:', response.data);
      console.log('📦 response.data.data:', response.data?.data);


      const dataArray = response.data?.data || [];

      console.log('✅ Extracted dataArray:', dataArray);
      console.log('✅ Is Array?', Array.isArray(dataArray));
      console.log('✅ Array length:', dataArray.length);

      if (dataArray.length > 0) {
        console.log('✅ First item:', dataArray[0]);
      }


      setCategories(dataArray);
      setFilteredCategories(dataArray);
      setActiveFilter(null);

      console.log('✅ State updated! Categories set to:', dataArray.length, 'items');
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      setError(error.response?.data?.message || error.message || 'Failed to fetch categories');
      setCategories([]);
      setFilteredCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    console.log('🔍 Starting applyFilters... categories:', categories.length);

    let filtered = [...categories];

    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cat =>
        cat.name?.toLowerCase().includes(searchLower) ||
        cat.id?.toString().includes(searchTerm)
      );
      console.log('🔍 After search filter:', filtered.length);
    }

    console.log('🔍 Final filtered count:', filtered.length);
    setFilteredCategories(filtered);
  };

  const handleSpecialFilter = async (type, value) => {
    try {
      setLoading(true);
      setError(null);
      let response;

      console.log('🔍 Applying special filter:', type, value);

      switch (type) {
        case 'groups':
          response = await getCuisineGroups();
          setActiveFilter({ type: 'groups', label: 'Category Groups' });
          break;
        case 'byFather':
          response = await getCuisineByFatherId(value);
          setActiveFilter({ type: 'byFather', label: `Main Category: ${value}` });
          break;
        case 'byParent':
          response = await getCuisineChildrenByParent(value);
          setActiveFilter({ type: 'byParent', label: `Parent Category: ${value}` });
          break;
        default:
          await fetchCategories();
          return;
      }

      console.log('🔍 Filter response:', response);
      const dataArray = response.data?.data || [];
      console.log('🔍 Filter result array:', dataArray);

      setFilteredCategories(dataArray);
      setShowFilterPanel(false);
    } catch (error) {
      console.error('❌ Filter Error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to apply filter');
      setFilteredCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        father_id: parseInt(formData.father_id) || 0,
        parent_id: parseInt(formData.parent_id) || 0
      };


      console.log('📤 Submitting:', payload);

      let response;
      if (view === 'edit' && selectedCategory) {
        response = await updateCuisineCategory(selectedCategory.id, payload);
        alert('✅ Category updated successfully!');
      } else {
        response = await createCuisineCategory(payload);
        alert('✅ Category created successfully!');
      }

      console.log('✅ Submit response:', response.data);

      await fetchCategories();
      resetForm();
      setView('list');
    } catch (error) {
      console.error('❌ Submit Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save category';
      setError(errorMessage);
      alert('❌ Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    console.log('✏️ Editing category:', category);
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      father_id: category.father_id || 0,
      parent_id: category.parent_id || 0
    });
    setFormErrors({});
    setError(null);
    setView('edit');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🗑️ Deleting category:', id);

      const response = await deleteCuisineCategory(id);
      console.log('✅ Delete response:', response.data);

      alert('✅ Category deleted successfully!');
      await fetchCategories();
    } catch (error) {
      console.error('❌ Delete Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete category';
      setError(errorMessage);
      alert('❌ Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', father_id: 0, parent_id: 0 });
    setSelectedCategory(null);
    setFormErrors({});
    setError(null);
  };

  const getMainCategoryOptions = () => {
    return categories.filter(cat => cat.father_id === 0);
  };

  const getSubCategoryOptions = () => {
    if (formData.father_id === 0) return [];
    return categories.filter(cat =>
      cat.father_id === formData.father_id || cat.id === formData.father_id
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterValue('');
    setShowFilterPanel(false);
    setActiveFilter(null);
    fetchCategories();
  };

  const getCategoryType = (category) => {
    if (!category) return 'Unknown';
    const isRoot = category.father_id === 0 && category.parent_id === 0;
    const isGroup = category.father_id !== 0 && category.parent_id === 0;
    return isRoot ? 'Main Category' : isGroup ? 'Category Group' : 'Subcategory';
  };

  const getCategoryBadge = (category) => {
    const type = getCategoryType(category);
    const badges = {
      'Main Category': 'bg-purple-100 text-purple-700',
      'Category Group': 'bg-blue-100 text-blue-700',
      'Subcategory': 'bg-green-100 text-green-700',
      'Unknown': 'bg-gray-100 text-gray-700'
    };
    return badges[type] || badges['Unknown'];
  };


  console.log('🎨 Render - view:', view);
  console.log('🎨 Render - categories.length:', categories.length);
  console.log('🎨 Render - filteredCategories.length:', filteredCategories.length);
  console.log('🎨 Render - loading:', loading);




  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        { }
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Cuisine Categories</h1>
            <button
              onClick={() => {
                console.log('➕ Opening add form');
                resetForm();
                setView('add');
              }}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Add Cuisine
            </button>
          </div>
        </div>

        <div className="p-6">

          { }
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X size={18} />
              </button>
            </div>
          )}

          { }
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    console.log('🔍 Search changed:', e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilterPanel
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter size={18} />
                Filters
              </button>

              {(searchTerm || activeFilter) && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <X size={18} />
                  Clear
                </button>
              )}
            </div>

            {activeFilter && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filter:</span>
                <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                  {activeFilter.label}
                  <button onClick={clearAllFilters} className="hover:text-red-900">
                    <X size={14} />
                  </button>
                </span>
              </div>
            )}

            {showFilterPanel && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setFilterValue('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="groups">Category Groups</option>
                      <option value="byFather">By Main Category</option>
                      <option value="byParent">By Parent Category</option>
                    </select>
                  </div>

                  {(filterType === 'byFather' || filterType === 'byParent') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {filterType === 'byFather' ? 'Select Main Category' : 'Select Parent Category'}
                      </label>
                      <select
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Select Category</option>
                        {filterType === 'byFather'
                          ? [...new Set(categories.map(c => c.father_id))].sort((a, b) => a - b).map(id => (
                            <option key={id} value={id}>{id === 0 ? 'Root Level' : `Category ID: ${id}`}</option>
                          ))
                          : [...new Set(categories.map(c => c.parent_id))].sort((a, b) => a - b).map(id => (
                            <option key={id} value={id}>{id === 0 ? 'Root Level' : `Category ID: ${id}`}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        if (filterType === 'groups') {
                          handleSpecialFilter('groups');
                        } else if (filterType === 'byFather' && filterValue) {
                          handleSpecialFilter('byFather', filterValue);
                        } else if (filterType === 'byParent' && filterValue) {
                          handleSpecialFilter('byParent', filterValue);
                        } else if (filterType === 'all') {
                          fetchCategories();
                          setShowFilterPanel(false);
                        }
                      }}
                      disabled={loading || (!filterValue && filterType !== 'all' && filterType !== 'groups')}
                      className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          { }
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredCategories.length}</span> of <span className="font-semibold text-gray-900">{categories.length}</span> categories
            </p>
          </div>

          { }
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
                <p className="text-sm text-gray-500">Loading categories...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Search className="text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 text-sm">No categories found</p>
                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400 mt-2">Click "Add Cuisine" to create your first category</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCategories.map((category) => {
                      const typeLabel = getCategoryType(category);
                      const typeBadge = getCategoryBadge(category);

                      return (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{category.id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${typeBadge}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatDate(category.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {!['Category', 'Cuisine'].includes(category.name) && 
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(category)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(category.id)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }




  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => {
            resetForm();
            setView('list');
          }}
          className="flex items-center text-gray-700 hover:text-gray-900"
        >
          <ChevronLeft size={20} />
          <span className="ml-1 text-lg font-semibold">
            {view === 'edit' ? 'Edit Cuisine Category' : 'Add Cuisine Category'}
          </span>
        </button>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                }}
                placeholder="e.g., Indian, Chinese, North Indian"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.father_id}
                onChange={(e) => {
                  const newFatherId = parseInt(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    father_id: newFatherId,
                    parent_id: newFatherId === 0 ? 0 : formData.parent_id
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={0}>None (This is a Main Category)</option>
                {getMainCategoryOptions().map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select "None" if this is a top-level main category (e.g., Indian, Chinese)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Category <span className="text-red-500">*</span>
              </label>
              {formData.father_id === 0 ? (
                <>
                  <input
                    type="text"
                    value="None (Main Category)"
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Main categories don't have a parent
                  </p>
                </>
              ) : (
                <>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={formData.father_id}>
                      Same as Main (Create a Group)
                    </option>
                    {getSubCategoryOptions()
                      .filter(cat => cat.id !== formData.father_id)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    }
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select "Same as Main" to create a category group, or choose a different parent for subcategory
                  </p>
                </>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle size={16} />
                Understanding Category Structure
              </h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li><strong>Main Category:</strong> Top-level categories like "Indian", "Chinese", "Italian"</li>
                <li><strong>Category Group:</strong> Groups of related subcategories (e.g., Regional Indian cuisines)</li>
                <li><strong>Subcategory:</strong> Specific types under a main category (e.g., "North Indian" under "Indian")</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.name.trim()}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Saving...' : (view === 'edit' ? 'Update Category' : 'Create Category')}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setView('list');
                }}
                disabled={loading}
                className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CuisineList;