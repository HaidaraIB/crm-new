
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Page } from '../../types';

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
        case 'TikTok':
            return 'TikTok';
        case 'WhatsApp':
            return 'WhatsApp';
        default:
            return '';
    }
}

export const ManageIntegrationAccountModal = () => {
    const { 
        isManageIntegrationAccountModalOpen, 
        setIsManageIntegrationAccountModalOpen, 
        currentPage, 
        t,
        setConnectedAccounts,
        editingAccount,
        setEditingAccount,
        setIsSuccessModalOpen,
        setSuccessMessage
    } = useAppContext();

    const [accountName, setAccountName] = useState('');
    const [accountLink, setAccountLink] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [status, setStatus] = useState<'Connected' | 'Disconnected'>('Connected');
    const [isLoading, setIsLoading] = useState(false);

    const platformName = getPlatformName(currentPage);
    // Map Meta to 'facebook' for dataKey compatibility (API will use company-specific keys)
    const platformKey = (platformName.toLowerCase() === 'meta' ? 'facebook' : platformName.toLowerCase()) as 'facebook' | 'tiktok' | 'whatsapp';
    const isEditMode = !!editingAccount;

    useEffect(() => {
        if (editingAccount) {
            setAccountName(editingAccount.name || '');
            setAccountLink(editingAccount.link || '');
            setPhoneNumber(editingAccount.phone || '');
            setStatus(editingAccount.status as 'Connected' | 'Disconnected' || 'Connected');
        } else {
            // Reset form for "add" mode
            setAccountName('');
            setAccountLink('');
            setPhoneNumber('');
            setStatus('Connected');
        }
    }, [editingAccount, isManageIntegrationAccountModalOpen]);

    const handleClose = () => {
        setIsManageIntegrationAccountModalOpen(false);
        setEditingAccount(null); // Clear editing state on close
    };

    const handleSubmit = async () => {
        const payload = {
            platform: platformName.toLowerCase() === 'meta' ? 'meta' : platformName.toLowerCase(),
            name: accountName,
            link: accountLink,
            phone: phoneNumber,
            status,
        };

        setIsLoading(true);

        try {
            // TODO: استبدل هذا الكود باستدعاء API
            // مثال:
            // if (isEditMode) {
            //   await updateConnectedAccountAPI(editingAccount.id, payload);
            //   // ثم حدث state
            // } else {
            //   const newAccount = await createConnectedAccountAPI(payload);
            //   // ثم أضف للstate
            // }

            // الكود الحالي (للاختبار فقط):
            if (isEditMode) {
                // Edit existing account
                setConnectedAccounts((prev: any) => ({
                    ...prev,
                    [platformKey]: prev[platformKey].map((acc: any) => 
                        acc.id === editingAccount.id 
                        ? { ...acc, ...payload } 
                        : acc
                    )
                }));
            } else {
                // Add new account
                const newAccount = {
                    id: Date.now(),
                    ...payload,
                };
                setConnectedAccounts((prev: any) => ({
                    ...prev,
                    [platformKey]: [...(prev[platformKey] || []), newAccount]
                }));
            }

            // Reset form
            setAccountName('');
            setAccountLink('');
            setPhoneNumber('');
            setStatus('Connected');
            
            // Close modal immediately and show success modal
            handleClose();
            setSuccessMessage(isEditMode 
                ? (t('accountUpdatedSuccessfully') || 'Account updated successfully!')
                : (t('accountCreatedSuccessfully') || 'Account created successfully!')
            );
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error saving account:', error);
            alert(error?.message || t('errorSavingAccount') || 'Failed to save account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderPlatformFields = () => {
        switch (platformName) {
            case 'Meta':
            case 'TikTok':
                return (
                    <>
                        <div>
                            <Label htmlFor="account-name">{t('accountName')}</Label>
                            <Input id="account-name" placeholder={t('enterAccountName')} value={accountName} onChange={e => setAccountName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="account-link">{t('accountLink')}</Label>
                            <Input id="account-link" placeholder="https://..." value={accountLink} onChange={e => setAccountLink(e.target.value)} />
                        </div>
                    </>
                );
            case 'WhatsApp':
                 return (
                    <>
                        <div>
                            <Label htmlFor="account-name">{t('accountName')}</Label>
                            <Input id="account-name" placeholder={t('egSalesWhatsapp')} value={accountName} onChange={e => setAccountName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="phone-number">{t('phoneNumber')}</Label>
                            <Input id="phone-number" placeholder={t('enterWhatsappNumber')} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Modal 
            isOpen={isManageIntegrationAccountModalOpen} 
            onClose={handleClose} 
            title={`${t(isEditMode ? 'edit' : 'addNew')} ${platformName} ${t('account')}`}
        >
            <div className="space-y-4">
                {renderPlatformFields()}
                <div>
                    <Label htmlFor="status">{t('status')}</Label>
                    <Select id="status" value={status} onChange={e => setStatus(e.target.value as 'Connected' | 'Disconnected')}>
                        <option value="Connected">{t('connected')}</option>
                        <option value="Disconnected">{t('disconnected')}</option>
                    </Select>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isLoading} loading={isLoading}>{t('submit')}</Button>
                </div>
            </div>
        </Modal>
    );
};
