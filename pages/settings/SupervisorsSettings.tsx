import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Supervisor, User } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getSupervisorsAPI, createSupervisorAPI, updateSupervisorAPI, updateUserAPI, deleteSupervisorAPI, toggleSupervisorActiveAPI } from '../../services/api';
import { normalizeRole } from '../../utils/roles';
import { normalizeUser } from '../../utils/userUtils';
import { useReactivateEmployee } from '../../hooks/useQueries';
import { SupervisorModal, SupervisorFormData } from './SupervisorModal';
import { EditIcon, TrashIcon } from '../../components/icons';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { TableHorizontalScroll } from '../../components/TableHorizontalScroll';

export const SupervisorsSettings = () => {
  const queryClient = useQueryClient();
  const {
    t,
    currentUser,
    language,
    setSelectedUser,
    setIsDeactivateEmployeeModalOpen,
    setIsSuccessModalOpen,
    setSuccessMessage,
    isDeactivateEmployeeModalOpen,
  } = useAppContext();
  const reactivateMutation = useReactivateEmployee();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSupervisors = async () => {
    if (normalizeRole(currentUser?.role) !== 'Owner') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getSupervisorsAPI();
      const list = (res && (res as any).results) ? (res as any).results : Array.isArray(res) ? res : [];
      setSupervisors(list);
    } catch (e) {
      console.error('Error loading supervisors:', e);
      setSupervisors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSupervisors();
  }, [currentUser?.role]);

  const deactivateModalWasOpen = useRef(false);
  useEffect(() => {
    if (deactivateModalWasOpen.current && !isDeactivateEmployeeModalOpen) {
      void loadSupervisors();
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    }
    deactivateModalWasOpen.current = isDeactivateEmployeeModalOpen;
  }, [isDeactivateEmployeeModalOpen]);

  const handleOpenModal = (supervisor?: Supervisor) => {
    setEditingSupervisor(supervisor || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupervisor(null);
  };

  const handleSave = async (data: SupervisorFormData) => {
    setIsSaving(true);
    try {
      if (editingSupervisor) {
        await Promise.all([
          updateUserAPI(editingSupervisor.user.id, {
            first_name: data.first_name,
            last_name: data.last_name,
            phone: (data.phone || '').trim(),
          }),
          updateSupervisorAPI(editingSupervisor.id, {
            user_id: editingSupervisor.user.id,
            is_active: data.is_active,
            can_manage_leads: data.can_manage_leads,
            can_manage_deals: data.can_manage_deals,
            can_manage_tasks: data.can_manage_tasks,
            can_view_reports: data.can_view_reports,
            can_manage_users: data.can_manage_users,
            can_manage_products: data.can_manage_products,
            can_manage_services: data.can_manage_services,
            can_manage_real_estate: data.can_manage_real_estate,
            can_manage_settings: data.can_manage_settings,
            can_delete_clients: data.can_delete_clients,
          }),
        ]);
      } else {
        await createSupervisorAPI({
          username: data.username,
          email: data.email,
          password: data.password!,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: (data.phone || '').trim(),
          is_active: data.is_active,
          can_manage_leads: data.can_manage_leads,
          can_manage_deals: data.can_manage_deals,
          can_manage_tasks: data.can_manage_tasks,
          can_view_reports: data.can_view_reports,
          can_manage_users: data.can_manage_users,
          can_manage_products: data.can_manage_products,
          can_manage_services: data.can_manage_services,
          can_manage_real_estate: data.can_manage_real_estate,
          can_manage_settings: data.can_manage_settings,
          can_delete_clients: data.can_delete_clients,
          });
      }
      await loadSupervisors();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving supervisor:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (s: Supervisor) => {
    if (s.user?.is_active === false) return;
    try {
      await toggleSupervisorActiveAPI(s.id);
      await loadSupervisors();
    } catch (e) {
      console.error('Error toggling supervisor:', e);
    }
  };

  const supervisorToUser = (s: Supervisor): User =>
    normalizeUser({
      id: s.user.id,
      username: s.user.username,
      email: s.user.email,
      first_name: s.user.first_name,
      last_name: s.user.last_name,
      phone: s.user.phone,
      role: 'supervisor',
      is_active: s.user.is_active !== false,
    });

  const handleDeactivateSupervisor = (s: Supervisor) => {
    setSelectedUser(supervisorToUser(s));
    setIsDeactivateEmployeeModalOpen(true);
  };

  const handleReactivateSupervisor = async (s: Supervisor) => {
    try {
      await reactivateMutation.mutateAsync(s.user.id);
      setSuccessMessage(t('employeeReactivatedSuccessfully'));
      setIsSuccessModalOpen(true);
      await loadSupervisors();
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      console.error('Error reactivating supervisor:', e);
      alert(e?.message || t('errorReactivatingEmployee'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSupervisorAPI(deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await loadSupervisors();
      setDeleteTarget(null);
    } catch (e) {
      console.error('Error deleting supervisor:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  if (normalizeRole(currentUser?.role) !== 'Owner') {
    return (
      <div className="text-gray-500 dark:text-gray-400 py-4">
        {t('supervisorsOwnerOnly')}
      </div>
    );
  }

  const permissionLabels: Record<string, string> = {
    can_manage_leads: t('supervisorsPermCanManageLeads'),
    can_manage_deals: t('supervisorsPermCanManageDeals'),
    can_manage_tasks: t('supervisorsPermCanManageTasks'),
    can_view_reports: t('supervisorsPermCanViewReports'),
    can_manage_users: t('supervisorsPermCanManageUsers'),
    can_manage_products: t('supervisorsPermCanManageProducts'),
    can_manage_services: t('supervisorsPermCanManageServices'),
    can_manage_real_estate: t('supervisorsPermCanManageRealEstate'),
    can_manage_settings: t('supervisorsPermCanManageSettings'),
  };

  const inventoryPermKeys: (keyof Supervisor)[] = ['can_manage_products', 'can_manage_services', 'can_manage_real_estate'];
  const specialization = currentUser?.company?.specialization;
  const allowedInventoryKey =
      specialization === 'real_estate'
          ? 'can_manage_real_estate'
          : specialization === 'products'
              ? 'can_manage_products'
              : specialization === 'services' || specialization === 'medical'
                  ? 'can_manage_services'
                  : null;
  const allPermKeys = Object.keys(permissionLabels) as (keyof Supervisor)[];
  const permKeys = allPermKeys.filter((k) => {
    if (inventoryPermKeys.includes(k)) return k === allowedInventoryKey;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('supervisorsTitle')}
        </h3>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          + {t('supervisorsAdd')}
        </button>
      </div>
      <TableHorizontalScroll scrollClassName="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <table className="w-full text-sm text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3 text-center">{t('name')}</th>
              <th className="px-6 py-3 text-center">{t('email')}</th>
              <th className="px-6 py-3 text-center">{t('status')}</th>
              <th className="px-6 py-3 text-center">{t('supervisorsPermissions')}</th>
              <th className="px-6 py-3 text-center">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">{t('loading')}</td>
              </tr>
            ) : supervisors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">{t('supervisorsNone')}</td>
              </tr>
            ) : (
              supervisors.map((s) => (
                <tr key={s.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                    {s.user.first_name} {s.user.last_name}
                  </td>
                  <td className="px-6 py-4 text-center">{s.user.email}</td>
                  <td className="px-6 py-4 text-center">
                    {(() => {
                      const accountOff = s.user?.is_active === false;
                      const crmOff = !s.is_active;
                      const label = accountOff
                        ? t('deactivated')
                        : crmOff
                          ? t('supervisorsCrmAccessOff')
                          : t('active');
                      const cls = accountOff || crmOff
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                      return (
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {permKeys.filter((k) => typeof (s as any)[k] === 'boolean' && (s as any)[k]).map((k) => (
                        <span key={k} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                          {permissionLabels[k]}
                        </span>
                      ))}
                      {(s.can_delete_clients || s.user?.can_delete_clients) && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded">
                          {t('canDeleteClients')}
                        </span>
                      )}
                      {permKeys.filter((k) => (s as any)[k]).length === 0 &&
                        !(s.can_delete_clients || s.user?.can_delete_clients) && (
                        <span className="text-xs text-gray-400">{t('supervisorsNoPermissions')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {s.user?.is_active !== false ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivateSupervisor(s)}
                          className="px-2 py-1 text-xs rounded-md border border-amber-600 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/20"
                        >
                          {t('deactivateEmployee')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivateSupervisor(s)}
                          disabled={reactivateMutation.isPending}
                          className="px-2 py-1 text-xs rounded-md border border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                        >
                          {t('reactivateEmployee')}
                        </button>
                      )}
                      {language === 'ar' && (
                        <div
                          className="flex items-center justify-center p-2"
                          title={s.is_active ? t('supervisorsCrmAccessOff') : t('supervisorsCrmAccess')}
                        >
                          <ToggleSwitch
                            enabled={s.is_active && s.user?.is_active !== false}
                            setEnabled={() => handleToggleActive(s)}
                          />
                        </div>
                      )}
                      <button type="button" onClick={() => handleOpenModal(s)} className="p-2 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30" title={t('edit')} aria-label={t('edit')}>
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(s)} className="p-2 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30" title={t('delete')} aria-label={t('delete')}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      {language !== 'ar' && (
                        <div
                          className="flex items-center justify-center p-2"
                          title={s.is_active ? t('supervisorsCrmAccessOff') : t('supervisorsCrmAccess')}
                        >
                          <ToggleSwitch
                            enabled={s.is_active && s.user?.is_active !== false}
                            setEnabled={() => handleToggleActive(s)}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableHorizontalScroll>
      <SupervisorModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} editingSupervisor={editingSupervisor} isLoading={isSaving} />
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {t('supervisorsDeleteConfirm')} {deleteTarget.user.first_name} {deleteTarget.user.last_name}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-md dark:border-gray-600">{t('cancel')}</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
