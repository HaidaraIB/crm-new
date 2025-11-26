
import React, { useState } from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, Input, ToggleSwitch, NumberInput } from '../../components/index';
import { useAppContext } from '../../context/AppContext';

export const LeadsSettings = () => {
    const { t } = useAppContext();
    const [autoRotate, setAutoRotate] = useState(false);
    const [delayTime, setDelayTime] = useState('30');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            // TODO: Save settings to API when backend is ready
            // await saveLeadsSettingsAPI({ autoRotate, delayTime: parseInt(delayTime) });
            
            // For now, just show success message
            alert(t('settingsSaved') || 'Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert(t('errorSavingSettings') || 'Error saving settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-semibold mb-4">{t('leadAssignmentSettings')}</h2>
                <div className="space-y-6">
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
                            onChange={(e) => setDelayTime(e.target.value)}
                            min={0}
                            step={1}
                        />
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
