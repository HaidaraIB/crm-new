
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

export const AddOwnerModal = () => {
    const { isAddOwnerModalOpen, setIsAddOwnerModalOpen, t, addOwner } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        city: 'Riyadh',
        district: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        addOwner(formState);
        setIsAddOwnerModalOpen(false);
        // Reset form
        setFormState({ name: '', phone: '', city: 'Riyadh', district: '' });
    };

    return (
        <Modal isOpen={isAddOwnerModalOpen} onClose={() => setIsAddOwnerModalOpen(false)} title={t('addNewOwner')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('ownerName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterOwnerFullName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="phone">{t('ownerPhone')}</Label>
                    <Input id="phone" placeholder={t('enterContactPhoneNumber')} value={formState.phone} onChange={handleChange} />
                </div>
                 <div>
                    <Label htmlFor="city">{t('city')}</Label>
                    <Select id="city" value={formState.city} onChange={handleChange}>
                        <option>{t('riyadh')}</option>
                        <option>{t('jeddah')}</option>
                        <option>{t('dammam')}</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="district">{t('ownerDistrict')}</Label>
                    <Input id="district" placeholder={t('enterSpecificDistrict')} value={formState.district} onChange={handleChange} />
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
