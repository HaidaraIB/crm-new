import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useDeactivateEmployee } from '../../hooks/useQueries';
import { getDeactivateEmployeePreviewAPI } from '../../services/api';
import { normalizeRole, roleUsesLeadReassignOnDeactivate } from '../../utils/roles';
import { translations } from '../../constants';

type TranslationKey = keyof typeof translations.en;

const interpolate = (template: string, vars: Record<string, string | number>): string =>
    Object.entries(vars).reduce(
        (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
        template
    );

const getUserDisplayName = (user: any, t: (key: TranslationKey) => string): string => {
    if (user.name?.trim()) return user.name.trim();
    if (user.first_name || user.last_name) {
        const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        if (full) return full;
    }
    if (user.username?.trim()) return user.username.trim();
    if (user.email?.trim()) return user.email.trim();
    return t('unknown');
};

export const DeactivateEmployeeModal = () => {
    const {
        isDeactivateEmployeeModalOpen,
        setIsDeactivateEmployeeModalOpen,
        selectedUser,
        t,
        setIsSuccessModalOpen,
        setSuccessMessage,
    } = useAppContext();

    const deactivateMutation = useDeactivateEmployee();
    const [reassignLeads, setReassignLeads] = useState(true);
    const [assignedLeadsCount, setAssignedLeadsCount] = useState<number | null>(null);
    const [canReassign, setCanReassign] = useState(true);
    const [showLeadReassignOptions, setShowLeadReassignOptions] = useState(true);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const isSupervisorTarget = selectedUser
        ? normalizeRole(selectedUser.role) === 'Supervisor'
        : false;

    useEffect(() => {
        if (!isDeactivateEmployeeModalOpen || !selectedUser) {
            setAssignedLeadsCount(null);
            setErrorMessage('');
            setReassignLeads(true);
            setShowLeadReassignOptions(true);
            return;
        }

        const roleShowsLeads = roleUsesLeadReassignOnDeactivate(selectedUser.role);
        setShowLeadReassignOptions(roleShowsLeads);

        let cancelled = false;
        setPreviewLoading(true);
        getDeactivateEmployeePreviewAPI(selectedUser.id)
            .then((data) => {
                if (cancelled) return;
                setAssignedLeadsCount(data.assigned_leads_count ?? 0);
                setCanReassign(data.can_reassign ?? false);
                setShowLeadReassignOptions(
                    data.show_lead_reassign_options ?? roleShowsLeads
                );
                if (
                    (data.show_lead_reassign_options ?? roleShowsLeads) &&
                    (data.assigned_leads_count ?? 0) > 0 &&
                    !data.can_reassign
                ) {
                    setReassignLeads(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAssignedLeadsCount(0);
                    setShowLeadReassignOptions(roleShowsLeads);
                }
            })
            .finally(() => {
                if (!cancelled) setPreviewLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isDeactivateEmployeeModalOpen, selectedUser?.id, selectedUser?.role]);

    const handleDeactivate = async () => {
        if (!selectedUser) return;
        setErrorMessage('');

        try {
            const result = await deactivateMutation.mutateAsync({
                id: selectedUser.id,
                reassign_leads: showLeadReassignOptions ? reassignLeads : false,
            });

            setIsDeactivateEmployeeModalOpen(false);

            let message = isSupervisorTarget
                ? t('employeeDeactivatedSuccessfully')
                : t('employeeDeactivatedSuccessfully');
            if (
                showLeadReassignOptions &&
                reassignLeads &&
                (result.assigned_lead_count > 0 || result.skipped_lead_count > 0)
            ) {
                message = interpolate(t('employeeDeactivatedWithRedistribution'), {
                    assigned: result.assigned_lead_count,
                    skipped: result.skipped_lead_count,
                });
            } else if (
                !showLeadReassignOptions &&
                (result.assigned_lead_count > 0 || result.skipped_lead_count > 0)
            ) {
                message = interpolate(t('employeeDeactivatedWithRedistribution'), {
                    assigned: result.assigned_lead_count,
                    skipped: result.skipped_lead_count,
                });
            }

            setSuccessMessage(message);
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            setErrorMessage(error?.message || t('errorDeactivatingEmployee'));
        }
    };

    if (!selectedUser) return null;

    const displayName = getUserDisplayName(selectedUser, t);
    const leadsCount = assignedLeadsCount ?? 0;

    const bodyText = previewLoading
        ? t('loading')
        : !showLeadReassignOptions
          ? interpolate(t('deactivateEmployeeNoLeadsRole'), { name: displayName })
          : interpolate(t('deactivateEmployeeLeadsSummary'), {
                name: displayName,
                count: leadsCount,
            });

    const modalTitle = isSupervisorTarget
        ? t('deactivateSupervisorTitle')
        : t('deactivateEmployeeTitle');

    return (
        <Modal
            isOpen={isDeactivateEmployeeModalOpen}
            onClose={() => {
                setIsDeactivateEmployeeModalOpen(false);
                setErrorMessage('');
            }}
            title={modalTitle}
        >
            <div className="space-y-4">
                {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errorMessage}
                    </div>
                )}
                <p>{bodyText}</p>
                {showLeadReassignOptions && leadsCount > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('deactivateEmployeeQuestion')}
                        </p>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reassignLeads"
                                checked={reassignLeads}
                                onChange={() => setReassignLeads(true)}
                                disabled={!canReassign}
                                className="mt-1"
                            />
                            <span className="text-sm">{t('deactivateReassignLeads')}</span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reassignLeads"
                                checked={!reassignLeads}
                                onChange={() => setReassignLeads(false)}
                                className="mt-1"
                            />
                            <span className="text-sm">{t('deactivateKeepLeads')}</span>
                        </label>
                        {!canReassign && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                {t('deactivateNoEmployeesForReassign')}
                            </p>
                        )}
                    </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('deactivateEmployeeCannotLogin')}
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setIsDeactivateEmployeeModalOpen(false);
                            setErrorMessage('');
                        }}
                        disabled={deactivateMutation.isPending}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeactivate}
                        loading={deactivateMutation.isPending}
                        disabled={deactivateMutation.isPending || previewLoading}
                    >
                        {t('confirmDeactivateEmployee')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
