


import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Input, Button, Loader } from '../components/index';

// FIX: Made children optional to fix missing children prop error.
const Label = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

export const ProfilePage = () => {
    const {
        t,
        currentUser,
        setCurrentUser,
        setIsChangePasswordModalOpen,
        language
    } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState<{ id: number; isActive: boolean; planName?: string } | null>(null);
    
    // Split name into first and last name
    const nameParts = currentUser?.name?.split(' ') || [];
    const initialFirstName = nameParts[0] || '';
    const initialLastName = nameParts.slice(1).join(' ') || '';
    
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [email, setEmail] = useState(currentUser?.email || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Load subscription info
    useEffect(() => {
        const loadSubscriptionInfo = async () => {
            try {
                const { getCurrentUserAPI } = await import('../services/api');
                const userData = await getCurrentUserAPI();
                if (userData?.company?.subscription) {
                    setSubscriptionInfo({
                        id: userData.company.subscription.id,
                        isActive: userData.company.subscription.is_active === true,
                        planName: userData.company.subscription.plan?.name || undefined,
                    });
                }
            } catch (error) {
                console.error('Error loading subscription info:', error);
            }
        };
        if (currentUser) {
            loadSubscriptionInfo();
        }
    }, [currentUser]);

    // Update form when currentUser changes
    useEffect(() => {
        if (currentUser) {
            const nameParts = currentUser.name?.split(' ') || [];
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
            setEmail(currentUser.email || '');
            setPhone(currentUser.phone || '');
        }
    }, [currentUser]);

    if (!currentUser) return null;

    const handleSave = () => {
        // TODO: Add API call to update user profile
        // For now, just update local state
        const fullName = `${firstName} ${lastName}`.trim();
        setCurrentUser({
            ...currentUser,
            name: fullName,
            email: email,
            phone: phone
        });
        // TODO: Show success message
    };

    
    if (loading) {
        return (
            <PageWrapper title={t('profile')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

    const isRTL = language === 'ar';

    return (
        <PageWrapper title={t('profile')}>
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('profileSettings')}</h2>
                    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="profile-first-name">{t('firstName') || 'First Name'}</Label>
                                <Input 
                                    id="profile-first-name" 
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="profile-last-name">{t('lastName') || 'Last Name'}</Label>
                                <Input 
                                    id="profile-last-name" 
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="profile-email">{t('email')}</Label>
                            <Input 
                                id="profile-email" 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={true}
                                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            />
                            {currentUser.emailVerified ? (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {t('emailVerified') || 'Email verified'}
                                </p>
                            ) : (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    {t('emailNotVerified') || 'Email not verified. Please check your inbox for verification email.'}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="profile-phone">{t('phone')}</Label>
                            <Input 
                                id="profile-phone" 
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={true}
                                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('security')}</h2>
                    <Button onClick={() => setIsChangePasswordModalOpen(true)}>
                        {t('changePassword')}
                    </Button>
                </Card>

                {subscriptionInfo && (
                    <Card>
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">{t('subscription')}</h2>
                        <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div>
                                <Label htmlFor="subscription-status">{t('subscriptionStatus')}</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        subscriptionInfo.isActive 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                        {subscriptionInfo.isActive ? t('active') : t('inactive')}
                                    </span>
                                </div>
                            </div>
                            {subscriptionInfo.planName && (
                                <div>
                                    <Label htmlFor="current-plan">{t('currentPlan')}</Label>
                                    <p className="mt-1 text-gray-700 dark:text-gray-300">{subscriptionInfo.planName}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
                
                <div className="flex justify-end">
                    <Button onClick={handleSave}>{t('saveProfile')}</Button>
                </div>
            </div>
        </PageWrapper>
    );
};
