
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Card } from '../Card';

export const ViewDealModal = () => {
    const { 
        isViewDealModalOpen, 
        setIsViewDealModalOpen, 
        t, 
        viewingDeal,
        users,
        leads,
        projects,
        units,
        currentUser
    } = useAppContext();
    
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    
    if (!viewingDeal) return null;

    // Find related data
    const lead = leads.find(l => l.id === viewingDeal.leadId || l.id === viewingDeal.client);
    const startedByUser = users.find(u => u.id === viewingDeal.startedBy);
    const closedByUser = users.find(u => u.id === viewingDeal.closedBy);
    const project = isRealEstate && viewingDeal.project ? projects.find(p => p.name === viewingDeal.project) : null;
    const unit = isRealEstate && viewingDeal.unit ? units.find(u => u.code === viewingDeal.unit) : null;

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

    // Calculate values
    const totalValue = viewingDeal.value || 0;
    const discountAmount = viewingDeal.discountAmount || 0;
    const originalValue = totalValue + discountAmount;
    const discountPercentage = viewingDeal.discountPercentage || 0;
    const salesCommissionPercentage = viewingDeal.salesCommissionPercentage || 0;
    const salesCommissionAmount = viewingDeal.salesCommissionAmount || 0;

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

    const getStatusColor = (status: string | undefined): string => {
        if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        const colorMap: { [key: string]: string } = {
            'Reservation': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'Contracted': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'Closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    };

    return (
        <Modal 
            isOpen={isViewDealModalOpen} 
            onClose={() => setIsViewDealModalOpen(false)} 
            maxWidth="4xl"
            title={
                <div className="flex items-center justify-between">
                    <span>{t('viewDeal') || 'View Deal'}</span>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">#{viewingDeal.id}</span>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Header Card with Key Info */}
                <Card>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('clientName') || 'Client Name'}</p>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{viewingDeal.clientName || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lead') || 'Lead'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{lead?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stage') || 'Stage'}</p>
                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStageColor(viewingDeal.stage)}`}>
                                {formatStage(viewingDeal.stage)}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('status') || 'Status'}</p>
                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(viewingDeal.status)}`}>
                                {viewingDeal.status || '-'}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalValue') || 'Total Value'}</p>
                            <p className="text-lg font-bold text-primary">{totalValue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('paymentMethod') || 'Payment Method'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{viewingDeal.paymentMethod || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startDate') || 'Start Date'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.startDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedDate') || 'Closed Date'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.closedDate)}</p>
                        </div>
                        {isRealEstate && (
                            <>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('project') || 'Project'}</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{project?.name || viewingDeal.project || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('unit') || 'Unit'}</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{unit?.code || viewingDeal.unit || '-'}</p>
                                </div>
                            </>
                        )}
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startedBy') || 'Started By'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{startedByUser?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedBy') || 'Closed By'}</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">{closedByUser?.name || '-'}</p>
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
                                <span className="text-base font-semibold text-gray-900 dark:text-white">{originalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('discountPercentage') || 'Discount Percentage'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white">{discountPercentage > 0 ? `${discountPercentage}%` : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('discountAmount') || 'Discount Amount'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white">{discountAmount > 0 ? discountAmount.toLocaleString() : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-3">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('totalValue') || 'Total Value'}</span>
                                <span className="text-lg font-bold text-primary">{totalValue.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('salesCommissionPercentage') || 'Sales Commission %'}</span>
                                <span className="text-base font-medium text-gray-900 dark:text-white">{salesCommissionPercentage > 0 ? `${salesCommissionPercentage}%` : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('salesCommissionAmount') || 'Sales Commission Amount'}</span>
                                <span className="text-base font-semibold text-gray-900 dark:text-white">{salesCommissionAmount > 0 ? salesCommissionAmount.toLocaleString() : '-'}</span>
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
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startDate') || 'Start Date'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.startDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedDate') || 'Closed Date'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.closedDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('startedBy') || 'Started By'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{startedByUser?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closedBy') || 'Closed By'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{closedByUser?.name || '-'}</p>
                        </div>
                        {viewingDeal.employee && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('employee') || 'Employee'}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {users.find(u => u.id === viewingDeal.employee)?.name || '-'}
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
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('createdAt') || 'Created At'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('updatedAt') || 'Updated At'}</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewingDeal.updatedAt)}</p>
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
