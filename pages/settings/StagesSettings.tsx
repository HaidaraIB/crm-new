import React from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, TrashIcon, PlusIcon, EditIcon } from '../../components/index';
import { Stage } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useStages, useDeleteStage } from '../../hooks/useQueries';

export const StagesSettings = () => {
    const { 
        t,
        language,
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsAddStageModalOpen,
        setIsEditStageModalOpen,
        setEditingStage
    } = useAppContext();
    
    // Fetch stages using React Query
    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);
    
    // Delete mutation
    const deleteStageMutation = useDeleteStage();

    const handleEditStage = (stage: Stage) => {
        setEditingStage(stage);
        setIsEditStageModalOpen(true);
    };

    const handleDeleteStage = (id: number) => {
        const stage = stages.find(s => s.id === id);
        if (stage) {
                                        setConfirmDeleteConfig({
                                            title: t('deleteStage') || 'Delete Stage',
                                            message: t('confirmDeleteStage') || 'Are you sure you want to delete',
                                            itemName: stage.name,
                                            onConfirm: async () => {
                                                try {
                                                    await deleteStageMutation.mutateAsync(id);
                                                } catch (error) {
                                                    console.error('Error deleting stage:', error);
                                                    throw error;
                                                }
                                            },
                                        });
                                        setIsConfirmDeleteModalOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('leadStages')}</h2>
                    <Button onClick={() => setIsAddStageModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addStage')} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addStage')}</>
                        )}
                                </Button>
                            </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                    {t('stageName')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                                    {t('description')}
                                </th>
                                <th className="px-6 py-4 text-left rtl:text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[120px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {stages && stages.length > 0 ? stages.map(stage => (
                                <tr 
                                    key={stage.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {stage.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md">
                                            {stage.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`flex items-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                onClick={() => handleEditStage(stage)}
                                                title={t('edit') || 'Edit'}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-red-600 dark:text-red-400"
                                                onClick={() => handleDeleteStage(stage.id)}
                                                title={t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('noStagesFound') || 'No stages found'}
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
