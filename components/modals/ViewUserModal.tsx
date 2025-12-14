
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Button } from '../Button';

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
const getUserDisplayName = (user: any, t?: (key: string) => string): string => {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
        return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    }
    return user.username || user.email || (t ? t('unknown') : 'Unknown');
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
        <div className={`${className || 'w-24 h-24'} rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white font-semibold text-2xl border-4 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden`}>
            {getInitials(alt)}
        </div>
    );

    if (imgError || !src) {
        return fallbackAvatar;
    }

    return (
        <div className={`relative ${className || 'w-24 h-24'} rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg`}>
            <img 
                src={src} 
                alt={alt} 
                className="w-full h-full object-cover transition-all duration-200"
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

export const ViewUserModal = () => {
    const { isViewUserModalOpen, setIsViewUserModalOpen, selectedUser, t } = useAppContext();

    if (!selectedUser) return null;

    const displayName = getUserDisplayName(selectedUser, t);

    return (
        <Modal isOpen={isViewUserModalOpen} onClose={() => setIsViewUserModalOpen(false)} title={`${t('viewEmployee')}: ${displayName}`}>
            <div className="space-y-6">
                {/* User Avatar and Basic Info */}
                <div className="flex flex-col items-center pb-6 border-b border-gray-200 dark:border-gray-700">
                    <Avatar 
                        src={selectedUser.avatar || ''} 
                        alt={displayName} 
                        className="w-24 h-24 mb-4" 
                    />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{displayName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getRoleTranslation(selectedUser.role, t)}</p>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                            {displayName}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('phone')}</label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                            {selectedUser.phone}
                        </div>
                    </div>
                    
                    {selectedUser.email && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                                {selectedUser.email}
                            </div>
                        </div>
                    )}
                    
                    {selectedUser.username && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('username')}</label>
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                                {selectedUser.username}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('role')}</label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                            {getRoleTranslation(selectedUser.role, t)}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="secondary" onClick={() => setIsViewUserModalOpen(false)}>
                        {t('cancel')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

