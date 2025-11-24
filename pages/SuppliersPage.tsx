
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Supplier } from '../types';
import { SuppliersFilterDrawer } from '../components/drawers/SuppliersFilterDrawer';

const SuppliersTable = ({ suppliers, onUpdate, onDelete, isAdmin }: { suppliers: Supplier[], onUpdate: (supplier: Supplier) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right min-w-[900px]">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('specialization')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('phone')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('email')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('contactPerson')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(supplier => (
                                <tr key={supplier.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.specialization}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.phone}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.email}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{supplier.contactPerson}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(supplier)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(supplier.id)}>
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

export const SuppliersPage = () => {
    const { 
        t,
        currentUser,
        suppliers,
        supplierFilters,
        setSupplierFilters,
        setIsSupplierFilterDrawerOpen,
        deleteSupplier,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddSupplierModalOpen,
        setEditingSupplier,
        setIsEditSupplierModalOpen,
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي getSuppliersAPI() هنا عند فتح الصفحة
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';
    const isAdmin = currentUser?.role === 'Owner';

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
        const supplier = suppliers.find(s => s.id === id);
        if (supplier) {
            setConfirmDeleteConfig({
                title: t('deleteSupplier') || 'Delete Supplier',
                message: t('confirmDeleteSupplier') || 'Are you sure you want to delete',
                itemName: supplier.name,
                onConfirm: async () => {
                    await deleteSupplier(id);
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
        let filtered = suppliers;

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
    }, [suppliers, supplierFilters]);

    if (loading) {
        return (
            <PageWrapper title={t('suppliers')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
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

