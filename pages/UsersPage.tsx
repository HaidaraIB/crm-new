
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, Dropdown, DropdownItem, WhatsappIcon, Loader, PlusIcon } from '../components/index';
import { User } from '../types';

// Helper function to translate role - only Owner and Employee are valid
const getRoleTranslation = (role: string, t: (key: string) => string): string => {
    // Normalize role: convert any old roles to Employee, keep Owner as is
    const normalizedRole = role === 'Owner' ? 'Owner' : 'Employee';
    const roleMap: Record<string, string> = {
        'Owner': 'owner',
        'Employee': 'employee',
    };
    
    const translationKey = roleMap[normalizedRole];
    return translationKey ? t(translationKey) : normalizedRole;
};

const UserCard = ({ user }: { user: User }) => {
    const { t, setSelectedUser, setIsViewUserModalOpen, setIsEditUserModalOpen, setIsDeleteUserModalOpen, currentUser } = useAppContext();
    
    // Check if current user is admin (Owner role)
    const isAdmin = currentUser?.role === 'Owner';
    
    const handleEdit = () => {
        setSelectedUser(user);
        setIsEditUserModalOpen(true);
    };

    const handleDelete = () => {
        setSelectedUser(user);
        setIsDeleteUserModalOpen(true);
    };

    const handleView = () => {
        setSelectedUser(user);
        setIsViewUserModalOpen(true);
    };

    const handleCall = () => {
        if (user.phone) {
            const phoneNumber = user.phone.replace(/\D/g, '');
            if (phoneNumber) {
                window.location.href = `tel:${phoneNumber}`;
            } else {
                alert(t('noPhoneNumber') || 'No phone number available');
            }
        } else {
            alert(t('noPhoneNumber') || 'No phone number available');
        }
    };

    return (
        <Card className="relative text-center">
            {isAdmin && (
                <div className="absolute top-2 end-2">
                    <Dropdown trigger={
                        <Button variant="ghost" className="p-1 h-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </Button>
                    }>
                        <DropdownItem onClick={handleView}>{t('viewUser')}</DropdownItem>
                        <DropdownItem onClick={handleEdit}>{t('editUser')}</DropdownItem>
                        <DropdownItem onClick={handleDelete}>{t('deleteUser')}</DropdownItem>
                    </Dropdown>
                </div>
            )}
            <div className="flex flex-col items-center pt-4">
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full mb-3" />
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{getRoleTranslation(user.role, t)}</p>
                <p className="text-sm mt-1">{user.phone}</p>
                <div className="flex gap-2 mt-4">
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto" onClick={handleCall}>{t('call')}</Button>
                    <a href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                        <Button variant="secondary" className="text-xs px-3 py-1 h-auto !bg-green-500 text-white hover:!bg-green-600 flex items-center gap-1.5">
                           <span className="hidden sm:inline">{t('whatsapp')}</span>
                        </Button>
                    </a>
                </div>
            </div>
        </Card>
    );
};


export const UsersPage = () => {
    const { t, users, currentUser, setIsAddUserModalOpen } = useAppContext();
    const [loading, setLoading] = useState(true);
    const userCount = users.length;
    
    // Check if current user is admin (Owner role)
    const isAdmin = currentUser?.role === 'Owner';

    useEffect(() => {
        // TODO: استدعي API لتحميل Users عند فتح الصفحة
        // مثال:
        // const loadUsers = async () => {
        //   try {
        //     const usersData = await getUsersAPI();
        //     // TODO: استخدم setUsers من AppContext لتحديث البيانات
        //   } catch (error) {
        //     console.error('Error loading users:', error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
        // loadUsers();
        
        // الكود الحالي (للاختبار فقط):
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <PageWrapper title={`${t('users')}: ${userCount}`}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            title={`${t('users')}: ${userCount}`}
            actions={
                isAdmin && (
                    <Button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        <PlusIcon className="w-4 h-4" /> {t('createUser')}
                    </Button>
                )
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map(user => (
                    // FIX: Wrapped UserCard in a div with a key to resolve TypeScript error about key prop not being in UserCard's props.
                    <div key={user.id}>
                        <UserCard user={user} />
                    </div>
                ))}
            </div>
        </PageWrapper>
    );
};
