import { User } from '../types';

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
  
  // Role normalization logic
  const normalizeRoleInternal = (role: string | undefined): string => {
    if (!role || typeof role !== 'string') return 'Employee';
    const roleLower = role.toLowerCase();
    if (roleLower === 'admin' || role === 'Owner') return 'Owner';
    if (roleLower.includes('sales') || roleLower.includes('manager') || roleLower.includes('assistant')) {
      return 'Employee';
    }
    if (roleLower === 'employee' || role === 'Employee') return 'Employee';
    return 'Employee';
  };

  return {
    ...userData, // Keep original fields
    id: userData.id,
    first_name,
    last_name,
    name: `${first_name} ${last_name}`.trim() || username,
    username,
    email: userData.email,
    role: normalizeRoleInternal(userData.role),
    phone: userData.phone || '',
    profile_photo: userData.profile_photo,
    avatar: userData.profile_photo || userData.avatar || getAvatarUrl(username),
    company: userData.company ? {
      id: typeof userData.company === 'object' ? userData.company.id : userData.company,
      name: userData.company_name || (typeof userData.company === 'object' ? userData.company.name : 'Unknown Company'),
      domain: userData.company_domain || (typeof userData.company === 'object' ? userData.company.domain : undefined),
      specialization: (userData.company_specialization || (typeof userData.company === 'object' ? userData.company.specialization : 'real_estate')) as 'real_estate' | 'services' | 'products',
    } : undefined,
    emailVerified: userData.email_verified || userData.is_email_verified || userData.emailVerified || false,
  };
};

