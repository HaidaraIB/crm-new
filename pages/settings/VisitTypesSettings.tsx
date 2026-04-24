
import React from 'react';
import { Card, Button, TrashIcon, PlusIcon, EditIcon } from '../../components/index';
import { useAppContext } from '../../context/AppContext';
import { useVisitTypes, useDeleteVisitType, useUpdateVisitType } from '../../hooks/useQueries';

export interface VisitTypeRow {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  isDefault?: boolean;
  is_default?: boolean;
}

export const VisitTypesSettings = () => {
    const {
        t,
        language,
        currentUser,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddVisitTypeModalOpen,
        setIsEditVisitTypeModalOpen,
        setEditingVisitType,
    } = useAppContext();

    const { data: visitTypesData } = useVisitTypes();
    const visitTypes = Array.isArray(visitTypesData)
        ? visitTypesData
        : (visitTypesData?.results || []);

    const deleteVisitTypeMutation = useDeleteVisitType();
    const updateVisitTypeMutation = useUpdateVisitType();

    const handleSetDefault = (row: VisitTypeRow & { company?: number }) => {
        if (row.isDefault ?? row.is_default) return;
        const companyId = row.company ?? currentUser?.company?.id;
        if (!companyId) return;
        updateVisitTypeMutation.mutate({
            id: row.id,
            data: {
                name: row.name,
                description: row.description ?? '',
                color: row.color ?? '#808080',
                company: companyId,
                is_active: row.is_active ?? true,
                is_default: true,
            },
        });
    };

    const handleEdit = (row: VisitTypeRow) => {
        setEditingVisitType(row);
        setIsEditVisitTypeModalOpen(true);
    };

    const handleDelete = (id: number) => {
        const row = visitTypes.find((v: VisitTypeRow) => v.id === id);
        if (row) {
            setConfirmDeleteConfig({
                title: t('deleteVisitType') || 'Delete visit type',
                message: t('confirmDeleteVisitType') || 'Are you sure you want to delete',
                itemName: row.name,
                onConfirm: async () => {
                    await deleteVisitTypeMutation.mutateAsync(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{t('visitTypes') || 'Visit types'}</h2>
                    <Button onClick={() => setIsAddVisitTypeModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addVisitType') || 'Add visit type'} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addVisitType') || 'Add visit type'}</>
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
                                    {t('visitTypeName') || 'Name'}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                                    {t('description')}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[90px]">
                                    {t('default') || 'Default'}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[120px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {visitTypes?.length > 0 ? visitTypes.map((row: VisitTypeRow) => {
                                const isDefault = row.isDefault ?? row.is_default;
                                return (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center">
                                                <div
                                                    className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                                                    style={{ backgroundColor: row.color || '#808080' }}
                                                    title={row.color}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                                {row.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {isDefault ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary dark:bg-primary-900 dark:text-primary-200">
                                                    {t('default')}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="text-xs text-primary hover:underline"
                                                    onClick={() => handleSetDefault(row)}
                                                    disabled={updateVisitTypeMutation.isPending}
                                                >
                                                    {t('setAsDefault') || 'Set as default'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                    onClick={() => handleEdit(row)}
                                                    title={t('edit') || 'Edit'}
                                                >
                                                    <EditIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-red-600 dark:text-red-400"
                                                    onClick={() => handleDelete(row.id)}
                                                    title={t('delete') || 'Delete'}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('noVisitTypesFound') || 'No visit types yet'}
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
