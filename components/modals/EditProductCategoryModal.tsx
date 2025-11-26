
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { ProductCategory } from '../../types';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => {
    const { language } = useAppContext();
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100">
            {children}
        </select>
    );
};

export const EditProductCategoryModal = () => {
    const { isEditProductCategoryModalOpen, setIsEditProductCategoryModalOpen, t, updateProductCategory, editingProductCategory, setEditingProductCategory, productCategories, language } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        parentCategory: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingProductCategory) {
            setFormState({
                name: editingProductCategory.name,
                description: editingProductCategory.description,
                parentCategory: editingProductCategory.parentCategory?.toString() || '',
            });
        }
    }, [editingProductCategory]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleClose = () => {
        setIsEditProductCategoryModalOpen(false);
        setEditingProductCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProductCategory || !formState.name) {
            alert(t('fillRequiredFields') || 'Please fill in required fields');
            return;
        }

        setLoading(true);
        try {
            await updateProductCategory({
                ...editingProductCategory,
                name: formState.name,
                description: formState.description,
                parentCategory: formState.parentCategory || undefined,
            });
            handleClose();
        } catch (error: any) {
            console.error('Error updating product category:', error);
            const errorMessage = error?.message || t('failedToUpdateProductCategory') || 'Failed to update product category. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!editingProductCategory) return null;

    return (
        <Modal isOpen={isEditProductCategoryModalOpen} onClose={handleClose} title={t('editProductCategory') || 'Edit Product Category'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')} *</Label>
                    <Input id="name" placeholder={t('enterCategoryName') || 'Enter category name'} value={formState.name} onChange={handleChange} required />
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
                        {productCategories.filter(c => c.id !== editingProductCategory.id).map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                    </Select>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

