import React, { useState, useEffect } from 'react';
import { Supervisor } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { EyeIcon, EyeOffIcon } from '../../components/icons';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';

interface SupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupervisorFormData) => void;
  editingSupervisor?: Supervisor | null;
  isLoading?: boolean;
}

export interface SupervisorFormData {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  can_manage_leads: boolean;
  can_manage_deals: boolean;
  can_manage_tasks: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_manage_real_estate: boolean;
  can_manage_settings: boolean;
}

const PERMISSION_KEYS: (keyof Omit<SupervisorFormData, 'username' | 'email' | 'password' | 'first_name' | 'last_name' | 'phone' | 'is_active'>)[] = [
  'can_manage_leads',
  'can_manage_deals',
  'can_manage_tasks',
  'can_view_reports',
  'can_manage_users',
  'can_manage_products',
  'can_manage_services',
  'can_manage_real_estate',
  'can_manage_settings',
];

const INVENTORY_PERM_KEYS: (keyof SupervisorFormData)[] = ['can_manage_products', 'can_manage_services', 'can_manage_real_estate'];

function getInventoryPermissionForSpecialization(spec: string | undefined): keyof SupervisorFormData | null {
  if (!spec) return null;
  if (spec === 'real_estate') return 'can_manage_real_estate';
  if (spec === 'products') return 'can_manage_products';
  if (spec === 'services') return 'can_manage_services';
  return null;
}

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
  </label>
);

function validatePhone(phone: string, t: (key: any) => string): string | null {
  if (!phone.trim()) {
    return t('phoneRequired') || 'Phone is required';
  }
  if (!phone.startsWith('+')) {
    return t('invalidPhoneFormat') || 'Phone number must include country code (e.g., +964...)';
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return t('invalidPhoneLength') || 'Phone number is too short';
  }
  if (digitsOnly.length > 15) {
    return t('invalidPhoneLength') || 'Phone number is too long';
  }
  return null;
}

export const SupervisorModal: React.FC<SupervisorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSupervisor,
  isLoading = false,
}) => {
  const { t, language, currentUser } = useAppContext();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const specialization = currentUser?.company?.specialization;
  const allowedInventoryKey = getInventoryPermissionForSpecialization(specialization);
  const permissionKeysToShow = PERMISSION_KEYS.filter((key) => {
    if (INVENTORY_PERM_KEYS.includes(key)) return key === allowedInventoryKey;
    return true;
  });
  const [formData, setFormData] = useState<SupervisorFormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_active: true,
    can_manage_leads: false,
    can_manage_deals: false,
    can_manage_tasks: false,
    can_view_reports: false,
    can_manage_users: false,
    can_manage_products: false,
    can_manage_services: false,
    can_manage_real_estate: false,
    can_manage_settings: false,
  });

  useEffect(() => {
    setErrors({});
    if (editingSupervisor) {
      setFormData({
        username: editingSupervisor.user.username,
        email: editingSupervisor.user.email,
        password: '',
        first_name: editingSupervisor.user.first_name,
        last_name: editingSupervisor.user.last_name,
        phone: editingSupervisor.user.phone || '',
        is_active: editingSupervisor.is_active,
        can_manage_leads: editingSupervisor.can_manage_leads,
        can_manage_deals: editingSupervisor.can_manage_deals,
        can_manage_tasks: editingSupervisor.can_manage_tasks,
        can_view_reports: editingSupervisor.can_view_reports,
        can_manage_users: editingSupervisor.can_manage_users,
        can_manage_products: editingSupervisor.can_manage_products,
        can_manage_services: editingSupervisor.can_manage_services,
        can_manage_real_estate: editingSupervisor.can_manage_real_estate,
        can_manage_settings: editingSupervisor.can_manage_settings,
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        is_active: true,
        can_manage_leads: false,
        can_manage_deals: false,
        can_manage_tasks: false,
        can_view_reports: false,
        can_manage_users: false,
        can_manage_products: false,
        can_manage_services: false,
        can_manage_real_estate: false,
        can_manage_settings: false,
      });
    }
  }, [editingSupervisor, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const first = formData.first_name.trim();
    if (!first) {
      newErrors.first_name = t('firstNameRequired') || 'First name is required';
    } else if (first.length < 2) {
      newErrors.first_name = t('nameMinLength') || 'Name must be at least 2 characters';
    }

    if (!editingSupervisor) {
      if (!formData.username.trim()) {
        newErrors.username = t('usernameRequired') || 'Username is required';
      } else if (formData.username.trim().length < 3) {
        newErrors.username = t('usernameMinLength') || 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
        newErrors.username = t('usernameInvalidChars') || 'Username can only contain letters, numbers, and underscores';
      }
      if (!formData.email.trim()) {
        newErrors.email = t('emailRequired') || 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = t('invalidEmail') || 'Invalid email format';
      }
      const pw = formData.password || '';
      if (!pw.trim()) {
        newErrors.password = t('passwordRequired') || 'Password is required';
      } else if (pw.length < 8) {
        newErrors.password = t('passwordMinLength') || 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(pw)) {
        newErrors.password = t('passwordComplexity') || 'Password must contain at least one letter and one number';
      }
    }

    const phoneErr = validatePhone(formData.phone, t);
    if (phoneErr) newErrors.phone = phoneErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!editingSupervisor && !formData.password) return;
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePhoneChange = (value: string) => {
    if (errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const permLabelKey: Record<string, string> = {
    can_manage_leads: 'supervisorsPermCanManageLeads',
    can_manage_deals: 'supervisorsPermCanManageDeals',
    can_manage_tasks: 'supervisorsPermCanManageTasks',
    can_view_reports: 'supervisorsPermCanViewReports',
    can_manage_users: 'supervisorsPermCanManageUsers',
    can_manage_products: 'supervisorsPermCanManageProducts',
    can_manage_services: 'supervisorsPermCanManageServices',
    can_manage_real_estate: 'supervisorsPermCanManageRealEstate',
    can_manage_settings: 'supervisorsPermCanManageSettings',
  };

  const formDir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingSupervisor ? t('supervisorsEdit') : t('supervisorsAdd')}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" dir={formDir}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supervisor-first-name">{t('firstName')} *</Label>
              <Input
                id="supervisor-first-name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <Label htmlFor="supervisor-last-name">{t('lastName')}</Label>
              <Input
                id="supervisor-last-name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="supervisor-username">{t('username')} *</Label>
            <Input
              id="supervisor-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={!!editingSupervisor}
              className={editingSupervisor ? 'opacity-60' : ''}
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>
          <div>
            <Label htmlFor="supervisor-email">{t('email')} *</Label>
            <Input
              id="supervisor-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!!editingSupervisor}
              className={editingSupervisor ? 'opacity-60' : ''}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="supervisor-phone">{t('phone')} *</Label>
            <PhoneInput
              id="supervisor-phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder={t('enterPhone') || 'Enter phone number'}
              error={!!errors.phone}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          {!editingSupervisor && (
            <div>
              <Label htmlFor="supervisor-password">{t('password')} *</Label>
              <div className="relative">
                <Input
                  id="supervisor-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password || ''}
                  onChange={handleChange}
                  className="pe-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                name="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={handleChange}
                className="rounded"
                disabled={editingSupervisor?.user?.is_active === false}
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('supervisorsCrmAccess')}
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ps-6">
              {t('supervisorsCrmAccessHint')}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('supervisorsPermissions')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permissionKeysToShow.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <input name={key} type="checkbox" checked={formData[key]} onChange={handleChange} className="rounded" />
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t((permLabelKey[key] || 'supervisorsPermissions') as any)}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300">
              {t('cancel')}
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
              {isLoading ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
