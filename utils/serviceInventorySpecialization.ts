/**
 * Service catalog (services, packages, providers) is enabled for `services`
 * and `medical` (خدمات طبية) tenants — same inventory subtree in the app.
 */
export function companyHasServiceInventory(specialization?: string | null): boolean {
  const s = String(specialization || '').toLowerCase();
  return s === 'services' || s === 'medical';
}
