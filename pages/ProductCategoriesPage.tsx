
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { ProductCategory } from '../types';
import { ProductCategoriesFilterDrawer } from '../components/drawers/ProductCategoriesFilterDrawer';

const CategoriesTable = ({ categories, onUpdate, onDelete, isAdmin }: { categories: ProductCategory[], onUpdate: (category: ProductCategory) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right min-w-[600px]">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('name')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('description')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(category => (
                                <tr key={category.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{category.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{category.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm max-w-xs truncate">{category.description}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(category)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(category.id)}>
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

export const ProductCategoriesPage = () => {
    const { 
        t,
        currentUser,
        productCategories,
        productCategoryFilters,
        setProductCategoryFilters,
        setIsProductCategoriesFilterDrawerOpen,
        deleteProductCategory,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddProductCategoryModalOpen,
        setEditingProductCategory,
        setIsEditProductCategoryModalOpen,
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي getProductCategoriesAPI() هنا عند فتح الصفحة
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';
    const isAdmin = currentUser?.role === 'Owner';

    // If not products, show message
    if (!isProducts) {
        return (
            <PageWrapper title={t('productCategories')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-700 dark:text-gray-300">{t('productsOnly') || 'This page is only available for Products companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeleteCategory = (id: number) => {
        const category = productCategories.find(c => c.id === id);
        if (category) {
            setConfirmDeleteConfig({
                title: t('deleteProductCategory') || 'Delete Product Category',
                message: t('confirmDeleteProductCategory') || 'Are you sure you want to delete',
                itemName: category.name,
                onConfirm: async () => {
                    await deleteProductCategory(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateCategory = (category: ProductCategory) => {
        setEditingProductCategory(category);
        setIsEditProductCategoryModalOpen(true);
    };

    const filteredCategories = useMemo(() => {
        let filtered = productCategories;

        // Search filter
        if (productCategoryFilters.search) {
            const searchLower = productCategoryFilters.search.toLowerCase();
            filtered = filtered.filter(category => 
                category.name.toLowerCase().includes(searchLower) ||
                category.code.toLowerCase().includes(searchLower) ||
                (category.description && category.description.toLowerCase().includes(searchLower))
            );
        }

        return filtered;
    }, [productCategories, productCategoryFilters]);

    if (loading) {
        return (
            <PageWrapper title={t('productCategories')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('productCategories')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsProductCategoriesFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddProductCategoryModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addProductCategory') || 'Add Product Category'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <CategoriesTable categories={filteredCategories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} isAdmin={isAdmin} />
            </Card>
            <ProductCategoriesFilterDrawer />
        </PageWrapper>
    );
};

