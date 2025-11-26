
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { formatDateToLocal } from '../../utils/dateUtils';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddCampaignModal = () => {
    const { isAddCampaignModalOpen, setIsAddCampaignModalOpen, t, addCampaign } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        code: '',
        budget: '',
        createdAt: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
        isActive: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type, checked } = e.target;
        setFormState(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : value
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name || formState.name.trim() === '') {
            alert('Please enter campaign name');
            return;
        }
        try {
            await addCampaign({
                name: formState.name.trim(),
                budget: Number(formState.budget) || 0,
                isActive: formState.isActive,
            });
            setIsAddCampaignModalOpen(false);
            // Reset form
            setFormState({
                name: '', code: '', budget: '',
                createdAt: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format in local timezone
                isActive: true,
            });
        } catch (error: any) {
            console.error('Error creating campaign:', error);
            const errorMessage = error?.message || 'Failed to create campaign. Please try again.';
            alert(errorMessage);
        }
    };

    return (
        <Modal isOpen={isAddCampaignModalOpen} onClose={() => setIsAddCampaignModalOpen(false)} title={t('addNewCampaign')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input id="name" placeholder={t('enterCampaignName')} value={formState.name} onChange={handleChange} />
                </div>
                 <div>
                    <Label htmlFor="budget">{t('budget')}</Label>
                    <NumberInput id="budget" name="budget" value={formState.budget} onChange={handleChange} placeholder={t('enterCampaignBudget')} min={0} step={1} />
                </div>
                <div className="flex items-center gap-2">
                    <input id="isActive" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={formState.isActive} onChange={handleChange} />
                    <label htmlFor="isActive" className="text-sm font-medium text-secondary">{t('active')}</label>
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
