const BLOB_BASE_URL = 'https://zenziostorage.blob.core.windows.net/zenzio-s3-bucket';
const BLOB_SAS_TOKEN = import.meta.env.VITE_BLOB_SAS_TOKEN || '';

const MENU_BLOB_URL = `${BLOB_BASE_URL}/images/menu/`;
const RESTAURANT_BLOB_URL = `${BLOB_BASE_URL}/documents/restaurant/`;
const RESTAURANT_LOGO_BLOB_URL = `${BLOB_BASE_URL}/images/restaurant/`;

export const getImageUrl = (image, type = null) => {
  if (!image) return null;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (type === 'restaurant') {
    return `${RESTAURANT_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;
  }

  if (type === 'menu') {
    return `${MENU_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;
  }

  const finalUrl = image.includes('restaurant')
    ? `${RESTAURANT_BLOB_URL}${image}${BLOB_SAS_TOKEN}`
    : `${MENU_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;

  return finalUrl;
};

export const getRestaurantImageUrl = (image) => {
  if (!image) return null;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${RESTAURANT_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;
};

export const getRestaurantLogoUrl = (image) => {
  if (!image) return null;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${RESTAURANT_LOGO_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;
};

export const getMenuImageUrl = (image) => {
  if (!image) return null;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${MENU_BLOB_URL}${image}${BLOB_SAS_TOKEN}`;
};

export const getFirstImageUrl = (images, type = null) => {
  if (!images || !Array.isArray(images) || !images.length) return null;
  return getImageUrl(images[0], type);
};

export const getAllImageUrls = (images, type = null) => {
  if (!images || !Array.isArray(images)) return [];
  return images.map(img => getImageUrl(img, type)).filter(Boolean);
};

export const isValidImageUrl = (image) => {
  if (!image || typeof image !== 'string') return false;

  if (image.startsWith('http://') || image.startsWith('https://')) return true;

  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return exts.some(ext => image.toLowerCase().endsWith(ext));
};

export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' };

  const max = 5 * 1024 * 1024;
  if (file.size > max) return { valid: false, error: 'File must be < 5MB' };

  const types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!types.includes(file.type))
    return { valid: false, error: 'Only JPEG, PNG, GIF, WebP allowed' };

  return { valid: true, error: null };
};

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
  });

export const extractFilename = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.split('/').pop();
  }
  return url;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`;
};

export const getPlaceholderImage = (w = 200, h = 200) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect fill='%23e5e7eb' width='${w}' height='${h}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E`;
