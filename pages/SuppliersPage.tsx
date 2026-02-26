
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Supplier } from '../types';
import { SuppliersFilterDrawer } from '../components/drawers/SuppliersFilterDrawer';
import { useSuppliers, useDeleteSupplier } from '../hooks/useQueries';

const SuppliersTable = ({ suppliers, onUpdate, onDelete, isAdmin }: { suppliers: Supplier[], onUpdate: (supplier: Supplier) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[900px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('code')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('name')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('specialization')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('phone')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('email')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('contactPerson')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {suppliers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noSuppliersFound') || 'No suppliers found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                suppliers.map(supplier => (
                                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{supplier.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{supplier.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{supplier.specialization || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{supplier.phone || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{supplier.email || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{supplier.contactPerson || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(supplier)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(supplier.id)}
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

export const SuppliersPage = () => {
    const { 
        t,
        currentUser,
        supplierFilters,
        setSupplierFilters,
        setIsSupplierFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddSupplierModalOpen,
        setEditingSupplier,
        setIsEditSupplierModalOpen,
        hasSupervisorPermission,
    } = useAppContext();

    // Fetch suppliers using React Query
    const { data: suppliersResponse, isLoading: suppliersLoading, error: suppliersError } = useSuppliers();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allSuppliers = useMemo(() => {
        const suppliers = suppliersResponse?.results || [];
        return suppliers.map((s: any) => ({
            id: s.id,
            code: s.code || '',
            name: s.name || '',
            logo: s.logo || '',
            phone: s.phone || '',
            email: s.email || '',
            address: s.address || '',
            contactPerson: s.contact_person || s.contactPerson || '',
            specialization: s.specialization || '',
            isActive: s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true),
        } as Supplier));
    }, [suppliersResponse]);

    // Delete supplier mutation
    const deleteSupplierMutation = useDeleteSupplier();

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';
    const isAdmin = currentUser?.role === 'Owner' || (currentUser?.role === 'Supervisor' && hasSupervisorPermission('can_manage_products'));

    // If not products, show message
    if (!isProducts) {
        return (
            <PageWrapper title={t('suppliers')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-secondary">{t('productsOnly') || 'This page is only available for Products companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeleteSupplier = (id: number) => {
        const supplier = allSuppliers.find(s => s.id === id);
        if (supplier) {
            setConfirmDeleteConfig({
                title: t('deleteSupplier') || 'Delete Supplier',
                message: t('confirmDeleteSupplier') || 'Are you sure you want to delete',
                itemName: supplier.name,
                onConfirm: async () => {
                    try {
                        await deleteSupplierMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting supplier:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsEditSupplierModalOpen(true);
    };

    const filteredSuppliers = useMemo(() => {
        let filtered = allSuppliers;

        // Specialization filter
        if (supplierFilters.specialization && supplierFilters.specialization !== 'All') {
            filtered = filtered.filter(supplier => supplier.specialization === supplierFilters.specialization);
        }

        // Search filter
        if (supplierFilters.search) {
            const searchLower = supplierFilters.search.toLowerCase();
            filtered = filtered.filter(supplier => 
                supplier.name.toLowerCase().includes(searchLower) ||
                supplier.code.toLowerCase().includes(searchLower) ||
                (supplier.email && supplier.email.toLowerCase().includes(searchLower)) ||
                (supplier.phone && supplier.phone.toLowerCase().includes(searchLower)) ||
                (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchLower))
            );
        }

        return filtered;
    }, [allSuppliers, supplierFilters]);

    if (suppliersLoading) {
        return (
            <PageWrapper title={t('suppliers')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (suppliersError) {
        return (
            <PageWrapper title={t('suppliers')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingSuppliers') || 'Error loading suppliers. Please try again.'}
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
            title={t('suppliers')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsSupplierFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddSupplierModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addSupplier') || 'Add Supplier'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <SuppliersTable suppliers={filteredSuppliers} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} isAdmin={isAdmin} />
            </Card>
            <SuppliersFilterDrawer />
        </PageWrapper>
    );
};

