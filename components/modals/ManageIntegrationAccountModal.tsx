
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Page } from '../../types';
import { useCreateConnectedAccount, useUpdateConnectedAccount, useConnectedAccounts } from '../../hooks/useQueries';
import { clearFieldError } from '../../utils/formFieldErrors';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

// FIX: Made children optional to fix missing children prop error.
const Select = ({ id, children, value, onChange }: { id: string; children?: React.ReactNode, value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; }) => (
    <select id={id} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
        {children}
    </select>
);

const getPlatformName = (currentPage: Page): string => {
    switch (currentPage) {
        case 'Integrations':
        case 'Meta':
            return 'Meta';
        case 'WhatsApp':
        case 'Messaging Center':
            return 'WhatsApp';
        default:
            return '';
    }
};

/** API `platform` query value for GET /integrations/accounts/ */
const getIntegrationPlatformApiParam = (currentPage: Page): string | undefined => {
    switch (currentPage) {
        case 'Integrations':
        case 'Meta':
            return 'meta';
        case 'WhatsApp':
        case 'Messaging Center':
            return 'whatsapp';
        default:
            return undefined;
    }
};

type IntegrationModalTitleKey =
    | 'editMetaAccount'
    | 'addNewMetaAccount'
    | 'editWhatsAppAccount'
    | 'addNewWhatsAppAccount';

const getIntegrationModalTitleKey = (platformName: string, isEditMode: boolean): IntegrationModalTitleKey => {
    if (platformName === 'Meta') {
        return isEditMode ? 'editMetaAccount' : 'addNewMetaAccount';
    }
    return isEditMode ? 'editWhatsAppAccount' : 'addNewWhatsAppAccount';
};

export const ManageIntegrationAccountModal = () => {
    const { 
        isManageIntegrationAccountModalOpen, 
        setIsManageIntegrationAccountModalOpen, 
        currentPage, 
        t,
        editingAccount,
        setEditingAccount,
        setIsSuccessModalOpen,
        setSuccessMessage,
    } = useAppContext();

    const [accountName, setAccountName] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // React Query mutations
    const createAccountMutation = useCreateConnectedAccount();
    const updateAccountMutation = useUpdateConnectedAccount();
    
    const isLoading = createAccountMutation.isPending || updateAccountMutation.isPending;

    const platformName = getPlatformName(currentPage);
    const isEditMode = !!editingAccount;
    const modalTitleKey = getIntegrationModalTitleKey(platformName, isEditMode);

    const platformApi = getIntegrationPlatformApiParam(currentPage);
    const { data: existingAccountsResponse, isFetching: existingAccountsFetching } = useConnectedAccounts(platformApi, {
        enabled: Boolean(isManageIntegrationAccountModalOpen && !isEditMode && platformApi),
    });
    const existingAccountCount = useMemo(() => {
        const raw = existingAccountsResponse as { results?: unknown[] } | unknown[] | undefined;
        const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
        return Array.isArray(list) ? list.length : 0;
    }, [existingAccountsResponse]);
    const cannotAddSecond = !isEditMode && existingAccountCount > 0;
    const blockAddWhileLoading = !isEditMode && !!platformApi && existingAccountsFetching;

    useEffect(() => {
        if (editingAccount) {
            setAccountName(editingAccount.name || '');
        } else {
            setAccountName('');
        }
        setErrors({});
    }, [editingAccount, isManageIntegrationAccountModalOpen]);

    const handleClose = () => {
        setIsManageIntegrationAccountModalOpen(false);
        setEditingAccount(null); // Clear editing state on close
        setErrors({});
    };

    const handleSubmit = async () => {
        if (cannotAddSecond || blockAddWhileLoading) {
            return;
        }
        if (!accountName.trim()) {
            setErrors({ accountName: t('accountNameRequired') || 'Account name is required' });
            return;
        }
        setErrors({});

        try {
            if (isEditMode && editingAccount) {
                // تحديث حساب موجود
                await updateAccountMutation.mutateAsync({
                    id: editingAccount.id,
                    data: { name: accountName },
                });
            } else {
                // إنشاء حساب جديد
                await createAccountMutation.mutateAsync({
                    platform: platformName.toLowerCase() === 'meta' ? 'meta' : platformName.toLowerCase(),
                    name: accountName,
                });
            }

            // Reset form
            setAccountName('');

            // Close modal and show success message
            handleClose();
            setSuccessMessage(isEditMode ? t('accountUpdatedSuccessfully') : t('accountCreatedSuccessfully'));
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error saving account:', error);
            setErrors({ general: error?.message || t('errorSavingAccount') || 'Failed to save account. Please try again.' });
        }
    };

    const handleAccountNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAccountName(e.target.value);
        clearFieldError(setErrors, 'accountName');
    };

    const renderPlatformFields = () => {
        switch (platformName) {
            case 'Meta':
                if (!isEditMode) return null;
                return (
                    <div>
                        <Label htmlFor="account-name">{t('accountName')}</Label>
                        <Input
                            id="account-name"
                            placeholder={t('enterAccountName')}
                            value={accountName}
                            onChange={handleAccountNameChange}
                            className={errors.accountName ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.accountName && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountName}</p>
                        )}
                    </div>
                );
            case 'WhatsApp':
                if (!isEditMode) return null;
                return (
                    <div>
                        <Label htmlFor="account-name">{t('accountName')}</Label>
                        <Input
                            id="account-name"
                            placeholder={t('egSalesWhatsapp')}
                            value={accountName}
                            onChange={handleAccountNameChange}
                            className={errors.accountName ? 'border-red-500 dark:border-red-500' : ''}
                        />
                        {errors.accountName && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountName}</p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Modal 
            isOpen={isManageIntegrationAccountModalOpen} 
            onClose={handleClose} 
            title={t(modalTitleKey)}
        >
            <div className="space-y-4">
                {errors.general && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600 dark:text-red-400">
                        {errors.general}
                    </div>
                )}
                {cannotAddSecond && (
                    <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                        {t('oneIntegrationAccountLimitModal')}
                    </p>
                )}
                {renderPlatformFields()}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || cannotAddSecond || blockAddWhileLoading} loading={isLoading}>{t('submit')}</Button>
                </div>
            </div>
        </Modal>
    );
};
