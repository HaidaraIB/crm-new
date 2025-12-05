/**
 * Get the base domain (main domain without subdomain)
 * Example: company.example.com -> example.com
 */
export const getBaseDomain = (): string => {
  const hostname = window.location.hostname;
  // If localhost or IP, return as is
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }
  
  // Get base domain from environment variable or extract from hostname
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
 * Get company route path (only for subdomain, no path-based routing)
 */
export const getCompanyRoute = (companyName?: string, companyDomain?: string, page?: string): string => {
  // Always use simple paths - subdomain handles the routing
  return page && page !== 'Dashboard' ? `/${page.toLowerCase()}` : '/';
};

/**
 * Get company subdomain URL
 */
export const getCompanySubdomainUrl = (companyDomain: string, page?: string): string => {
  const baseDomain = getBaseDomain();
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  let path = '/';
  if (page && page !== 'Dashboard') {
    path = `/${page.toLowerCase()}`;
  }
  
  return `${protocol}//${companyDomain}.${baseDomain}${port}${path}`;
};

/**
 * Navigate to company route (subdomain only, no path-based routing)
 */
export const navigateToCompanyRoute = (companyName?: string, companyDomain?: string, page: string = 'Dashboard'): void => {
  // If company has domain and we're already on the subdomain, just update the path
  if (companyDomain && isOnSubdomain() && isSubdomainMatch(companyDomain)) {
    // We're already on the correct subdomain, just update the path
    const route = getCompanyRoute(companyName, companyDomain, page);
    window.history.replaceState({}, '', route);
    return;
  }
  
  // If company has domain but we're not on subdomain, redirect to subdomain
  if (companyDomain && !isOnSubdomain()) {
    const subdomainUrl = getCompanySubdomainUrl(companyDomain, page);
    window.location.href = subdomainUrl;
    return;
  }
  
  // If no domain, just update the path (for main domain)
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

