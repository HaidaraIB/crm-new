import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useCreateClientFieldVisit } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

function fieldVisitErrorMessage(error: unknown, t: (key: keyof typeof import('../../constants').translations.en) => string): string {
    const err = error as Error & { fields?: Record<string, unknown> };
    const nf = err.fields?.non_field_errors;
    const list = Array.isArray(nf) ? nf : nf != null ? [nf] : [];
    if (list.some((x) => String(x).includes('field_visit_too_far'))) {
        return t('fieldVisitTooFar');
    }
    return err?.message || t('failedToAddFieldVisit');
}

function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
        });
    });
}

export const AddFieldVisitModal = () => {
    const {
        isAddFieldVisitModalOpen,
        setIsAddFieldVisitModalOpen,
        selectedLead,
        t,
        language,
        setIsSuccessModalOpen,
        setSuccessMessage,
    } = useAppContext();

    const createFieldVisitMutation = useCreateClientFieldVisit();
    const loading = createFieldVisitMutation.isPending;

    const [summary, setSummary] = useState('');
    const [visitDatetime, setVisitDatetime] = useState('');
    const [upcomingVisitDate, setUpcomingVisitDate] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [locating, setLocating] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!summary?.trim()) {
            newErrors.summary = t('visitSummaryRequired') || 'Summary is required';
        }
        if (!visitDatetime?.trim()) {
            newErrors.visitDatetime = t('visitDatetimeRequired') || 'Visit date and time is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    if (!selectedLead) return null;

    const handleClose = () => {
        setIsAddFieldVisitModalOpen(false);
        setSummary('');
        setVisitDatetime('');
        setUpcomingVisitDate('');
        setErrors({});
        setLocating(false);
    };

    const setVisitDatetimeToNow = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        setVisitDatetime(`${y}-${m}-${d}T${h}:${min}`);
    };

    const toIsoOrUndefined = (local: string): string | undefined => {
        if (!local?.trim()) return undefined;
        const dt = new Date(local);
        return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;
        if (!validateForm()) return;

        const visitIso = toIsoOrUndefined(visitDatetime);
        if (!visitIso) {
            setErrors({ visitDatetime: t('visitDatetimeRequired') });
            return;
        }

        setLocating(true);
        setErrors({});
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude, accuracy } = position.coords;

            await createFieldVisitMutation.mutateAsync({
                client: selectedLead.id,
                summary: summary.trim(),
                visit_datetime: visitIso,
                upcoming_visit_date: toIsoOrUndefined(upcomingVisitDate),
                employee_latitude: latitude,
                employee_longitude: longitude,
                ...(accuracy != null && !Number.isNaN(accuracy)
                    ? { employee_location_accuracy: accuracy }
                    : {}),
            });
            handleClose();
            setSuccessMessage(t('fieldVisitCreatedSuccessfully'));
            setIsSuccessModalOpen(true);
        } catch (error: unknown) {
            console.error('Error adding field visit:', error);
            const err = error as Error & { code?: string };
            if (err?.name === 'GeolocationPositionError' || !navigator.geolocation) {
                setErrors({ _general: t('employeeLocationRequired') });
            } else {
                setErrors({ _general: fieldVisitErrorMessage(error, t) });
            }
        } finally {
            setLocating(false);
        }
    };

    const busy = loading || locating;

    return (
        <Modal
            isOpen={isAddFieldVisitModalOpen}
            onClose={handleClose}
            title={`${t('addFieldVisit')} ${t('for')} ${selectedLead.name}`}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="fieldVisitSummary">{t('visitSummary') || 'Summary'} <span className="text-red-500">*</span></Label>
                    <textarea
                        id="fieldVisitSummary"
                        rows={4}
                        value={summary}
                        onChange={(e) => {
                            setSummary(e.target.value);
                            clearError('summary');
                        }}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                    />
                    {errors.summary && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.summary}</p>}
                </div>
                <div>
                    <Label htmlFor="fieldVisitDatetime">{t('visitDatetime') || 'Visit date & time'} <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                        <input
                            type="datetime-local"
                            id="fieldVisitDatetime"
                            value={visitDatetime}
                            onChange={(e) => {
                                setVisitDatetime(e.target.value);
                                clearError('visitDatetime');
                            }}
                            className={`flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.visitDatetime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                        />
                        <Button type="button" variant="secondary" onClick={setVisitDatetimeToNow}>
                            {t('now') || 'Now'}
                        </Button>
                    </div>
                    {errors.visitDatetime && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.visitDatetime}</p>}
                </div>
                <div>
                    <Label htmlFor="fieldUpcomingVisit">{t('upcomingVisitDate')}</Label>
                    <input
                        type="datetime-local"
                        id="fieldUpcomingVisit"
                        value={upcomingVisitDate}
                        onChange={(e) => setUpcomingVisitDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={busy} loading={busy}>
                        {locating ? t('gettingLocation') : t('submit')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
