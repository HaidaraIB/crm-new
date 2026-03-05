
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Loader } from '../../components/index';
import { FileTextIcon, SearchIcon, EditIcon, PlusIcon } from '../../components/icons';
import { EditTemplateModal } from '../../components/modals/EditTemplateModal';
import { useAppContext } from '../../context/AppContext';
import {
    getMessageTemplatesAPI,
    syncWhatsAppTemplatesAPI,
    deleteMessageTemplateAPI,
    submitMessageTemplateToWhatsAppAPI,
    type MessageTemplateType,
} from '../../services/api';

export const TemplateManagementSettings = () => {
    const { t, language, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen, showAlert } = useAppContext();
    const [templateSearch, setTemplateSearch] = useState('');
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplateType | null>(null);
    const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
    const [syncingTemplates, setSyncingTemplates] = useState(false);
    const [submittingTemplateId, setSubmittingTemplateId] = useState<number | null>(null);

    const { data: templates = [], refetch: refetchTemplates } = useQuery({
        queryKey: ['messageTemplates'],
        queryFn: getMessageTemplatesAPI,
    });

    const filteredTemplates = useMemo(() => {
        if (!templateSearch.trim()) return templates;
        const q = templateSearch.trim().toLowerCase();
        return templates.filter(
            (tpl) =>
                (tpl.name || '').toLowerCase().includes(q) ||
                ((tpl as any).language || '').toLowerCase().includes(q)
        );
    }, [templates, templateSearch]);

    const categoryLabelKey = (cat: string) =>
        cat === 'marketing' ? 'categoryMarketingLabel' : cat === 'auth' ? 'categoryAuthLabel' : cat === 'utility' ? 'categoryUtilityLabel' : cat === 'carousel' ? 'categoryCarouselLabel' : cat === 'single_product' ? 'categorySingleProductLabel' : cat === 'multi_product' ? 'categoryMultiProductLabel' : cat === 'product_card_carousel' ? 'categoryProductCardCarouselLabel' : cat === 'limited_time_offer' ? 'categoryLimitedTimeOfferLabel' : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end flex-wrap gap-3">
                <Button
                    variant="secondary"
                    disabled={syncingTemplates}
                    onClick={async () => {
                        setSyncingTemplates(true);
                        try {
                            await syncWhatsAppTemplatesAPI();
                            await refetchTemplates();
                            showAlert(t('templatesSynced') || 'Templates synced.', 'info');
                        } catch (e: any) {
                            const errKey = e?.data?.error_key;
                            showAlert((errKey && t(errKey)) ? t(errKey) : (e?.data?.error || e?.message || 'Sync failed'), 'error');
                        } finally {
                            setSyncingTemplates(false);
                        }
                    }}
                    className="min-w-[5rem]"
                >
                    {syncingTemplates ? (
                        <>
                            <svg className="w-4 h-4 me-2 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t('syncing')}
                        </>
                    ) : (
                        t('sync') || 'Sync'
                    )}
                </Button>
                <Button onClick={() => { setEditingTemplate(null); setIsEditTemplateOpen(true); }}>
                    <PlusIcon className="w-4 h-4 me-2" /> {t('addTemplate') || 'Add Template'}
                </Button>
            </div>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder={t('search') || 'Search'}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            </div>
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{t('templateLanguage') || 'Language'}</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{t('name') || 'Name'}</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{t('category')}</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">{t('status')}</th>
                                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 w-[180px]">{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTemplates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {templates.length === 0
                                            ? (t('noTemplates') || 'No templates yet. Create one with + Template.')
                                            : (t('search') || 'Search') + ' — ' + (t('noResultsFound') || 'No results found')}
                                    </td>
                                </tr>
                            ) : (
                                filteredTemplates.map((tpl) => {
                                    const isWa = (tpl.channel_type || '').toLowerCase() === 'whatsapp' || (tpl.channel_type || '').toLowerCase() === 'whatsapp_api';
                                    const metaStatus = (tpl as MessageTemplateType).meta_status || 'PENDING';
                                    const cat = (tpl.category || '').toLowerCase();
                                    const labelKey = categoryLabelKey(cat);
                                    const categoryDisplay = labelKey ? t(labelKey) : (tpl.category_display || tpl.category || '').toUpperCase();
                                    return (
                                        <tr key={tpl.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 even:bg-gray-50/50 dark:even:bg-gray-800/20">
                                            <td className="py-3 px-4 text-center text-sm text-gray-900 dark:text-white">{(tpl as any).language || 'AR'}</td>
                                            <td className="py-3 px-4 text-center text-sm text-gray-900 dark:text-white font-medium">{tpl.name}</td>
                                            <td className="py-3 px-4 text-center text-sm text-gray-900 dark:text-white">{categoryDisplay || '—'}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${metaStatus === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : metaStatus === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {metaStatus === 'APPROVED' ? (t('templateApproved') || 'APPROVED') : metaStatus === 'REJECTED' ? (t('templateRejected') || 'REJECTED') : (t('templatePending') || 'PENDING')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-center items-center gap-0.5">
                                                    {isWa && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 shrink-0 min-w-[7rem]"
                                                            disabled={submittingTemplateId === tpl.id}
                                                            onClick={async () => {
                                                                setSubmittingTemplateId(tpl.id);
                                                                try {
                                                                    await submitMessageTemplateToWhatsAppAPI(tpl.id);
                                                                    showAlert(t('templateSubmittedToWhatsApp') || 'Template submitted to WhatsApp for review.', 'info');
                                                                    refetchTemplates();
                                                                } catch (e: any) {
                                                                    const errKey = e?.data?.error_key;
                                                                    showAlert((errKey && t(errKey)) ? t(errKey) : (e?.data?.error || e?.message || t('failedToSendSms')), 'error');
                                                                } finally {
                                                                    setSubmittingTemplateId(null);
                                                                }
                                                            }}
                                                        >
                                                            {submittingTemplateId === tpl.id ? (
                                                                <>
                                                                    <svg className="w-4 h-4 me-1.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                    </svg>
                                                                    {t('submittingToWhatsApp')}
                                                                </>
                                                            ) : (
                                                                t('submitToWhatsApp') || 'Submit to WhatsApp'
                                                            )}
                                                        </Button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setConfirmDeleteConfig({
                                                                title: t('deleteTemplate'),
                                                                message: t('deleteTemplateConfirm'),
                                                                itemName: tpl.name,
                                                                confirmButtonText: t('delete'),
                                                                confirmButtonVariant: 'danger',
                                                                onConfirm: async () => {
                                                                    await deleteMessageTemplateAPI(tpl.id);
                                                                    refetchTemplates();
                                                                },
                                                            });
                                                            setIsConfirmDeleteModalOpen(true);
                                                        }}
                                                        className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-red-600 rounded-lg border border-gray-200 dark:border-gray-600"
                                                        title={t('deleteTemplate')}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { navigator.clipboard.writeText(tpl.content); showAlert(t('copied'), 'info'); }}
                                                        className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-primary rounded-lg border border-gray-200 dark:border-gray-600"
                                                        title={t('copyTemplate')}
                                                    >
                                                        <FileTextIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingTemplate(tpl); setIsEditTemplateOpen(true); }}
                                                        className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-primary rounded-lg border border-gray-200 dark:border-gray-600"
                                                        title={t('edit')}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <EditTemplateModal
                isOpen={isEditTemplateOpen}
                onClose={() => { setIsEditTemplateOpen(false); setEditingTemplate(null); }}
                template={editingTemplate}
                t={t}
                language={language}
                onSuccess={() => refetchTemplates()}
                onSendToReview={editingTemplate ? async (templateId, lang) => {
                    await submitMessageTemplateToWhatsAppAPI(templateId, { language: lang });
                    showAlert(t('templateSubmittedToWhatsApp') || 'Template submitted to WhatsApp for review.', 'info');
                    refetchTemplates();
                } : undefined}
                onRequestDelete={(tpl) => {
                    setConfirmDeleteConfig({
                        title: t('deleteTemplate'),
                        message: t('deleteTemplateConfirm'),
                        itemName: tpl.name,
                        confirmButtonText: t('delete'),
                        confirmButtonVariant: 'danger',
                        onConfirm: async () => {
                            await deleteMessageTemplateAPI(tpl.id);
                            refetchTemplates();
                            setIsEditTemplateOpen(false);
                            setEditingTemplate(null);
                        },
                    });
                    setIsConfirmDeleteModalOpen(true);
                }}
            />
        </div>
    );
};
