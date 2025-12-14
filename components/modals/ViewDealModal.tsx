
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Card } from '../Card';
import { useUsers, useLeads, useProjects, useUnits } from '../../hooks/useQueries';
import { User } from '../../types';

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
        return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    }
    return user.username || user.email || (t ? t('unknown') : 'Unknown');
};

export const ViewDealModal = () => {
    const { 
        isViewDealModalOpen, 
        setIsViewDealModalOpen, 
        t, 
        viewingDeal,
        currentUser
    } = useAppContext();
    
    // Fetch data using React Query hooks
    const { data: usersResponse } = useUsers();
    const users = Array.isArray(usersResponse) 
        ? usersResponse 
        : (usersResponse?.results || []);
    
    const { data: leadsResponse } = useLeads();
    const leads = leadsResponse?.results || [];
    
    const { data: projectsResponse } = useProjects();
    const projects = projectsResponse?.results || [];
    
    const { data: unitsResponse } = useUnits();
    const units = Array.isArray(unitsResponse) 
        ? unitsResponse 
        : (unitsResponse?.results || []);
    
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    
    if (!viewingDeal) return null;

    // Find related data
    const lead = leads.find((l: any) => l.id === viewingDeal.leadId || l.id === viewingDeal.client);
    
    // Handle startedBy and closedBy - API might return started_by/closed_by or startedBy/closedBy
    const startedById = (viewingDeal as any).started_by || viewingDeal.startedBy;
    const closedById = (viewingDeal as any).closed_by || viewingDeal.closedBy;
    const startedByUser = users.find((u: any) => u.id === startedById);
    const closedByUser = users.find((u: any) => u.id === closedById);
    
    // Handle startDate and closedDate - API might return start_date/closed_date or startDate/closedDate
    const startDate = (viewingDeal as any).start_date || viewingDeal.startDate;
    const closedDate = (viewingDeal as any).closed_date || viewingDeal.closedDate;
    // Handle project - API might return project_name, project (ID), or project object
    const project = isRealEstate && viewingDeal.project 
        ? ((viewingDeal as any).project_name 
            ? projects.find((p: any) => p.name === (viewingDeal as any).project_name)
            : typeof viewingDeal.project === 'object' 
                ? projects.find((p: any) => p.id === viewingDeal.project?.id || p.id === viewingDeal.project)
                : projects.find((p: any) => p.id === viewingDeal.project || p.name === viewingDeal.project))
        : null;
    // Handle unit - API might return unit_code, unit (ID), or unit object
    const unit = isRealEstate && viewingDeal.unit 
        ? ((viewingDeal as any).unit_code
            ? units.find((u: any) => u.code === (viewingDeal as any).unit_code)
            : typeof viewingDeal.unit === 'object'
                ? units.find((u: any) => u.id === viewingDeal.unit?.id || u.id === viewingDeal.unit)
                : units.find((u: any) => u.id === viewingDeal.unit || u.code === viewingDeal.unit))
        : null;

    // Format dates
    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return dateStr;
    };

    // Calculate values - handle both camelCase and snake_case from API
    const totalValue = Number(viewingDeal.value || (viewingDeal as any).value || 0);
    const discountAmount = Number(viewingDeal.discountAmount || (viewingDeal as any).discount_amount || 0);
    const discountPercentage = Number(viewingDeal.discountPercentage || (viewingDeal as any).discount_percentage || 0);
    const salesCommissionPercentage = Number(viewingDeal.salesCommissionPercentage || (viewingDeal as any).sales_commission_percentage || 0);
    const salesCommissionAmount = Number(viewingDeal.salesCommissionAmount || (viewingDeal as any).sales_commission_amount || 0);
    
    // Calculate original value (before discount)
    // If discountAmount exists, originalValue = totalValue + discountAmount
    // Otherwise, if discountPercentage exists, calculate from percentage
    // Otherwise, originalValue = totalValue
    let originalValue = totalValue;
    if (discountAmount > 0) {
        originalValue = totalValue + discountAmount;
    } else if (discountPercentage > 0 && totalValue > 0) {
        // Calculate original value from discount percentage
        originalValue = totalValue / (1 - discountPercentage / 100);
    }
    
    // Ensure all values are valid numbers (not NaN)
    const safeTotalValue = isNaN(totalValue) ? 0 : totalValue;
    const safeDiscountAmount = isNaN(discountAmount) ? 0 : discountAmount;
    const safeOriginalValue = isNaN(originalValue) ? safeTotalValue : originalValue;
    const safeDiscountPercentage = isNaN(discountPercentage) ? 0 : discountPercentage;
    const safeSalesCommissionPercentage = isNaN(salesCommissionPercentage) ? 0 : salesCommissionPercentage;
    const safeSalesCommissionAmount = isNaN(salesCommissionAmount) ? 0 : salesCommissionAmount;

    // Format stage
    const formatStage = (stage: string | undefined): string => {
        if (!stage) return '-';
        const stageMap: { [key: string]: string } = {
            'in_progress': t('inProgress') || 'In Progress',
            'on_hold': t('onHold') || 'On Hold',
            'won': t('won') || 'Won',
            'lost': t('lost') || 'Lost',
            'cancelled': t('cancelled') || 'Cancelled',
        };
        return stageMap[stage] || stage;
    };

    const getStageColor = (stage: string | undefined): string => {
        if (!stage) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        const colorMap: { [key: string]: string } = {
            'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'on_hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'won': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'lost': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        };
        return colorMap[stage] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    };

    // Format deal status with translation
    // API returns lowercase: 'reservation', 'contracted', 'closed'
    const formatStatus = (status: string | undefined): string => {
        if (!status) return '-';
        const statusLower = status.toLowerCase();
        const statusMap: { [key: string]: string } = {
            'reservation': t('reservation') || 'Reservation',
            'contracted': t('contracted') || 'Contracted',
            'closed': t('closed') || 'Closed',
        };
        return statusMap[statusLower] || status;
    };

    // Format payment method with translation
    const formatPaymentMethod = (method: string | undefined): string => {
        if (!method) return '-';
        const methodLower = method.toLowerCase();
        const methodMap: { [key: string]: string } = {
            'cash': t('cash') || 'Cash',
            'installment': t('installment') || 'Installment',
        };
        return methodMap[methodLower] || method;
    };

    const getStatusColor = (status: string | undefined): string => {
        if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        const statusLower = status.toLowerCase();
        const colorMap: { [key: string]: string } = {
            'reservation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'contracted': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
        return colorMap[statusLower] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    };

    return (
        <Modal 
            isOpen={isViewDealModalOpen} 
            onClose={() => setIsViewDealModalOpen(false)} 
            maxWidth="4xl"
            title={
                <div className="flex items-center justify-between">
                    <span>{t('viewDeal') || 'View Deal'}</span>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Header Card with Key Info */}
                <Card>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('clientName') || 'Client Name'}</p>
                            <p className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">{viewingDeal.clientName || '-'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lead') || 'Lead'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">{lead?.name || '-'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stage') || 'Stage'}</p>
                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStageColor(viewingDeal.stage)}`}>
                                {formatStage(viewingDeal.stage)}
                            </span>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('status') || 'Status'}</p>
                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(viewingDeal.status)}`}>
                                {formatStatus(viewingDeal.status)}
                            </span>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalValue') || 'Total Value'}</p>
                            <p className="text-lg font-bold text-primary whitespace-nowrap">
                                {safeTotalValue > 0 ? (() => {
                                    const formatted = safeTotalValue.toLocaleString('en-US', { 
                                        minimumFractionDigits: 0, 
                                        maximumFractionDigits: 2 
                                    });
                                    return formatted.replace(/\.0+$/, '');
                                })() : '-'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('paymentMethod') || 'Payment Method'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {formatPaymentMethod((viewingDeal as any).paymentMethod || (viewingDeal as any).payment_method)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startDate') || 'Start Date'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(startDate)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedDate') || 'Closed Date'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(closedDate)}</p>
                        </div>
                        {isRealEstate && (
                            <>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('project') || 'Project'}</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">{project?.name || (viewingDeal as any).project_name || viewingDeal.project || '-'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('unit') || 'Unit'}</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">{unit?.code || (viewingDeal as any).unit_code || viewingDeal.unit || '-'}</p>
                                </div>
                            </>
                        )}
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startedBy') || 'Started By'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {startedByUser ? getUserDisplayName(startedByUser) : '-'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedBy') || 'Closed By'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {closedByUser ? getUserDisplayName(closedByUser) : '-'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Financial Details */}
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">
                        {t('financialInformation') || 'Financial Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('originalValue') || 'Original Value'}</span>
                                <span className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap text-right">
                                    {safeOriginalValue > 0 ? (() => {
                                        const formatted = safeOriginalValue.toLocaleString('en-US', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 2 
                                        });
                                        return formatted.replace(/\.0+$/, '');
                                    })() : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('discountPercentage') || 'Discount Percentage'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap text-right">{safeDiscountPercentage > 0 ? `${safeDiscountPercentage}%` : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('discountAmount') || 'Discount Amount'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap text-right">
                                    {safeDiscountAmount > 0 ? (() => {
                                        const formatted = safeDiscountAmount.toLocaleString('en-US', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 2 
                                        });
                                        return formatted.replace(/\.0+$/, '');
                                    })() : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('totalValue') || 'Total Value'}</span>
                                <span className="text-lg font-bold text-primary whitespace-nowrap text-right">
                                    {safeTotalValue > 0 ? (() => {
                                        const formatted = safeTotalValue.toLocaleString('en-US', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 2 
                                        });
                                        return formatted.replace(/\.0+$/, '');
                                    })() : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('salesCommissionPercentage') || t('salesCommission') || 'Sales Commission %'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white whitespace-nowrap text-right">
                                    {safeSalesCommissionPercentage > 0 ? `${safeSalesCommissionPercentage}%` : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('salesCommissionAmount') || t('salesCommissionAmount') || 'Sales Commission Amount'}</span>
                                <span className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap text-right">
                                    {safeSalesCommissionAmount > 0 ? (() => {
                                        const formatted = safeSalesCommissionAmount.toLocaleString('en-US', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 2 
                                        });
                                        return formatted.replace(/\.0+$/, '');
                                    })() : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Dates & Personnel */}
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">
                        {t('personnelInformation') || 'Personnel Information'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startDate') || 'Start Date'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(startDate)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedDate') || 'Closed Date'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(closedDate)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startedBy') || 'Started By'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {startedByUser ? getUserDisplayName(startedByUser) : '-'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedBy') || 'Closed By'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {closedByUser ? getUserDisplayName(closedByUser) : '-'}
                            </p>
                        </div>
                        {viewingDeal.employee && (
                            <div className="text-center">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('employee') || 'Employee'}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {(() => {
                                        const employee = users.find((u: any) => u.id === viewingDeal.employee);
                                        return employee ? getUserDisplayName(employee) : '-';
                                    })()}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Description */}
                {viewingDeal.description && (
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">
                            {t('description') || 'Description'}
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {viewingDeal.description}
                        </p>
                    </Card>
                )}

                {/* Timestamps */}
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">
                        {t('timestamps') || 'Timestamps'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('createdAt') || 'Created At'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(viewingDeal.createdAt || (viewingDeal as any).created_at)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('updatedAt') || 'Updated At'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(viewingDeal.updatedAt || (viewingDeal as any).updated_at)}</p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                    <Button variant="secondary" onClick={() => setIsViewDealModalOpen(false)}>{t('close') || 'Close'}</Button>
                </div>
            </div>
        </Modal>
    );
};
