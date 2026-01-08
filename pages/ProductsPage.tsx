
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Product } from '../types';
import { ProductsFilterDrawer } from '../components/drawers/ProductsFilterDrawer';
import { useProducts, useDeleteProduct } from '../hooks/useQueries';

const ProductsTable = ({ products, onUpdate, onDelete, isAdmin }: { products: Product[], onUpdate: (product: Product) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    
    // Format numbers with proper number formatting
    const formatNumber = (num: number | undefined | null): string => {
        if (num === undefined || num === null || isNaN(Number(num))) return '-';
        const number = Number(num);
        const formatted = number.toLocaleString('en-US', { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 2 
        });
        return formatted.replace(/\.0+$/, '');
    };
    
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[900px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('code')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('name')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('category')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('price')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden lg:table-cell text-center">{t('cost')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('stock')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap hidden md:table-cell text-center">{t('sku')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('status')}</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">{t('noProductsFound') || 'No products found.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">
                                            <span className="text-sm">{product.code || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{product.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{product.category || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatNumber(product.price)}</span>
                                        </td>
                                        <td className="px-4 py-4 hidden lg:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatNumber(product.cost)}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${product.stock > 10 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                {formatNumber(product.stock)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 hidden md:table-cell whitespace-nowrap text-center">
                                            <span className="text-sm text-gray-900 dark:text-gray-100">{product.sku || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${product.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                {product.isActive ? t('active') : t('inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" 
                                                        onClick={() => onUpdate(product)}
                                                        title={t('edit') || 'Edit'}
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button 
                                                        className="p-1 h-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" 
                                                        onClick={() => onDelete(product.id)}
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

export const ProductsPage = () => {
    const { 
        t,
        currentUser,
        productFilters,
        setProductFilters,
        setIsProductFilterDrawerOpen,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddProductModalOpen,
        setEditingProduct,
        setIsEditProductModalOpen,
    } = useAppContext();

    // Fetch products using React Query
    const { data: productsResponse, isLoading: productsLoading, error: productsError } = useProducts();
    
    // Normalize API fields to frontend naming (snake_case to camelCase)
    const allProducts = useMemo(() => {
        const products = productsResponse?.results || [];
        return products.map((p: any) => {
            // Handle category - could be ID, object with name, or string
            let categoryName = '';
            if (p.category) {
                if (typeof p.category === 'string') {
                    categoryName = p.category;
                } else if (typeof p.category === 'object' && p.category?.name) {
                    categoryName = p.category.name;
                } else if (typeof p.category === 'number') {
                    // If it's an ID, we'll need to find it in categories list
                    // For now, keep as is and handle in component
                    categoryName = p.category_name || '';
                }
            }
            
            // Handle supplier - could be ID, object with name, or string
            let supplierName = '';
            if (p.supplier) {
                if (typeof p.supplier === 'string') {
                    supplierName = p.supplier;
                } else if (typeof p.supplier === 'object' && p.supplier?.name) {
                    supplierName = p.supplier.name;
                } else if (typeof p.supplier === 'number') {
                    supplierName = p.supplier_name || '';
                }
            }
            
            return {
                id: p.id,
                code: p.code || '',
                name: p.name || '',
                description: p.description || '',
                price: p.price || p.price === 0 ? Number(p.price) : 0,
                cost: p.cost || p.cost === 0 ? Number(p.cost) : 0,
                stock: p.stock || p.stock === 0 ? Number(p.stock) : 0,
                category: categoryName || p.category_name || '',
                supplier: supplierName || p.supplier_name || undefined,
                sku: p.sku || undefined,
                image: p.image || undefined,
                isActive: p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : true),
            } as Product;
        });
    }, [productsResponse]);

    // Delete product mutation
    const deleteProductMutation = useDeleteProduct();

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

    // If not products, show message
    if (!isProducts) {
        return (
            <PageWrapper title={t('products')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-secondary">{t('productsOnly') || 'This page is only available for Products companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleDeleteProduct = (id: number) => {
        const product = allProducts.find(p => p.id === id);
        if (product) {
            setConfirmDeleteConfig({
                title: t('deleteProduct') || 'Delete Product',
                message: t('confirmDeleteProduct') || 'Are you sure you want to delete',
                itemName: product.name,
                onConfirm: async () => {
                    try {
                        await deleteProductMutation.mutateAsync(id);
                    } catch (error: any) {
                        console.error('Error deleting product:', error);
                        throw error;
                    }
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const filteredProducts = useMemo(() => {
        let filtered = allProducts;
        if (productFilters.category && productFilters.category !== 'All') {
            filtered = filtered.filter(product => product.category === productFilters.category);
        }
        if (productFilters.supplier && productFilters.supplier !== 'All') {
            filtered = filtered.filter(product => product.supplier === productFilters.supplier);
        }
        if (productFilters.isActive && productFilters.isActive !== 'All') {
            filtered = filtered.filter(product => product.isActive === (productFilters.isActive === 'true'));
        }
        if (productFilters.stockMin) {
            const minStock = parseFloat(productFilters.stockMin);
            if (!isNaN(minStock)) {
                filtered = filtered.filter(product => product.stock >= minStock);
            }
        }
        if (productFilters.stockMax) {
            const maxStock = parseFloat(productFilters.stockMax);
            if (!isNaN(maxStock)) {
                filtered = filtered.filter(product => product.stock <= maxStock);
            }
        }
        if (productFilters.priceMin) {
            const minPrice = parseFloat(productFilters.priceMin);
            if (!isNaN(minPrice)) {
                filtered = filtered.filter(product => product.price >= minPrice);
            }
        }
        if (productFilters.priceMax) {
            const maxPrice = parseFloat(productFilters.priceMax);
            if (!isNaN(maxPrice)) {
                filtered = filtered.filter(product => product.price <= maxPrice);
            }
        }
        if (productFilters.search) {
            const searchLower = productFilters.search.toLowerCase();
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchLower) || 
                product.code.toLowerCase().includes(searchLower) ||
                (product.sku && product.sku.toLowerCase().includes(searchLower))
            );
        }
        return filtered;
    }, [allProducts, productFilters]);

    const handleUpdateProduct = (product: Product) => {
        setEditingProduct(product);
        setIsEditProductModalOpen(true);
    };

    if (productsLoading) {
        return (
            <PageWrapper title={t('products')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (productsError) {
        return (
            <PageWrapper title={t('products')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingProducts') || 'Error loading products. Please try again.'}
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
            title={t('products')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsProductFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddProductModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addProduct') || 'Add Product'}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <ProductsTable products={filteredProducts} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} isAdmin={isAdmin} />
            </Card>
            <ProductsFilterDrawer />
        </PageWrapper>
    );
};

