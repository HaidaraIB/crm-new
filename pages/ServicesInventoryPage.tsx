
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, SearchIcon, Input, Loader, EditIcon, TrashIcon } from '../components/index';
import { Service, ServicePackage, ServiceProvider } from '../types';

type Tab = 'services' | 'packages' | 'providers';

const ServicesTable = ({ services, onUpdate, onDelete }: { services: Service[], onUpdate: (service: Service) => void, onDelete: (id: number) => void }) => {
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
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(service)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(service.id)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
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

const PackagesTable = ({ packages, onUpdate, onDelete }: { packages: ServicePackage[], onUpdate: (pkg: ServicePackage) => void, onDelete: (id: number) => void }) => {
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
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(pkg)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(pkg.id)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
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

const ProvidersTable = ({ providers, onUpdate, onDelete }: { providers: ServiceProvider[], onUpdate: (provider: ServiceProvider) => void, onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[800px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('logo')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('specialization')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('phone')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('email')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('rating')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.map(provider => (
                                <tr key={provider.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{provider.code}</td>
                                    <td className="px-3 sm:px-6 py-4"><img src={provider.logo} alt={provider.name} className="w-8 h-8 rounded-full object-cover" /></td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{provider.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{provider.specialization}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{provider.phone}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{provider.email}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{provider.rating ? `⭐ ${provider.rating}` : '-'}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(provider)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(provider.id)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
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

export const ServicesInventoryPage = () => {
    const { 
        t,
        currentUser,
        services,
        servicePackages,
        serviceProviders,
        deleteService,
        deleteServicePackage,
        deleteServiceProvider,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
    } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('services');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is services
    const isServices = currentUser?.company?.specialization === 'services';

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

    const handleUpdateService = (service: Service) => {
        // TODO: Implement update modal
        console.log('Update service:', service);
    };

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
        // TODO: Implement update modal
        console.log('Update package:', pkg);
    };

    const handleDeleteProvider = (id: number) => {
        const provider = serviceProviders.find(p => p.id === id);
        if (provider) {
            setConfirmDeleteConfig({
                title: t('deleteServiceProvider') || 'Delete Service Provider',
                message: t('confirmDeleteServiceProvider') || 'Are you sure you want to delete',
                itemName: provider.name,
                onConfirm: async () => {
                    await deleteServiceProvider(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateProvider = (provider: ServiceProvider) => {
        // TODO: Implement update modal
        console.log('Update provider:', provider);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'services':
                return <Card><ServicesTable services={services} onUpdate={handleUpdateService} onDelete={handleDeleteService} /></Card>;
            case 'packages':
                return <Card><PackagesTable packages={servicePackages} onUpdate={handleUpdatePackage} onDelete={handleDeletePackage} /></Card>;
            case 'providers':
                return <Card><ProvidersTable providers={serviceProviders} onUpdate={handleUpdateProvider} onDelete={handleDeleteProvider} /></Card>;
            default:
                return null;
        }
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
        <PageWrapper title={t('services')}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse min-w-max" aria-label="Tabs">
                    <button onClick={() => setActiveTab('services')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'services' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('services')}</button>
                    <button onClick={() => setActiveTab('packages')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'packages' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('servicePackages')}</button>
                    <button onClick={() => setActiveTab('providers')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'providers' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('serviceProviders')}</button>
                </nav>
            </div>
            {renderContent()}
        </PageWrapper>
    );
};

