
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, TableHorizontalScroll, PhoneText } from '../components/index';
import { Product, ProductCategory, Supplier } from '../types';
import { AddProductModal } from '../components/modals/AddProductModal';
import { EditProductModal } from '../components/modals/EditProductModal';
import { AddProductCategoryModal } from '../components/modals/AddProductCategoryModal';
import { EditProductCategoryModal } from '../components/modals/EditProductCategoryModal';
import { AddSupplierModal } from '../components/modals/AddSupplierModal';
import { EditSupplierModal } from '../components/modals/EditSupplierModal';
import {
    useDeleteProduct,
    useDeleteProductCategory,
    useDeleteSupplier,
    useProductCategories,
    useProducts,
    useSuppliers,
} from '../hooks/useQueries';
import { normalizeRole } from '../utils/roles';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { withLatinDigits } from '../utils/dateUtils';

type Tab = 'products' | 'categories' | 'suppliers';

const ProductsTable = ({ products, onUpdate, onDelete, isAdmin }: { products: Product[], onUpdate: (product: Product) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
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
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">{product.price.toLocaleString(undefined, withLatinDigits())}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{product.cost.toLocaleString(undefined, withLatinDigits())}</td>
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
        </TableHorizontalScroll>
    );
};

const CategoriesTable = ({ categories, onUpdate, onDelete, isAdmin }: { categories: ProductCategory[], onUpdate: (category: ProductCategory) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
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
        </TableHorizontalScroll>
    );
};

const SuppliersTable = ({ suppliers, onUpdate, onDelete, isAdmin }: { suppliers: Supplier[], onUpdate: (supplier: Supplier) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
            <div className="min-w-full block">
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
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">
                                        <PhoneText>{supplier.phone}</PhoneText>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 hidden lg:table-cell text-xs sm:text-sm">{supplier.email}</td>
                                    <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-xs sm:text-sm">{supplier.contactPerson}</td>
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
        </TableHorizontalScroll>
    );
};

export const ProductsInventoryPage = () => {
    const {
        t,
        currentUser,
        hasSupervisorPermission,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        setIsAddProductModalOpen,
        setIsEditProductModalOpen,
        setEditingProduct,
        setIsAddProductCategoryModalOpen,
        setIsEditProductCategoryModalOpen,
        setEditingProductCategory,
        setIsAddSupplierModalOpen,
        setIsEditSupplierModalOpen,
        setEditingSupplier,
    } = useAppContext();
    const [activeTab, setActiveTab] = useState<Tab>('products');

    const { data: productsResponse, isLoading: productsLoading } = useProducts();
    const { data: categoriesResponse, isLoading: categoriesLoading } = useProductCategories();
    const { data: suppliersResponse, isLoading: suppliersLoading } = useSuppliers();
    const deleteProductMutation = useDeleteProduct();
    const deleteProductCategoryMutation = useDeleteProductCategory();
    const deleteSupplierMutation = useDeleteSupplier();

    const products = useMemo((): Product[] => {
        const rows = productsResponse?.results || [];
        return rows.map((p: any): Product => {
            let categoryName = '';
            if (typeof p.category === 'string') categoryName = p.category;
            else if (typeof p.category === 'object' && p.category?.name) categoryName = p.category.name;
            else if (typeof p.category === 'number') categoryName = p.category_name || '';

            let supplierName = '';
            if (typeof p.supplier === 'string') supplierName = p.supplier;
            else if (typeof p.supplier === 'object' && p.supplier?.name) supplierName = p.supplier.name;
            else if (typeof p.supplier === 'number') supplierName = p.supplier_name || '';

            return {
                id: Number(p.id),
                code: String(p.code || ''),
                name: String(p.name || ''),
                description: String(p.description || ''),
                price: p.price || p.price === 0 ? Number(p.price) : 0,
                cost: p.cost || p.cost === 0 ? Number(p.cost) : 0,
                stock: p.stock || p.stock === 0 ? Number(p.stock) : 0,
                category: categoryName || p.category_name || '',
                supplier: supplierName || p.supplier_name || undefined,
                sku: p.sku || undefined,
                image: p.image || undefined,
                isActive: p.is_active !== undefined ? Boolean(p.is_active) : p.isActive !== undefined ? Boolean(p.isActive) : true,
            };
        });
    }, [productsResponse]);

    const productCategories = useMemo((): ProductCategory[] => {
        const rows = categoriesResponse?.results || [];
        return rows.map((c: any): ProductCategory => {
            let parentCategoryId: number | undefined;
            if (typeof c.parent_category === 'number') parentCategoryId = c.parent_category;
            else if (typeof c.parent_category === 'object' && c.parent_category?.id) parentCategoryId = c.parent_category.id;
            else if (c.parent_category_id) parentCategoryId = c.parent_category_id;
            else if (c.parentCategory) {
                parentCategoryId = typeof c.parentCategory === 'number' ? c.parentCategory : c.parentCategory?.id;
            }
            return {
                id: Number(c.id),
                code: String(c.code || ''),
                name: String(c.name || ''),
                description: String(c.description || ''),
                parentCategory: parentCategoryId,
            };
        });
    }, [categoriesResponse]);

    const suppliers = useMemo((): Supplier[] => {
        const rows = suppliersResponse?.results || [];
        return rows.map((s: any): Supplier => ({
            id: Number(s.id),
            code: String(s.code || ''),
            name: String(s.name || ''),
            logo: String(s.logo || ''),
            phone: String(s.phone || ''),
            email: String(s.email || ''),
            address: String(s.address || ''),
            contactPerson: String(s.contact_person || s.contactPerson || ''),
            specialization: String(s.specialization || ''),
        }));
    }, [suppliersResponse]);

    const isProducts = currentUser?.company?.specialization === 'products';
    const currentRole = normalizeRole(currentUser?.role);
    const isAdmin =
        currentRole === 'Owner' ||
        (currentRole === 'Supervisor' && hasSupervisorPermission('can_manage_products'));
    const loading =
        (activeTab === 'products' && productsLoading) ||
        (activeTab === 'categories' && categoriesLoading) ||
        (activeTab === 'suppliers' && suppliersLoading);

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
        const product = products.find((p) => p.id === id);
        if (product) {
            setConfirmDeleteConfig({
                title: t('deleteProduct') || 'Delete Product',
                message: t('confirmDeleteProduct') || 'Are you sure you want to delete',
                itemName: product.name,
                onConfirm: async () => {
                    await deleteProductMutation.mutateAsync(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateProduct = (product: Product) => {
        setEditingProduct(product);
        setIsEditProductModalOpen(true);
    };

    const handleDeleteCategory = (id: number) => {
        const category = productCategories.find((c) => c.id === id);
        if (category) {
            setConfirmDeleteConfig({
                title: t('deleteProductCategory') || 'Delete Product Category',
                message: t('confirmDeleteProductCategory') || 'Are you sure you want to delete',
                itemName: category.name,
                onConfirm: async () => {
                    await deleteProductCategoryMutation.mutateAsync(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateCategory = (category: ProductCategory) => {
        setEditingProductCategory(category);
        setIsEditProductCategoryModalOpen(true);
    };

    const handleDeleteSupplier = (id: number) => {
        const supplier = suppliers.find((s) => s.id === id);
        if (supplier) {
            setConfirmDeleteConfig({
                title: t('deleteSupplier') || 'Delete Supplier',
                message: t('confirmDeleteSupplier') || 'Are you sure you want to delete',
                itemName: supplier.name,
                onConfirm: async () => {
                    await deleteSupplierMutation.mutateAsync(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    const handleUpdateSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsEditSupplierModalOpen(true);
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-16">
                    <Loader size="lg" variant="primary" />
                </div>
            );
        }
        switch (activeTab) {
            case 'products':
                return <Card><ProductsTable products={products} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} isAdmin={isAdmin} /></Card>;
            case 'categories':
                return <Card><CategoriesTable categories={productCategories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} isAdmin={isAdmin} /></Card>;
            case 'suppliers':
                return <Card><SuppliersTable suppliers={suppliers} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} isAdmin={isAdmin} /></Card>;
            default:
                return null;
        }
    };

    const getAddButtonLabel = () => {
        switch (activeTab) {
            case 'products': return t('addProduct') || 'Add Product';
            case 'categories': return t('addProductCategory') || 'Add Category';
            case 'suppliers': return t('addSupplier') || 'Add Supplier';
            default: return t('createNew') || 'Create New';
        }
    };

    const handleAddClick = () => {
        switch (activeTab) {
            case 'products':
                setIsAddProductModalOpen(true);
                break;
            case 'categories':
                setIsAddProductCategoryModalOpen(true);
                break;
            case 'suppliers':
                setIsAddSupplierModalOpen(true);
                break;
        }
    };

    const pageActions = (
        <>
            {isAdmin && (
                <Button onClick={handleAddClick}>
                    <PlusIcon className="w-4 h-4"/> {getAddButtonLabel()}
                </Button>
            )}
        </>
    );

    return (
        <PageWrapper title={t('products')} actions={pageActions}>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse min-w-max" aria-label="Tabs">
                    <button onClick={() => setActiveTab('products')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'products' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('products')}</button>
                    <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'categories' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('productCategories')}</button>
                    <button onClick={() => setActiveTab('suppliers')} className={`whitespace-nowrap py-3 sm:py-4 px-1 text-xs sm:text-sm flex-shrink-0 transition-colors ${activeTab === 'suppliers' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE}`}>{t('suppliers')}</button>
                </nav>
            </div>
            {renderContent()}
            <AddProductModal />
            <EditProductModal />
            <AddProductCategoryModal />
            <EditProductCategoryModal />
            <AddSupplierModal />
            <EditSupplierModal />
        </PageWrapper>
    );
};

