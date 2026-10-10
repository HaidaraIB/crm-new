
import React, { useState, useEffect, useRef } from 'react';
import { Alert } from '../Alert';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import {Input, AutoDirTextarea } from '../Input';
import { Button } from '../Button';
import { ProductCategory } from '../../types';
import { useUpdateProductCategory, useProductCategories } from '../../hooks/useQueries';
import { buildUpdateDiff } from '../../utils/buildUpdateDiff';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';

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
    const productCategories: ProductCategory[] = Array.isArray(categoriesResponse) 
        ? categoriesResponse 
        : (categoriesResponse?.results || []);
    
    // Update product category mutation
    const updateProductCategoryMutation = useUpdateProductCategory();
    const loading = updateProductCategoryMutation.isPending;
    const initialPayloadRef = useRef<Record<string, unknown> | null>(null);

    const buildPayload = (state: typeof formState): Record<string, unknown> => {
        const selectedParentCategory = state.parentCategory
            ? productCategories.find(cat => cat.name === state.parentCategory)
            : null;

        return {
            name: state.name.trim(),
            description: state.description?.trim() || '',
            company: currentUser?.company?.id || currentUser?.company_id,
            parent_category: selectedParentCategory ? selectedParentCategory.id : null,
        };
    };
    
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const translate = (key: string) => {
        const value = t(key as never);
        return value && value !== key ? value : undefined;
    };

    const catalogValues = (): Record<string, unknown> => ({
            name: formState.name,
            description: formState.description,
    });

    const applyCatalog = (values: Record<string, unknown>) => {
        const next = catalogFieldErrors('product_category.upsert', values, translate);

        return next;
    };

    const validateForm = (): boolean => {
        const next = applyCatalog(catalogValues());
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const blurField = (field: string) => {
        const next = applyCatalog(catalogValues());
        setErrors((prev) => {
            const updated = { ...prev };
            if (next[field]) updated[field] = next[field];
            else delete updated[field];
            return updated;
        });
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
            
            const initState = {
                name: editingProductCategory.name || '',
                description: editingProductCategory.description || '',
                parentCategory: parentCategoryName,
            };
            setFormState(initState);
            initialPayloadRef.current = buildPayload(initState);
            setErrors({});
        } else {
            initialPayloadRef.current = null;
        }
    }, [editingProductCategory, productCategories, currentUser?.company?.id, currentUser?.company_id]);

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
            const updateData = buildPayload(formState);
            const patch = buildUpdateDiff(initialPayloadRef.current || {}, updateData);
            if (Object.keys(patch).length === 0) {
                handleClose();
                return;
            }

            await updateProductCategoryMutation.mutateAsync({
                id: editingProductCategory.id,
                data: patch,
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('productCategoryUpdatedSuccessfully') || 'Product category updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating product category:', error);
            const serverErrors = serverFieldErrors(error, 'product_category.upsert', translate);
            if (serverErrors.company && !serverErrors._general) serverErrors._general = serverErrors.company;
            if (Object.keys(serverErrors).length) setErrors((prev) => ({ ...prev, ...serverErrors }));
            else setErrors({ _general: error?.message || t('failedToUpdateProductCategory') || 'Failed to update product category. Please try again.' });
        }
    };

    if (!editingProductCategory) return null;

    return (
        <Modal isOpen={isEditProductCategoryModalOpen} onClose={handleClose} title={t('editProductCategory') || 'Edit Product Category'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <Alert variant="error">{errors._general}</Alert>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterCategoryName') || 'Enter category name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''} onBlur={() => blurField('name')} />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <AutoDirTextarea 
                        id="description" 
                        rows={3} 
                        value={formState.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                        placeholder={t('enterCategoryDescription') || 'Enter category description'} onBlur={() => blurField('description')} />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                    )}
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

