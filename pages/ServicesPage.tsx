
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Service } from '../types';
import { ServicesFilterDrawer } from '../components/drawers/ServicesFilterDrawer';
import { useServices, useDeleteService } from '../hooks/useQueries';

const ServicesTable = ({ services, onUpdate, onDelete, isAdmin }: { services: Service[], onUpdate: (service: Service) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
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
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('category')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('price')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('duration')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('status')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {services.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noServicesFound') || 'No services found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                services.map(service => (
                                    <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{service.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{service.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{service.category || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(service.price)}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{service.duration || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${service.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                {service.isActive ? t('active') : t('inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(service)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(service.id)}
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

export const ServicesPage = () => {
    const { 
        t,
        currentUser,
        hasSupervisorPermission,
        serviceFilters,
        setServiceFilters,
        setIsServiceFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddServiceModalOpen,
        setEditingService,
        setIsEditServiceModalOpen,
    } = useAppContext();

    // Fetch services using React Query
    const { data: servicesResponse, isLoading: servicesLoading, error: servicesError } = useServices();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allServices = useMemo(() => {
        const services = servicesResponse?.results || [];
        return services.map((s: any) => ({
            id: s.id,
            code: s.code || '',
            name: s.name || '',
            description: s.description || '',
            price: s.price || s.price === 0 ? Number(s.price) : 0,
            duration: s.duration || '',
            category: s.category || '',
            provider: s.provider_name || s.provider || s.provider_id || '',
            isActive: s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true),
        } as Service));
    }, [servicesResponse]);

    // Delete service mutation
    const deleteServiceMutation = useDeleteService();

    // Check if user's company specialization is services
    const isServices = currentUser?.company?.specialization === 'services';
    const isAdmin = currentUser?.role === 'Owner' || (currentUser?.role === 'Supervisor' && hasSupervisorPermission('can_manage_services'));

    // If not services, show message
    if (!isServices) {
        return (
            <PageWrapper title={t('services')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">{t('servicesOnly') || 'This page is only available for Services companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeleteService = (id: number) => {
        const service = allServices.find(s => s.id === id);
        if (service) {
            setConfirmDeleteConfig({
                title: t('deleteService') || 'Delete Service',
                message: t('confirmDeleteService') || 'Are you sure you want to delete',
                itemName: service.name,
                onConfirm: async () => {
                    try {
                        await deleteServiceMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting service:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const filteredServices = useMemo(() => {
        let filtered = allServices;
        if (serviceFilters.category && serviceFilters.category !== 'All') {
            filtered = filtered.filter(service => service.category === serviceFilters.category);
        }
        if (serviceFilters.provider && serviceFilters.provider !== 'All') {
            filtered = filtered.filter(service => service.provider === serviceFilters.provider);
        }
        if (serviceFilters.isActive && serviceFilters.isActive !== 'All') {
            filtered = filtered.filter(service => service.isActive === (serviceFilters.isActive === 'true'));
        }
        if (serviceFilters.priceMin) {
            const minPrice = parseFloat(serviceFilters.priceMin);
            if (!isNaN(minPrice)) {
                filtered = filtered.filter(service => service.price >= minPrice);
            }
        }
        if (serviceFilters.priceMax) {
            const maxPrice = parseFloat(serviceFilters.priceMax);
            if (!isNaN(maxPrice)) {
                filtered = filtered.filter(service => service.price <= maxPrice);
            }
        }
        if (serviceFilters.search) {
            const searchLower = serviceFilters.search.toLowerCase();
            filtered = filtered.filter(service => 
                service.name.toLowerCase().includes(searchLower) || 
                service.code.toLowerCase().includes(searchLower)
            );
        }
        return filtered;
    }, [allServices, serviceFilters]);

    const handleUpdateService = (service: Service) => {
        setEditingService(service);
        setIsEditServiceModalOpen(true);
    };

    if (servicesLoading) {
        return (
            <PageWrapper title={t('services')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (servicesError) {
        return (
            <PageWrapper title={t('services')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingServices') || 'Error loading services. Please try again.'}
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
            title={t('services')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsServiceFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddServiceModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addService') || 'Add Service'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <ServicesTable services={filteredServices} onUpdate={handleUpdateService} onDelete={handleDeleteService} isAdmin={isAdmin} />
            </Card>
            <ServicesFilterDrawer />
        </PageWrapper>
    );
};

