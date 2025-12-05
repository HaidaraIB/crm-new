



import React, { useState } from 'react';
// FIX: Corrected component import path to avoid conflict with `components.tsx`.
import { Card, Button, Input, TrashIcon, EyeIcon, EyeOffIcon, PlusIcon } from '../../components/index';
import { Status } from '../../types';
import { useAppContext } from '../../context/AppContext';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void, className?:string }) => (
    <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${className}`}>
        {children}
    </select>
);

export const StatusesSettings = () => {
    const { t, statuses, addStatus, updateStatus, deleteStatus, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
    const [editingStatuses, setEditingStatuses] = useState<{ [key: number]: Partial<Status> }>({});
    const [updateTimeouts, setUpdateTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});

    const handleStatusChange = async (id: number, field: keyof Status, value: any, immediate: boolean = false) => {
        const status = statuses.find(s => s.id === id);
        if (!status) return;

        // Update local state immediately
        setEditingStatuses(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

        if (immediate) {
            // Update immediately (for toggles, color changes)
            const updatedStatus = { ...status, [field]: value };
            try {
                await updateStatus(updatedStatus);
            } catch (error) {
                console.error('Error updating status:', error);
            }
        } else {
            // Debounce for text inputs
            if (updateTimeouts[id]) {
                clearTimeout(updateTimeouts[id]);
            }
            
            const timeout = setTimeout(async () => {
                const updatedStatus = { ...status, [field]: value };
                try {
                    await updateStatus(updatedStatus);
                } catch (error) {
                    console.error('Error updating status:', error);
                }
            }, 500);
            
            setUpdateTimeouts(prev => ({ ...prev, [id]: timeout }));
        }
    };

    const handleAddStatus = async () => {
        try {
            await addStatus({
                name: '',
                description: '',
                category: 'Active',
                color: '#808080', // Default color, but not shown in UI
                isDefault: false,
                isHidden: false,
            });
        } catch (error) {
            console.error('Error adding status:', error);
        }
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
                    await deleteStatus(id);
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
                    <Button onClick={() => handleAddStatus()}><PlusIcon className="w-4 h-4" /> {t('addStatus')}</Button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left rtl:text-right text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-2 min-w-[200px]">{t('name')}</th>
                                <th className="p-2 min-w-[250px]">{t('description')}</th>
                                <th className="p-2 min-w-[150px]">{t('category')}</th>
                                <th className="p-2">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statuses.map(status => (
                                <tr key={status.id} className="border-t dark:border-gray-700">
                                    <td className="p-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editingStatuses[status.id]?.name !== undefined ? editingStatuses[status.id].name : status.name}
                                                onChange={(e) => handleStatusChange(status.id, 'name', e.target.value, false)}
                                                className="text-sm"
                                            />
                                            {status.isDefault && <span className="text-xs whitespace-nowrap font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">Default</span>}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                         <Input
                                            value={editingStatuses[status.id]?.description !== undefined ? editingStatuses[status.id].description : status.description}
                                            onChange={(e) => handleStatusChange(status.id, 'description', e.target.value, false)}
                                            className="text-sm"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Select
                                            id={`category-${status.id}`}
                                            value={editingStatuses[status.id]?.category || status.category}
                                            onChange={(e) => handleStatusChange(status.id, 'category', e.target.value as Status['category'], true)}
                                            className="text-sm"
                                        >
                                            <option value="Active">{t('active')}</option>
                                            <option value="Inactive">{t('inactive')}</option>
                                            <option value="Follow Up">{t('followUp')}</option>
                                            <option value="Closed">{t('closed')}</option>
                                        </Select>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" className="p-1 h-auto !text-gray-700 dark:!text-gray-300" onClick={() => handleStatusChange(status.id, 'isHidden', !status.isHidden, true)}>
                                                {status.isHidden ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" disabled={status.isDefault} onClick={() => handleDeleteStatus(status.id)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
