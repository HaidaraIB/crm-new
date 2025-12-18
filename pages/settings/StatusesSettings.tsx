import React from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, TrashIcon, PlusIcon, EditIcon } from '../../components/index';
import { Status } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useStatuses, useDeleteStatus } from '../../hooks/useQueries';

export const StatusesSettings = () => {
    const { 
        t,
        language,
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsAddStatusModalOpen,
        setIsEditStatusModalOpen,
        setEditingStatus
    } = useAppContext();
    
    // Fetch statuses using React Query
    const { data: statusesData } = useStatuses();
    const statuses = Array.isArray(statusesData) 
        ? statusesData 
        : (statusesData?.results || []);
    
    // Delete mutation
    const deleteStatusMutation = useDeleteStatus();

    const handleEditStatus = (status: Status) => {
        setEditingStatus(status);
        setIsEditStatusModalOpen(true);
    };

    const handleDeleteStatus = (id: number) => {
        const status = statuses.find(s => s.id === id);
        if (!status) return;
        
        if (status.isDefault) {
            alert(t('cannotDeleteDefault') || 'Cannot delete default status');
            return;
        }
        
        setConfirmDeleteConfig({
            title: t('deleteStatus') || 'Delete Status',
            message: t('confirmDeleteStatus') || 'Are you sure you want to delete',
            itemName: status.name,
            onConfirm: async () => {
                try {
                    await deleteStatusMutation.mutateAsync(id);
                } catch (error) {
                    console.error('Error deleting status:', error);
                    throw error;
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('availableStatuses')}</h2>
                    <Button onClick={() => setIsAddStatusModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addStatus')} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addStatus')}</>
                        )}
                    </Button>
                </div>
                 <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px]">
                                    {t('color') || 'Color'}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                    {t('name')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                                    {t('description')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                                    {t('category')}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[140px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {statuses.length > 0 ? statuses.map(status => (
                                <tr 
                                    key={status.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div 
                                            className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700" 
                                            style={{ backgroundColor: status.color || '#808080' }}
                                            title={status.color}
                                        />
                                    </td>
                                    <td className={`px-6 py-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                        <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''} ${language === 'ar' ? 'justify-end' : ''}`}>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {status.name}
                                            </span>
                                            {status.isDefault && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 flex-shrink-0">
                                                    {t('default')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md">
                                            {status.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {(() => {
                                            const categoryLower = status.category?.toLowerCase() || '';
                                            const isFollowUp = categoryLower === 'follow up' || categoryLower === 'follow_up' || categoryLower === 'followup';
                                            const isActive = categoryLower === 'active';
                                            const isInactive = categoryLower === 'inactive';
                                            const isClosed = categoryLower === 'closed';
                                            
                                            return (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                    isInactive ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                    isFollowUp ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                }`}>
                                                    {isFollowUp ? t('followUp') : 
                                                     isActive ? t('active') :
                                                     isInactive ? t('inactive') :
                                                     isClosed ? t('closed') :
                                                     status.category}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                onClick={() => handleEditStatus(status)}
                                                title={t('edit') || 'Edit'}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-red-600 dark:text-red-400"
                                                disabled={status.isDefault} 
                                                onClick={() => handleDeleteStatus(status.id)}
                                                title={status.isDefault ? t('cannotDeleteDefault') || 'Cannot delete default' : t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('noStatusesFound') || 'No statuses found'}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
