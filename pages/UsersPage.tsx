
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, Card, Dropdown, DropdownItem, WhatsappIcon, Loader, PlusIcon, PhoneIcon } from '../components/index';
import { User } from '../types';
import { useUsers } from '../hooks/useQueries';

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

// Helper function to get user display name
const getUserDisplayName = (user: User): string => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
        return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    }
    return user.username || user.email || 'Unknown';
};

// Avatar component with fallback
const Avatar = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Generate initials from name
    const getInitials = (name: string): string => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]);
        }
        return name.substring(0, 2);
    };

    // Fallback avatar with initials
    const fallbackAvatar = (
        <div className={`${className || 'w-20 h-20'} rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-semibold text-base border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden`}>
            {getInitials(alt)}
        </div>
    );

    if (imgError || !src) {
        return fallbackAvatar;
    }

    return (
        <div className={`relative group ${className || 'w-20 h-20'} rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200`}>
            <img 
                src={src} 
                alt={alt} 
                className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
                style={{ opacity: imgLoaded ? 1 : 0 }}
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
            />
            {!imgLoaded && !imgError && (
                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
        </div>
    );
};

const UserCard = ({ user }: { user: User }) => {
    const { t, setSelectedUser, setIsViewUserModalOpen, setIsEditUserModalOpen, setIsDeleteUserModalOpen, currentUser, hasSupervisorPermission } = useAppContext();
    
    const getUserDisplayNameLocal = (user: User): string => {
        if (user.name) return user.name;
        if (user.first_name || user.last_name) {
            return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        }
        return user.username || user.email || t('unknown') || 'Unknown';
    };
    
    // Check if current user can manage users (Owner or Supervisor with permission)
    const isAdmin = currentUser?.role === 'Owner' || (currentUser?.role === 'Supervisor' && hasSupervisorPermission('can_manage_users'));
    // Check if the displayed user is admin (Owner role) - don't allow edit/delete for admins
    const isUserAdmin = user.role === 'Owner';
    
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

    return (
        <Card className="relative text-center">
            {isAdmin && (
                <div className="absolute top-2 end-2">
                    <Dropdown trigger={
                        <Button variant="ghost" className="p-1 h-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </Button>
                    }>
                        <DropdownItem onClick={handleView}>{t('viewEmployee')}</DropdownItem>
                        {!isUserAdmin && (
                            <>
                                <DropdownItem onClick={handleEdit}>{t('editEmployee')}</DropdownItem>
                                <DropdownItem onClick={handleDelete}>{t('deleteEmployee')}</DropdownItem>
                            </>
                        )}
                    </Dropdown>
                </div>
            )}
            <div className="flex flex-col items-center pt-4">
                <Avatar src={user.avatar || ''} alt={getUserDisplayNameLocal(user)} className="w-20 h-20 mb-3" />
                <h3 className="font-bold text-lg">{getUserDisplayNameLocal(user)}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{getRoleTranslation(user.role, t)}</p>
                <p className="text-sm mt-1">{user.phone}</p>
                {user.phone && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <a 
                            href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center justify-center w-8 h-8 text-primary hover:opacity-80 transition-opacity"
                            title={t('call') || 'Call'}
                        >
                            <PhoneIcon className="w-5 h-5"/>
                        </a>
                        <a 
                            href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center justify-center w-8 h-8 text-green-600 dark:text-green-400 hover:opacity-80 transition-opacity"
                            title={t('openWhatsApp') || 'Open WhatsApp'}
                        >
                            <WhatsappIcon className="w-5 h-5"/>
                        </a>
                    </div>
                )}
            </div>
        </Card>
    );
};


export const UsersPage = () => {
    const { t, currentUser, setIsAddUserModalOpen, hasSupervisorPermission } = useAppContext();
    
    // Fetch users using React Query
    const { data: usersResponse, isLoading: usersLoading, error: usersError } = useUsers();
    const allUsers = usersResponse?.results || [];
    
    // Filter out Owner, Admin, and Supervisor - only show Employee users
    const filteredUsers = allUsers.filter(user => {
        const roleLower = (user.role || '').toLowerCase();
        return roleLower !== 'owner' && roleLower !== 'admin' && roleLower !== 'supervisor';
    });
    const userCount = filteredUsers.length;
    
    // Check if current user can manage users (Owner or Supervisor with permission)
    const isAdmin = currentUser?.role === 'Owner' || (currentUser?.role === 'Supervisor' && hasSupervisorPermission('can_manage_users'));

    if (usersLoading) {
        return (
            <PageWrapper title={`${t('employees')}: ${userCount}`}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    if (usersError) {
        return (
            <PageWrapper title={`${t('employees')}: ${userCount}`}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">
                            {t('errorLoadingEmployees') || 'Error loading employees. Please try again.'}
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
            title={`${t('employees')}: ${userCount}`}
            actions={
                isAdmin && filteredUsers.length > 0 && (
                    <Button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        <PlusIcon className="w-4 h-4" /> {t('createEmployee')}
                    </Button>
                )
            }
        >
            {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="text-center">
                        <svg 
                            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={1.5} 
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                            />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {t('noEmployeesFound')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {isAdmin 
                                ? (t('noEmployeesFound') + '. ' + (t('createFirstEmployee') || 'Create your first employee to get started.'))
                                : (t('noEmployeesFound') || 'No employees found.')
                            }
                        </p>
                        {isAdmin && (
                            <Button 
                                onClick={() => setIsAddUserModalOpen(true)}
                                className="mt-4"
                            >
                                <PlusIcon className="w-4 h-4" /> {t('createEmployee')}
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map(user => (
                        // FIX: Wrapped UserCard in a div with a key to resolve TypeScript error about key prop not being in UserCard's props.
                        <div key={user.id}>
                            <UserCard user={user} />
                        </div>
                    ))}
                </div>
            )}
        </PageWrapper>
    );
};
