
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { ServiceProvider } from '../types';
import { ServiceProvidersFilterDrawer } from '../components/drawers/ServiceProvidersFilterDrawer';
import { useServiceProviders, useDeleteServiceProvider } from '../hooks/useQueries';

const ProvidersTable = ({ providers, onUpdate, onDelete, isAdmin }: { providers: ServiceProvider[], onUpdate: (provider: ServiceProvider) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    
    // Format rating with proper number formatting
    const formatRating = (rating: number | undefined | null): string => {
        if (rating === undefined || rating === null || isNaN(Number(rating))) return '-';
        const num = Number(rating);
        return `⭐ ${num.toFixed(1)}`;
    };
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[800px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('code')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('name')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('specialization')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('phone')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('email')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('rating')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {providers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noServiceProvidersFound') || 'No service providers found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                providers.map(provider => (
                                    <tr key={provider.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{provider.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{provider.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{provider.specialization || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{provider.phone || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{provider.email || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatRating(provider.rating)}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(provider)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(provider.id)}
                                                        title={t('delete') || 'Delete'}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const ServiceProvidersPage = () => {
    const { 
        t,
        currentUser,
        serviceProviderFilters,
        setServiceProviderFilters,
        setIsServiceProviderFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddServiceProviderModalOpen,
        setEditingServiceProvider,
        setIsEditServiceProviderModalOpen,
        hasSupervisorPermission,
    } = useAppContext();

    // Fetch service providers using React Query
    const { data: providersResponse, isLoading: providersLoading, error: providersError } = useServiceProviders();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allProviders = useMemo(() => {
        const providers = providersResponse?.results || [];
        return providers.map((p: any) => ({
            id: p.id,
            code: p.code || '',
            name: p.name || '',
            phone: p.phone || '',
            email: p.email || '',
            specialization: p.specialization || '',
            rating: p.rating !== undefined && p.rating !== null ? Number(p.rating) : undefined,
        } as ServiceProvider));
    }, [providersResponse]);

    // Delete service provider mutation
    const deleteServiceProviderMutation = useDeleteServiceProvider();

    // Check if user's company specialization is services
    const isServices = currentUser?.company?.specialization === 'services';
    const isAdmin = currentUser?.role === 'Owner' || (currentUser?.role === 'Supervisor' && hasSupervisorPermission('can_manage_services'));

    // If not services, show message
    if (!isServices) {
        return (
            <PageWrapper title={t('serviceProviders')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-secondary">{t('servicesOnly') || 'This page is only available for Services companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeleteProvider = (id: number) => {
        const provider = allProviders.find(p => p.id === id);
        if (provider) {
            setConfirmDeleteConfig({
                title: t('deleteServiceProvider') || 'Delete Service Provider',
                message: t('confirmDeleteServiceProvider') || 'Are you sure you want to delete',
                itemName: provider.name,
                onConfirm: async () => {
                    try {
                        await deleteServiceProviderMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting service provider:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateProvider = (provider: ServiceProvider) => {
        setEditingServiceProvider(provider);
        setIsEditServiceProviderModalOpen(true);
    };

    const filteredProviders = useMemo(() => {
        let filtered = allProviders;

        // Specialization filter
        if (serviceProviderFilters.specialization && serviceProviderFilters.specialization !== 'All') {
            filtered = filtered.filter(provider => provider.specialization === serviceProviderFilters.specialization);
        }

        // Search filter
        if (serviceProviderFilters.search) {
            const searchLower = serviceProviderFilters.search.toLowerCase();
            filtered = filtered.filter(provider => 
                provider.name.toLowerCase().includes(searchLower) ||
                provider.code.toLowerCase().includes(searchLower) ||
                (provider.email && provider.email.toLowerCase().includes(searchLower)) ||
                (provider.phone && provider.phone.toLowerCase().includes(searchLower))
            );
        }

        return filtered;
    }, [allProviders, serviceProviderFilters]);

    if (providersLoading) {
        return (
            <PageWrapper title={t('serviceProviders')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (providersError) {
        return (
            <PageWrapper title={t('serviceProviders')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingServiceProviders') || 'Error loading service providers. Please try again.'}
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
            title={t('serviceProviders')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsServiceProviderFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddServiceProviderModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addServiceProvider') || 'Add Service Provider'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <ProvidersTable providers={filteredProviders} onUpdate={handleUpdateProvider} onDelete={handleDeleteProvider} isAdmin={isAdmin} />
            </Card>
            <ServiceProvidersFilterDrawer />
        </PageWrapper>
    );
};

