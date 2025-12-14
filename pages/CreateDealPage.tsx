
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, PlusIcon, Loader, NumberInput, ArrowLeftIcon } from '../components/index';
import { useProjects, useUnits, useLeads, useUsers, useCreateDeal } from '../hooks/useQueries';
import { User } from '../types';

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


export const CreateDealPage = () => {
    const { t, setCurrentPage, setIsAddLeadModalOpen, currentUser, selectedLeadForDeal, setSelectedLeadForDeal } = useAppContext();
    
    // Fetch data using React Query hooks
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
    
    // Use React Query mutation for creating deal
    const createDealMutation = useCreateDeal();
    
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    
    // Use selectedLeadForDeal if available, otherwise use first lead
    const defaultLeadId = useMemo(() => {
        return selectedLeadForDeal || (leads.length > 0 ? leads[0].id : 0);
    }, [selectedLeadForDeal, leads]);
    
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
        startDate: new Date().toISOString().split('T')[0],
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
        const projectId = Number(formState.project);
        return allUnits.filter((u: any) => u.project === projectId || u.project?.id === projectId || u.project_id === projectId);
    }, [allUnits, formState.project, isRealEstate]);

    // Update form state when data loads
    useEffect(() => {
        if (isRealEstate && projects.length > 0 && !formState.project) {
            setFormState(prev => ({ ...prev, project: projects[0].id.toString() }));
        }
        if (defaultLeadId > 0 && formState.leadId === 0) {
            setFormState(prev => ({ ...prev, leadId: defaultLeadId }));
        }
        // Set default employee, startedBy and closedBy if users are loaded and current values are invalid
        if (userOptions.length > 0 && currentUser?.id) {
            const currentUserInList = userOptions.find(u => u.id === currentUser.id);
            if (currentUserInList && (formState.employee === 0 || !userOptions.find(u => u.id === formState.employee))) {
                setFormState(prev => ({ ...prev, employee: currentUser.id }));
            }
            if (currentUserInList && (formState.startedBy === 0 || !userOptions.find(u => u.id === formState.startedBy))) {
                setFormState(prev => ({ ...prev, startedBy: currentUser.id }));
            }
            if (currentUserInList && (formState.closedBy === 0 || !userOptions.find(u => u.id === formState.closedBy))) {
                setFormState(prev => ({ ...prev, closedBy: currentUser.id }));
            }
        }
    }, [projects, isRealEstate, defaultLeadId, formState.leadId, formState.startedBy, formState.closedBy, userOptions, currentUser]);

    // Update unit when project changes or units load
    useEffect(() => {
        if (isRealEstate && formState.project && units.length > 0 && !formState.unit) {
            setFormState(prev => ({ ...prev, unit: units[0].id.toString() }));
        }
    }, [isRealEstate, formState.project, units, formState.unit]);

    const calculatedValues = useMemo(() => {
        const value = parseFloat(formState.value) || 0;
        const discountAmount = parseFloat(formState.discountAmount) || 0;
        const totalValue = value - discountAmount;
        const commissionPercent = parseFloat(formState.salesCommissionPercentage) || 0;
        const salesCommissionAmount = totalValue * (commissionPercent / 100);
        return { totalValue, salesCommissionAmount };
    }, [formState.value, formState.discountAmount, formState.salesCommissionPercentage]);

    useEffect(() => {
        // Show loading screen briefly when page opens
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // Update leadId when selectedLeadForDeal changes
    useEffect(() => {
        if (selectedLeadForDeal) {
            setFormState(prev => ({ ...prev, leadId: selectedLeadForDeal }));
        }
    }, [selectedLeadForDeal]);

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

        // Note: startedBy and closedBy can be 0, we'll use currentUser?.id as fallback in payload

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
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isValid = validateForm();
        
        if (!isValid) {
            // Scroll to first error
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                const errorElement = document.getElementById(firstErrorField);
                if (errorElement) {
                    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    errorElement.focus();
                }
            }
            return;
        }
        
        try {
            const payload: any = {
                client: formState.leadId, // API expects 'client' field with lead ID
                employee: Number(formState.employee) || currentUser?.id || null, // Send employee ID to API
                payment_method: formState.paymentMethod.toLowerCase() || null, // Send as payment_method (snake_case, lowercase) for API
                status: formState.status.toLowerCase(), // Send as lowercase for API
                stage: formState.stage,
                value: calculatedValues.totalValue,
                started_by: Number(formState.startedBy) || currentUser?.id || null, // Send as started_by (snake_case) for API
                closed_by: Number(formState.closedBy) || currentUser?.id || null, // Send as closed_by (snake_case) for API
                start_date: formState.startDate || null, // Send as start_date (snake_case) for API
                closed_date: formState.closedDate || null, // Send as closed_date (snake_case) for API
                discount_percentage: Number(formState.discountPercentage) || 0, // Send as discount_percentage (snake_case) for API
                discount_amount: Number(formState.discountAmount) || 0, // Send as discount_amount (snake_case) for API
                sales_commission_percentage: Number(formState.salesCommissionPercentage) || 0, // Send as sales_commission_percentage (snake_case) for API
                sales_commission_amount: calculatedValues.salesCommissionAmount, // Send as sales_commission_amount (snake_case) for API
                description: formState.description || '',
                company: currentUser?.company?.id,
            };
            
            // Only include real estate fields if specialization is real_estate
            if (isRealEstate) {
                if (formState.project) {
                    payload.project = Number(formState.project);
                }
                if (formState.unit) {
                    payload.unit = Number(formState.unit);
                }
            }
            
            
            await createDealMutation.mutateAsync(payload);
            // Clear selectedLeadForDeal after creating deal
            setSelectedLeadForDeal(null);
            window.history.pushState({}, '', '/deals');
            setCurrentPage('Deals');
        } catch (error: any) {
            console.error('Error creating deal:', error);
            
            // Handle API validation errors
            let errorMessage = t('errorCreatingDeal') || 'Failed to create deal. Please try again.';
            
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
            
            alert(errorMessage);
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('createNewDeal')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper 
            title={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            window.history.pushState({}, '', '/deals');
                            setCurrentPage('Deals');
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span>{t('createNewDeal')}</span>
                </div>
            }
        >
            <form onSubmit={handleSubmit} onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                    e.preventDefault();
                    handleSubmit(e as any);
                }
            }}>
                <Card>
                    <h3 className="text-lg font-semibold mb-6 border-b pb-3 dark:border-gray-700">{t('dealInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Row 1 */}
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
                                    {(projects || []).map(p => <option key={p.id} value={p.id.toString()}>{p.name}</option>)}
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
                            <div className="flex gap-2">
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
                                    {(leads || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </Select>
                                <Button type="button" variant="secondary" className="px-3" onClick={() => setIsAddLeadModalOpen(true)}>
                                    <PlusIcon className="w-4 h-4"/>
                                </Button>
                            </div>
                            {errors.leadId && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.leadId}</p>
                            )}
                        </div>
                        {/* Row 2 */}
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
                            <Label htmlFor="startedBy">{t('startedBy')}</Label>
                            <Select 
                                id="startedBy" 
                                value={formState.startedBy} 
                                onChange={handleChange}
                                className={errors.startedBy ? 'border-red-500 dark:border-red-500' : ''}
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
                                    userOptions.map(u => (
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
                        {/* Row 3 */}
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
                         {/* Row 4 */}
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
                            <Input id="discountAmount" type="number" placeholder={t('calculated')} value={formState.discountAmount} readOnly />
                        </div>
                         {/* Row 5 */}
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
                    <div className="mt-6">
                        <Label htmlFor="description">{t('description')}</Label>
                        <textarea id="description" rows={4} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder={t('enterNotesAboutDeal')} value={formState.description} onChange={handleChange}></textarea>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => {
                            window.history.pushState({}, '', '/deals');
                            setCurrentPage('Deals');
                        }}>
                            {t('cancel')}
                        </Button>
                        <Button 
                            type="submit"
                            onClick={(e) => {
                                // Don't prevent default - let form handle it
                            }}
                            disabled={createDealMutation.isPending}
                        >
                            {createDealMutation.isPending ? (t('creating') || 'Creating...') : t('createDeal')}
                        </Button>
                    </div>
                </Card>
            </form>
        </PageWrapper>
    )
}