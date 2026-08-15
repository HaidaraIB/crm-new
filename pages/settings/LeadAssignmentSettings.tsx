
import React, { useState, useEffect } from 'react';
import { Card, Button, NumberInput } from '../../components/index';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyAssignmentSettingsAPI } from '../../services/api';
import { useCurrentUser, queryKeys } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { IANA_TIMEZONE_GROUPS, allListedIanaZones, type TimezoneGroup } from '../../utils/ianaTimezones';
import type { AutoAssignAlgorithm } from '../../types';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

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
    const [autoAssignAlgorithm, setAutoAssignAlgorithm] = useState<AutoAssignAlgorithm>('least_busy');
    const [reAssignEnabled, setReAssignEnabled] = useState(false);
    const [reAssignHours, setReAssignHours] = useState(24);
    const [noFollowUpEnabled, setNoFollowUpEnabled] = useState(true);
    const [noFollowUpHours, setNoFollowUpHours] = useState(10);
    const [noFollowUpDigestHour, setNoFollowUpDigestHour] = useState(9);
    const [businessTimezone, setBusinessTimezone] = useState('UTC');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load settings from company data
    useEffect(() => {
        if (company) {
            setAutoAssignEnabled(company.auto_assign_enabled || false);
            setAutoAssignAlgorithm(company.auto_assign_algorithm || 'least_busy');
            setReAssignEnabled(company.re_assign_enabled || false);
            setReAssignHours(company.re_assign_hours || 24);
            setNoFollowUpEnabled(company.no_follow_up_enabled ?? true);
            setNoFollowUpHours(company.no_follow_up_hours || 10);
            setNoFollowUpDigestHour(company.no_follow_up_digest_hour ?? 9);
            setBusinessTimezone((company.timezone || 'UTC').trim() || 'UTC');
        }
    }, [company]);

    const timezoneSelectGroups = React.useMemo((): TimezoneGroup[] => {
        const listed = allListedIanaZones();
        const current = (businessTimezone || 'UTC').trim() || 'UTC';
        const extra: TimezoneGroup[] = [];
        if (!listed.has(current)) {
            extra.push({
                label: t('savedTimezoneGroup'),
                zones: [current],
            });
        }
        return [...extra, ...IANA_TIMEZONE_GROUPS];
    }, [businessTimezone, t]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (reAssignEnabled && (!Number.isFinite(reAssignHours) || reAssignHours < 1)) {
            newErrors.reAssignHours = t('invalidReminderDelayTime') || 'Please enter a valid number of hours (1 or more)';
        }

        if (
            noFollowUpEnabled &&
            (!Number.isFinite(noFollowUpHours) || noFollowUpHours < 1 || noFollowUpHours > 168)
        ) {
            newErrors.noFollowUpHours = t('invalidNoFollowUpHours') || 'Please enter a valid number of hours (1 to 168)';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstFieldError(newErrors, {
                    reAssignHours: 're-assign-hours',
                    noFollowUpHours: 'no-follow-up-hours',
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

        if (!validateForm()) {
            return;
        }

        setIsSaving(true);
        setErrors({});

        try {
            await updateCompanyAssignmentSettingsAPI(company.id, {
                auto_assign_enabled: autoAssignEnabled,
                auto_assign_algorithm: autoAssignAlgorithm,
                re_assign_enabled: reAssignEnabled,
                re_assign_hours: reAssignHours,
                no_follow_up_enabled: noFollowUpEnabled,
                no_follow_up_hours: noFollowUpHours,
                no_follow_up_digest_hour: noFollowUpDigestHour,
                timezone: businessTimezone.trim() || 'UTC',
            });

            // Invalidate and refetch current user data to get updated company settings
            await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
            await queryClient.refetchQueries({ queryKey: queryKeys.currentUser });

            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating assignment settings:', error);
            setErrors({ general: error?.message || t('errorSavingSettings') || 'Failed to save settings. Please try again.' });
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

                    {autoAssignEnabled && (
                        <div className="ml-0 pl-4 border-s-2 border-primary/30 space-y-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t('autoAssignAlgorithm')}
                            </p>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="auto-assign-algorithm"
                                    value="least_busy"
                                    checked={autoAssignAlgorithm === 'least_busy'}
                                    onChange={() => setAutoAssignAlgorithm('least_busy')}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {t('autoAssignAlgorithmLeastBusy')}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {t('autoAssignAlgorithmLeastBusyDesc')}
                                    </span>
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="auto-assign-algorithm"
                                    value="round_robin"
                                    checked={autoAssignAlgorithm === 'round_robin'}
                                    onChange={() => setAutoAssignAlgorithm('round_robin')}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {t('autoAssignAlgorithmRoundRobin')}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {t('autoAssignAlgorithmRoundRobinDesc')}
                                    </span>
                                </span>
                            </label>
                        </div>
                    )}

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
                                    <NumberInput
                                        id="re-assign-hours"
                                        min={1}
                                        value={reAssignHours.toString()}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10);
                                            if (!isNaN(value) && value >= 1) {
                                                setReAssignHours(value);
                                            } else if (e.target.value === '') {
                                                setReAssignHours(1);
                                            }
                                            if (errors.reAssignHours) {
                                                setErrors((prev) => {
                                                    const next = { ...prev };
                                                    delete next.reAssignHours;
                                                    return next;
                                                });
                                            }
                                        }}
                                        className={`w-32 ${errors.reAssignHours ? 'border-red-500' : ''}`}
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('hours') || 'ساعة'}
                                    </span>
                                </div>
                                {errors.reAssignHours && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reAssignHours}</p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('reminderDelayTimeDesc')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* No-follow-up alerts */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {t('noFollowUpEnabled')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('noFollowUpDesc')}
                                </p>
                            </div>
                            <div className="ml-4 rtl:ml-0 rtl:mr-4">
                                <ToggleSwitch
                                    enabled={noFollowUpEnabled}
                                    setEnabled={setNoFollowUpEnabled}
                                />
                            </div>
                        </div>

                        {noFollowUpEnabled && (
                            <>
                                <div className="mt-4">
                                    <Label htmlFor="no-follow-up-hours">
                                        {t('noFollowUpHours')}
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <NumberInput
                                            id="no-follow-up-hours"
                                            min={1}
                                            max={168}
                                            value={noFollowUpHours.toString()}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value, 10);
                                                if (!isNaN(value) && value >= 1) {
                                                    setNoFollowUpHours(value);
                                                } else if (e.target.value === '') {
                                                    setNoFollowUpHours(1);
                                                }
                                                if (errors.noFollowUpHours) {
                                                    setErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.noFollowUpHours;
                                                        return next;
                                                    });
                                                }
                                            }}
                                            className={`w-32 ${errors.noFollowUpHours ? 'border-red-500' : ''}`}
                                        />
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('hours')}
                                        </span>
                                    </div>
                                    {errors.noFollowUpHours && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.noFollowUpHours}</p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('noFollowUpHoursDesc')}
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <Label htmlFor="no-follow-up-digest-hour">
                                        {t('noFollowUpDigestHour')}
                                    </Label>
                                    <select
                                        id="no-follow-up-digest-hour"
                                        value={noFollowUpDigestHour}
                                        onChange={(e) => setNoFollowUpDigestHour(parseInt(e.target.value, 10))}
                                        dir="ltr"
                                        className="mt-1 w-32 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                                    >
                                        {Array.from({ length: 24 }, (_, hour) => (
                                            <option key={hour} value={hour}>
                                                {`${hour.toString().padStart(2, '0')}:00`}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t('noFollowUpDigestHourDesc')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <Label htmlFor="company-timezone">{t('businessTimezone')}</Label>
                        <select
                            id="company-timezone"
                            value={businessTimezone.trim() || 'UTC'}
                            onChange={(e) => setBusinessTimezone(e.target.value)}
                            dir="ltr"
                            className="mt-1 max-w-md w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                        >
                            {timezoneSelectGroups.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.zones.map((zone) => (
                                        <option key={zone} value={zone}>
                                            {zone}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('businessTimezoneHelp')}
                        </p>
                    </div>

                    {errors.general && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                            {errors.general}
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

