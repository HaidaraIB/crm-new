
import React from 'react';
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

export const ViewUserModal = () => {
    const { isViewUserModalOpen, setIsViewUserModalOpen, selectedUser, t } = useAppContext();

    if (!selectedUser) return null;

    return (
        <Modal isOpen={isViewUserModalOpen} onClose={() => setIsViewUserModalOpen(false)} title={`${t('viewEmployee')}: ${selectedUser.name}`}>
            <div className="space-y-6">
                {/* User Avatar and Basic Info */}
                <div className="flex flex-col items-center pb-6 border-b border-gray-200 dark:border-gray-700">
                    <img 
                        src={selectedUser.avatar} 
                        alt={selectedUser.name} 
                        className="w-24 h-24 rounded-full mb-4 border-4 border-gray-200 dark:border-gray-700" 
                    />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getRoleTranslation(selectedUser.role, t)}</p>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                            {selectedUser.name}
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

