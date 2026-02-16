

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, Loader, TrashIcon, EditIcon, EyeIcon } from '../components/index';
import { Deal } from '../types';
import { useDeals, useDeleteDeal, useProjects, useUnits } from '../hooks/useQueries';
import { exportToExcel } from '../utils/exportToExcel';

const DealsTable = ({ deals, onDelete, onEdit, onView, isRealEstate, projects, units }: { deals: Deal[], onDelete: (id: number) => void, onEdit: (id: number) => void, onView: (id: number) => void, isRealEstate: boolean, projects: any[], units: any[] }) => {
    const { t } = useAppContext();
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[1000px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('dealId')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('clientName')}</th>
                                {isRealEstate && <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('project')}</th>}
                                {isRealEstate && <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('unit')}</th>}
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden sm:table-cell text-center">{t('stage')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('status')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('paymentMethod')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('value')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('startDate')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('closedDate')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {deals.length === 0 ? (
                                <tr>
                                    <td colSpan={isRealEstate ? 11 : 9} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noDealsFound')}</p>
                                    </td>
                                </tr>
                            ) : (
                                deals.map(deal => {
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

                                    const formatPaymentMethod = (method: string | undefined): string => {
                                        if (!method) return '-';
                                        const methodLower = method.toLowerCase();
                                        const methodMap: { [key: string]: string } = {
                                            'cash': t('cash') || 'Cash',
                                            'installment': t('installment') || 'Installment',
                                        };
                                        return methodMap[methodLower] || method;
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

                                    // Get project and unit names from API serializer fields (project_name, unit_code)
                                    // If not available, fall back to searching in projects/units arrays
                                    const projectName = isRealEstate && deal.project 
                                        ? ((deal as any).project_name || projects.find(p => p.name === deal.project || p.id.toString() === deal.project || p.id === deal.project)?.name || (typeof deal.project === 'string' ? deal.project : null))
                                        : null;
                                    const unitCode = isRealEstate && deal.unit 
                                        ? ((deal as any).unit_code || units.find(u => u.code === deal.unit || u.id.toString() === deal.unit || u.id === deal.unit)?.code || (typeof deal.unit === 'string' ? deal.unit : null))
                                        : null;

                                    // Format value like budget: comma-separated with trailing zeros removed
                                    const formattedValue = (() => {
                                        const num = Number(deal.value);
                                        const formatted = num.toLocaleString('en-US', { 
                                            minimumFractionDigits: 0, 
                                            maximumFractionDigits: 2 
                                        });
                                        return formatted.replace(/\.0+$/, '');
                                    })();

                                    return (
                                        <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                            <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap text-center">
                                                <span className="text-sm">#{deal.id}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{deal.clientName}</span>
                                            </td>
                                            {isRealEstate && (
                                                <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{projectName || '-'}</span>
                                                </td>
                                            )}
                                            {isRealEstate && (
                                                <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{unitCode || '-'}</span>
                                                </td>
                                            )}
                                            <td className="px-4 py-4 hidden sm:table-cell whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(deal.stage)}`}>
                                                    {formatStage(deal.stage)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                                                    deal.status?.toLowerCase() === 'reservation' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    deal.status?.toLowerCase() === 'contracted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    deal.status?.toLowerCase() === 'closed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                }`}>
                                                    {formatStatus(deal.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatPaymentMethod(deal.paymentMethod)}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formattedValue}</span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(deal.startDate)}</span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(deal.closedDate)}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-1.5 h-auto !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20 rounded-md transition-colors" 
                                                        onClick={() => onView(deal.id)} 
                                                        title={t('view') || 'View'}
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-1.5 h-auto !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 rounded-md transition-colors" 
                                                        onClick={() => onEdit(deal.id)} 
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" 
                                                        onClick={() => onDelete(deal.id)} 
                                                        title={t('delete') || 'Delete'}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const DealsPage = () => {
    const { 
        t, 
        setCurrentPage, 
        setIsDealsFilterDrawerOpen, 
        dealFilters,
        setDealFilters,
        currentUser, 
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsEditDealModalOpen,
        setEditingDeal,
        setIsViewDealModalOpen,
        setViewingDeal
    } = useAppContext();

    // Fetch deals using React Query
    const { data: dealsResponse, isLoading: dealsLoading, error: dealsError } = useDeals();
    const dealsRaw = dealsResponse?.results || [];

    // Fetch projects and units for real estate
    const { data: projectsResponse } = useProjects();
    const projectsRaw = projectsResponse?.results || [];

    const { data: unitsResponse } = useUnits();
    const unitsRaw = unitsResponse?.results || [];
    
    // Transform deals: convert client, project, unit from object/ID to string
    const allDeals = useMemo(() => {
        return dealsRaw.map((deal: any) => {
            // Handle clientName - API might return client_name, clientName, or client object
            let clientName = '';
            if (deal.client_name) {
                clientName = deal.client_name;
            } else if (deal.clientName) {
                clientName = deal.clientName;
            } else if (typeof deal.client === 'object' && deal.client?.name) {
                clientName = deal.client.name;
            } else if (typeof deal.client === 'number') {
                // Would need to fetch client, but for now use fallback
                clientName = deal.client_name || deal.clientName || '';
            }
            
            // Handle project - API might return project_name, project, or project object
            let projectName = '';
            if (deal.project_name) {
                projectName = deal.project_name;
            } else if (typeof deal.project === 'object' && deal.project?.name) {
                projectName = deal.project.name;
            } else if (typeof deal.project === 'number') {
                const proj = projectsRaw.find((p: any) => p.id === deal.project);
                projectName = proj?.name || '';
            } else if (typeof deal.project === 'string') {
                projectName = deal.project;
            }
            
            // Handle unit - API might return unit_code, unit, or unit object
            let unitCode = '';
            if (deal.unit_code) {
                unitCode = deal.unit_code;
            } else if (typeof deal.unit === 'object' && deal.unit?.code) {
                unitCode = deal.unit.code;
            } else if (typeof deal.unit === 'number') {
                const unit = unitsRaw.find((u: any) => u.id === deal.unit);
                unitCode = unit?.code || '';
            } else if (typeof deal.unit === 'string') {
                unitCode = deal.unit;
            }
            
            // Handle paymentMethod - API might return payment_method or paymentMethod
            const paymentMethod = deal.payment_method || deal.paymentMethod || '';
            
            // Handle startedBy and closedBy - API might return started_by/closed_by or startedBy/closedBy
            const startedBy = deal.started_by || deal.startedBy || null;
            const closedBy = deal.closed_by || deal.closedBy || null;
            
            // Handle startDate and closedDate - API might return start_date/closed_date or startDate/closedDate
            const startDate = deal.start_date || deal.startDate || null;
            const closedDate = deal.closed_date || deal.closedDate || null;
            
            return {
                ...deal,
                clientName: clientName,
                project: projectName,
                unit: unitCode,
                paymentMethod: paymentMethod,
                startedBy: startedBy,
                closedBy: closedBy,
                startDate: startDate,
                closedDate: closedDate,
            };
        });
    }, [dealsRaw, projectsRaw, unitsRaw]);
    
    // Transform projects and units for display
    const projects = projectsRaw;
    const units = unitsRaw;

    // Delete deal mutation
    const deleteDealMutation = useDeleteDeal();

    const isRealEstate = currentUser?.company?.specialization === 'real_estate';

    const filteredDeals = useMemo(() => {
        let filtered = allDeals;

        // Status filter
        if (dealFilters.status && dealFilters.status !== 'All') {
            filtered = filtered.filter(deal => {
                const status = deal.status || '';
                return status === dealFilters.status;
            });
        }

        // Payment method filter
        if (dealFilters.paymentMethod && dealFilters.paymentMethod !== 'All') {
            filtered = filtered.filter(deal => {
                const paymentMethod = deal.paymentMethod || '';
                return paymentMethod === dealFilters.paymentMethod;
            });
        }

        // Unit filter (for real estate)
        if (isRealEstate && dealFilters.unit && dealFilters.unit !== 'All') {
            filtered = filtered.filter(deal => {
                const unit = deal.unit || '';
                return unit === dealFilters.unit;
            });
        }

        // Project filter (for real estate) - filter by deal's project
        if (isRealEstate && dealFilters.project && dealFilters.project !== 'All') {
            filtered = filtered.filter(deal => {
                const project = deal.project || '';
                return project === dealFilters.project;
            });
        }

        // Value range filter
        if (dealFilters.valueMin) {
            const minValue = parseFloat(dealFilters.valueMin);
            if (!isNaN(minValue)) {
                filtered = filtered.filter(deal => (deal.value || 0) >= minValue);
            }
        }
        if (dealFilters.valueMax) {
            const maxValue = parseFloat(dealFilters.valueMax);
            if (!isNaN(maxValue)) {
                filtered = filtered.filter(deal => (deal.value || 0) <= maxValue);
            }
        }

        // Search filter
        if (dealFilters.search) {
            const searchLower = dealFilters.search.toLowerCase();
            filtered = filtered.filter(deal => 
                (deal.clientName || '').toLowerCase().includes(searchLower) || 
                deal.id.toString().includes(searchLower)
            );
        }

        return filtered;
    }, [allDeals, dealFilters, isRealEstate]);

    const handleDelete = (id: number) => {
        const deal = allDeals.find(d => d.id === id);
        if (deal) {
            setConfirmDeleteConfig({
                title: t('deleteDeal') || 'Delete Deal',
                message: t('confirmDeleteDeal') || 'Are you sure you want to delete the deal for',
                itemName: deal.clientName,
                onConfirm: async () => {
                    try {
                        await deleteDealMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting deal:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleEdit = (id: number) => {
        const deal = allDeals.find(d => d.id === id);
        if (deal) {
            setEditingDeal(deal);
            setIsEditDealModalOpen(true);
        }
    };

    const handleView = (id: number) => {
        const deal = allDeals.find(d => d.id === id);
        if (deal) {
            setViewingDeal(deal);
            setIsViewDealModalOpen(true);
        }
    };

    const handleExportDeals = () => {
        const rows = filteredDeals.map((deal: any) => ({
            id: deal.id,
            clientName: deal.clientName ?? '',
            project: deal.project ?? '',
            unit: deal.unit ?? '',
            stage: deal.stage ?? '',
            status: deal.status ?? '',
            paymentMethod: deal.paymentMethod ?? '',
            value: deal.value ?? '',
            startDate: deal.startDate ? new Date(deal.startDate).toLocaleDateString() : '',
            closedDate: deal.closedDate ? new Date(deal.closedDate).toLocaleDateString() : '',
        }));
        const columns = [
            { key: 'id', label: t('dealId') || 'ID' },
            { key: 'clientName', label: t('clientName') || 'Client' },
            { key: 'project', label: t('project') || 'Project' },
            { key: 'unit', label: t('unit') || 'Unit' },
            { key: 'stage', label: t('stage') || 'Stage' },
            { key: 'status', label: t('status') || 'Status' },
            { key: 'paymentMethod', label: t('paymentMethod') || 'Payment Method' },
            { key: 'value', label: t('value') || 'Value' },
            { key: 'startDate', label: t('startDate') || 'Start Date' },
            { key: 'closedDate', label: t('closedDate') || 'Closed Date' },
        ];
        exportToExcel(rows, columns, `deals-export-${new Date().toISOString().slice(0, 10)}`, t('deals') || 'Deals');
    };

    if (dealsLoading) {
        return (
            <PageWrapper title={t('deals')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (dealsError) {
        return (
            <PageWrapper title={t('deals')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingDeals') || 'Error loading deals. Please try again.'}
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            {t('reload') || 'Reload'}
                        </Button>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('deals')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsDealsFilterDrawerOpen(true)} className="w-full sm:w-auto" type="button">
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    <Button variant="secondary" onClick={handleExportDeals} className="w-full sm:w-auto" type="button" disabled={filteredDeals.length === 0}>
                        <span className="hidden sm:inline">{t('exportDeals') || 'Export to Excel'}</span>
                    </Button>
                    <Button 
                        onClick={() => {
                            window.history.pushState({}, '', '/create-deal');
                            setCurrentPage('CreateDeal');
                        }} 
                        className="w-full sm:w-auto" 
                        type="button"
                    >
                        <PlusIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('createDeal')}</span>
                    </Button>
                </>
            }
        >
            <Card>
                <DealsTable deals={filteredDeals} onDelete={handleDelete} onEdit={handleEdit} onView={handleView} isRealEstate={isRealEstate} projects={projects} units={units} />
            </Card>
        </PageWrapper>
    );
};
