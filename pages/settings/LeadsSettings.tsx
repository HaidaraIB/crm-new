
import React, { useState } from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, ToggleSwitch, NumberInput } from '../../components/index';
import { useAppContext } from '../../context/AppContext';
import { scrollToFirstFieldError } from '../../utils/formFieldErrors';

export const LeadsSettings = () => {
    const { t } = useAppContext();
    const [autoRotate, setAutoRotate] = useState(false);
    const [delayTime, setDelayTime] = useState('30');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    const handleDelayTimeChange = (value: string) => {
        setDelayTime(value);
        setSuccessMessage('');
        if (errors.delayTime || errors.general) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.delayTime;
                delete next.general;
                return next;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (autoRotate) {
            const parsed = parseInt(delayTime, 10);
            if (delayTime.trim() === '' || isNaN(parsed) || parsed < 0) {
                newErrors.delayTime = t('invalidReminderDelayTime') || 'Please enter a valid delay time';
            }
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstFieldError(newErrors, { delayTime: 'delay-time' })
            );
            return false;
        }
        return true;
    };

    const handleSaveSettings = async () => {
        if (!validateForm()) {
            return;
        }
        setIsSaving(true);
        setErrors({});
        setSuccessMessage('');
        try {
            // TODO: Save settings to API when backend is ready
            // await saveLeadsSettingsAPI({ autoRotate, delayTime: parseInt(delayTime) });
            setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            setErrors({
                general: t('errorSavingSettings') || 'Error saving settings. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">{t('leadAssignmentSettings')}</h2>
                <div className="space-y-6">
                    {errors.general && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                            {errors.general}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-300 px-4 py-3 rounded-md text-sm">
                            {successMessage}
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">{t('autoRotation')}</h3>
                            <p className="text-sm text-tertiary">{t('autoRotationDesc')}</p>
                        </div>
                        <ToggleSwitch enabled={autoRotate} setEnabled={setAutoRotate} />
                    </div>

                    <div className="max-w-sm">
                         <label htmlFor="delay-time" className="block text-sm font-medium text-secondary mb-1">{t('reminderDelayTime')}</label>
                         <NumberInput 
                            id="delay-time" 
                            name="delay-time"
                            value={delayTime}
                            onChange={(e) => handleDelayTimeChange(e.target.value)}
                            min={0}
                            step={1}
                            className={errors.delayTime ? 'border-red-500' : ''}
                        />
                        {errors.delayTime && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.delayTime}</p>
                        )}
                         <p className="text-xs text-tertiary mt-1">{t('reminderDelayTimeDesc')}</p>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                        {isSaving ? t('saving') || 'Saving...' : t('saveSettings')}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
