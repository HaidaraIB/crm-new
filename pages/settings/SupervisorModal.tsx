import React, { useState, useEffect } from 'react';
import { Supervisor } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { EyeIcon, EyeOffIcon } from '../../components/icons';

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

const PERMISSION_KEYS: (keyof Omit<SupervisorFormData, 'username' | 'email' | 'password' | 'first_name' | 'last_name' | 'is_active'>)[] = [
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

export const SupervisorModal: React.FC<SupervisorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSupervisor,
  isLoading = false,
}) => {
  const { t, language, currentUser } = useAppContext();
  const [showPassword, setShowPassword] = useState(false);
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
    if (editingSupervisor) {
      setFormData({
        username: editingSupervisor.user.username,
        email: editingSupervisor.user.email,
        password: '',
        first_name: editingSupervisor.user.first_name,
        last_name: editingSupervisor.user.last_name,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupervisor && !formData.password) return;
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('firstName')}</label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('lastName')}</label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('username')}</label>
            <input name="username" value={formData.username} onChange={handleChange} required disabled={!!editingSupervisor} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('email')}</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!!editingSupervisor} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-60" />
          </div>
          {!editingSupervisor && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('password')}</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password || ''} onChange={handleChange} required className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <button type="button" className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} className="rounded" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('active')}</label>
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
