
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode, value?: string | number; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string }) => {
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const EditDealModal = () => {
    const { 
        isEditDealModalOpen, 
        setIsEditDealModalOpen, 
        t, 
        updateDeal, 
        editingDeal, 
        projects, 
        units, 
        leads, 
        currentUser, 
        users,
        setIsSuccessModalOpen,
        setSuccessMessage
    } = useAppContext();
    
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const [formState, setFormState] = useState({
        project: '',
        unit: '',
        leadId: 0,
        startedBy: currentUser?.id || 1,
        closedBy: currentUser?.id || 1,
        paymentMethod: 'Cash',
        status: 'Reservation',
        stage: 'in_progress' as 'won' | 'lost' | 'on_hold' | 'in_progress' | 'cancelled',
        startDate: '',
        closedDate: '',
        value: '',
        discountPercentage: '',
        discountAmount: '',
        salesCommissionPercentage: '',
        description: '',
    });

    const calculatedValues = useMemo(() => {
        const value = parseFloat(formState.value) || 0;
        const discountPercent = parseFloat(formState.discountPercentage) || 0;
        // Calculate discountAmount from value and discountPercentage
        const discountAmount = value * (discountPercent / 100);
        const totalValue = value - discountAmount;
        const commissionPercent = parseFloat(formState.salesCommissionPercentage) || 0;
        const salesCommissionAmount = totalValue * (commissionPercent / 100);
        return { discountAmount, totalValue, salesCommissionAmount };
    }, [formState.value, formState.discountPercentage, formState.salesCommissionPercentage]);

    // Initialize form state when editingDeal changes
    useEffect(() => {
        if (editingDeal && isEditDealModalOpen) {
            // Find project by name (editingDeal.project is project_name from API)
            const projectName = editingDeal.project || '';
            const foundProject = projects.find(p => p.name === projectName);
            
            // Find unit by code (editingDeal.unit is unit_code from API, which should match unit.code)
            const unitCode = editingDeal.unit || '';
            const foundUnit = units.find(u => u.code === unitCode);
            
            // Format dates for date inputs (YYYY-MM-DD)
            const formatDate = (dateStr: string | undefined): string => {
                if (!dateStr) return '';
                // If already in YYYY-MM-DD format, return as is
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
                // If in ISO format, extract date part
                if (dateStr.includes('T')) return dateStr.split('T')[0];
                // Otherwise try to parse
                try {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
                return '';
            };
            
            // Calculate original value (before discount)
            // editingDeal.value is totalValue (after discount), so we need to add discountAmount back
            const totalValue = editingDeal.value || 0;
            const discountAmount = editingDeal.discountAmount || 0;
            const originalValue = totalValue + discountAmount;
            
            setFormState({
                project: foundProject?.name || projectName || '',
                unit: foundUnit?.code || unitCode || '',
                leadId: editingDeal.leadId || editingDeal.client || 0,
                startedBy: editingDeal.startedBy || currentUser?.id || 1,
                closedBy: editingDeal.closedBy || currentUser?.id || 1,
                paymentMethod: editingDeal.paymentMethod || 'Cash',
                status: editingDeal.status || 'Reservation',
                stage: editingDeal.stage || 'in_progress',
                startDate: formatDate(editingDeal.startDate),
                closedDate: formatDate(editingDeal.closedDate),
                value: originalValue > 0 ? originalValue.toString() : '',
                discountPercentage: editingDeal.discountPercentage !== undefined && editingDeal.discountPercentage !== null ? editingDeal.discountPercentage.toString() : '',
                discountAmount: discountAmount > 0 ? discountAmount.toString() : '',
                salesCommissionPercentage: editingDeal.salesCommissionPercentage !== undefined && editingDeal.salesCommissionPercentage !== null ? editingDeal.salesCommissionPercentage.toString() : '',
                description: editingDeal.description || '',
            });
            setErrors({});
        }
    }, [editingDeal, isEditDealModalOpen, projects, units, currentUser?.id]);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.leadId || formState.leadId === 0) {
            newErrors.leadId = t('leadRequired') || 'Lead is required';
        }

        if (!formState.value || parseFloat(formState.value) <= 0) {
            newErrors.value = t('valueRequired') || 'Deal value is required and must be greater than 0';
        }

        if (isRealEstate && !formState.project) {
            newErrors.project = t('projectRequired') || 'Project is required';
        }

        if (isRealEstate && !formState.unit) {
            newErrors.unit = t('unitRequired') || 'Unit is required';
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => {
            const newState = { ...prev, [id]: value };

            if (id === 'value' || id === 'discountPercentage') {
                const val = parseFloat(newState.value) || 0;
                const discPercent = parseFloat(newState.discountPercentage) || 0;
                newState.discountAmount = (val * (discPercent / 100)).toFixed(2);
            }

            return newState;
        });
        clearError(id);
    };

    const handleClose = () => {
        setIsEditDealModalOpen(false);
        setErrors({});
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm() || !editingDeal) {
            return;
        }
        
        setLoading(true);
        
        try {
            await updateDeal(editingDeal.id, {
                leadId: formState.leadId,
                startedBy: Number(formState.startedBy),
                closedBy: Number(formState.closedBy),
                paymentMethod: formState.paymentMethod,
                status: formState.status,
                stage: formState.stage,
                value: calculatedValues.totalValue, // Send totalValue as value to API
                startDate: formState.startDate || undefined,
                closedDate: formState.closedDate || undefined,
                discountPercentage: Number(formState.discountPercentage) || 0,
                discountAmount: calculatedValues.discountAmount, // Use calculated discountAmount
                salesCommissionPercentage: Number(formState.salesCommissionPercentage) || 0,
                salesCommissionAmount: calculatedValues.salesCommissionAmount,
                description: formState.description || undefined,
                ...(isRealEstate && {
                    unit: formState.unit,
                    project: formState.project,
                }),
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('dealUpdatedSuccessfully') || 'Deal updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating deal:', error);
            const errorMessage = error?.message || t('errorUpdatingDeal') || 'Failed to update deal. Please try again.';
            setErrors({ _general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    if (!editingDeal) return null;

    return (
        <Modal isOpen={isEditDealModalOpen} onClose={handleClose} title={t('editDeal') || 'Edit Deal'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isRealEstate && projects.length > 0 && (
                        <div>
                            <Label htmlFor="project">{t('project')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="project" 
                                value={formState.project} 
                                onChange={handleChange}
                                className={errors.project ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option disabled value="">{t('selectProject')}</option>
                                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </Select>
                            {errors.project && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project}</p>
                            )}
                        </div>
                    )}
                    {isRealEstate && units.length > 0 && (
                        <div>
                            <Label htmlFor="unit">{t('unit')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="unit" 
                                value={formState.unit} 
                                onChange={handleChange}
                                className={errors.unit ? 'border-red-500 dark:border-red-500' : ''}
                            >
                                <option disabled value="">{t('selectUnit')}</option>
                                {units.map(u => <option key={u.id} value={u.code}>{u.code}</option>)}
                            </Select>
                            {errors.unit && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit}</p>
                            )}
                        </div>
                    )}
                    <div>
                        <Label htmlFor="leadId">{t('lead')} <span className="text-red-500">*</span></Label>
                        <Select 
                            id="leadId" 
                            className={`flex-grow ${errors.leadId ? 'border-red-500 dark:border-red-500' : ''}`} 
                            value={formState.leadId} 
                            onChange={(e) => {
                                setFormState(p => ({...p, leadId: Number(e.target.value)}));
                                clearError('leadId');
                            }}
                        >
                            <option disabled value={0}>{t('selectLead')}</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </Select>
                        {errors.leadId && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.leadId}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="stage">{t('stage')} <span className="text-red-500">*</span></Label>
                        <Select 
                            id="stage" 
                            value={formState.stage} 
                            onChange={(e) => {
                                setFormState(prev => ({ ...prev, stage: e.target.value as 'won' | 'lost' | 'on_hold' | 'in_progress' | 'cancelled' }));
                            }}
                        >
                            <option value="in_progress">{t('inProgress') || 'In Progress'}</option>
                            <option value="on_hold">{t('onHold') || 'On Hold'}</option>
                            <option value="won">{t('won') || 'Won'}</option>
                            <option value="lost">{t('lost') || 'Lost'}</option>
                            <option value="cancelled">{t('cancelled') || 'Cancelled'}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="startedBy">{t('startedBy')}</Label>
                        <Select id="startedBy" value={formState.startedBy} onChange={handleChange}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="closedBy">{t('closedBy')}</Label>
                        <Select id="closedBy" value={formState.closedBy} onChange={handleChange}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="paymentMethod">{t('paymentMethod')}</Label>
                        <Select id="paymentMethod" value={formState.paymentMethod} onChange={handleChange}>
                            <option value="Cash">{t('cash')}</option>
                            <option value="Installment">{t('installment')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="status">{t('status')}</Label>
                        <Select id="status" value={formState.status} onChange={handleChange}>
                            <option value="Reservation">{t('reservation')}</option>
                            <option value="Contracted">{t('contracted')}</option>
                            <option value="Closed">{t('closed')}</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="startDate">{t('startDate')}</Label>
                        <Input id="startDate" type="date" value={formState.startDate} onChange={handleChange}/>
                    </div>
                    <div>
                        <Label htmlFor="closedDate">{t('closedDate')}</Label>
                        <Input id="closedDate" type="date" value={formState.closedDate} onChange={handleChange}/>
                    </div>
                    <div>
                        <Label htmlFor="value">{t('value')} <span className="text-red-500">*</span></Label>
                        <NumberInput 
                            id="value" 
                            name="value" 
                            value={formState.value} 
                            onChange={handleChange} 
                            placeholder={t('eg1000000')} 
                            min={0} 
                            step={1}
                            className={errors.value ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.value && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="discountPercentage">{t('discountPercentage')}</Label>
                        <NumberInput id="discountPercentage" name="discountPercentage" value={formState.discountPercentage} onChange={handleChange} placeholder={t('eg10')} min={0} max={100} step={0.01} />
                    </div>
                    <div>
                        <Label htmlFor="discountAmount">{t('discountAmount')}</Label>
                        <Input id="discountAmount" type="number" placeholder={t('calculated')} value={calculatedValues.discountAmount.toFixed(2)} readOnly />
                    </div>
                    <div>
                        <Label htmlFor="totalValue">{t('totalValue')}</Label>
                        <Input id="totalValue" type="number" value={calculatedValues.totalValue} readOnly className="font-bold bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div>
                        <Label htmlFor="salesCommissionPercentage">{t('salesCommissionPercentage')}</Label>
                        <NumberInput id="salesCommissionPercentage" name="salesCommissionPercentage" value={formState.salesCommissionPercentage} onChange={handleChange} placeholder={t('eg25')} min={0} max={100} step={0.01} />
                    </div>
                    <div>
                        <Label htmlFor="salesCommissionAmount">{t('salesCommissionAmount')}</Label>
                        <Input id="salesCommissionAmount" type="number" placeholder={t('calculated')} value={calculatedValues.salesCommissionAmount.toFixed(2)} readOnly />
                    </div>
                </div>
                <div>
                    <Label htmlFor="description">{t('description')}</Label>
                    <textarea id="description" rows={4} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder={t('enterNotesAboutDeal')} value={formState.description} onChange={handleChange}></textarea>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} loading={loading}>{t('saveChanges')}</Button>
                </div>
            </form>
        </Modal>
    );
};

