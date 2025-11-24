

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, TrashIcon, FilterIcon } from '../components/index';
import { Campaign } from '../types';
import { CampaignsFilterDrawer } from '../components/drawers/CampaignsFilterDrawer';

const CampaignsTable = ({ campaigns, onDelete }: { campaigns: Campaign[], onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('name')}</th>
                        <th scope="col" className="px-6 py-3">{t('code')}</th>
                        <th scope="col" className="px-6 py-3">{t('budget')}</th>
                        <th scope="col" className="px-6 py-3">{t('createdAt')}</th>
                        <th scope="col" className="px-6 py-3">{t('isActive')}</th>
                        <th scope="col" className="px-6 py-3">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.length > 0 ? campaigns.map(campaign => (
                        <tr key={campaign.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{campaign.name}</td>
                            <td className="px-6 py-4">{campaign.code}</td>
                            <td className="px-6 py-4">{campaign.budget.toLocaleString()}</td>
                            <td className="px-6 py-4">{campaign.createdAt}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    campaign.isActive 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                    {campaign.isActive ? t('yes') : t('no')}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(campaign.id)}>
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center py-10">
                                {t('noResultsFound')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}


export const CampaignsPage = () => {
    // TODO: أضف useEffect لتحميل Campaigns من API عند فتح الصفحة
    // مثال:
    // useEffect(() => {
    //   const loadCampaigns = async () => {
    //     try {
    //       const campaignsData = await getCampaignsAPI();
    //       // TODO: استخدم setCampaigns من AppContext
    //     } catch (error) {
    //       console.error('Error loading campaigns:', error);
    //     }
    //   };
    //   loadCampaigns();
    // }, []);
    const { 
        t, 
        setIsAddCampaignModalOpen, 
        campaigns, 
        campaignFilters,
        setCampaignFilters,
        setIsCampaignsFilterDrawerOpen,
        deleteCampaign, 
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen, 
        currentUser 
    } = useAppContext();
    const isAdmin = currentUser?.role === 'Owner';
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const filteredCampaigns = useMemo(() => {
        let filtered = campaigns;

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
                const campaignDate = new Date(campaign.createdAt);
                campaignDate.setHours(0, 0, 0, 0);
                return campaignDate >= fromDate;
            });
        }
        if (campaignFilters.createdAtTo) {
            const toDate = new Date(campaignFilters.createdAtTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(campaign => {
                const campaignDate = new Date(campaign.createdAt);
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
    }, [campaigns, campaignFilters]);
    
    const handleDelete = (id: number) => {
        const campaign = campaigns.find(c => c.id === id);
        if (campaign) {
            setConfirmDeleteConfig({
                title: t('deleteCampaign') || 'Delete Campaign',
                message: t('confirmDeleteCampaign') || 'Are you sure you want to delete',
                itemName: campaign.name,
                onConfirm: async () => {
                    await deleteCampaign(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    }


    if (loading) {
        return (
            <PageWrapper title={t('campaigns')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
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
                    onDelete={handleDelete}
                />
            </Card>
            <CampaignsFilterDrawer />
        </PageWrapper>
    );
};
