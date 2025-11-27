
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => {
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const AddProjectModal = () => {
    const { isAddProjectModalOpen, setIsAddProjectModalOpen, t, addProject, developers } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        developer: '',
        type: 'Residential',
        city: '',
        paymentMethod: 'Cash',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('projectNameRequired') || 'Project name is required';
        }

        if (!formState.developer) {
            newErrors.developer = t('developerRequired') || 'Developer is required';
        }

        if (developers.length === 0) {
            newErrors.developer = t('noDevelopersAvailable') || 'No developers available. Please add a developer first.';
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

    // تحديث developer عند فتح الـ modal أو عند تحميل developers
    useEffect(() => {
        if (isAddProjectModalOpen && developers.length > 0) {
            setFormState(prev => {
                // إذا كان developer فارغ، اختر الأول
                if (!prev.developer) {
                    return { ...prev, developer: developers[0].name };
                }
                return prev;
            });
        }
    }, [isAddProjectModalOpen, developers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        try {
            await addProject(formState);
            handleClose();
        } catch (error: any) {
            console.error('Error adding project:', error);
            alert(error?.message || 'Failed to add project. Please try again.');
        }
    };

    const handleClose = () => {
        setIsAddProjectModalOpen(false);
        // Reset form عند الإغلاق
        setFormState({
            name: '',
            developer: '',
            type: 'Residential',
            city: '',
            paymentMethod: 'Cash',
        });
    };

    return (
        <Modal isOpen={isAddProjectModalOpen} onClose={handleClose} title={t('addNewProject')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <Label htmlFor="name">{t('projectName')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterProjectName')} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="developer">{t('developer')} <span className="text-red-500">*</span></Label>
                    <Select 
                        id="developer" 
                        value={formState.developer} 
                        onChange={handleChange}
                        className={errors.developer ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option value="">{t('selectDeveloper') || 'Select Developer'}</option>
                        {developers.map(dev => <option key={dev.id} value={dev.name}>{dev.name}</option>)}
                    </Select>
                    {errors.developer && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.developer}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="type">{t('type')}</Label>
                    <Input id="type" placeholder="e.g. Residential" value={formState.type} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="city">{t('city')}</Label>
                    <Input id="city" placeholder="e.g. Dubai" value={formState.city} onChange={handleChange} />
                </div>
                 <div>
                    <Label htmlFor="paymentMethod">{t('paymentMethod')}</Label>
                    <Select id="paymentMethod" value={formState.paymentMethod} onChange={handleChange}>
                        <option value="Cash">{t('cash')}</option>
                        <option value="Installments">{t('installment')}</option>
                    </Select>
                </div>
                <div className="flex justify-end">
                    <Button type="submit">{t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};
