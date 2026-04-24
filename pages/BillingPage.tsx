
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Loader, PaymentGatewaySelector, Modal, PlanEntitlementsSummary, PageLoadingState, SectionLoadingState } from '../components/index';
import { getPublicPlansAPI, createPaymentSessionAPI, checkPaymentStatusAPI, getCurrentUserAPI, switchSubscriptionPlanFreeAPI } from '../services/api';
import { CreditCardIcon } from '../components/icons';
import { formatDaysRemainingLabel, isFreeTrialPlan } from '../utils/planEntitlements';
import { ARABIC_DATE_LOCALE } from '../utils/dateUtils';

type SubscriptionInfo = {
    id: number;
    isActive: boolean;
    plan?: {
        id?: number;
        name?: string;
        name_ar?: string;
        description?: string;
        description_ar?: string;
        price_monthly?: number;
        price_yearly?: number;
        trial_days?: number;
        tier?: number;
        users?: string;
        clients?: string;
        features?: Record<string, boolean>;
        limits?: Record<string, number | 'unlimited' | null>;
        usage_limits_monthly?: Record<string, number | 'unlimited' | null>;
    };
    startDate?: string;
    endDate?: string;
    billingCycle?: 'monthly' | 'yearly';
    daysRemainingInPeriod?: number;
    pendingPlan?: { id?: number; name?: string; tier?: number } | null;
    subscriptionStatus?: string;
};

export const BillingPage = () => {
    const { t, language, currentUser } = useAppContext();
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRenewing, setIsRenewing] = useState(false);
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [showChangePlanModal, setShowChangePlanModal] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [freeTrialConsumed, setFreeTrialConsumed] = useState(false);

    const isFibSessionPayload = (response: any) =>
        response?.payment_id != null &&
        (response?.qr_code || response?.readable_code || response?.personal_app_link);

    const routeToFibPaymentPage = (subscriptionId: number, response: any) => {
        try {
            sessionStorage.setItem(`fibPaymentData:${subscriptionId}`, JSON.stringify(response));
            sessionStorage.setItem('fibPaymentLatestSubscriptionId', String(subscriptionId));
            localStorage.setItem('pendingSubscriptionId', String(subscriptionId));
        } catch (e) {
            console.warn('Failed to cache FIB payment payload:', e);
        }
        window.location.href = `/payment?subscription_id=${subscriptionId}`;
    };

    const planLang = language === 'ar' ? 'ar' : 'en';

    // Load subscription info
    useEffect(() => {
        const loadSubscriptionInfo = async () => {
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const userData = await getCurrentUserAPI();
                
                setFreeTrialConsumed(!!userData?.company?.free_trial_consumed);
                if (userData?.company?.subscription) {
                    const subscription = userData.company.subscription;
                    const subscriptionId = subscription.id;
                    
                    // Get detailed subscription status
                    let detailedStatus = null;
                    try {
                        detailedStatus = await checkPaymentStatusAPI(subscriptionId);
                    } catch (error) {
                        console.error('Error checking payment status:', error);
                    }

                    // Get plan details from public plans
                    let planDetails = null;
                    if (subscription.plan?.id) {
                        try {
                            const publicPlans = await getPublicPlansAPI();
                            const publicPlan = Array.isArray(publicPlans) 
                                ? publicPlans.find((p: any) => p.id === subscription.plan?.id)
                                : null;
                            if (publicPlan) {
                                planDetails = {
                                    id: publicPlan.id,
                                    name: publicPlan.name,
                                    name_ar: publicPlan.name_ar,
                                    description: publicPlan.description,
                                    description_ar: publicPlan.description_ar,
                                    price_monthly: publicPlan.price_monthly,
                                    price_yearly: publicPlan.price_yearly,
                                    trial_days: publicPlan.trial_days,
                                    users: publicPlan.users,
                                    clients: publicPlan.clients,
                                    features: publicPlan.features || {},
                                    limits: publicPlan.limits || {},
                                    usage_limits_monthly: publicPlan.usage_limits_monthly || {},
                                };
                            }
                        } catch (error) {
                            console.error('Error fetching plan details:', error);
                        }
                    }

                    // Determine billing cycle from subscription duration (paid plans only).
                    // Free/trial plans do not have a billing cycle.
                    let billingCycle: 'monthly' | 'yearly' | undefined = 'monthly';
                    const pm = Number(planDetails?.price_monthly ?? subscription.plan?.price_monthly ?? 0);
                    const py = Number(planDetails?.price_yearly ?? subscription.plan?.price_yearly ?? 0);
                    const trialDays = Number(planDetails?.trial_days ?? 0);
                    const isFreeOrTrial = pm <= 0 && py <= 0;
                    if (isFreeOrTrial) {
                        billingCycle = undefined;
                    } else if (subscription.billing_cycle === 'yearly' || subscription.billing_cycle === 'monthly') {
                        billingCycle = subscription.billing_cycle;
                    } else if (subscription.start_date && subscription.end_date) {
                        const startDate = new Date(subscription.start_date);
                        const endDate = new Date(subscription.end_date);
                        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        billingCycle = daysDiff >= 330 ? 'yearly' : 'monthly';
                    }

                    setSubscriptionInfo({
                        id: subscriptionId,
                        isActive: detailedStatus?.is_truly_active ?? subscription.is_active === true,
                        plan: planDetails || {
                            id: subscription.plan?.id,
                            name: subscription.plan?.name,
                            name_ar: subscription.plan?.name_ar,
                            tier: subscription.plan?.tier,
                        },
                        startDate: subscription.start_date,
                        endDate: detailedStatus?.end_date || subscription.end_date,
                        billingCycle: billingCycle as any,
                        daysRemainingInPeriod: subscription.days_remaining_in_period,
                        pendingPlan: subscription.pending_plan,
                        subscriptionStatus: subscription.subscription_status,
                    });
                } else {
                    setSubscriptionInfo(null);
                }
            } catch (error) {
                console.error('Error loading subscription info:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSubscriptionInfo();
    }, [currentUser]);

    // Load available plans for change plan modal
    useEffect(() => {
        if (showChangePlanModal) {
            const loadPlans = async () => {
                setPlansLoading(true);
                try {
                    const data = await getPublicPlansAPI();
                    setAvailablePlans(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Error loading plans:', error);
                } finally {
                    setPlansLoading(false);
                }
            };
            loadPlans();
        }
    }, [showChangePlanModal]);

    const currentPlanId = subscriptionInfo?.plan?.id ?? null;

    useEffect(() => {
        if (currentPlanId != null && selectedPlan === currentPlanId) {
            setSelectedPlan(null);
        }
    }, [currentPlanId, selectedPlan]);

    useEffect(() => {
        if (!selectedPlan || !freeTrialConsumed) return;
        const p = availablePlans.find((x: any) => x.id === selectedPlan);
        if (p && isFreeTrialPlan(p)) {
            setSelectedPlan(null);
        }
    }, [freeTrialConsumed, selectedPlan, availablePlans]);

    const handleRenewSubscription = async () => {
        if (!subscriptionInfo || !subscriptionInfo.id) {
            alert(t('subscriptionNotFound') || 'Subscription not found');
            return;
        }

        // Free/trial plans do not support renewals
        const currentPm = Number(subscriptionInfo.plan?.price_monthly ?? 0);
        const currentPy = Number(subscriptionInfo.plan?.price_yearly ?? 0);
        const isCurrentFreeOrTrial = currentPm <= 0 && currentPy <= 0;
        if (isCurrentFreeOrTrial) {
            alert(language === 'ar' ? 'لا يوجد تجديد للخطة المجانية/التجريبية.' : 'Free/trial plans do not require renewal.');
            return;
        }

        if (!selectedGateway) {
            alert(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsRenewing(true);
            const billingCycle = subscriptionInfo.billingCycle || 'monthly';

            const response = await createPaymentSessionAPI(
                subscriptionInfo.id,
                selectedGateway,
                undefined, // No plan change
                billingCycle
            );
            
            if (response.redirect_url) {
                window.location.href = response.redirect_url;
            } else if (isFibSessionPayload(response)) {
                routeToFibPaymentPage(subscriptionInfo.id, response);
            } else {
                alert(t('paymentRedirectError') || 'Failed to get payment URL');
            }
        } catch (error: any) {
            console.error('Error renewing subscription:', error);
            alert(error?.message || t('errorRenewingSubscription') || 'Error renewing subscription');
        } finally {
            setIsRenewing(false);
            setShowRenewalModal(false);
        }
    };

    const handleChangePlan = async () => {
        if (!subscriptionInfo || !subscriptionInfo.id) {
            alert(t('subscriptionNotFound') || 'Subscription not found');
            return;
        }

        if (!selectedPlan) {
            alert(t('planRequired') || 'Please select a plan to continue');
            return;
        }

        if (currentPlanId != null && selectedPlan === currentPlanId) {
            alert(
                language === 'ar'
                    ? 'أنت مشترك بالفعل في هذه الخطة. اختر خطة أخرى.'
                    : 'This is already your current plan. Choose a different plan.'
            );
            return;
        }

        const selectedPlanObj = availablePlans.find((p: any) => p.id === selectedPlan);
        if (freeTrialConsumed && selectedPlanObj && isFreeTrialPlan(selectedPlanObj)) {
            alert(t('trialUnavailable') || 'Trial already used');
            return;
        }

        const selectedPm = Number(selectedPlanObj?.price_monthly ?? 0);
        const selectedPy = Number(selectedPlanObj?.price_yearly ?? 0);
        const isSelectedFreeOrTrial = selectedPm <= 0 && selectedPy <= 0;

        try {
            setIsRenewing(true);
            if (isSelectedFreeOrTrial) {
                await switchSubscriptionPlanFreeAPI(selectedPlan);
                // Refresh subscription info in-place
                const refreshed = await getCurrentUserAPI();
                setFreeTrialConsumed(!!refreshed?.company?.free_trial_consumed);
                if (refreshed?.company?.subscription) {
                    const s = refreshed.company.subscription;
                    setSubscriptionInfo((prev) => prev ? ({
                        ...prev,
                        id: s.id,
                        isActive: s.is_active === true,
                        startDate: s.start_date,
                        endDate: s.end_date,
                    }) : prev);
                }
            } else {
                if (!selectedGateway) {
                    alert(t('paymentGatewayRequired') || 'Please select a payment method');
                    return;
                }
                const response = await createPaymentSessionAPI(
                    subscriptionInfo.id,
                    selectedGateway,
                    selectedPlan,
                    billingCycle
                );
                if (response.redirect_url) {
                    window.location.href = response.redirect_url;
                } else if (isFibSessionPayload(response)) {
                    routeToFibPaymentPage(subscriptionInfo.id, response);
                } else {
                    alert(t('paymentRedirectError') || 'Failed to get payment URL');
                }
            }
        } catch (error: any) {
            console.error('Error changing plan:', error);
            alert(error?.message || t('errorLoadingPaymentLink') || 'Error loading payment link');
        } finally {
            setIsRenewing(false);
            setShowChangePlanModal(false);
        }
    };

    const getDaysRemaining = () => {
        if (!subscriptionInfo?.endDate) return null;
        const endDate = new Date(subscriptionInfo.endDate);
        const now = new Date();
        const daysDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff;
    };

    const getPlanPrice = () => {
        if (!subscriptionInfo?.plan) return null;
        const cycle = subscriptionInfo.billingCycle || 'monthly';
        const price = cycle === 'monthly' 
            ? subscriptionInfo.plan.price_monthly 
            : subscriptionInfo.plan.price_yearly;
        return price || 0;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(
            language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
            { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }
        );
    };

    const isRTL = language === 'ar';

    /** Comma thousands separator, no trailing fraction zeros (e.g. 99, 99.5, 1,234.56). */
    const formatMoneyAmount = (amount: number) =>
        new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            useGrouping: true,
        }).format(amount);

    /** Localized amount + currency label (LTR English string; Arabic uses {@link renderPricePeriodLine}). */
    const formatPriceLocalized = (amount: number) => {
        return `${formatMoneyAmount(amount)} ${t('currencyUSD')}`;
    };

    /** Price + period with correct bidi: Arabic RTL line, LTR number island. */
    const renderPricePeriodLine = (amount: number, cycle: 'yearly' | 'monthly' | undefined) => {
        const period = cycle === 'yearly' ? t('perYear') : t('perMonth');
        if (!isRTL) {
            return (
                <>
                    {formatPriceLocalized(amount)} / {period}
                </>
            );
        }
        return (
            <>
                <span dir="ltr" className="inline-block [unicode-bidi:isolate]">
                    {formatMoneyAmount(amount)}
                </span>
                {'\u00A0'}
                {t('currencyUSD')}
                {' / '}
                {period}
            </>
        );
    };

    const localizePlanSlot = (raw: string | undefined) => {
        if (raw === undefined || raw === null || String(raw).trim() === '') return '—';
        const s = String(raw).trim().toLowerCase();
        if (s === 'unlimited') return t('unlimited');
        return String(raw).trim();
    };

    if (isLoading) {
        return (
            <PageWrapper title={t('billing') || 'Billing'}>
                <PageLoadingState label={t('loadingBilling') || 'Loading billing'} />
            </PageWrapper>
        );
    }

    if (!currentUser) {
        return (
            <PageWrapper title={t('billing') || 'Billing'}>
                <Card>
                    <p className="text-gray-600 dark:text-gray-400">{t('pleaseLogin') || 'Please login to view billing information'}</p>
                </Card>
            </PageWrapper>
        );
    }

    const daysRemaining = getDaysRemaining();
    const planPrice = getPlanPrice();
    const isCurrentFreeOrTrial = Number(subscriptionInfo?.plan?.price_monthly ?? 0) <= 0 && Number(subscriptionInfo?.plan?.price_yearly ?? 0) <= 0;

    return (
        <PageWrapper title={t('billing') || 'Billing'}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Current Subscription Status */}
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCardIcon className="w-8 h-8 text-primary" />
                        <h2 className="text-2xl font-semibold">{t('subscription') || 'Subscription'}</h2>
                    </div>

                    {subscriptionInfo ? (
                        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {/* Status + days: label beside value, larger type */}
                            <div
                                dir={isRTL ? 'rtl' : 'ltr'}
                                className="flex flex-wrap items-center justify-start gap-x-6 gap-y-4"
                            >
                                <div
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                    className="flex flex-wrap items-center gap-3"
                                >
                                    <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                                        {t('subscriptionStatus')}
                                    </span>
                                    <span
                                        className={`inline-flex items-center px-5 py-2 rounded-full text-lg font-semibold ${
                                            subscriptionInfo.isActive
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}
                                    >
                                        {subscriptionInfo.isActive ? t('active') : t('inactive')}
                                    </span>
                                </div>
                                {daysRemaining !== null && daysRemaining > 0 && (
                                    <div
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                        className="flex flex-wrap items-center gap-3"
                                    >
                                        <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                                            {t('daysRemaining')}
                                        </span>
                                        <span
                                            className={`text-2xl font-bold ${
                                                daysRemaining <= 7
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : daysRemaining <= 30
                                                      ? 'text-amber-600 dark:text-amber-400'
                                                      : 'text-green-600 dark:text-green-400'
                                            }`}
                                        >
                                            {formatDaysRemainingLabel(daysRemaining, planLang)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Plan Details */}
                            {subscriptionInfo.plan && (
                                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('currentPlan') || 'Current Plan'}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {language === 'ar' && subscriptionInfo.plan.name_ar && subscriptionInfo.plan.name_ar.trim()
                                                ? subscriptionInfo.plan.name_ar
                                                : (subscriptionInfo.plan.name || '-')}
                                        </p>
                                        {subscriptionInfo.plan.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {language === 'ar' && subscriptionInfo.plan.description_ar && subscriptionInfo.plan.description_ar.trim()
                                                    ? subscriptionInfo.plan.description_ar
                                                    : subscriptionInfo.plan.description}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('billingCycle') || 'Billing Cycle'}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {subscriptionInfo.billingCycle
                                                ? (subscriptionInfo.billingCycle === 'yearly' ? t('yearly') : t('monthly'))
                                                : t('noBillingCycle')}
                                        </p>
                                    </div>
                                    {planPrice !== null && planPrice > 0 && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {t('price') || 'Price'}
                                            </p>
                                            <p
                                                className="text-lg font-semibold text-gray-900 dark:text-white"
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                            >
                                                {renderPricePeriodLine(planPrice, subscriptionInfo.billingCycle)}
                                            </p>
                                        </div>
                                    )}
                                    </div>

                                    <PlanEntitlementsSummary
                                        users={subscriptionInfo.plan.users}
                                        clients={subscriptionInfo.plan.clients}
                                        extra_limits={subscriptionInfo.plan.limits}
                                        features={subscriptionInfo.plan.features}
                                        language={planLang}
                                        labels={{
                                            resourceLimitsTitle: t('planSectionResourceLimits') || 'Resource limits',
                                            featuresTitle: t('planSectionFeatures') || 'Features',
                                            none: t('planFeaturesNone') || 'None',
                                        }}
                                        className="mt-0 pt-0 border-t-0 text-sm"
                                    />
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subscriptionInfo.startDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('startDate') || 'Start Date'}
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {formatDate(subscriptionInfo.startDate)}
                                        </p>
                                    </div>
                                )}
                                {subscriptionInfo.endDate && (
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            {t('subscriptionEndDate') || 'End Date'}
                                        </p>
                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                            {formatDate(subscriptionInfo.endDate)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Renewal Reminder */}
                            {subscriptionInfo.isActive && daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        {t('subscriptionRenewalReminder').replace(
                                            '{remaining}',
                                            formatDaysRemainingLabel(daysRemaining, planLang),
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                {subscriptionInfo.isActive && (
                                    <div className="flex-1">
                                        <Button
                                            onClick={() => setShowRenewalModal(true)}
                                            disabled={isRenewing || isCurrentFreeOrTrial}
                                            className="w-full"
                                        >
                                            {t('renewSubscription') || 'Renew Subscription'}
                                        </Button>
                                    </div>
                                )}
                                <Button 
                                    onClick={() => setShowChangePlanModal(true)}
                                    variant="outline"
                                    disabled={isRenewing}
                                    className="flex-1"
                                >
                                    {t('changePlan') || 'Change Plan'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {t('noSubscriptionFound') || 'No active subscription found'}
                            </p>
                            <Button onClick={() => setShowChangePlanModal(true)}>
                                {t('selectPlan') || 'Select a Plan'}
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Billing History - Placeholder for future implementation */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                        {t('billingHistory') || 'Billing History'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                        {t('billingHistoryComingSoon') || 'Billing history will be available soon'}
                    </p>
                </Card>
            </div>

            {/* Renew Subscription Modal */}
            <Modal
                isOpen={showRenewalModal}
                onClose={() => {
                    setShowRenewalModal(false);
                    setSelectedGateway(null);
                }}
                title={t('renewSubscription') || 'Renew Subscription'}
                maxWidth="lg"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('selectPaymentMethodForRenewal') || 'Select a payment method to renew your subscription'}
                    </p>
                    <PaymentGatewaySelector
                        selectedGateway={selectedGateway}
                        onSelect={setSelectedGateway}
                    />
                    <div className="flex justify-end gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRenewalModal(false);
                                setSelectedGateway(null);
                            }}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleRenewSubscription}
                            loading={isRenewing}
                            disabled={!selectedGateway || isRenewing}
                        >
                            {isRenewing ? (t('processing') || 'Processing...') : (t('proceedToPayment') || 'Proceed to Payment')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Change Plan Modal */}
            <Modal
                isOpen={showChangePlanModal}
                onClose={() => {
                    setShowChangePlanModal(false);
                    setSelectedGateway(null);
                    setSelectedPlan(null);
                }}
                title={t('changePlan') || 'Change Plan'}
                maxWidth="2xl"
            >
                <div className="space-y-6">
                    {(() => {
                        const selectedPlanObj = availablePlans.find((p: any) => p.id === selectedPlan);
                        const isSelectedFreeOrTrial = Number(selectedPlanObj?.price_monthly ?? 0) <= 0 && Number(selectedPlanObj?.price_yearly ?? 0) <= 0;
                        return !isSelectedFreeOrTrial ? (
                            <div className="flex justify-center">
                                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            billingCycle === 'monthly'
                                                ? 'bg-primary text-white'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {t('monthly') || 'Monthly'}
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            billingCycle === 'yearly'
                                                ? 'bg-primary text-white'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {t('yearly') || 'Yearly'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                        null
                        );
                    })()}

                    {/* Plans List */}
                    {plansLoading ? (
                        <SectionLoadingState label={t('loadingPlans') || 'Loading plans'} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                            {availablePlans.map((plan) => {
                                const price = billingCycle === 'monthly' 
                                    ? Number(plan.price_monthly || 0) 
                                    : Number(plan.price_yearly || 0);
                                const isFreeOrTrial = Number(plan.price_monthly || 0) <= 0 && Number(plan.price_yearly || 0) <= 0;
                                const isCurrentPlan = currentPlanId != null && plan.id === currentPlanId;
                                const trialLocked = freeTrialConsumed && isFreeTrialPlan(plan);
                                const isLocked = isCurrentPlan || trialLocked;
                                const isSelected = !isLocked && selectedPlan === plan.id;
                                
                                return (
                                    <div
                                        key={plan.id}
                                        role="button"
                                        tabIndex={isLocked ? -1 : 0}
                                        onClick={() => {
                                            if (isLocked) return;
                                            setSelectedPlan(plan.id);
                                        }}
                                        onKeyDown={(e) => {
                                            if (isLocked) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedPlan(plan.id);
                                            }
                                        }}
                                        className={`p-4 border-2 rounded-lg transition-all ${
                                            isLocked
                                                ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 opacity-75 cursor-not-allowed'
                                                : `cursor-pointer ${
                                                      isSelected
                                                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                  }`
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold">
                                                {language === 'ar' && plan.name_ar && plan.name_ar.trim()
                                                    ? plan.name_ar
                                                    : plan.name}
                                            </h3>
                                            {isCurrentPlan && (
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
                                                    {t('currentPlan') || 'Current plan'}
                                                </span>
                                            )}
                                            {trialLocked && !isCurrentPlan && (
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-200 border border-amber-700/50">
                                                    {t('trialUnavailable') || 'Trial already used'}
                                                </span>
                                            )}
                                            {!isLocked && isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {language === 'ar' && plan.description_ar && plan.description_ar.trim()
                                                ? plan.description_ar
                                                : plan.description}
                                        </p>
                                        <p className="text-lg font-bold text-primary" dir={isRTL ? 'rtl' : 'ltr'}>
                                            {isFreeOrTrial
                                                ? (t('free') || 'Free')
                                                : renderPricePeriodLine(
                                                      price,
                                                      billingCycle === 'yearly' ? 'yearly' : 'monthly',
                                                  )}
                                        </p>
                                        <PlanEntitlementsSummary
                                            users={plan.users}
                                            clients={plan.clients}
                                            extra_limits={plan.limits}
                                            features={(plan.features || {}) as Record<string, boolean>}
                                            language={planLang}
                                            labels={{
                                                resourceLimitsTitle: t('planSectionResourceLimits') || 'Resource limits',
                                                featuresTitle: t('planSectionFeatures') || 'Features',
                                                none: t('planFeaturesNone') || 'None',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {(() => {
                        const selectedPlanObj = availablePlans.find((p: any) => p.id === selectedPlan);
                        const isSelectedFreeOrTrial = Number(selectedPlanObj?.price_monthly ?? 0) <= 0 && Number(selectedPlanObj?.price_yearly ?? 0) <= 0;
                        return !isSelectedFreeOrTrial ? (
                            <PaymentGatewaySelector
                                selectedGateway={selectedGateway}
                                onSelect={setSelectedGateway}
                            />
                        ) : null;
                    })()}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowChangePlanModal(false);
                                setSelectedGateway(null);
                                setSelectedPlan(null);
                            }}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleChangePlan}
                            loading={isRenewing}
                            disabled={
                                !selectedPlan ||
                                isRenewing ||
                                (currentPlanId != null && selectedPlan === currentPlanId) ||
                                (() => {
                                    const sp = availablePlans.find((p: any) => p.id === selectedPlan);
                                    if (sp && freeTrialConsumed && isFreeTrialPlan(sp)) return true;
                                    const isSelectedFreeOrTrial =
                                        Number(sp?.price_monthly ?? 0) <= 0 &&
                                        Number(sp?.price_yearly ?? 0) <= 0;
                                    return !isSelectedFreeOrTrial && !selectedGateway;
                                })()
                            }
                        >
                            {isRenewing ? (t('processing') || 'Processing...') : (t('changePlan') || 'Change Plan')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
};

