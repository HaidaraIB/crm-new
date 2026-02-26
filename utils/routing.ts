/**
 * Get the base domain (app domain; company is subdomain).
 * For production (e.g. apple.dashboard.loop-crm.app) set VITE_BASE_DOMAIN=dashboard.loop-crm.app
 * so getCurrentSubdomain() returns "apple".
 */
export const getBaseDomain = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }
  const envBaseDomain = import.meta.env.VITE_BASE_DOMAIN;
  if (envBaseDomain) {
    return envBaseDomain;
  }
  
  // Try to extract base domain (assumes format: subdomain.example.com)
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Return last two parts (example.com)
    return parts.slice(-2).join('.');
  }
  
  return hostname;
};

/**
 * Get current subdomain from hostname
 * Example: company.example.com -> company
 * Example: memo.com.localhost -> memo.com
 */
export const getCurrentSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  
  // Handle localhost with subdomain (e.g., memo.com.localhost)
  if (hostname.includes('.localhost')) {
    const parts = hostname.split('.');
    const localhostIndex = parts.indexOf('localhost');
    if (localhostIndex > 0) {
      // Return everything before localhost as subdomain
      return parts.slice(0, localhostIndex).join('.');
    }
  }
  
  // If just localhost or IP, no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  
  const baseDomain = getBaseDomain();
  const baseDomainParts = baseDomain.split('.');
  const hostnameParts = hostname.split('.');
  
  // If hostname has more parts than base domain, extract subdomain
  if (hostnameParts.length > baseDomainParts.length) {
    const subdomainParts = hostnameParts.slice(0, hostnameParts.length - baseDomainParts.length);
    return subdomainParts.join('.');
  }
  
  return null;
};

/**
 * Check if we're on a subdomain
 */
export const isOnSubdomain = (): boolean => {
  return getCurrentSubdomain() !== null;
};

/**
 * Convert page name to URL path segment (e.g. "All Leads" -> "all-leads")
 */
const pageToPathSegment = (page: string): string => {
  return page.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/** Sanitize to subdomain-like slug (lowercase, hyphens, no spaces/special chars) */
const toSubdomainSlug = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Get company route path. Folder structure with subdomain (company domain) in path, not company name.
 * Example: /apple/dashboard, /apple/leads (apple = company.domain / subdomain value)
 */
export const getCompanyRoute = (companyName?: string, companyDomain?: string, page?: string): string => {
  const subdomainSlug = companyDomain ? toSubdomainSlug(companyDomain) : (companyName ? toSubdomainSlug(companyName) : '');
  const pagePath = page ? pageToPathSegment(page) : 'dashboard';
  if (!subdomainSlug) return `/${pagePath}`;
  return `/${subdomainSlug}/${pagePath}`;
};

/**
 * Get company subdomain URL (optional; for host-based subdomain if needed later)
 */
export const getCompanySubdomainUrl = (companyDomain: string, page?: string): string => {
  const baseDomain = getBaseDomain();
  const protocol = window.location.protocol;
  let port = '';
  const currentPort = window.location.port;
  if (currentPort && currentPort !== '80' && currentPort !== '443') port = `:${currentPort}`;
  const path = page ? `/${pageToPathSegment(page)}` : '/dashboard';
  const hostname = `${companyDomain}.${baseDomain}`;
  return `${protocol}//${hostname}${port}${path}`;
};

/**
 * Navigate to company route. Path stays folder-like: /subdomain/page (e.g. /apple/dashboard).
 */
export const navigateToCompanyRoute = (companyName?: string, companyDomain?: string, page: string = 'Dashboard'): void => {
  const route = getCompanyRoute(companyName, companyDomain, page);
  window.history.replaceState({}, '', route);
};

/**
 * Check if current subdomain matches company domain
 */
export const isSubdomainMatch = (companyDomain?: string): boolean => {
  if (!companyDomain) return false;
  const currentSubdomain = getCurrentSubdomain();
  return currentSubdomain === companyDomain;
};

/**
 * Extract company subdomain/slug from pathname (first path segment)
 * Example: /apple/dashboard -> apple
 */
export const extractCompanyFromPath = (pathname: string): string | null => {
  const pathParts = pathname.split('/').filter(part => part.length > 0);
  if (pathParts.length === 0) return null;
  
  // First part should be company name
  const companyPart = pathParts[0];
  
  // Check if it's a known route (not a company name)
  const knownRoutes = [
    'dashboard', 'leads', 'activities', 'properties', 'owners', 'services',
    'products', 'suppliers', 'deals', 'employees', 'users', 'marketing',
    'campaigns', 'todos', 'reports', 'integrations', 'twilio', 'settings', 'profile',
    'billing', 'payment', 'subscription', 'login', 'register', 'forgot-password',
    'reset-password', 'verify-email', '2fa', 'payment-success', 'change-plan',
    'create-lead', 'edit-lead', 'view-lead', 'create-deal',
    'terms-of-service', 'terms', 'privacy-policy', 'privacy', 'data-deletion-policy', 'data-deletion'
  ];
  
  // If first part is a known route, no company in path
  if (knownRoutes.includes(companyPart.toLowerCase())) {
    return null;
  }
  
  return companyPart;
};

/**
 * Extract page from pathname (removing company prefix if present)
 * Example: /company_name/dashboard -> dashboard
 * Example: /dashboard -> dashboard
 */
export const extractPageFromPath = (pathname: string): string => {
  const companyName = extractCompanyFromPath(pathname);
  const pathParts = pathname.split('/').filter(part => part.length > 0);
  
  if (companyName && pathParts.length > 1) {
    // Remove company name and get the rest
    return pathParts.slice(1).join('/');
  }
  
  // No company in path, return full path
  return pathParts.join('/') || 'dashboard';
};

