
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { NumberInput } from '../NumberInput';
import { useUpdateDeal, useProjects, useUnits, useLeads, useUsers } from '../../hooks/useQueries';
import { User } from '../../types';

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
        return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    }
    return user.username || user.email || 'Unknown';
};

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className, disabled }: { id: string; children?: React.ReactNode, value?: string | number; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; disabled?: boolean }) => {
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} disabled={disabled} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

export const EditDealModal = () => {
    const { 
        isEditDealModalOpen, 
        setIsEditDealModalOpen, 
        t, 
        editingDeal, 
        currentUser,
        setIsSuccessModalOpen,
        setSuccessMessage
    } = useAppContext();
    
    // Fetch data using React Query
    const { data: projectsResponse } = useProjects();
    const projects = projectsResponse?.results || [];

    const { data: unitsResponse } = useUnits();
    const allUnits = Array.isArray(unitsResponse) 
        ? unitsResponse 
        : (unitsResponse?.results || []);

    const { data: leadsResponse } = useLeads();
    const leads = leadsResponse?.results || [];

    const { data: usersResponse } = useUsers();
    const users = Array.isArray(usersResponse) 
        ? usersResponse 
        : (usersResponse?.results || []);
    const userOptions = (users && users.length > 0) ? users : (currentUser ? [currentUser] : []);

    // Update deal mutation
    const updateDealMutation = useUpdateDeal();
    const loading = updateDealMutation.isPending;
    
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const [formState, setFormState] = useState({
        project: '',
        unit: '',
        leadId: 0,
        employee: currentUser?.id || 0,
        startedBy: currentUser?.id || 0,
        closedBy: currentUser?.id || 0,
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
    
    // Filter units by selected project (must be after formState declaration)
    const units = useMemo(() => {
        if (!isRealEstate || !formState.project) {
            return allUnits;
        }
        // If project is a name, find the project ID first
        const projectObj = projects.find((p: any) => p.name === formState.project || p.id.toString() === formState.project);
        const projectId = projectObj?.id || Number(formState.project);
        return allUnits.filter((u: any) => u.project === projectId || u.project?.id === projectId || u.project_id === projectId);
    }, [allUnits, formState.project, isRealEstate, projects]);

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
            // Handle project - could be ID, name, project_name, or object
            let projectValue = '';
            if (typeof editingDeal.project === 'object' && editingDeal.project?.id) {
                projectValue = editingDeal.project.id.toString();
            } else if (typeof editingDeal.project === 'number') {
                projectValue = editingDeal.project.toString();
            } else {
                // Try to find by name or project_name
                const projectName = (editingDeal as any).project_name || editingDeal.project || '';
                const foundProject = projects.find((p: any) => 
                    p.name === projectName || 
                    p.id.toString() === projectName ||
                    p.id === Number(projectName)
                );
                projectValue = foundProject ? foundProject.id.toString() : '';
                
                // If still not found and project is a string that looks like an ID, use it
                if (!projectValue && typeof editingDeal.project === 'string' && /^\d+$/.test(editingDeal.project)) {
                    projectValue = editingDeal.project;
                }
            }
            
            // Handle unit - could be ID, code, or object
            let unitValue = '';
            if (typeof editingDeal.unit === 'object' && editingDeal.unit?.id) {
                unitValue = editingDeal.unit.id.toString();
            } else if (typeof editingDeal.unit === 'number') {
                unitValue = editingDeal.unit.toString();
            } else {
                // Try to find by code
                const unitCode = editingDeal.unit || '';
                const foundUnit = allUnits.find((u: any) => u.code === unitCode || u.id.toString() === unitCode);
                unitValue = foundUnit ? foundUnit.id.toString() : '';
            }
            
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
            const totalValue = Number(editingDeal.value || (editingDeal as any).value || 0);
            
            // Handle discount fields - API might return discount_percentage/discount_amount or discountPercentage/discountAmount
            const discountAmount = Number(editingDeal.discountAmount || (editingDeal as any).discount_amount || 0);
            const discountPercentage = Number(editingDeal.discountPercentage || (editingDeal as any).discount_percentage || 0);
            
            // Handle sales commission fields - API might return sales_commission_percentage/sales_commission_amount or salesCommissionPercentage/salesCommissionAmount
            const salesCommissionPercentage = Number(editingDeal.salesCommissionPercentage || (editingDeal as any).sales_commission_percentage || 0);
            
            const originalValue = totalValue + discountAmount;
            
            // Handle employee - API might return employee as object or ID
            const employeeId = (editingDeal as any).employee 
                ? (typeof (editingDeal as any).employee === 'object' ? (editingDeal as any).employee.id : (editingDeal as any).employee)
                : currentUser?.id || 0;
            
            // Handle startedBy and closedBy - API might return started_by/closed_by or startedBy/closedBy
            const startedById = (editingDeal as any).started_by || editingDeal.startedBy || currentUser?.id || 0;
            const closedById = (editingDeal as any).closed_by || editingDeal.closedBy || currentUser?.id || 0;
            
            // Handle startDate and closedDate - API might return start_date/closed_date or startDate/closedDate
            const startDateValue = (editingDeal as any).start_date || editingDeal.startDate;
            const closedDateValue = (editingDeal as any).closed_date || editingDeal.closedDate;
            
            // Handle paymentMethod - API might return payment_method or paymentMethod
            // API expects lowercase: 'cash' or 'installment'
            const paymentMethodRaw = (editingDeal as any).paymentMethod || (editingDeal as any).payment_method || 'cash';
            const paymentMethodDisplay = paymentMethodRaw.charAt(0).toUpperCase() + paymentMethodRaw.slice(1).toLowerCase(); // Display as 'Cash' or 'Installment'
            
            // Handle status - API expects lowercase: 'reservation', 'contracted', 'closed'
            const statusRaw = editingDeal.status || 'reservation';
            const statusDisplay = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase(); // Display as 'Reservation', 'Contracted', 'Closed'
            
            setFormState({
                project: projectValue,
                unit: unitValue,
                leadId: editingDeal.leadId || editingDeal.client || 0,
                employee: employeeId,
                startedBy: startedById,
                closedBy: closedById,
                paymentMethod: paymentMethodDisplay,
                status: statusDisplay,
                stage: editingDeal.stage || 'in_progress',
                startDate: formatDate(startDateValue),
                closedDate: formatDate(closedDateValue),
                value: originalValue > 0 ? originalValue.toString() : '',
                discountPercentage: discountPercentage > 0 ? discountPercentage.toString() : '',
                discountAmount: discountAmount > 0 ? discountAmount.toString() : '',
                salesCommissionPercentage: salesCommissionPercentage > 0 ? salesCommissionPercentage.toString() : '',
                description: editingDeal.description || '',
            });
            setErrors({});
        }
    }, [editingDeal, isEditDealModalOpen, projects, allUnits, currentUser?.id]);

    // Update unit when project changes or units load
    useEffect(() => {
        if (isRealEstate && formState.project && units.length > 0 && !formState.unit && editingDeal) {
            // Only auto-select if we don't have a unit yet (not when editing existing deal with unit)
            // This prevents overwriting the existing unit when the modal opens
            const hasExistingUnit = editingDeal.unit && (typeof editingDeal.unit === 'object' ? editingDeal.unit.id : editingDeal.unit);
            if (!hasExistingUnit) {
                setFormState(prev => ({ ...prev, unit: units[0].id.toString() }));
            }
        }
    }, [isRealEstate, formState.project, units, formState.unit, editingDeal]);

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

            // Reset unit when project changes
            if (id === 'project' && isRealEstate) {
                newState.unit = '';
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
        
        try {
            const payload: any = {
                client: formState.leadId, // API expects 'client' field with lead ID
                employee: Number(formState.employee) || currentUser?.id || null, // Send employee ID to API
                started_by: Number(formState.startedBy) || currentUser?.id || null, // Send as started_by (snake_case) for API
                closed_by: Number(formState.closedBy) || currentUser?.id || null, // Send as closed_by (snake_case) for API
                payment_method: formState.paymentMethod.toLowerCase() || null, // Send as payment_method (snake_case, lowercase) for API
                status: formState.status.toLowerCase(), // Send as lowercase for API
                stage: formState.stage,
                value: calculatedValues.totalValue, // Send totalValue as value to API
                start_date: formState.startDate || null, // Send as start_date (snake_case) for API
                closed_date: formState.closedDate || null, // Send as closed_date (snake_case) for API
                discount_percentage: Number(formState.discountPercentage) || 0,
                discount_amount: calculatedValues.discountAmount, // Use calculated discountAmount
                sales_commission_percentage: Number(formState.salesCommissionPercentage) || 0,
                sales_commission_amount: calculatedValues.salesCommissionAmount,
                description: formState.description || '',
                company: currentUser?.company?.id,
            };
            
            // Add real estate fields if applicable - convert to IDs
            if (isRealEstate) {
                if (formState.project) {
                    // Convert project name/ID to project ID
                    const projectObj = projects.find((p: any) => p.name === formState.project || p.id.toString() === formState.project);
                    payload.project = projectObj ? projectObj.id : Number(formState.project);
                }
                if (formState.unit) {
                    // Convert unit code/ID to unit ID
                    const unitObj = allUnits.find((u: any) => u.code === formState.unit || u.id.toString() === formState.unit);
                    payload.unit = unitObj ? unitObj.id : Number(formState.unit);
                }
            }
            
            
            await updateDealMutation.mutateAsync({
                id: editingDeal.id,
                data: payload
            });

            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(t('dealUpdatedSuccessfully') || 'Deal updated successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error updating deal:', error);
            
            // Handle API validation errors
            let errorMessage = t('errorUpdatingDeal') || 'Failed to update deal. Please try again.';
            
            if (error?.message) {
                try {
                    const errorData = JSON.parse(error.message);
                    const newErrors: { [key: string]: string } = {};
                    
                    Object.keys(errorData).forEach(key => {
                        if (Array.isArray(errorData[key])) {
                            newErrors[key] = errorData[key][0];
                        } else if (typeof errorData[key] === 'string') {
                            newErrors[key] = errorData[key];
                        }
                    });
                    
                    setErrors(newErrors);
                    
                    // Show first error in alert
                    const firstError = Object.values(newErrors)[0];
                    if (firstError) {
                        errorMessage = firstError;
                    }
                } catch (e) {
                    // If parsing fails, use the error message as is
                    errorMessage = error.message;
                }
            } else if (error?.fields || error?.response?.data) {
                const errorData = error.fields || error.response?.data || {};
                const newErrors: { [key: string]: string } = {};
                
                Object.keys(errorData).forEach(key => {
                    if (Array.isArray(errorData[key])) {
                        newErrors[key] = errorData[key][0];
                    } else if (typeof errorData[key] === 'string') {
                        newErrors[key] = errorData[key];
                    }
                });
                
                setErrors(newErrors);
                
                // Show first error in alert
                const firstError = Object.values(newErrors)[0];
                if (firstError) {
                    errorMessage = firstError;
                }
            }
            
            setErrors(prev => ({ ...prev, _general: errorMessage }));
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
                                {projects.map((p: any) => <option key={p.id} value={p.id.toString()}>{p.name}</option>)}
                            </Select>
                            {errors.project && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project}</p>
                            )}
                        </div>
                    )}
                    {isRealEstate && (
                        <div>
                            <Label htmlFor="unit">{t('unit')} <span className="text-red-500">*</span></Label>
                            <Select 
                                id="unit" 
                                value={formState.unit} 
                                onChange={handleChange}
                                className={errors.unit ? 'border-red-500 dark:border-red-500' : ''}
                                disabled={!formState.project || units.length === 0}
                            >
                                <option disabled value="">
                                    {!formState.project 
                                        ? (t('selectProjectFirst') || 'Select project first')
                                        : units.length === 0 
                                            ? (t('noUnitsAvailable') || 'No units available')
                                            : t('selectUnit')
                                    }
                                </option>
                                {units.map((u: any) => (
                                    <option key={u.id} value={u.id.toString()}>
                                        {u.code || `Unit ${u.id}`}
                                    </option>
                                ))}
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
                        <Label htmlFor="employee">{t('employee') || 'Employee'}</Label>
                        <Select 
                            id="employee" 
                            value={formState.employee} 
                            onChange={handleChange}
                            className={errors.employee ? 'border-red-500 dark:border-red-500' : ''}
                        >
                            {userOptions.length > 0 ? (
                                userOptions.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {getUserDisplayName(u)}
                                    </option>
                                ))
                            ) : (
                                <option value="">{t('noUsersAvailable') || 'No users available'}</option>
                            )}
                        </Select>
                        {errors.employee && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.employee}</p>
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
                        <Select 
                            id="startedBy" 
                            value={formState.startedBy} 
                            onChange={handleChange}
                            className={errors.startedBy ? 'border-red-500 dark:border-red-500' : ''}
                        >
                            {userOptions.length > 0 ? (
                                userOptions.map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {getUserDisplayName(u)}
                                    </option>
                                ))
                            ) : (
                                <option value="">{t('noUsersAvailable') || 'No users available'}</option>
                            )}
                        </Select>
                        {errors.startedBy && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startedBy}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="closedBy">{t('closedBy')}</Label>
                        <Select 
                            id="closedBy" 
                            value={formState.closedBy} 
                            onChange={handleChange}
                            className={errors.closedBy ? 'border-red-500 dark:border-red-500' : ''}
                        >
                            {userOptions.length > 0 ? (
                                userOptions.map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {getUserDisplayName(u)}
                                    </option>
                                ))
                            ) : (
                                <option value="">{t('noUsersAvailable') || 'No users available'}</option>
                            )}
                        </Select>
                        {errors.closedBy && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.closedBy}</p>
                        )}
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

