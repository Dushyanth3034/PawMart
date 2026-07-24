/**
 * Returns the full absolute URL for a product or pet image.
 * Prefixes relative upload paths (e.g. starting with "/uploads/")
 * with the backend server API host.
 * 
 * @param {string|null|undefined} url - The raw URL or path
 * @returns {string} The full absolute URL or fallback placeholder
 */
export const getFullImageUrl = (url) => {
  if (!url) return '/placeholder.svg';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  // Normalize double slashes if any
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const host = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
  return `${host}${cleanUrl}`;
};
