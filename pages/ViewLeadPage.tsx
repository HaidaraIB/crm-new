

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, Timeline, DealIcon, EditIcon, PlusIcon, Loader } from '../components/index';
import { formatDateToLocal } from '../utils/dateUtils';

export const ViewLeadPage = () => {
    const { t, selectedLead, setIsAddActionModalOpen, users, clientTasks, setEditingLead, setIsEditLeadModalOpen, setCurrentPage, setSelectedLeadForDeal } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, [selectedLead?.id]);

    // دالة لتحويل stage إلى نص جميل
    const formatStage = (stage: string): string => {
        const stageMap: { [key: string]: string } = {
            'untouched': t('untouched') || 'Untouched',
            'touched': t('touched') || 'Touched',
            'following': t('following') || 'Following',
            'meeting': t('meeting') || 'Meeting',
            'no_answer': t('noAnswer') || 'No Answer',
            'out_of_service': t('outOfService') || 'Out of Service',
        };
        return stageMap[stage.toLowerCase()] || stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // تحويل ClientTasks إلى TimelineEntries
    const leadClientTasks = selectedLead ? clientTasks.filter(ct => ct.clientId === selectedLead.id) : [];
    const timelineHistory = selectedLead ? leadClientTasks.map(ct => {
        const user = users.find(u => u.id === ct.createdBy);
        const formattedStage = formatStage(ct.stage);
        return {
            id: ct.id,
            user: user?.name || 'Unknown',
            avatar: user?.avatar || '',
            action: t('stageUpdated') || 'Stage updated',
            details: ct.notes || '',
            date: formatDateToLocal(ct.createdAt),
            stage: formattedStage, // إضافة stage منسق للاستخدام في العرض
        };
    }) : [];

    if (!selectedLead) {
        return <PageWrapper title={t('leads')}><div>Lead not found</div></PageWrapper>;
    }

    if (loading) {
        return (
            <PageWrapper title={selectedLead.name}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper 
            title={selectedLead.name} 
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="secondary"
                        onClick={() => {
                            if (selectedLead) {
                                setSelectedLeadForDeal(selectedLead.id);
                                setCurrentPage('CreateDeal');
                            }
                        }}
                    >
                        <DealIcon className="w-4 h-4"/> {t('addDeal')}
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => {
                            if (selectedLead) {
                                setEditingLead(selectedLead);
                                setIsEditLeadModalOpen(true);
                            }
                        }}
                    >
                        <EditIcon className="w-4 h-4"/> {t('editClient')}
                    </Button>
                    <Button onClick={() => setIsAddActionModalOpen(true)}><PlusIcon className="w-4 h-4"/> {t('add_action')}</Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('contactInformation') || 'Contact Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('phone')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{selectedLead.phone || '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('communicationWay')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{selectedLead.communicationWay || '-'}</p>
                        </div>
                        {selectedLead.assignedTo > 0 && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('assignedTo')}</label>
                                <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{users.find(u => u.id === selectedLead.assignedTo)?.name || 'Unknown'}</p>
                            </div>
                        )}
                    </div>
                </Card>
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('status')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('status')}</label>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    selectedLead.status === 'Untouched' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                                    selectedLead.status === 'Touched' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    selectedLead.status === 'Following' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    selectedLead.status === 'Meeting' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                    selectedLead.status === 'No Answer' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                    selectedLead.status === 'Out Of Service' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                    {selectedLead.status}
                                </span>
                            </div>
                        </div>
                        {selectedLead.lastStage && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('lastStage')}</label>
                                <div className="mt-1">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {selectedLead.lastStage}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('priority')}</label>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    selectedLead.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    selectedLead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                    {selectedLead.priority}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('type')}</label>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    selectedLead.type === 'Fresh' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    selectedLead.type === 'Cold' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                    {selectedLead.type}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-3 dark:border-gray-700">{t('financialInformation') || 'Financial Information'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('budget')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {selectedLead.budget > 0 ? selectedLead.budget.toLocaleString() : '-'}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('createdAt')}</label>
                            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">{selectedLead.createdAt || '-'}</p>
                        </div>
                        {selectedLead.lastFeedback && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('lastFeedback')}</label>
                                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedLead.lastFeedback}</p>
                            </div>
                        )}
                        {selectedLead.notes && (
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('notes')}</label>
                                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedLead.notes}</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="mt-6">
                <h2 className="text-xl font-bold mb-4">{t('timeline')}</h2>
                <Timeline history={timelineHistory} />
            </div>

        </PageWrapper>
    )
}
