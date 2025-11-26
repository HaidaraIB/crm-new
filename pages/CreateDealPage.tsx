
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, PlusIcon, Loader, NumberInput } from '../components/index';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode, value?: string | number; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string }) => (
    <select id={id} value={value} onChange={onChange} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${className}`}>
        {children}
    </select>
);


export const CreateDealPage = () => {
    const { t, setCurrentPage, setIsAddLeadModalOpen, addDeal, projects, units, leads, currentUser, selectedLeadForDeal, setSelectedLeadForDeal, users } = useAppContext();
    const [loading, setLoading] = useState(true);
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
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clientName = leads.find(l => l.id === formState.leadId)?.name || t('unknownClient');
        addDeal({
            clientName,
            paymentMethod: formState.paymentMethod,
            status: formState.status,
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
        <PageWrapper title={t('createNewDeal')}>
            <form onSubmit={handleSubmit}>
                <Card>
                    <h3 className="text-lg font-semibold mb-6 border-b pb-3 dark:border-gray-700">{t('dealInformation')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Row 1 */}
                        {isRealEstate && projects.length > 0 && (
                            <div>
                                <Label htmlFor="project">{t('project')}</Label>
                                <Select id="project" value={formState.project} onChange={handleChange}>
                                    <option disabled value="">{t('selectProject')}</option>
                                    {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </Select>
                            </div>
                        )}
                        {isRealEstate && units.length > 0 && (
                            <div>
                                <Label htmlFor="unit">{t('unit')}</Label>
                                <Select id="unit" value={formState.unit} onChange={handleChange}>
                                    <option disabled value="">{t('selectUnit')}</option>
                                    {units.map(u => <option key={u.id} value={u.code}>{u.code}</option>)}
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="leadId">{t('lead')}</Label>
                            <div className="flex gap-2">
                                <Select id="leadId" className="flex-grow" value={formState.leadId} onChange={(e) => setFormState(p => ({...p, leadId: Number(e.target.value)}))}>
                                    <option disabled value={0}>{t('selectLead')}</option>
                                    {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </Select>
                                <Button type="button" variant="secondary" className="px-3" onClick={() => setIsAddLeadModalOpen(true)}>
                                    <PlusIcon className="w-4 h-4"/>
                                </Button>
                            </div>
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
                            <Label htmlFor="value">{t('value')}</Label>
                            <NumberInput id="value" name="value" value={formState.value} onChange={handleChange} placeholder={t('eg1000000')} min={0} step={1} />
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