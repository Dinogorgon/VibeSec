/**
 * Get the base API URL with proper protocol validation
 * Ensures the URL always has a protocol and no trailing slashes
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // In production, if VITE_API_URL is not set, use relative URLs (Netlify proxy)
  if (import.meta.env.PROD && !envUrl) {
    return ''; // Empty string = relative URL, will use Netlify proxy
  }
  
  const defaultUrl = 'http://localhost:3000';
  
  if (!envUrl) {
    if (import.meta.env.DEV) {
      console.log('[API URL] Using default URL:', defaultUrl);
    }
    return defaultUrl;
  }
  
  // Remove trailing slashes
  let url = envUrl.trim().replace(/\/+$/, '');
  
  // Add protocol if missing
  if (!url.match(/^https?:\/\//i)) {
    // Default to https in production, http in development
    const protocol = import.meta.env.PROD ? 'https://' : 'http://';
    url = protocol + url;
    if (import.meta.env.DEV) {
      console.warn('[API URL] Missing protocol, added:', protocol);
    }
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    console.error('[API URL] Invalid URL format:', envUrl, 'falling back to default');
    return defaultUrl;
  }
  
  if (import.meta.env.DEV) {
    console.log('[API URL] Using:', url);
  }
  
  return url;
}

/**
 * Get a full API URL for a given path
 * @param path - API path (e.g., '/api/auth/github')
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If baseUrl is empty (relative URL), just return the path
  if (!baseUrl) {
    return normalizedPath;
  }
  
  return `${baseUrl}${normalizedPath}`;
}

