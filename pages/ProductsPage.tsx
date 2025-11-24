
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Product } from '../types';
import { ProductsFilterDrawer } from '../components/drawers/ProductsFilterDrawer';

const ProductsTable = ({ products, onUpdate, onDelete, isAdmin }: { products: Product[], onUpdate: (product: Product) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
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
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('category')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('price')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden lg:table-cell">{t('cost')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('stock')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3 hidden md:table-cell">{t('sku')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('status')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-3 sm:px-6 py-4 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{product.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{product.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{product.category}</td>
                                    <td className="px-3 sm:px-6 py-4 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{product.price.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{product.cost.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{product.sku || '-'}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                            {product.isActive ? t('active') : t('inactive')}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(product)}>
                                                    <EditIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {isAdmin && (
                                                <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(product.id)}>
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

export const ProductsPage = () => {
    const { 
        t,
        currentUser,
        products,
        productFilters,
        setProductFilters,
        setIsProductFilterDrawerOpen,
        deleteProduct,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddProductModalOpen,
        setEditingProduct,
        setIsEditProductModalOpen,
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي API لتحميل Products عند فتح الصفحة (لشركات المنتجات فقط)
        // مثال:
        // const loadProducts = async () => {
        //   try {
        //     const productsData = await getProductsAPI();
        //     // TODO: استخدم setProducts من AppContext لتحديث البيانات
        //   } catch (error) {
        //     console.error('Error loading products:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // if (isProducts) loadProducts();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';
    const isAdmin = currentUser?.role === 'Owner';

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
        const product = products.find(p => p.id === id);
        if (product) {
            setConfirmDeleteConfig({
                title: t('deleteProduct') || 'Delete Product',
                message: t('confirmDeleteProduct') || 'Are you sure you want to delete',
                itemName: product.name,
                onConfirm: async () => {
                    await deleteProduct(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const filteredProducts = useMemo(() => {
        let filtered = products;
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
    }, [products, productFilters]);

    const handleUpdateProduct = (product: Product) => {
        setEditingProduct(product);
        setIsEditProductModalOpen(true);
    };

    if (loading) {
        return (
            <PageWrapper title={t('products')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
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

