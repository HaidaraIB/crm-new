
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, FilterIcon, PlusIcon, SearchIcon, Input, Loader, EditIcon, TrashIcon } from '../components/index';
import { Product, ProductCategory, Supplier } from '../types';

type Tab = 'products' | 'categories' | 'suppliers';

const ProductsTable = ({ products, onUpdate, onDelete }: { products: Product[], onUpdate: (product: Product) => void, onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[900px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{product.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{product.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{product.category}</td>
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{product.price.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{product.cost.toLocaleString()}</td>
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
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(product)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(product.id)}>
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

const CategoriesTable = ({ categories, onUpdate, onDelete }: { categories: ProductCategory[], onUpdate: (category: ProductCategory) => void, onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[600px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{category.code}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{category.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm max-w-xs truncate">{category.description}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(category)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(category.id)}>
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

const SuppliersTable = ({ suppliers, onUpdate, onDelete }: { suppliers: Supplier[], onUpdate: (supplier: Supplier) => void, onDelete: (id: number) => void }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 min-w-[900px]">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('code')}</th>
                                <th scope="col" className="px-3 sm:px-6 py-3">{t('logo')}</th>
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
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{supplier.code}</td>
                                    <td className="px-3 sm:px-6 py-4"><img src={supplier.logo} alt={supplier.name} className="w-8 h-8 rounded-full object-cover" /></td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{supplier.name}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{supplier.specialization}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{supplier.phone}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{supplier.email}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{supplier.contactPerson}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" className="p-1 h-auto" onClick={() => onUpdate(supplier)}>
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(supplier.id)}>
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

export const ProductsInventoryPage = () => {
    const { 
        t,
        currentUser,
        products,
        productCategories,
        suppliers,
        deleteProduct,
        deleteProductCategory,
        deleteSupplier,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
    } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('products');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is products
    const isProducts = currentUser?.company?.specialization === 'products';

    // If not products, show message
    if (!isProducts) {
        return (
            <PageWrapper title={t('products')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">{t('productsOnly') || 'This page is only available for Products companies.'}</p>
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

    const handleUpdateProduct = (product: Product) => {
        // TODO: Implement update modal
        console.log('Update product:', product);
    };

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
        // TODO: Implement update modal
        console.log('Update category:', category);
    };

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
        // TODO: Implement update modal
        console.log('Update supplier:', supplier);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'products':
                return <Card><ProductsTable products={products} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} /></Card>;
            case 'categories':
                return <Card><CategoriesTable categories={productCategories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} /></Card>;
            case 'suppliers':
                return <Card><SuppliersTable suppliers={suppliers} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} /></Card>;
            default:
                return null;
        }
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
        <PageWrapper title={t('products')}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse min-w-max" aria-label="Tabs">
                    <button onClick={() => setActiveTab('products')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'products' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('products')}</button>
                    <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'categories' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('productCategories')}</button>
                    <button onClick={() => setActiveTab('suppliers')} className={`whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${activeTab === 'suppliers' ? 'border-primary text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300'}`}>{t('suppliers')}</button>
                </nav>
            </div>
            {renderContent()}
        </PageWrapper>
    );
};

