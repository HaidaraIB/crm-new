
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { ProductCategory } from '../../types';
import { useUpdateProductCategory, useProductCategories } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => {
    const { language } = useAppContext();
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const EditProductCategoryModal = () => {
    const { isEditProductCategoryModalOpen, setIsEditProductCategoryModalOpen, t, editingProductCategory, setEditingProductCategory, language, setIsSuccessModalOpen, setSuccessMessage, currentUser } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        parentCategory: '',
    });
    
    // Fetch product categories using React Query
    const { data: categoriesResponse } = useProductCategories();
    const productCategories = Array.isArray(categoriesResponse) 
        ? categoriesResponse 
        : (categoriesResponse?.results || []);
    
    // Update product category mutation
    const updateProductCategoryMutation = useUpdateProductCategory();
    const loading = updateProductCategoryMutation.isPending;
    
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

    useEffect(() => {
        if (editingProductCategory) {
            // Get parent category name from productCategories if parentCategory is an ID
            let parentCategoryName = '';
            if (editingProductCategory.parentCategory) {
                const parentId = typeof editingProductCategory.parentCategory === 'number' 
                    ? editingProductCategory.parentCategory 
                    : Number(editingProductCategory.parentCategory);
                
                // Try to find parent category in the list
                const parentCategory = productCategories.find(cat => cat.id === parentId);
                if (parentCategory) {
                    parentCategoryName = parentCategory.name;
                } else {
                    // If not found, wait a bit for categories to load, or use the ID as fallback
                    // The select will show the ID if name is not found
                }
            }
            
            setFormState({
                name: editingProductCategory.name || '',
                description: editingProductCategory.description || '',
                parentCategory: parentCategoryName,
            });
            setErrors({});
        }
    }, [editingProductCategory, productCategories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsEditProductCategoryModalOpen(false);
        setEditingProductCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProductCategory) return;
        
        if (!validateForm()) {
            return;
        }

        try {
            // Find parent category by name to get its ID
            const selectedParentCategory = formState.parentCategory 
                ? productCategories.find(cat => cat.name === formState.parentCategory)
                : null;

            const updateData: any = {
                name: formState.name.trim(),
                description: formState.description?.trim() || '',
                company: currentUser?.company?.id || currentUser?.company_id,
                parent_category: selectedParentCategory ? selectedParentCategory.id : null,
            };

            await updateProductCategoryMutation.mutateAsync({
                id: editingProductCategory.id,
                data: updateData
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('productCategoryUpdatedSuccessfully') || 'Product category updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating product category:', error);
            
            // Parse API validation errors
            const apiErrors = error?.response?.data || {};
            const newErrors: { [key: string]: string } = {};
            
            Object.keys(apiErrors).forEach(key => {
                const errorMessages = Array.isArray(apiErrors[key]) 
                    ? apiErrors[key] 
                    : [apiErrors[key]];
                newErrors[key] = errorMessages[0];
            });
            
            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToUpdateProductCategory') || 'Failed to update product category. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    if (!editingProductCategory) return null;

    return (
        <Modal isOpen={isEditProductCategoryModalOpen} onClose={handleClose} title={t('editProductCategory') || 'Edit Product Category'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterCategoryName') || 'Enter category name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <textarea 
                        id="description" 
                        rows={3} 
                        value={formState.description}
                        onChange={handleChange}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                        placeholder={t('enterCategoryDescription') || 'Enter category description'}
                    />
                </div>
                <div>
                    <Label htmlFor="parentCategory">{t('parentCategory')}</Label>
                    <Select id="parentCategory" value={formState.parentCategory} onChange={handleChange}>
                        <option value="">{t('selectParentCategory') || 'Select Parent Category (Optional)'}</option>
                        {(productCategories || []).filter(c => c.id !== editingProductCategory.id).map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                    </Select>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

