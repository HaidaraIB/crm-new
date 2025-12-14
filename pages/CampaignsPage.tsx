

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, TrashIcon, FilterIcon, EditIcon } from '../components/index';
import { Campaign } from '../types';
import { CampaignsFilterDrawer } from '../components/drawers/CampaignsFilterDrawer';
import { useCampaigns, useDeleteCampaign } from '../hooks/useQueries';

const CampaignsTable = ({ campaigns, onEdit, onDelete }: { campaigns: Campaign[], onEdit: (campaign: Campaign) => void, onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg">
            <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400" style={{ minWidth: '800px' }}>
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('code')}</th>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('name')}</th>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('budget')}</th>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('createdAt')}</th>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('isActive')}</th>
                        <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.length > 0 ? campaigns.map(campaign => {
                        // Format budget
                        const formattedBudget = campaign.budget && campaign.budget > 0 ? (() => {
                            const num = Number(campaign.budget);
                            const formatted = num.toLocaleString('en-US', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 2 
                            });
                            return formatted.replace(/\.0+$/, '');
                        })() : '-';
                        
                        // Format date
                        const formattedDate = campaign.createdAt ? (() => {
                            try {
                                const date = new Date(campaign.createdAt);
                                return date.toLocaleDateString();
                            } catch {
                                return campaign.createdAt;
                            }
                        })() : '-';
                        
                        return (
                            <tr key={campaign.id} className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{campaign.code || '-'}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name || '-'}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{formattedBudget}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{formattedDate}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                        campaign.isActive 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                    }`}>
                                        {campaign.isActive ? t('yes') : t('no')}
                                    </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Button variant="ghost" className="p-1.5 h-auto !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 rounded-md transition-colors" onClick={() => onEdit(campaign)} title={t('edit') || 'Edit'}>
                                            <EditIcon className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" onClick={() => onDelete(campaign.id)} title={t('delete') || 'Delete'}>
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={6} className="px-4 py-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400">{t('noResultsFound')}</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}


export const CampaignsPage = () => {
    const { 
        t, 
        setIsAddCampaignModalOpen, 
        campaignFilters,
        setCampaignFilters,
        setIsCampaignsFilterDrawerOpen,
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen,
        setEditingCampaign,
        setIsEditCampaignModalOpen,
        currentUser 
    } = useAppContext();
    const isAdmin = currentUser?.role === 'Owner';

    // Fetch campaigns using React Query
    const { data: campaignsResponse, isLoading: campaignsLoading, error: campaignsError } = useCampaigns();
    const allCampaignsRaw = campaignsResponse?.results || [];
    
    // Normalize API fields to frontend naming (created_at -> createdAt, is_active -> isActive)
    const allCampaigns = useMemo(() => {
        return allCampaignsRaw.map((campaign: any) => ({
            ...campaign,
            createdAt: campaign.created_at || campaign.createdAt || '',
            isActive: campaign.is_active !== undefined ? campaign.is_active : (campaign.isActive !== undefined ? campaign.isActive : true),
            budget: typeof campaign.budget === 'number' ? campaign.budget : Number(campaign.budget) || 0,
        }));
    }, [allCampaignsRaw]);

    // Delete campaign mutation
    const deleteCampaignMutation = useDeleteCampaign();

    const filteredCampaigns = useMemo(() => {
        let filtered = allCampaigns;

        // Status filter
        if (campaignFilters.isActive && campaignFilters.isActive !== 'All') {
            filtered = filtered.filter(campaign => campaign.isActive === (campaignFilters.isActive === 'true'));
        }

        // Budget range filter
        if (campaignFilters.budgetMin) {
            const minBudget = parseFloat(campaignFilters.budgetMin);
            if (!isNaN(minBudget)) {
                filtered = filtered.filter(campaign => campaign.budget >= minBudget);
            }
        }
        if (campaignFilters.budgetMax) {
            const maxBudget = parseFloat(campaignFilters.budgetMax);
            if (!isNaN(maxBudget)) {
                filtered = filtered.filter(campaign => campaign.budget <= maxBudget);
            }
        }

        // Created date range filter
        if (campaignFilters.createdAtFrom) {
            const fromDate = new Date(campaignFilters.createdAtFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(campaign => {
                const createdAt = campaign.createdAt || (campaign as any).created_at;
                if (!createdAt) return false;
                const campaignDate = new Date(createdAt);
                campaignDate.setHours(0, 0, 0, 0);
                return campaignDate >= fromDate;
            });
        }
        if (campaignFilters.createdAtTo) {
            const toDate = new Date(campaignFilters.createdAtTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(campaign => {
                const createdAt = campaign.createdAt || (campaign as any).created_at;
                if (!createdAt) return false;
                const campaignDate = new Date(createdAt);
                return campaignDate <= toDate;
            });
        }

        // Search filter
        if (campaignFilters.search) {
            const searchLower = campaignFilters.search.toLowerCase();
            filtered = filtered.filter(campaign => 
                campaign.name.toLowerCase().includes(searchLower) ||
                campaign.code.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [allCampaigns, campaignFilters]);
    
    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setIsEditCampaignModalOpen(true);
    };

    const handleDelete = (id: number) => {
        const campaign = allCampaigns.find(c => c.id === id);
        if (campaign) {
            setConfirmDeleteConfig({
                title: t('deleteCampaign') || 'Delete Campaign',
                message: t('confirmDeleteCampaign') || 'Are you sure you want to delete',
                itemName: campaign.name,
                onConfirm: async () => {
                    try {
                        await deleteCampaignMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting campaign:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    }

    if (campaignsLoading) {
        return (
            <PageWrapper title={t('campaigns')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (campaignsError) {
        return (
            <PageWrapper title={t('campaigns')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingCampaigns') || 'Error loading campaigns. Please try again.'}
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
            title={t('campaigns')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsCampaignsFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddCampaignModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addCampaign')}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <CampaignsTable 
                    campaigns={filteredCampaigns}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Card>
            <CampaignsFilterDrawer />
        </PageWrapper>
    );
};
