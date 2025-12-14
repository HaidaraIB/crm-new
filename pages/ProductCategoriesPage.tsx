
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { ProductCategory } from '../types';
import { ProductCategoriesFilterDrawer } from '../components/drawers/ProductCategoriesFilterDrawer';
import { useProductCategories, useDeleteProductCategory } from '../hooks/useQueries';

const CategoriesTable = ({ categories, onUpdate, onDelete, isAdmin, allCategories }: { categories: ProductCategory[], onUpdate: (category: ProductCategory) => void, onDelete: (id: number) => void, isAdmin: boolean, allCategories: ProductCategory[] }) => {
    const { t } = useAppContext();
    
    // Helper function to get parent category name
    const getParentCategoryName = (parentId: number | undefined | null): string => {
        if (!parentId) return '-';
        const parent = allCategories.find(c => c.id === parentId);
        return parent?.name || '-';
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
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('parentCategory')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noProductCategoriesFound') || 'No product categories found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                categories.map(category => (
                                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{category.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">{category.description || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{getParentCategoryName(category.parentCategory)}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(category)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(category.id)}
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

export const ProductCategoriesPage = () => {
    const { 
        t,
        currentUser,
        productCategoryFilters,
        setProductCategoryFilters,
        setIsProductCategoryFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddProductCategoryModalOpen,
        setEditingProductCategory,
        setIsEditProductCategoryModalOpen,
    } = useAppContext();

    // Fetch product categories using React Query
    const { data: categoriesResponse, isLoading: categoriesLoading, error: categoriesError } = useProductCategories();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allCategories = useMemo(() => {
        const categories = categoriesResponse?.results || [];
        return categories.map((c: any) => {
            // Handle parent_category - could be ID, object with id, or null
            let parentCategoryId: number | undefined = undefined;
            if (c.parent_category) {
                if (typeof c.parent_category === 'number') {
                    parentCategoryId = c.parent_category;
                } else if (typeof c.parent_category === 'object' && c.parent_category?.id) {
                    parentCategoryId = c.parent_category.id;
                }
            } else if (c.parent_category_id) {
                parentCategoryId = c.parent_category_id;
            } else if (c.parentCategory) {
                parentCategoryId = typeof c.parentCategory === 'number' ? c.parentCategory : c.parentCategory?.id;
            }
            
            return {
                id: c.id,
                code: c.code || '',
                name: c.name || '',
                description: c.description || '',
                parentCategory: parentCategoryId,
            } as ProductCategory;
        });
    }, [categoriesResponse]);

    // Delete product category mutation
    const deleteProductCategoryMutation = useDeleteProductCategory();

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
        const category = allCategories.find(c => c.id === id);
        if (category) {
            setConfirmDeleteConfig({
                title: t('deleteProductCategory') || 'Delete Product Category',
                message: t('confirmDeleteProductCategory') || 'Are you sure you want to delete',
                itemName: category.name,
                onConfirm: async () => {
                    try {
                        await deleteProductCategoryMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting product category:', error);
                        throw error;
                    }
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
        let filtered = allCategories;

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
    }, [allCategories, productCategoryFilters]);

    if (categoriesLoading) {
        return (
            <PageWrapper title={t('productCategories')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (categoriesError) {
        return (
            <PageWrapper title={t('productCategories')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingProductCategories') || 'Error loading product categories. Please try again.'}
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
            title={t('productCategories')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsProductCategoryFilterDrawerOpen(true)}>
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
                <CategoriesTable categories={filteredCategories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} isAdmin={isAdmin} allCategories={allCategories} />
            </Card>
            <ProductCategoriesFilterDrawer />
        </PageWrapper>
    );
};

