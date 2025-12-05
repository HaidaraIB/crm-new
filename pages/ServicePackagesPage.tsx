
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { ServicePackage } from '../types';
import { ServicePackagesFilterDrawer } from '../components/drawers/ServicePackagesFilterDrawer';

const PackagesTable = ({ packages, onUpdate, onDelete, isAdmin }: { packages: ServicePackage[], onUpdate: (pkg: ServicePackage) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[700px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('description')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('price')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('duration')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('status')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map(pkg => (
                                <tr key={pkg.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{pkg.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{pkg.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm max-w-xs truncate">{pkg.description}</td>
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{pkg.price.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{pkg.duration}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${pkg.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {pkg.isActive ? t('active') : t('inactive')}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(pkg)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(pkg.id)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
        servicePackages,
        servicePackageFilters,
        setServicePackageFilters,
        setIsServicePackagesFilterDrawerOpen,
        deleteServicePackage,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddServicePackageModalOpen,
        setEditingServicePackage,
        setIsEditServicePackageModalOpen,
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي getServicePackagesAPI() هنا عند فتح الصفحة
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

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
        const pkg = servicePackages.find(p => p.id === id);
        if (pkg) {
            setConfirmDeleteConfig({
                title: t('deleteServicePackage') || 'Delete Service Package',
                message: t('confirmDeleteServicePackage') || 'Are you sure you want to delete',
                itemName: pkg.name,
                onConfirm: async () => {
                    await deleteServicePackage(id);
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
        let filtered = servicePackages;

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
    }, [servicePackages, servicePackageFilters]);

    if (loading) {
        return (
            <PageWrapper title={t('servicePackages')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
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

