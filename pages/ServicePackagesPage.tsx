
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { ServicePackage } from '../types';
import { ServicePackagesFilterDrawer } from '../components/drawers/ServicePackagesFilterDrawer';
import { useServicePackages, useDeleteServicePackage } from '../hooks/useQueries';

const PackagesTable = ({ packages, onUpdate, onDelete, isAdmin }: { packages: ServicePackage[], onUpdate: (pkg: ServicePackage) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    
    // Format price with proper number formatting
    const formatPrice = (price: number | undefined | null): string => {
        if (price === undefined || price === null || isNaN(Number(price))) return '-';
        const num = Number(price);
        const formatted = num.toLocaleString('en-US', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 2 
        });
        return formatted.replace(/\.0+$/, '');
    };
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[700px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('code')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('name')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('description')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('price')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('duration')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('status')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {packages.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noServicePackagesFound') || 'No service packages found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                packages.map(pkg => (
                                    <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{pkg.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{pkg.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate block mx-auto">{pkg.description || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(pkg.price)}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{pkg.duration || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${pkg.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                {pkg.isActive ? t('active') : t('inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(pkg)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(pkg.id)}
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

export const ServicePackagesPage = () => {
    const { 
        t,
        currentUser,
        servicePackageFilters,
        setServicePackageFilters,
        setIsServicePackagesFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddServicePackageModalOpen,
        setEditingServicePackage,
        setIsEditServicePackageModalOpen,
    } = useAppContext();

    // Fetch service packages using React Query
    const { data: packagesResponse, isLoading: packagesLoading, error: packagesError } = useServicePackages();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allPackages = useMemo(() => {
        const packages = packagesResponse?.results || [];
        return packages.map((p: any) => ({
            id: p.id,
            code: p.code || '',
            name: p.name || '',
            description: p.description || '',
            price: p.price || p.price === 0 ? Number(p.price) : 0,
            duration: p.duration || '',
            services: Array.isArray(p.services) ? p.services.map((s: any) => typeof s === 'number' ? s : (s.id || s)) : [],
            isActive: p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : true),
        } as ServicePackage));
    }, [packagesResponse]);

    // Delete service package mutation
    const deleteServicePackageMutation = useDeleteServicePackage();

    // Check if user's company specialization is services
    const isServices = currentUser?.company?.specialization === 'services';
    const isAdmin = currentUser?.role === 'Owner';

    // If not services, show message
    if (!isServices) {
        return (
            <PageWrapper title={t('servicePackages')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">{t('servicesOnly') || 'This page is only available for Services companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeletePackage = (id: number) => {
        const pkg = allPackages.find(p => p.id === id);
        if (pkg) {
            setConfirmDeleteConfig({
                title: t('deleteServicePackage') || 'Delete Service Package',
                message: t('confirmDeleteServicePackage') || 'Are you sure you want to delete',
                itemName: pkg.name,
                onConfirm: async () => {
                    try {
                        await deleteServicePackageMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting service package:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdatePackage = (pkg: ServicePackage) => {
        setEditingServicePackage(pkg);
        setIsEditServicePackageModalOpen(true);
    };

    const filteredPackages = useMemo(() => {
        let filtered = allPackages;

        // Status filter
        if (servicePackageFilters.status && servicePackageFilters.status !== 'All') {
            filtered = filtered.filter(pkg => pkg.isActive === (servicePackageFilters.status === 'Active'));
        }

        // Price range filter
        if (servicePackageFilters.priceMin) {
            const minPrice = parseFloat(servicePackageFilters.priceMin);
            if (!isNaN(minPrice)) {
                filtered = filtered.filter(pkg => pkg.price >= minPrice);
            }
        }
        if (servicePackageFilters.priceMax) {
            const maxPrice = parseFloat(servicePackageFilters.priceMax);
            if (!isNaN(maxPrice)) {
                filtered = filtered.filter(pkg => pkg.price <= maxPrice);
            }
        }

        // Search filter
        if (servicePackageFilters.search) {
            const searchLower = servicePackageFilters.search.toLowerCase();
            filtered = filtered.filter(pkg => 
                pkg.name.toLowerCase().includes(searchLower) ||
                pkg.code.toLowerCase().includes(searchLower) ||
                (pkg.description && pkg.description.toLowerCase().includes(searchLower))
            );
        }

        return filtered;
    }, [allPackages, servicePackageFilters]);

    if (packagesLoading) {
        return (
            <PageWrapper title={t('servicePackages')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (packagesError) {
        return (
            <PageWrapper title={t('servicePackages')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingServicePackages') || 'Error loading service packages. Please try again.'}
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
            title={t('servicePackages')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsServicePackagesFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddServicePackageModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addServicePackage') || 'Add Service Package'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <PackagesTable packages={filteredPackages} onUpdate={handleUpdatePackage} onDelete={handleDeletePackage} isAdmin={isAdmin} />
            </Card>
            <ServicePackagesFilterDrawer />
        </PageWrapper>
    );
};

