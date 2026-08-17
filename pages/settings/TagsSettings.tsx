import React from 'react';
import { Card, Button, TrashIcon, PlusIcon, EditIcon, TableHorizontalScroll } from '../../components/index';
import { Tag } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useTags, useDeleteTag } from '../../hooks/useQueries';

export const TagsSettings = () => {
    const {
        t,
        language,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddTagModalOpen,
        setIsEditTagModalOpen,
        setEditingTag,
    } = useAppContext();

    const { data: tagsData } = useTags();
    const tags: Tag[] = Array.isArray(tagsData) ? tagsData : (tagsData?.results || []);

    const deleteTagMutation = useDeleteTag();

    const handleEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setIsEditTagModalOpen(true);
    };

    const handleDeleteTag = (id: number) => {
        const tag = tags.find((item) => item.id === id);
        if (!tag) return;

        setConfirmDeleteConfig({
            title: t('deleteTag') || 'Delete Tag',
            message: t('confirmDeleteTag') || 'Are you sure you want to delete',
            itemName: tag.name,
            onConfirm: async () => {
                try {
                    await deleteTagMutation.mutateAsync(id);
                } catch (error) {
                    console.error('Error deleting tag:', error);
                    throw error;
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold">{t('availableTags')}</h2>
                    <Button onClick={() => setIsAddTagModalOpen(true)}>
                        {language === 'ar' ? (
                            <>{t('addTag')} <PlusIcon className="w-4 h-4" /></>
                        ) : (
                            <><PlusIcon className="w-4 h-4" /> {t('addTag')}</>
                        )}
                    </Button>
                </div>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t('tagsSettingsHint')}</p>
                <TableHorizontalScroll scrollClassName="rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[100px]">
                                    {t('color') || 'Color'}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                                    {t('name')}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[250px]">
                                    {t('description')}
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-[140px]">
                                    {t('actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {tags.length > 0 ? tags.map((tag) => (
                                <tr
                                    key={tag.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div
                                            className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 mx-auto"
                                            style={{ backgroundColor: tag.color || '#808080' }}
                                            title={tag.color}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {tag.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md mx-auto">
                                            {tag.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className={`flex items-center justify-center gap-1 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                                                onClick={() => handleEditTag(tag)}
                                                title={t('edit') || 'Edit'}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-2 h-auto hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-red-600 dark:text-red-400"
                                                onClick={() => handleDeleteTag(tag.id)}
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
                                            {t('noTagsFound') || 'No tags found'}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableHorizontalScroll>
            </Card>
        </div>
    );
};
