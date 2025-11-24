
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Service } from '../types';
import { ServicesFilterDrawer } from '../components/drawers/ServicesFilterDrawer';

const ServicesTable = ({ services, onUpdate, onDelete, isAdmin }: { services: Service[], onUpdate: (service: Service) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
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
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('category')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('price')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('duration')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('status')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map(service => (
                                <tr key={service.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{service.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{service.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{service.category}</td>
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{service.price.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{service.duration}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${service.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {service.isActive ? t('active') : t('inactive')}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(service)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(service.id)}>
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

export const ServicesPage = () => {
    const { 
        t,
        currentUser,
        services,
        serviceFilters,
        setServiceFilters,
        setIsServiceFilterDrawerOpen,
        deleteService,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddServiceModalOpen,
        setEditingService,
        setIsEditServiceModalOpen,
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي API لتحميل Services عند فتح الصفحة (لشركات الخدمات فقط)
        // مثال:
        // const loadServices = async () => {
        //   try {
        //     const servicesData = await getServicesAPI();
        //     // TODO: استخدم setServices من AppContext لتحديث البيانات
        //   } catch (error) {
        //     console.error('Error loading services:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // if (isServices) loadServices();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is services
    const isServices = currentUser?.company?.specialization === 'services';
    const isAdmin = currentUser?.role === 'Owner';

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
        const service = services.find(s => s.id === id);
        if (service) {
            setConfirmDeleteConfig({
                title: t('deleteService') || 'Delete Service',
                message: t('confirmDeleteService') || 'Are you sure you want to delete',
                itemName: service.name,
                onConfirm: async () => {
                    await deleteService(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const filteredServices = useMemo(() => {
        let filtered = services;
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
    }, [services, serviceFilters]);

    const handleUpdateService = (service: Service) => {
        setEditingService(service);
        setIsEditServiceModalOpen(true);
    };

    if (loading) {
        return (
            <PageWrapper title={t('services')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
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

