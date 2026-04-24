
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useCreateClientVisit, useVisitTypes } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddVisitModal = () => {
    const { isAddVisitModalOpen, setIsAddVisitModalOpen, selectedLead, t, language, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();

    const { data: visitTypesData } = useVisitTypes();
    const visitTypes = Array.isArray(visitTypesData)
        ? visitTypesData
        : (visitTypesData?.results || []);

    const createClientVisitMutation = useCreateClientVisit();
    const loading = createClientVisitMutation.isPending;

    const getDefaultVisitType = () => {
        if (visitTypes.length === 0) return '';
        const def = visitTypes.find((v: { isDefault?: boolean; is_default?: boolean }) => v.isDefault ?? v.is_default) ?? visitTypes[0];
        return def.name;
    };

    const [visitTypeName, setVisitTypeName] = useState(getDefaultVisitType());
    const [summary, setSummary] = useState('');
    const [visitDatetime, setVisitDatetime] = useState('');
    const [upcomingVisitDate, setUpcomingVisitDate] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!visitTypeName?.trim()) {
            newErrors.visitType = t('visitTypeRequired') || 'Visit type is required';
        }
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
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    React.useEffect(() => {
        if (visitTypes.length > 0) {
            setVisitTypeName(getDefaultVisitType());
        }
    }, [visitTypes]);

    if (!selectedLead) return null;

    const handleClose = () => {
        setIsAddVisitModalOpen(false);
        setVisitTypeName(getDefaultVisitType());
        setSummary('');
        setVisitDatetime('');
        setUpcomingVisitDate('');
        setErrors({});
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

        const vt = visitTypes.find((v: { name: string }) =>
            v.name === visitTypeName ||
            v.name.toLowerCase() === visitTypeName.toLowerCase()
        );
        if (!vt) {
            setErrors({ visitType: t('visitTypeNotFound') || 'Visit type not found in settings.' });
            return;
        }

        const visitIso = toIsoOrUndefined(visitDatetime);
        if (!visitIso) {
            setErrors({ visitDatetime: t('visitDatetimeRequired') || 'Visit date and time is required' });
            return;
        }

        try {
            await createClientVisitMutation.mutateAsync({
                client: selectedLead.id,
                visit_type: vt.id,
                summary: summary.trim(),
                visit_datetime: visitIso,
                upcoming_visit_date: toIsoOrUndefined(upcomingVisitDate),
            });
            handleClose();
            setSuccessMessage(t('visitCreatedSuccessfully') || 'Visit logged successfully.');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error adding visit:', error);
            setErrors({ _general: error?.message || t('failedToAddVisit') || 'Failed to add visit.' });
        }
    };

    return (
        <Modal isOpen={isAddVisitModalOpen} onClose={handleClose} title={`${t('addVisit') || 'Add visit'} ${t('for')} ${selectedLead.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="visitType">{t('visitType') || 'Visit type'} <span className="text-red-500">*</span></Label>
                    <select
                        id="visitType"
                        value={visitTypeName}
                        onChange={(e) => {
                            setVisitTypeName(e.target.value);
                            clearError('visitType');
                        }}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.visitType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                    >
                        {visitTypes.length > 0 ? (
                            visitTypes.map((v: { id: number; name: string }) => (
                                <option key={v.id} value={v.name}>{v.name}</option>
                            ))
                        ) : (
                            <option value="">{t('noVisitTypesAvailable') || 'No visit types'}</option>
                        )}
                    </select>
                    {errors.visitType && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.visitType}</p>}
                </div>
                <div>
                    <Label htmlFor="visitSummary">{t('visitSummary') || 'Summary'} <span className="text-red-500">*</span></Label>
                    <textarea
                        id="visitSummary"
                        rows={4}
                        value={summary}
                        onChange={(e) => {
                            setSummary(e.target.value);
                            clearError('summary');
                        }}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                        placeholder={t('writeVisitSummary') || 'What happened on this visit?'}
                    />
                    {errors.summary && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.summary}</p>}
                </div>
                <div>
                    <Label htmlFor="visitDatetime">{t('visitDatetime') || 'Visit date & time'} <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                        <input
                            type="datetime-local"
                            id="visitDatetime"
                            value={visitDatetime}
                            onChange={(e) => {
                                setVisitDatetime(e.target.value);
                                clearError('visitDatetime');
                            }}
                            className={`flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${errors.visitDatetime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100`}
                        />
                        <Button type="button" variant="secondary" onClick={setVisitDatetimeToNow} className="whitespace-nowrap">
                            {t('now') || 'Now'}
                        </Button>
                    </div>
                    {errors.visitDatetime && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.visitDatetime}</p>}
                </div>
                <div>
                    <Label htmlFor="upcomingVisitDate">{t('upcomingVisitDate') || 'Next visit (optional)'}</Label>
                    <input
                        type="datetime-local"
                        id="upcomingVisitDate"
                        value={upcomingVisitDate}
                        onChange={(e) => setUpcomingVisitDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
