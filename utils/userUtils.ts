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
      auto_assign_enabled: typeof userData.company === 'object' ? (userData.company.auto_assign_enabled ?? false) : false,
      re_assign_enabled: typeof userData.company === 'object' ? (userData.company.re_assign_enabled ?? false) : false,
      re_assign_hours: typeof userData.company === 'object' ? (userData.company.re_assign_hours ?? 24) : 24,
      subscription: typeof userData.company === 'object' ? userData.company.subscription : undefined,
    } : undefined,
    emailVerified: userData.email_verified || userData.is_email_verified || userData.emailVerified || false,
    supervisor_permissions: userData.supervisor_permissions ?? undefined,
    language: (userData.language === 'ar' || userData.language === 'en') ? userData.language : undefined,
  };
};

