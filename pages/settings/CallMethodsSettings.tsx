
import React from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, TrashIcon, PlusIcon, EditIcon } from '../../components/index';
import { useAppContext } from '../../context/AppContext';
import { useCallMethods, useDeleteCallMethod } from '../../hooks/useQueries';

export interface CallMethod {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

export const CallMethodsSettings = () => {
    const { 
        t,
        language,
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsAddCallMethodModalOpen,
        setIsEditCallMethodModalOpen,
        setEditingCallMethod
    } = useAppContext();
    
    // Fetch call methods using React Query
    const { data: callMethodsData } = useCallMethods();
    const callMethods = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);
    
    // Delete mutation
    const deleteCallMethodMutation = useDeleteCallMethod();

    const handleEditCallMethod = (callMethod: CallMethod) => {
        setEditingCallMethod(callMethod);
        setIsEditCallMethodModalOpen(true);
    };

    const handleDeleteCallMethod = (id: number) => {
        const callMethod = callMethods.find(c => c.id === id);
        if (callMethod) {
            setConfirmDeleteConfig({
                title: t('deleteCallMethod') || 'Delete Call Method',
                message: t('confirmDeleteCallMethod') || 'Are you sure you want to delete',
                itemName: callMethod.name,
                onConfirm: async () => {
                    try {
                        await deleteCallMethodMutation.mutateAsync(id);
                    } catch (error) {
                        console.error('Error deleting call method:', error);
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
                    <h2 className="text-xl font-semibold">{t('callMethods') || 'Call Methods'}</h2>
                    <Button onClick={() => setIsAddCallMethodModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addCallMethod') || 'Add Call Method'} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addCallMethod') || 'Add Call Method'}</>
                        )}
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px]">
                                    {t('color') || 'Color'}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                    {t('callMethodName') || 'Call Method Name'}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                                    {t('description')}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[120px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {callMethods && callMethods.length > 0 ? callMethods.map(callMethod => (
                                <tr 
                                    key={callMethod.id} 
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center">
                                            <div 
                                                className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700" 
                                                style={{ backgroundColor: callMethod.color || '#808080' }}
                                                title={callMethod.color}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {callMethod.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            {callMethod.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                onClick={() => handleEditCallMethod(callMethod)}
                                                title={t('edit') || 'Edit'}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-red-600 dark:text-red-400"
                                                onClick={() => handleDeleteCallMethod(callMethod.id)}
                                                title={t('delete') || 'Delete'}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('noCallMethodsFound') || 'No call methods found'}
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
