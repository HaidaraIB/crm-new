import React, { useEffect, useState } from 'react';
import { Card, Button, NumberInput } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyAssignmentSettingsAPI } from '../../services/api';
import { useCurrentUser, queryKeys } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

/**
 * Owner-only settings for measured working-hours tracking.
 *
 * Off by default for every company: this measures employee activity, so it has to be a
 * deliberate opt-in rather than something a migration switches on. The privacy note is
 * shown unconditionally, not tucked behind the toggle.
 */
export const WorkHoursSettings = () => {
    const { t, language, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
    const { data: currentUserData } = useCurrentUser();
    const queryClient = useQueryClient();
    const user = currentUserData || currentUser;

    const company = user?.company;
    const isRTL = language === 'ar';

    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(10);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (company) {
            setTrackingEnabled(company.work_hours_tracking_enabled ?? false);
            setIdleTimeoutMinutes(company.work_hours_idle_timeout_minutes ?? 10);
        }
    }, [company]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (
            !Number.isFinite(idleTimeoutMinutes) ||
            idleTimeoutMinutes < 1 ||
            idleTimeoutMinutes > 120
        ) {
            newErrors.idleTimeoutMinutes =
                t('invalidWorkHoursIdleTimeout') || 'Please enter a valid number of minutes (1 to 120)';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstFieldError(newErrors, {
                    idleTimeoutMinutes: 'work-hours-idle-timeout',
                })
            );
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!company?.id) {
            setErrors({ general: t('companyNotFound') || 'Company not found' });
            return;
        }

        if (!validateForm()) return;

        setIsSaving(true);
        setErrors({});

        try {
            await updateCompanyAssignmentSettingsAPI(company.id, {
                work_hours_tracking_enabled: trackingEnabled,
                work_hours_idle_timeout_minutes: idleTimeoutMinutes,
            });

            // The tracker reads these off currentUser.company, so it must be refreshed
            // before the change takes effect in this tab.
            await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
            await queryClient.refetchQueries({ queryKey: queryKeys.currentUser });

            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating work hours settings:', error);
            setErrors({
                general:
                    error?.message ||
                    t('errorSavingSettings') ||
                    'Failed to save settings. Please try again.',
            });
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
                    {t('workHoursSettings')}
                </h2>
                <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 p-3">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            {t('workHoursSettingsHint')}
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {t('enableWorkHoursTracking')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('enableWorkHoursTrackingDesc')}
                            </p>
                        </div>
                        <div className="ml-4 rtl:ml-0 rtl:mr-4">
                            <ToggleSwitch enabled={trackingEnabled} setEnabled={setTrackingEnabled} />
                        </div>
                    </div>

                    {trackingEnabled && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <Label htmlFor="work-hours-idle-timeout">
                                {t('workHoursIdleTimeoutMinutes')}
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                                <NumberInput
                                    id="work-hours-idle-timeout"
                                    min={1}
                                    max={120}
                                    value={idleTimeoutMinutes.toString()}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        if (!isNaN(value)) {
                                            setIdleTimeoutMinutes(value);
                                        } else if (e.target.value === '') {
                                            setIdleTimeoutMinutes(1);
                                        }
                                        if (errors.idleTimeoutMinutes) {
                                            setErrors((prev) => {
                                                const next = { ...prev };
                                                delete next.idleTimeoutMinutes;
                                                return next;
                                            });
                                        }
                                    }}
                                    className={`w-32 ${errors.idleTimeoutMinutes ? 'border-red-500' : ''}`}
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('minutes') || 'minutes'}
                                </span>
                            </div>
                            {errors.idleTimeoutMinutes && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {errors.idleTimeoutMinutes}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t('workHoursIdleTimeoutMinutesDesc')}
                            </p>
                        </div>
                    )}

                    {errors.general && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                            {isSaving ? (t('saving') || 'Saving...') : t('saveSettings')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
