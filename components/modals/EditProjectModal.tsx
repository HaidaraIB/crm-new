
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Project } from '../../types';
import { useUpdateProject, useDevelopers } from '../../hooks/useQueries';

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


export const EditProjectModal = () => {
    const { isEditProjectModalOpen, setIsEditProjectModalOpen, t, editingProject, setEditingProject, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [formState, setFormState] = useState<Omit<Project, 'id' | 'code'>>({
        name: '',
        developer: '',
        type: '',
        city: '',
        paymentMethod: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    // Fetch developers using React Query
    const { data: developersResponse } = useDevelopers();
    const developers = developersResponse?.results || [];
    
    // Update project mutation
    const updateProjectMutation = useUpdateProject();
    const isLoading = updateProjectMutation.isPending;

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('projectNameRequired') || 'Project name is required';
        }

        if (!formState.developer) {
            newErrors.developer = t('developerRequired') || 'Developer is required';
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

    useEffect(() => {
        if (editingProject) {
            // Handle developer - it might be an object with id, or just an id, or a name
            let developerId = '';
            if (typeof editingProject.developer === 'object' && editingProject.developer?.id) {
                developerId = editingProject.developer.id.toString();
            } else if (typeof editingProject.developer === 'number') {
                developerId = editingProject.developer.toString();
            } else if (typeof editingProject.developer === 'string') {
                // If it's a string, try to find the developer by name
                const foundDeveloper = developers.find(d => d.name === editingProject.developer);
                developerId = foundDeveloper ? foundDeveloper.id.toString() : '';
            }
            
            // Handle paymentMethod - API might return payment_method (snake_case) or paymentMethod (camelCase)
            const paymentMethod = (editingProject as any).paymentMethod || (editingProject as any).payment_method || 'Cash';
            
            setFormState({
                name: editingProject.name,
                developer: developerId,
                type: editingProject.type || '',
                city: editingProject.city || '',
                paymentMethod: paymentMethod,
            });
        }
    }, [editingProject, developers]);

    const handleClose = () => {
        setIsEditProjectModalOpen(false);
        setEditingProject(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;
        
        if (!validateForm()) {
            return;
        }
        
        try {
            // Prepare project data with developer ID (not name) and company ID
            const projectData: any = {
                name: formState.name,
                developer: Number(formState.developer), // Convert to number (ID)
                type: formState.type || null,
                city: formState.city || null,
                payment_method: formState.paymentMethod || null, // Send as payment_method (snake_case) for API
                paymentMethod: formState.paymentMethod || null, // Also send as paymentMethod (camelCase) for compatibility
                company: currentUser?.company?.id,
            };
            
            if (!projectData.company) {
                throw new Error(t('companyRequired') || 'Company information is required');
            }
            
            if (!projectData.developer || isNaN(projectData.developer)) {
                throw new Error(t('developerRequired') || 'Developer is required');
            }
            
            await updateProjectMutation.mutateAsync({
                id: editingProject.id,
                data: projectData,
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('projectUpdatedSuccessfully') || 'Project updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating project:', error);
            setErrors({ _general: error?.message || t('errorUpdatingProject') || 'Failed to update project. Please try again.' });
        }
    };

    if (!editingProject) return null;

    return (
        <Modal isOpen={isEditProjectModalOpen} onClose={handleClose} title={`${t('edit')} ${t('project')}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
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
                        {developers.map(dev => <option key={dev.id} value={dev.id.toString()}>{dev.name}</option>)}
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
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isLoading} loading={isLoading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};
