
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, PlusIcon, Loader, NumberInput, ArrowLeftIcon } from '../components/index';

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


export const CreateDealPage = () => {
    const { t, setCurrentPage, setIsAddLeadModalOpen, addDeal, projects, units, leads, currentUser, selectedLeadForDeal, setSelectedLeadForDeal, users } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    
    // Use selectedLeadForDeal if available, otherwise use first lead
    const defaultLeadId = selectedLeadForDeal || (leads.length > 0 ? leads[0].id : 0);
    
    const [formState, setFormState] = useState({
        project: isRealEstate && projects.length > 0 ? projects[0].name : '',
        unit: isRealEstate && units.length > 0 ? units[0].code : '',
        leadId: defaultLeadId,
        startedBy: currentUser?.id || 1,
        closedBy: currentUser?.id || 1,
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

    const calculatedValues = useMemo(() => {
        const value = parseFloat(formState.value) || 0;
        const discountAmount = parseFloat(formState.discountAmount) || 0;
        const totalValue = value - discountAmount;
        const commissionPercent = parseFloat(formState.salesCommissionPercentage) || 0;
        const salesCommissionAmount = totalValue * (commissionPercent / 100);
        return { totalValue, salesCommissionAmount };
    }, [formState.value, formState.discountAmount, formState.salesCommissionPercentage]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
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
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const clientName = leads.find(l => l.id === formState.leadId)?.name || t('unknownClient');
        addDeal({
            clientName,
            paymentMethod: formState.paymentMethod,
            status: formState.status,
            stage: formState.stage,
            value: calculatedValues.totalValue,
            leadId: formState.leadId,
            startedBy: Number(formState.startedBy),
            closedBy: Number(formState.closedBy),
            startDate: formState.startDate,
            closedDate: formState.closedDate,
            discountPercentage: Number(formState.discountPercentage) || 0,
            discountAmount: Number(formState.discountAmount) || 0,
            salesCommissionPercentage: Number(formState.salesCommissionPercentage) || 0,
            salesCommissionAmount: calculatedValues.salesCommissionAmount,
            description: formState.description,
            // Only include real estate fields if specialization is real_estate
            ...(isRealEstate && {
                unit: formState.unit,
                project: formState.project,
            }),
        });
        // Clear selectedLeadForDeal after creating deal
        setSelectedLeadForDeal(null);
        setCurrentPage('Deals');
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
                        onClick={() => setCurrentPage('Deals')}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title={t('back') || 'Back'}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span>{t('createNewDeal')}</span>
                </div>
            }
        >
            <form onSubmit={handleSubmit}>
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
                                    {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                        <Button type="button" variant="secondary" onClick={() => setCurrentPage('Deals')}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit">
                            {t('createDeal')}
                        </Button>
                    </div>
                </Card>
            </form>
        </PageWrapper>
    )
}