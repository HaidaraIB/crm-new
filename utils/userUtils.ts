import { User } from '../types';
import { normalizeRole } from './roles';

// Default avatar generator
export const getAvatarUrl = (username?: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=random`;
};

// User data normalization helper
export const normalizeUser = (userData: any): User => {
  if (!userData) return userData;
  
  const first_name = userData.first_name || '';
  const last_name = userData.last_name || '';
  const username = userData.username || userData.email?.split('@')[0] || 'user';
  
  return {
    ...userData, // Keep original fields
    id: userData.id,
    first_name,
    last_name,
    name: `${first_name} ${last_name}`.trim() || username,
    username,
    email: userData.email,
    role: normalizeRole(userData.role),
    phone: userData.phone || '',
    profile_photo: userData.profile_photo,
    avatar: userData.profile_photo || userData.avatar || getAvatarUrl(username),
    company: userData.company ? {
      id: typeof userData.company === 'object' ? userData.company.id : userData.company,
      name: userData.company_name || (typeof userData.company === 'object' ? userData.company.name : 'Unknown Company'),
      domain: userData.company_domain || (typeof userData.company === 'object' ? userData.company.domain : undefined),
      specialization: (userData.company_specialization || (typeof userData.company === 'object' ? userData.company.specialization : 'real_estate')) as 'real_estate' | 'services' | 'products',
      timezone: typeof userData.company === 'object'
        ? (userData.company.timezone ?? 'UTC')
        : (userData.company_timezone as string | undefined) ?? 'UTC',
      auto_assign_enabled: typeof userData.company === 'object' ? (userData.company.auto_assign_enabled ?? false) : false,
      auto_assign_algorithm: typeof userData.company === 'object'
        ? (userData.company.auto_assign_algorithm ?? 'least_busy')
        : 'least_busy',
      re_assign_enabled: typeof userData.company === 'object' ? (userData.company.re_assign_enabled ?? false) : false,
      re_assign_hours: typeof userData.company === 'object' ? (userData.company.re_assign_hours ?? 24) : 24,
      field_visit_enabled: typeof userData.company === 'object'
        ? (userData.company.field_visit_enabled ?? true)
        : true,
      field_visit_allowed: typeof userData.company === 'object'
        ? (userData.company.field_visit_allowed ?? true)
        : true,
      field_visit_admin_allowed: typeof userData.company === 'object'
        ? (userData.company.field_visit_admin_allowed ?? true)
        : true,
      field_visit_admin_message: typeof userData.company === 'object'
        ? (userData.company.field_visit_admin_message ?? '')
        : '',
      subscription: typeof userData.company === 'object' ? userData.company.subscription : undefined,
    } : undefined,
    emailVerified: userData.email_verified || userData.is_email_verified || userData.emailVerified || false,
    supervisor_permissions: userData.supervisor_permissions ?? undefined,
    language: (userData.language === 'ar' || userData.language === 'en') ? userData.language : undefined,
    last_seen_at: userData.last_seen_at ?? null,
    last_seen_source: userData.last_seen_source ?? 'unknown',
    is_online: Boolean(userData.is_online),
    weekly_day_off:
      'weekly_day_off' in userData && userData.weekly_day_off !== undefined
        ? userData.weekly_day_off === null
          ? null
          : Number(userData.weekly_day_off)
        : undefined,
    can_delete_clients: Boolean(userData.can_delete_clients),
    is_company_owner: userData.is_company_owner ?? userData.isCompanyOwner,
    isCompanyOwner: userData.is_company_owner ?? userData.isCompanyOwner,
    login_two_factor_enabled:
      userData.login_two_factor_enabled ?? userData.loginTwoFactorEnabled ?? true,
    loginTwoFactorEnabled:
      userData.login_two_factor_enabled ?? userData.loginTwoFactorEnabled ?? true,
  };
};

