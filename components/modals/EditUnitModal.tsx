
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { Unit } from '../../types';

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

export const EditUnitModal = () => {
    const { isEditUnitModalOpen, setIsEditUnitModalOpen, t, updateUnit, editingUnit, setEditingUnit, projects } = useAppContext();
    const [formState, setFormState] = useState({
        project: '',
        bedrooms: '1',
        price: '',
        bathrooms: '1',
        type: 'Apartment',
        finishing: 'Finished',
        city: '',
        district: '',
        zone: '',
        isSold: false,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.project) {
            newErrors.project = t('projectRequired') || 'Project is required';
        }

        if (!formState.price || Number(formState.price) <= 0) {
            newErrors.price = t('priceRequired') || 'Price is required and must be greater than 0';
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
        if (editingUnit) {
            setFormState({
                project: editingUnit.project,
                bedrooms: editingUnit.bedrooms.toString(),
                price: editingUnit.price.toString(),
                bathrooms: editingUnit.bathrooms.toString(),
                type: editingUnit.type || 'Apartment',
                finishing: editingUnit.finishing || 'Finished',
                city: editingUnit.city || '',
                district: editingUnit.district || '',
                zone: editingUnit.zone || '',
                isSold: editingUnit.isSold || false,
            });
        }
    }, [editingUnit]);

    const handleClose = () => {
        setIsEditUnitModalOpen(false);
        setEditingUnit(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormState(prev => ({ ...prev, [id]: checked }));
        } else {
            setFormState(prev => ({ ...prev, [id]: value }));
        }
        clearError(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUnit) return;
        
        if (!validateForm()) {
            return;
        }
        
        try {
            await updateUnit({
                ...editingUnit,
                ...formState,
                bedrooms: Number(formState.bedrooms),
                price: Number(formState.price),
                bathrooms: Number(formState.bathrooms),
            });
            handleClose();
        } catch (error) {
            console.error('Error updating unit:', error);
            // يمكن إضافة toast notification هنا
        }
    };

    if (!editingUnit) return null;

    return (
        <Modal isOpen={isEditUnitModalOpen} onClose={handleClose} title={`${t('edit')} ${t('unit')}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="project">{t('project')} <span className="text-red-500">*</span></Label>
                        <Select 
                            id="project" 
                            value={formState.project} 
                            onChange={handleChange}
                            className={errors.project ? 'border-red-500 dark:border-red-500' : ''}
                        >
                            <option value="">{t('selectProject') || 'Select Project'}</option>
                            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </Select>
                        {errors.project && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="price">{t('price')} <span className="text-red-500">*</span></Label>
                        <NumberInput 
                            id="price" 
                            name="price" 
                            value={formState.price} 
                            onChange={handleChange} 
                            placeholder="e.g. 1,000,000" 
                            min={0} 
                            step={1}
                            className={errors.price ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="bedrooms">{t('bedrooms')}</Label>
                        <NumberInput id="bedrooms" name="bedrooms" value={formState.bedrooms} onChange={handleChange} min={0} step={1} />
                    </div>
                    <div>
                        <Label htmlFor="bathrooms">{t('bathrooms')}</Label>
                        <NumberInput id="bathrooms" name="bathrooms" value={formState.bathrooms} onChange={handleChange} min={0} step={1} />
                    </div>
                    <div>
                        <Label htmlFor="type">{t('type')}</Label>
                        <Select id="type" value={formState.type} onChange={handleChange}>
                            <option value="Apartment">{t('apartment')}</option>
                            <option value="Villa">{t('villa')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="finishing">{t('finishing')}</Label>
                        <Select id="finishing" value={formState.finishing} onChange={handleChange}>
                            <option value="Finished">{t('finished')}</option>
                            <option value="Semi-Finished">{t('semiFinished')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="city">{t('city')}</Label>
                        <Input id="city" placeholder="e.g. Dubai" value={formState.city} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="district">{t('district')}</Label>
                        <Input id="district" placeholder="e.g. Downtown" value={formState.district} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="zone">{t('zone')}</Label>
                        <Input id="zone" placeholder="e.g. Zone 1" value={formState.zone} onChange={handleChange} />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isSold"
                            checked={formState.isSold}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="isSold" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {t('sold') || 'Sold'}
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t('cancel')}</Button>
                    <Button type="submit">{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

