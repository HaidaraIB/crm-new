

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, Loader, TrashIcon, EditIcon, EyeIcon } from '../components/index';
import { Deal } from '../types';

const DealsTable = ({ deals, onDelete, onEdit, onView, isRealEstate }: { deals: Deal[], onDelete: (id: number) => void, onEdit: (id: number) => void, onView: (id: number) => void, isRealEstate: boolean }) => {
    const { t, projects, units } = useAppContext();
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[1000px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap">{t('dealId')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap">{t('clientName')}</th>
                                {isRealEstate && <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell">{t('project')}</th>}
                                {isRealEstate && <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell">{t('unit')}</th>}
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden sm:table-cell">{t('stage')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap">{t('status')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell">{t('paymentMethod')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-right">{t('value')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell">{t('startDate')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell">{t('closedDate')}</th>
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

                                    // Find project and unit names
                                    const projectName = isRealEstate && deal.project 
                                        ? (projects.find(p => p.name === deal.project || p.id.toString() === deal.project)?.name || deal.project)
                                        : null;
                                    const unitCode = isRealEstate && deal.unit 
                                        ? (units.find(u => u.code === deal.unit || u.id.toString() === deal.unit)?.code || deal.unit)
                                        : null;

                                    return (
                                        <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                            <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                <span className="text-sm">#{deal.id}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{deal.clientName}</span>
                                            </td>
                                            {isRealEstate && (
                                                <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{projectName || '-'}</span>
                                                </td>
                                            )}
                                            {isRealEstate && (
                                                <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{unitCode || '-'}</span>
                                                </td>
                                            )}
                                            <td className="px-4 py-4 hidden sm:table-cell whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getStageColor(deal.stage)}`}>
                                                    {formatStage(deal.stage)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                                                    deal.status === 'Reservation' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    deal.status === 'Contracted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                }`}>
                                                    {deal.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{deal.paymentMethod}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right whitespace-nowrap">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{deal.value.toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(deal.startDate)}</span>
                                            </td>
                                            <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(deal.closedDate)}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
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
    // TODO: أضف useEffect لتحميل Deals من API عند فتح الصفحة
    // مثال:
    // useEffect(() => {
    //   const loadDeals = async () => {
    //     try {
    //       const dealsData = await getDealsAPI();
    //       // TODO: استخدم setDeals من AppContext
    //     } catch (error) {
    //       console.error('Error loading deals:', error);
    //     }
    //   };
    //   loadDeals();
    // }, []);
    const { 
        t, 
        setCurrentPage, 
        setIsDealsFilterDrawerOpen, 
        deals, 
        dealFilters,
        setDealFilters,
        deleteDeal, 
        currentUser, 
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setIsEditDealModalOpen,
        setEditingDeal,
        setIsViewDealModalOpen,
        setViewingDeal
    } = useAppContext();
    const [loading, setLoading] = useState(true);
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const filteredDeals = useMemo(() => {
        let filtered = deals;

        // Status filter
        if (dealFilters.status && dealFilters.status !== 'All') {
            filtered = filtered.filter(deal => deal.status === dealFilters.status);
        }

        // Payment method filter
        if (dealFilters.paymentMethod && dealFilters.paymentMethod !== 'All') {
            filtered = filtered.filter(deal => deal.paymentMethod === dealFilters.paymentMethod);
        }

        // Unit filter (for real estate)
        if (isRealEstate && dealFilters.unit && dealFilters.unit !== 'All') {
            filtered = filtered.filter(deal => deal.unit === dealFilters.unit);
        }

        // Project filter (for real estate) - filter by deal's project
        if (isRealEstate && dealFilters.project && dealFilters.project !== 'All') {
            filtered = filtered.filter(deal => deal.project === dealFilters.project);
        }

        // Value range filter
        if (dealFilters.valueMin) {
            const minValue = parseFloat(dealFilters.valueMin);
            if (!isNaN(minValue)) {
                filtered = filtered.filter(deal => deal.value >= minValue);
            }
        }
        if (dealFilters.valueMax) {
            const maxValue = parseFloat(dealFilters.valueMax);
            if (!isNaN(maxValue)) {
                filtered = filtered.filter(deal => deal.value <= maxValue);
            }
        }

        // Search filter
        if (dealFilters.search) {
            const searchLower = dealFilters.search.toLowerCase();
            filtered = filtered.filter(deal => 
                deal.clientName.toLowerCase().includes(searchLower) || 
                deal.id.toString().includes(searchLower)
            );
        }

        return filtered;
    }, [deals, dealFilters, isRealEstate]);

    const handleDelete = (id: number) => {
        const deal = deals.find(d => d.id === id);
        if (deal) {
            setConfirmDeleteConfig({
                title: t('deleteDeal') || 'Delete Deal',
                message: t('confirmDeleteDeal') || 'Are you sure you want to delete the deal for',
                itemName: deal.clientName,
                onConfirm: async () => {
                    await deleteDeal(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleEdit = (id: number) => {
        const deal = deals.find(d => d.id === id);
        if (deal) {
            setEditingDeal(deal);
            setIsEditDealModalOpen(true);
        }
    };

    const handleView = (id: number) => {
        const deal = deals.find(d => d.id === id);
        if (deal) {
            setViewingDeal(deal);
            setIsViewDealModalOpen(true);
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('deals')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('deals')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsDealsFilterDrawerOpen(true)} className="w-full sm:w-auto">
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    <Button onClick={() => setCurrentPage('CreateDeal')} className="w-full sm:w-auto">
                        <PlusIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('createDeal')}</span>
                    </Button>
                </>
            }
        >
            <Card>
                <DealsTable deals={filteredDeals} onDelete={handleDelete} onEdit={handleEdit} onView={handleView} isRealEstate={isRealEstate} />
            </Card>
        </PageWrapper>
    );
};
