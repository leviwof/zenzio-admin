// ==============================================
// FILE: src/utils/imageUtils.js
// 🔥 FIXED: Handles both full URLs and filenames
// ✅ ADDED: Restaurant Logo URL support
// ==============================================

// 🚀 S3 BASE URLS
const MENU_S3_URL = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/menu/';
const RESTAURANT_S3_URL = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/documents/restaurant/';
const RESTAURANT_LOGO_S3_URL = 'https://zenzio-s3-bucket.s3.ap-south-1.amazonaws.com/images/restaurant/'; // ✅ NEW

// ==============================================
// 🌐 URL GENERATORS
// ==============================================

/**
 * Get full URL of any image.
 * Auto-detects menu/restaurant by path or explicit type.
 * @param {string} image - Image file/URL
 * @param {'menu'|'restaurant'} [type] - Optional forced type
 * @returns {string|null}
 */
export const getImageUrl = (image, type = null) => {
  if (!image) return null;

  // Already valid http/https URL - return as-is
  if (image.startsWith('http://') || image.startsWith('https://')) {
    console.log('🔗 Full URL detected:', image);
    return image;
  }

  // Explicit type passed
  if (type === 'restaurant') {
    console.log('🏪 Restaurant image:', RESTAURANT_S3_URL + image);
    return `${RESTAURANT_S3_URL}${image}`;
  }

  if (type === 'menu') {
    console.log('🍔 Menu image:', MENU_S3_URL + image);
    return `${MENU_S3_URL}${image}`;
  }

  // Auto detect based on name/path
  const finalUrl = image.includes('restaurant')
    ? `${RESTAURANT_S3_URL}${image}`
    : `${MENU_S3_URL}${image}`;

  console.log('🔍 Auto-detected:', finalUrl);
  return finalUrl;
};

/**
 * Shortcut for restaurant images (documents)
 */
export const getRestaurantImageUrl = (image) => {
  if (!image) return null;

  // If it's already a full URL, return it
  if (image.startsWith('http://') || image.startsWith('https://')) {
    console.log('✅ Restaurant full URL:', image);
    return image;
  }

  // Otherwise prepend S3 URL
  const url = `${RESTAURANT_S3_URL}${image}`;
  console.log('✅ Restaurant S3 URL:', url);
  return url;
};

/**
 * ✅ NEW: Shortcut for restaurant logo images
 */
export const getRestaurantLogoUrl = (image) => {
  if (!image) return null;

  // If it's already a full URL, return it
  if (image.startsWith('http://') || image.startsWith('https://')) {
    console.log('✅ Restaurant Logo full URL:', image);
    return image;
  }

  // Otherwise prepend S3 URL
  const url = `${RESTAURANT_LOGO_S3_URL}${image}`;
  console.log('✅ Restaurant Logo S3 URL:', url);
  return url;
};

/**
 * Shortcut for menu images
 */
export const getMenuImageUrl = (image) => {
  if (!image) return null;

  // If it's already a full URL, return it
  if (image.startsWith('http://') || image.startsWith('https://')) {
    console.log('✅ Menu full URL:', image);
    return image;
  }

  // Otherwise prepend S3 URL
  const url = `${MENU_S3_URL}${image}`;
  console.log('✅ Menu S3 URL:', url);
  return url;
};

// ==============================================
// 📌 ARRAY HELPERS
// ==============================================

export const getFirstImageUrl = (images, type = null) => {
  if (!images || !Array.isArray(images) || !images.length) return null;
  return getImageUrl(images[0], type);
};

export const getAllImageUrls = (images, type = null) => {
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => getImageUrl(img, type)).filter(Boolean);
};

// ==============================================
// 🔍 VALIDATION + FILE OPERATIONS
// ==============================================

export const isValidImageUrl = (image) => {
  if (!image || typeof image !== 'string') return false;

  if (image.startsWith('http://') || image.startsWith('https://')) return true;

  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return exts.some(ext => image.toLowerCase().endsWith(ext));
};

/**
 * Validate uploaded file
 */
export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' };

  const max = 5 * 1024 * 1024; // 5MB max
  if (file.size > max) return { valid: false, error: 'File must be < 5MB' };

  const types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!types.includes(file.type))
    return { valid: false, error: 'Only JPEG, PNG, GIF, WebP allowed' };

  return { valid: true, error: null };
};

/**
 * Convert file to Base64
 */
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
  });

/**
 * Extract filename from full URL
 */
export const extractFilename = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.split('/').pop();
  }
  return url;
};

/**
 * Nice size formatter (UI display)
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`;
};

// ==============================================
// 🖼️ FALLBACK PLACEHOLDERS
// ==============================================

export const getPlaceholderImage = (w = 200, h = 200) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect fill='%23e5e7eb' width='${w}' height='${h}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E`;