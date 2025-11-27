
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { Checkbox } from '../Checkbox';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary mb-1">{children}</label>
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

export const AddProductModal = () => {
    const { isAddProductModalOpen, setIsAddProductModalOpen, t, addProduct, productCategories, suppliers, language } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        description: '',
        price: '',
        cost: '',
        stock: '',
        category: '',
        supplier: '',
        sku: '',
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (!formState.price || Number(formState.price) <= 0) {
            newErrors.price = t('priceRequired') || 'Price is required and must be greater than 0';
        }

        if (!formState.category) {
            newErrors.category = t('categoryRequired') || 'Category is required';
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
        if (isAddProductModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                description: '',
                price: '',
                cost: '',
                stock: '',
                category: '',
                supplier: '',
                sku: '',
                isActive: true,
            });
        }
    }, [isAddProductModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            setFormState(prev => ({ ...prev, [id]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormState(prev => ({ ...prev, [id]: value }));
        }
        clearError(id);
    };

    const handleClose = () => {
        setIsAddProductModalOpen(false);
        setFormState({
            name: '',
            description: '',
            price: '',
            cost: '',
            stock: '',
            category: '',
            supplier: '',
            sku: '',
            isActive: true,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await addProduct({
                name: formState.name,
                description: formState.description,
                price: Number(formState.price) || 0,
                cost: Number(formState.cost) || 0,
                stock: Number(formState.stock) || 0,
                category: formState.category,
                supplier: formState.supplier || undefined,
                sku: formState.sku || undefined,
                isActive: formState.isActive,
            });
            handleClose();
        } catch (error: any) {
            console.error('Error creating product:', error);
            const errorMessage = error?.message || t('failedToCreateProduct') || 'Failed to create product. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddProductModalOpen} onClose={handleClose} title={t('addProduct') || 'Add Product'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterProductName') || 'Enter product name'} 
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
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t('enterProductDescription') || 'Enter product description'}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="price">{t('price')} <span className="text-red-500">*</span></Label>
                        <NumberInput 
                            id="price" 
                            name="price" 
                            value={formState.price} 
                            onChange={handleChange} 
                            placeholder={t('enterPrice') || 'Enter price'} 
                            min={0} 
                            step={0.1}
                            className={errors.price ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="cost">{t('cost')}</Label>
                        <NumberInput id="cost" name="cost" value={formState.cost} onChange={handleChange} placeholder={t('enterCost') || 'Enter cost'} min={0} step={0.1} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="stock">{t('stock')}</Label>
                        <NumberInput id="stock" name="stock" value={formState.stock} onChange={handleChange} placeholder={t('enterStock') || 'Enter stock'} min={0} step={1} />
                    </div>
                    <div>
                        <Label htmlFor="sku">{t('sku')}</Label>
                        <Input id="sku" placeholder={t('enterSKU') || 'Enter SKU'} value={formState.sku} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <div>
                        <Label htmlFor="category">{t('category')} <span className="text-red-500">*</span></Label>
                        <Select 
                            id="category" 
                            value={formState.category} 
                            onChange={handleChange}
                            className={errors.category ? 'border-red-500 dark:border-red-500' : ''}
                        >
                            <option value="">{t('selectCategory') || 'Select Category'}</option>
                            {productCategories.map(category => (
                                <option key={category.id} value={category.name}>{category.name}</option>
                            ))}
                        </Select>
                        {errors.category && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                        )}
                    </div>

                </div>
                <div>
                    <div>
                        <Label htmlFor="supplier">{t('supplier')}</Label>
                        <Select id="supplier" value={formState.supplier} onChange={handleChange}>
                            <option value="">{t('selectSupplier') || 'Select Supplier (Optional)'}</option>
                            {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                            ))}
                        </Select>
                    </div>
                </div>
                <div>
                    <Checkbox
                        id="isActive"
                        checked={formState.isActive}
                        onChange={handleChange}
                        label={t('active') || 'Active'}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

