

import React, { useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, PlusIcon, FacebookIcon, TikTokIcon, WhatsappIcon, TrashIcon, SettingsIcon, Loader } from '../components/index';
import { Page } from '../types';
import { connectIntegrationAccountAPI } from '../services/api';
import { useConnectedAccounts, useDeleteConnectedAccount } from '../hooks/useQueries';

type Account = { id: number; name: string; status: string; };

type PlatformDetails = {
    name: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    accounts: Account[];
    dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'];
};

const platformConfig: Record<string, { name: string, icon: React.FC<React.SVGProps<SVGSVGElement>>, dataKey: keyof ReturnType<typeof useAppContext>['connectedAccounts'] }> = {
    'Meta': { name: 'Meta', icon: FacebookIcon, dataKey: 'facebook' },
    'TikTok': { name: 'TikTok', icon: TikTokIcon, dataKey: 'tiktok' },
    'WhatsApp': { name: 'WhatsApp', icon: WhatsappIcon, dataKey: 'whatsapp' },
};

export const IntegrationsPage = () => {
    const { t, currentPage, setIsManageIntegrationAccountModalOpen, setEditingAccount, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();

    // Get platform param based on currentPage
    const platformParam = useMemo(() => {
        if (currentPage === 'Meta' || currentPage === 'Integrations') {
            return 'meta';
        } else if (currentPage === 'TikTok') {
            return 'tiktok';
        } else if (currentPage === 'WhatsApp') {
            return 'whatsapp';
        }
        return undefined;
    }, [currentPage]);

    // Get dataKey based on currentPage (memoized)
    const dataKey = useMemo(() => {
        let platformKey: string;
        switch (currentPage) {
            case 'Integrations':
            case 'Meta':
                platformKey = 'Meta';
                break;
            case 'TikTok':
                platformKey = 'TikTok';
                break;
            case 'WhatsApp':
                platformKey = 'WhatsApp';
                break;
            default:
                return null;
        }
        return platformConfig[platformKey]?.dataKey || null;
    }, [currentPage]);

    // Fetch connected accounts using React Query
    const { data: accountsResponse, isLoading: loading } = useConnectedAccounts(platformParam);
    
    // Ensure accounts is always an array and format them
    const accounts = useMemo(() => {
        const accountsData = Array.isArray(accountsResponse) 
            ? accountsResponse 
            : (accountsResponse?.results || []);
        
        return accountsData.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            status: acc.status === 'connected' ? 'Connected' : acc.status === 'disconnected' ? 'Disconnected' : acc.status_display || 'Disconnected',
            link: acc.account_link,
            phone: acc.phone_number,
        }));
    }, [accountsResponse]);

    // Get platform details (memoized)
    const platform = useMemo(() => {
        if (!dataKey) return null;
        const config = platformConfig[Object.keys(platformConfig).find(key => platformConfig[key].dataKey === dataKey) || ''];
        if (!config) return null;
        return {
            name: config.name,
            icon: config.icon,
            dataKey: dataKey,
        };
    }, [dataKey]);
    
    if (!platform || !dataKey) {
        return <PageWrapper title={t('integrations')}><div>{t('unknownIntegration')}</div></PageWrapper>;
    }
    
    const { name, icon: Icon } = platform;
    const pageTitle = `${name} ${t('integration')}`;

    // Delete account mutation
    const deleteAccountMutation = useDeleteConnectedAccount();
    const queryClient = useQueryClient();

    // Handle OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const connected = urlParams.get('connected');
        const accountId = urlParams.get('account_id');
        
        if (connected === 'true' && accountId) {
            // Remove parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Invalidate queries to refetch accounts
            queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
        }
    }, [queryClient]);

    const handleDelete = async (accountId: number) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            setConfirmDeleteConfig({
                title: t('disconnect') || 'Disconnect Account',
                message: t('confirmDisconnectAccount') || 'Are you sure you want to disconnect',
                itemName: account.name,
                onConfirm: async () => {
                    try {
                        await deleteAccountMutation.mutateAsync(accountId);
                    } catch (error: any) {
                        console.error('Error deleting account:', error);
                        alert(error?.message || t('errorDeletingAccount') || 'Failed to delete account');
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleConnect = async (accountId: number) => {
        try {
            const response = await connectIntegrationAccountAPI(accountId);
            // توجيه المستخدم إلى صفحة OAuth
            if (response.authorization_url) {
                window.location.href = response.authorization_url;
            }
        } catch (error: any) {
            console.error('Error connecting account:', error);
            alert(error?.message || t('errorConnectingAccount') || 'Failed to connect account');
        }
    };

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setIsManageIntegrationAccountModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingAccount(null); // Ensure we are in "add" mode
        setIsManageIntegrationAccountModalOpen(true);
    };

    if (loading) {
        return (
            <PageWrapper title={pageTitle}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={pageTitle}
            actions={
                <Button onClick={handleAddNew}>
                    <PlusIcon className="w-4 h-4" /> {t('addNewAccount')}
                </Button>
            }
        >
            <Card>
                {accounts.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {accounts.map(account => (
                            <li key={account.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                    <Icon className="w-8 h-8 text-primary" />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                                        <span className={`flex items-center text-xs ${account.status === 'Connected' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            <span className={`h-2 w-2 me-1.5 rounded-full ${account.status === 'Connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                            {account.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {account.status !== 'Connected' && (
                                        <Button variant="primary" onClick={() => handleConnect(account.id)}>
                                            {t('connect') || 'Connect'}
                                        </Button>
                                    )}
                                    <Button variant="secondary" onClick={() => handleEdit(account)}><SettingsIcon className="w-4 h-4 me-2" /> {t('edit')}</Button>
                                    <Button variant="danger" onClick={() => handleDelete(account.id)}><TrashIcon className="w-4 h-4 me-2" /> {t('disconnect')}</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16">
                        <Icon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">{t('noAccountsConnected')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('connectAccountPrompt')}</p>
                    </div>
                )}
            </Card>
        </PageWrapper>
    );
};