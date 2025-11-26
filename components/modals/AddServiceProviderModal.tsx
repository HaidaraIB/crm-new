
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { Button } from '../Button';

const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const AddServiceProviderModal = () => {
    const { isAddServiceProviderModalOpen, setIsAddServiceProviderModalOpen, t, addServiceProvider } = useAppContext();
    const [formState, setFormState] = useState({
        name: '',
        phone: '',
        email: '',
        specialization: '',
        rating: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAddServiceProviderModalOpen) {
            // Reset form when modal opens
            setFormState({
                name: '',
                phone: '',
                email: '',
                specialization: '',
                rating: '',
            });
        }
    }, [isAddServiceProviderModalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormState(prev => ({ ...prev, [id]: value }));
    };

    const handleClose = () => {
        setIsAddServiceProviderModalOpen(false);
        setFormState({
            name: '',
            phone: '',
            email: '',
            specialization: '',
            rating: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name) {
            alert(t('pleaseFillRequiredFields') || 'Please fill in required fields');
            return;
        }

        setLoading(true);
        try {
            await addServiceProvider({
                name: formState.name,
                phone: formState.phone || '',
                email: formState.email || '',
                specialization: formState.specialization || '',
                rating: formState.rating ? Number(formState.rating) : undefined,
            });
            handleClose();
        } catch (error: any) {
            console.error('Error creating service provider:', error);
            const errorMessage = error?.message || t('failedToCreateServiceProvider') || 'Failed to create service provider. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isAddServiceProviderModalOpen} onClose={handleClose} title={t('addServiceProvider') || 'Add Service Provider'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">{t('name')} *</Label>
                    <Input id="name" placeholder={t('enterProviderName') || 'Enter provider name'} value={formState.name} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input id="phone" placeholder={t('enterPhoneNumber') || 'Enter phone number'} value={formState.phone} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input id="email" type="email" placeholder={t('enterEmail') || 'Enter email'} value={formState.email} onChange={handleChange} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="specialization">{t('specialization')}</Label>
                        <Input id="specialization" placeholder={t('enterSpecialization') || 'Enter specialization'} value={formState.specialization} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="rating">{t('rating')}</Label>
                        <NumberInput id="rating" min={0} max={5} step={0.1} placeholder={t('enterRating') || 'Enter rating (0-5)'} value={formState.rating} onChange={handleChange} />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading}>{loading ? t('loading') || 'Loading...' : t('submit')}</Button>
                </div>
            </form>
        </Modal>
    );
};

