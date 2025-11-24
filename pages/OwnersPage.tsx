


import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, PlusIcon, Loader, EditIcon, TrashIcon, FilterIcon } from '../components/index';
import { Owner } from '../types';
import { OwnersFilterDrawer } from '../components/drawers/OwnersFilterDrawer';

const OwnersTable = ({ owners, onEdit, onDelete, isAdmin }: { owners: Owner[], onEdit: (owner: Owner) => void, onDelete: (id: number) => void, isAdmin: boolean }) => {
    const { t } = useAppContext();
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('code')}</th>
                        <th scope="col" className="px-6 py-3">{t('city')}</th>
                        <th scope="col" className="px-6 py-3">{t('district')}</th>
                        <th scope="col" className="px-6 py-3">{t('name')}</th>
                        <th scope="col" className="px-6 py-3">{t('phone')}</th>
                        <th scope="col" className="px-6 py-3">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {owners.length > 0 ? owners.map(owner => (
                        <tr key={owner.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4">{owner.code}</td>
                            <td className="px-6 py-4">{owner.city}</td>
                            <td className="px-6 py-4">{owner.district}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{owner.name}</td>
                            <td className="px-6 py-4">{owner.phone}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    {isAdmin && (
                                        <Button variant="ghost" className="p-1 h-auto" onClick={() => onEdit(owner)}>
                                            <EditIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {isAdmin && (
                                        <Button variant="ghost" className="p-1 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20" onClick={() => onDelete(owner.id)}>
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center py-10">{t('noOwnersFound')}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};


export const OwnersPage = () => {
    const { 
        t, 
        currentUser, 
        setIsAddOwnerModalOpen, 
        owners, 
        ownerFilters,
        setOwnerFilters,
        setIsOwnerFilterDrawerOpen,
        deleteOwner, 
        setEditingOwner, 
        setIsEditOwnerModalOpen, 
        setConfirmDeleteConfig, 
        setIsConfirmDeleteModalOpen 
    } = useAppContext();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: استدعي API لتحميل Owners عند فتح الصفحة (لشركات العقارات فقط)
        // مثال:
        // const loadOwners = async () => {
        //   try {
        //     const ownersData = await getOwnersAPI();
        //     // TODO: استخدم setOwners من AppContext لتحديث البيانات
        //   } catch (error) {
        //     console.error('Error loading owners:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // if (isRealEstate) loadOwners();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Check if user's company specialization is real_estate
    const isRealEstate = currentUser?.company?.specialization === 'real_estate';
    const isAdmin = currentUser?.role === 'Owner';

    // If not real estate, show message
    if (!isRealEstate) {
        return (
            <PageWrapper title={t('owners')}>
                <Card>
                    <div className="text-center py-12">
                        <p className="text-gray-600 dark:text-gray-400">{t('realEstateOnly') || 'This page is only available for Real Estate companies.'}</p>
                    </div>
                </Card>
            </PageWrapper>
        );
    }

    const handleEdit = (owner: Owner) => {
        setEditingOwner(owner);
        setIsEditOwnerModalOpen(true);
    };

    const filteredOwners = useMemo(() => {
        let filtered = owners;
        if (ownerFilters.city && ownerFilters.city !== 'All') {
            filtered = filtered.filter(owner => owner.city === ownerFilters.city);
        }
        if (ownerFilters.district && ownerFilters.district !== 'All') {
            filtered = filtered.filter(owner => owner.district === ownerFilters.district);
        }
        if (ownerFilters.search) {
            const searchLower = ownerFilters.search.toLowerCase();
            filtered = filtered.filter(owner => 
                owner.name.toLowerCase().includes(searchLower) || 
                owner.code.toLowerCase().includes(searchLower) ||
                owner.phone.includes(searchLower)
            );
        }
        return filtered;
    }, [owners, ownerFilters]);

    const handleDelete = (id: number) => {
        const owner = owners.find(o => o.id === id);
        if (owner) {
            setConfirmDeleteConfig({
                title: t('deleteOwner') || 'Delete Owner',
                message: t('confirmDeleteOwner') || 'Are you sure you want to delete',
                itemName: owner.name,
                onConfirm: async () => {
                    await deleteOwner(id);
                },
            });
            setIsConfirmDeleteModalOpen(true);
        }
    };

    if (loading) {
        return (
            <PageWrapper title={t('owners')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={t('owners')}
            actions={
                <>
                    <Button variant="secondary" onClick={() => setIsOwnerFilterDrawerOpen(true)}>
                        <FilterIcon className="w-4 h-4"/> <span className="hidden sm:inline">{t('filter')}</span>
                    </Button>
                    {isAdmin && (
                        <Button onClick={() => setIsAddOwnerModalOpen(true)}>
                            <PlusIcon className="w-4 h-4"/> {t('addOwner')}
                        </Button>
                    )}
                </>
            }
        >
            <Card>
                <OwnersTable owners={filteredOwners} onEdit={handleEdit} onDelete={handleDelete} isAdmin={isAdmin} />
            </Card>
            <OwnersFilterDrawer />
        </PageWrapper>
    );
};
