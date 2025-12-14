
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useAddChannel } from '../../hooks/useQueries';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Select = ({ id, children, value, onChange, className }: { id: string; children?: React.ReactNode; value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string; }) => {
    const { language } = useAppContext();
    const borderClass = className?.includes('border-red') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600';
    const baseClassName = className?.replace(/border-\S+/g, '').trim() || '';
    return (
        <select id={id} value={value} onChange={onChange} dir={language === 'ar' ? 'rtl' : 'ltr'} className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 ${borderClass} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 ${baseClassName}`}>
            {children}
        </select>
    );
};

// Default channel types available for selection
const DEFAULT_CHANNEL_TYPES = ['Web', 'Social', 'Advertising', 'Email', 'Phone', 'SMS', 'WhatsApp', 'Telegram', 'Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'YouTube', 'Other'];

export const AddChannelModal = () => {
    const { isAddChannelModalOpen, setIsAddChannelModalOpen, t, channelTypes, setIsSuccessModalOpen, setSuccessMessage, language, currentUser } = useAppContext();
    
    // Create channel mutation
    const addChannelMutation = useAddChannel();
    const loading = addChannelMutation.isPending;

    // Use channel types from API, fallback to default types for selection
    const apiChannelTypes = channelTypes && Array.isArray(channelTypes) ? channelTypes : [];
    // Combine API types with defaults, removing duplicates
    const availableChannelTypes = React.useMemo(() => {
        const combined = new Set([...apiChannelTypes, ...DEFAULT_CHANNEL_TYPES]);
        return Array.from(combined);
    }, [apiChannelTypes]);
    const [formState, setFormState] = useState({
        name: '',
        type: '',
        priority: 'medium' as 'high' | 'medium' | 'low',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formState.name.trim()) {
            newErrors.name = t('nameRequired') || 'Name is required';
        }

        if (!formState.type) {
            newErrors.type = t('typeRequired') || 'Type is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    useEffect(() => {
        if (isAddChannelModalOpen) {
            setFormState({
                name: '',
                type: availableChannelTypes.length > 0 ? availableChannelTypes[0] : '',
                priority: 'medium',
            });
            setErrors({});
        }
    }, [isAddChannelModalOpen, availableChannelTypes]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
        clearError(id);
    };

    const handleClose = () => {
        setIsAddChannelModalOpen(false);
        setFormState({
            name: '',
            type: availableChannelTypes.length > 0 ? availableChannelTypes[0] : '',
            priority: 'medium',
        });
        setErrors({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        if (!currentUser?.company?.id) {
            setErrors({ _general: t('companyRequired') || 'Company is required' });
            return;
        }

        try {
            await addChannelMutation.mutateAsync({
                name: formState.name,
                type: formState.type,
                priority: formState.priority,
                company: currentUser.company.id,
            });

            handleClose();
            setSuccessMessage(t('channelCreatedSuccessfully') || 'Channel created successfully!');
            setIsSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Error creating channel:', error);
            const errorData = error?.response?.data || error?.data || {};
            const newErrors: { [key: string]: string } = {};
            
            // Parse API validation errors
            if (errorData.priority) {
                newErrors.priority = Array.isArray(errorData.priority) ? errorData.priority[0] : errorData.priority;
            }
            if (errorData.company) {
                newErrors._general = Array.isArray(errorData.company) ? errorData.company[0] : errorData.company;
            }
            if (errorData.name) {
                newErrors.name = Array.isArray(errorData.name) ? errorData.name[0] : errorData.name;
            }
            if (errorData.type) {
                newErrors.type = Array.isArray(errorData.type) ? errorData.type[0] : errorData.type;
            }
            
            if (Object.keys(newErrors).length === 0) {
                newErrors._general = error?.message || t('failedToCreateChannel') || 'Failed to create channel. Please try again.';
            }
            
            setErrors(newErrors);
        }
    };

    const translateChannelType = (type: string): string => {
        const typeLower = type.toLowerCase();
        if (typeLower === 'web') return t('web');
        if (typeLower === 'social') return t('social');
        if (typeLower === 'advertising') return t('advertising');
        if (typeLower === 'email') return t('email');
        if (typeLower === 'phone') return t('phone') || 'Phone';
        if (typeLower === 'sms') return t('sms') || 'SMS';
        if (typeLower === 'whatsapp') return t('whatsapp') || 'WhatsApp';
        if (typeLower === 'telegram') return t('telegram') || 'Telegram';
        if (typeLower === 'instagram') return t('instagram') || 'Instagram';
        if (typeLower === 'facebook') return t('facebook') || 'Facebook';
        if (typeLower === 'linkedin') return t('linkedin') || 'LinkedIn';
        if (typeLower === 'twitter') return t('twitter') || 'Twitter';
        if (typeLower === 'tiktok') return t('tikTok') || 'TikTok';
        if (typeLower === 'youtube') return t('youtube') || 'YouTube';
        if (typeLower === 'other') return t('other') || 'Other';
        return type;
    };

    return (
        <Modal isOpen={isAddChannelModalOpen} onClose={handleClose} title={t('addChannel') || 'Add Channel'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {errors._general && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md text-sm">
                        {errors._general}
                    </div>
                )}
                <div>
                    <Label htmlFor="name">{t('name')} <span className="text-red-500">*</span></Label>
                    <Input 
                        id="name" 
                        placeholder={t('enterChannelName') || 'Enter channel name'} 
                        value={formState.name} 
                        onChange={handleChange}
                        className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="type">{t('type')} <span className="text-red-500">*</span></Label>
                    <Select 
                        id="type" 
                        value={formState.type} 
                        onChange={handleChange}
                        className={errors.type ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option value="">{t('selectType') || 'Select Type'}</option>
                        {(availableChannelTypes || []).length > 0 ? (
                            (availableChannelTypes || []).map(type => (
                                <option key={type} value={type}>{translateChannelType(type)}</option>
                            ))
                        ) : (
                            <option value="" disabled>{t('noChannelTypesAvailable') || 'No channel types available'}</option>
                        )}
                    </Select>
                    {errors.type && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="priority">{t('priority')}</Label>
                    <Select 
                        id="priority" 
                        value={formState.priority} 
                        onChange={handleChange}
                        className={errors.priority ? 'border-red-500 dark:border-red-500' : ''}
                    >
                        <option value="high">{t('high')}</option>
                        <option value="medium">{t('medium')}</option>
                        <option value="low">{t('low')}</option>
                    </Select>
                    {errors.priority && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.priority}</p>
                    )}
                </div>
                <div className={`flex ${language === 'ar' ? 'flex-row-reverse' : ''} justify-end gap-2`}>
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

