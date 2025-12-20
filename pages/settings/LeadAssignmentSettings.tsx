
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyAssignmentSettingsAPI } from '../../services/api';
import { useCurrentUser, queryKeys } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const LeadAssignmentSettings = () => {
    const { t, language, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const { data: currentUserData } = useCurrentUser();
    const queryClient = useQueryClient();
    const user = currentUserData || currentUser;
    
    const company = user?.company;
    const isRTL = language === 'ar';
    
    const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
    const [reAssignEnabled, setReAssignEnabled] = useState(false);
    const [reAssignHours, setReAssignHours] = useState(24);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string>('');

    // Load settings from company data
    useEffect(() => {
        if (company) {
            setAutoAssignEnabled(company.auto_assign_enabled || false);
            setReAssignEnabled(company.re_assign_enabled || false);
            setReAssignHours(company.re_assign_hours || 24);
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
            await updateCompanyAssignmentSettingsAPI(company.id, {
                auto_assign_enabled: autoAssignEnabled,
                re_assign_enabled: reAssignEnabled,
                re_assign_hours: reAssignHours,
            });

            // Invalidate and refetch current user data to get updated company settings
            await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
            await queryClient.refetchQueries({ queryKey: queryKeys.currentUser });

            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating assignment settings:', error);
            setSaveError(error?.message || t('errorSavingSettings') || 'Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

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
                    {t('leadAssignmentSettings')}
                </h2>
                <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {/* Auto Assign Setting */}
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {t('autoRotation')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('autoRotationDesc')}
                            </p>
                        </div>
                        <div className="ml-4 rtl:ml-0 rtl:mr-4">
                            <ToggleSwitch
                                enabled={autoAssignEnabled}
                                setEnabled={setAutoAssignEnabled}
                            />
                        </div>
                    </div>

                    {/* Re-assign Setting */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {t('reAssignEnabled') || 'إعادة التعيين التلقائي'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('reAssignDesc') || 'تعيين موظف جديد للعميل في حال لم يتواصل معه الموظف الحالي خلال فترة محددة'}
                                </p>
                            </div>
                            <div className="ml-4 rtl:ml-0 rtl:mr-4">
                                <ToggleSwitch
                                    enabled={reAssignEnabled}
                                    setEnabled={setReAssignEnabled}
                                />
                            </div>
                        </div>

                        {reAssignEnabled && (
                            <div className="mt-4">
                                <Label htmlFor="re-assign-hours">
                                    {t('reminderDelayTime')}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        id="re-assign-hours"
                                        type="number"
                                        min="1"
                                        value={reAssignHours}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10);
                                            if (!isNaN(value) && value >= 1) {
                                                setReAssignHours(value);
                                            }
                                        }}
                                        className="w-32"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('hours') || 'ساعة'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('reminderDelayTimeDesc')}
                                </p>
                            </div>
                        )}
                    </div>

                    {saveError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                            {saveError}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            onClick={handleSave}
                            loading={isSaving}
                            disabled={isSaving}
                        >
                            {isSaving ? (t('saving') || 'جاري الحفظ...') : t('saveSettings')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

