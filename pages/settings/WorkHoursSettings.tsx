import React, { useEffect, useState } from 'react';
import { Card, Button, NumberInput } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyAssignmentSettingsAPI } from '../../services/api';
import { useCurrentUser, queryKeys } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

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

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const mirrorWorkHoursErrors = (raw: Record<string, string>) => {
        const next = { ...raw };
        if (next._general && !next.general) next.general = next._general;
        if (next.idle_timeout_minutes && !next.idleTimeoutMinutes) next.idleTimeoutMinutes = next.idle_timeout_minutes;
        if (next.idleTimeoutMinutes && !next.idle_timeout_minutes) next.idle_timeout_minutes = next.idleTimeoutMinutes;
        return next;
    };

    const collectWorkHoursErrors = (minutes = idleTimeoutMinutes) =>
        mirrorWorkHoursErrors(
            catalogFieldErrors('work_hours.update', { idle_timeout_minutes: minutes, idleTimeoutMinutes: minutes }, translate),
        );

    const showIdleError = (minutes = idleTimeoutMinutes) => {
        const next = collectWorkHoursErrors(minutes);
        setErrors((prev) => {
            const updated = { ...prev };
            if (next.idleTimeoutMinutes) updated.idleTimeoutMinutes = next.idleTimeoutMinutes;
            else delete updated.idleTimeoutMinutes;
            if (next.idle_timeout_minutes) updated.idle_timeout_minutes = next.idle_timeout_minutes;
            else delete updated.idle_timeout_minutes;
            return updated;
        });
    };

    const validateForm = (): boolean => {
        const newErrors = collectWorkHoursErrors();

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
            const server = mirrorWorkHoursErrors(serverFieldErrors(error, 'work_hours.update', translate));
            if (!server.general && !server.idleTimeoutMinutes) {
                server.general =
                    error?.message ||
                    t('errorSavingSettings') ||
                    'Failed to save settings. Please try again.';
            }
            setErrors(server);
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
                                <div onBlur={() => showIdleError()}>
                                <NumberInput
                                    id="work-hours-idle-timeout"
                                    min={1}
                                    max={120}
                                    value={idleTimeoutMinutes.toString()}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        const minutes = !isNaN(value) ? value : e.target.value === '' ? 1 : idleTimeoutMinutes;
                                        if (!isNaN(value)) {
                                            setIdleTimeoutMinutes(value);
                                        } else if (e.target.value === '') {
                                            setIdleTimeoutMinutes(1);
                                        }
                                        if (errors.idleTimeoutMinutes) showIdleError(minutes);
                                    }}
                                    className={`w-32 ${errors.idleTimeoutMinutes ? 'border-red-500' : ''}`}
                                />
                                </div>
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
                        <Button onClick={handleSave} loading={isSaving} loadingText={t('saving')}>
                            {t('saveSettings')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
