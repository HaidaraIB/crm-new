
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyFieldVisitSettingsAPI } from '../../services/api';
import { useCurrentUser, queryKeys } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeRole } from '../../utils/roles';
import { User } from '../../types';

export const FieldVisitSettings = () => {
    const { t, currentUser, setCurrentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const { data: currentUserData } = useCurrentUser();
    const queryClient = useQueryClient();
    const user = currentUserData || currentUser;
    const company = user?.company;

    const [fieldVisitEnabled, setFieldVisitEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const adminAllowsFieldVisits = company?.field_visit_admin_allowed !== false;
    const adminBlockMessage = company?.field_visit_admin_message || '';

    useEffect(() => {
        if (company) {
            setFieldVisitEnabled(company.field_visit_enabled ?? true);
        }
    }, [company]);

    const handleSave = async () => {
        if (!company?.id) {
            setSaveError(t('companyNotFound') || 'Company not found');
            return;
        }

        setIsSaving(true);
        setSaveError('');
        try {
            await updateCompanyFieldVisitSettingsAPI(company.id, {
                field_visit_enabled: fieldVisitEnabled,
            });
            await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
            await queryClient.refetchQueries({ queryKey: queryKeys.currentUser });
            const freshUser = queryClient.getQueryData<User>(queryKeys.currentUser);
            if (freshUser) {
                setCurrentUser(freshUser);
            }
            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: unknown) {
            const err = error as Error;
            setSaveError(err?.message || t('errorSavingSettings') || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (normalizeRole(user?.role) !== 'Owner') {
        return (
            <Card>
                <p className="text-gray-500 dark:text-gray-400">{t('ownerOnlySettings') || 'Only the company owner can change these settings.'}</p>
            </Card>
        );
    }

    if (!company) {
        return (
            <Card>
                <p className="text-gray-500 dark:text-gray-400">{t('companyNotFound') || 'Company not found'}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                    {t('fieldVisitSettings') || 'Field visit settings'}
                </h2>
                {!adminAllowsFieldVisits ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                        {adminBlockMessage || t('fieldVisitDisabledByAdmin')}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {t('fieldVisit')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('fieldVisitSettingDesc')}
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={fieldVisitEnabled}
                                setEnabled={setFieldVisitEnabled}
                            />
                        </div>
                        {saveError && (
                            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{saveError}</p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                                {t('save') || 'Save'}
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};
