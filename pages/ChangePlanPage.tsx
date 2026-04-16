
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Loader, PaymentGatewaySelector, PlanEntitlementsSummary } from '../components/index';
import {
    getPublicPlansAPI,
    createPaymentSessionAPI,
    getCurrentUserAPI,
    previewSubscriptionChangeAPI,
    scheduleSubscriptionDowngradeAPI,
    type CreatePaymentSessionResult,
} from '../services/api';
import { isRedundantPlanDescription, isFreeTrialPlan } from '../utils/planEntitlements';

type PublicPlan = {
    id: number;
    name: string;
    name_ar?: string;
    description: string;
    description_ar?: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    users: string;
    clients: string;
    features?: Record<string, boolean>;
    limits?: Record<string, number | 'unlimited' | null>;
    usage_limits_monthly?: Record<string, number | 'unlimited' | null>;
    tier?: number;
};

export const ChangePlanPage = () => {
    const { t, language, theme, currentUser } = useAppContext();
    const [plans, setPlans] = useState<PublicPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState<boolean>(true);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedGateway, setSelectedGateway] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    /** Subscription's current plan id — selection of this plan is blocked. */
    const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
    const [freeTrialConsumed, setFreeTrialConsumed] = useState(false);
    const [preview, setPreview] = useState<{
        intent?: string;
        amount_usd?: string;
        days_remaining_in_period?: number;
        error?: string;
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        // Get subscription_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const subId = urlParams.get('subscription_id');
        if (subId) {
            setSubscriptionId(subId);
            const syncPlanFromMe = async () => {
                try {
                    if (!localStorage.getItem('accessToken')) return;
                    const userData = await getCurrentUserAPI();
                    setFreeTrialConsumed(!!userData?.company?.free_trial_consumed);
                    const sub = userData?.company?.subscription;
                    if (sub?.id?.toString() === subId && typeof sub.plan?.id === 'number') {
                        setCurrentPlanId(sub.plan.id);
                    }
                } catch {
                    /* ignore */
                }
            };
            syncPlanFromMe();
        } else {
            // Try to get from currentUser if logged in
            if (currentUser?.company) {
                // Try to get subscription ID from API
                const loadSubscriptionId = async () => {
                    try {
                        const userData = await getCurrentUserAPI();
                        setFreeTrialConsumed(!!userData?.company?.free_trial_consumed);
                        if (userData?.company?.subscription?.id) {
                            setSubscriptionId(userData.company.subscription.id.toString());
                        }
                        const planId = userData?.company?.subscription?.plan?.id;
                        if (typeof planId === 'number') {
                            setCurrentPlanId(planId);
                        }
                    } catch (error) {
                        console.error('Error loading subscription ID:', error);
                        // Fallback to localStorage
                        const pendingSubId = localStorage.getItem('pendingSubscriptionId');
                        if (pendingSubId) {
                            setSubscriptionId(pendingSubId);
                        }
                    }
                };
                loadSubscriptionId();
            } else {
                // Try to get from localStorage
                const pendingSubId = localStorage.getItem('pendingSubscriptionId');
                if (pendingSubId) {
                    setSubscriptionId(pendingSubId);
                }
            }
        }

        // Load plans
        const loadPlans = async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const data = await getPublicPlansAPI();
                const normalizedPlans = (Array.isArray(data) ? data : []).map((plan: any): PublicPlan => ({
                    id: plan.id,
                    name: plan.name || '',
                    name_ar: plan.name_ar || '',
                    description: plan.description || '',
                    description_ar: plan.description_ar || '',
                    price_monthly: Number(plan.price_monthly || 0),
                    price_yearly: Number(plan.price_yearly || 0),
                    trial_days: Number(plan.trial_days || 0),
                    users: plan.users,
                    clients: plan.clients,
                    features: plan.features || {},
                    limits: plan.limits || {},
                    usage_limits_monthly: plan.usage_limits_monthly || {},
                    tier: typeof plan.tier === 'number' ? plan.tier : undefined,
                }));
                setPlans(normalizedPlans);
            } catch (error: any) {
                setPlansError(error.message || t('failedToLoadPlans') || 'Failed to load plans');
            } finally {
                setPlansLoading(false);
            }
        };

        loadPlans();
    }, [t, currentUser]);

    useEffect(() => {
        const pid = currentUser?.company?.subscription?.plan?.id;
        if (typeof pid === 'number') {
            setCurrentPlanId(pid);
        }
        if (currentUser?.company && typeof currentUser.company.free_trial_consumed === 'boolean') {
            setFreeTrialConsumed(currentUser.company.free_trial_consumed);
        }
    }, [currentUser?.company?.subscription?.plan?.id, currentUser?.company?.free_trial_consumed]);

    useEffect(() => {
        if (currentPlanId != null && selectedPlan === currentPlanId) {
            setSelectedPlan(null);
        }
    }, [currentPlanId, selectedPlan]);

    useEffect(() => {
        if (!selectedPlan || !freeTrialConsumed) return;
        const p = plans.find((x) => x.id === selectedPlan);
        if (p && isFreeTrialPlan(p)) {
            setSelectedPlan(null);
        }
    }, [freeTrialConsumed, selectedPlan, plans]);

    useEffect(() => {
        if (!selectedPlan || !subscriptionId) {
            setPreview(null);
            return;
        }
        let cancelled = false;
        const run = async () => {
            setPreviewLoading(true);
            try {
                const data = await previewSubscriptionChangeAPI(selectedPlan, billingCycle);
                if (!cancelled) {
                    setPreview({
                        intent: data.intent,
                        amount_usd: data.amount_usd,
                        days_remaining_in_period: data.days_remaining_in_period,
                    });
                }
            } catch (e: any) {
                if (!cancelled) {
                    setPreview({ error: e?.message || 'Preview unavailable' });
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [selectedPlan, billingCycle, subscriptionId]);

    const getPlanPriceLabel = (plan: PublicPlan) => {
        const price = billingCycle === 'monthly' ? Number(plan.price_monthly || 0) : Number(plan.price_yearly || 0);
        if (price === 0) {
            return t('free') || 'Free';
        }
        const formattedPrice = new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
        return `${formattedPrice}/${billingCycle === 'monthly' ? t('month') || 'month' : t('year') || 'year'}`;
    };

    const handleChangePlan = async () => {
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

        const selectedPlanObj = plans.find((p) => p.id === selectedPlan);
        if (selectedPlanObj && freeTrialConsumed && isFreeTrialPlan(selectedPlanObj)) {
            alert(t('trialUnavailable') || 'Trial already used');
            return;
        }

        if (!subscriptionId) {
            alert(t('paymentSubscriptionIdRequired') || 'Subscription ID is required');
            return;
        }

        if (preview?.error) {
            const errLow = preview.error.toLowerCase();
            if (errLow.includes('downgrade') || errLow.includes('schedule')) {
                try {
                    setIsProcessing(true);
                    await scheduleSubscriptionDowngradeAPI(selectedPlan, billingCycle);
                    alert(
                        language === 'ar'
                            ? 'تم جدولة التخفيض لنهاية فترة الفوترة الحالية.'
                            : 'Downgrade scheduled for the end of your current billing period.'
                    );
                } catch (e: any) {
                    alert(e?.message || 'Error');
                } finally {
                    setIsProcessing(false);
                }
                return;
            }
            alert(preview.error);
            return;
        }

        if (!selectedGateway) {
            alert(t('paymentGatewayRequired') || 'Please select a payment method');
            return;
        }

        try {
            setIsProcessing(true);
            const response: CreatePaymentSessionResult = await createPaymentSessionAPI(
                parseInt(subscriptionId),
                selectedGateway,
                selectedPlan,
                billingCycle
            );
            if (response.redirect_url) {
                window.location.href = response.redirect_url;
            } else {
                alert(t('paymentRedirectError') || 'Failed to get payment URL');
            }
        } catch (error: any) {
            console.error('Error changing plan:', error);
            // Show user-friendly error message
            const errorMessage = error?.message || t('errorLoadingPaymentLink') || 'Error loading payment link';
            
            // If error mentions "already active", explain that plan change is still possible
            if (errorMessage.toLowerCase().includes('already active')) {
                alert(t('subscriptionActiveButCanUpgrade') || 'Your subscription is active. You can still upgrade or downgrade your plan. Please try again or contact support.');
            } else {
                alert(errorMessage);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const isRTL = language === 'ar';

    return (
        <PageWrapper title={t('changePlan') || 'Change Plan'}>
            <div className="max-w-6xl mx-auto space-y-6">
                <Card>
                    <h2 className="text-2xl font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                        {t('changePlan') || 'Change Plan'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {t('changePlanDescription') || 'Select a new plan for your subscription'}
                    </p>

                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center mb-6">
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

                    {selectedPlan && subscriptionId && (
                        <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                            {previewLoading && <span className="text-gray-500">{t('loading') || 'Loading…'}</span>}
                            {!previewLoading && preview?.error && (
                                <p className="text-amber-700 dark:text-amber-300">{preview.error}</p>
                            )}
                            {!previewLoading && !preview?.error && preview?.amount_usd != null && (
                                <div className="space-y-1">
                                    <p>
                                        <strong>{t('estimatedDue') || 'Estimated due now'}:</strong>{' '}
                                        {new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
                                            style: 'currency',
                                            currency: 'USD',
                                        }).format(Number(preview.amount_usd))}{' '}
                                        ({preview.intent})
                                    </p>
                                    {typeof preview.days_remaining_in_period === 'number' && (
                                        <p className="text-gray-600 dark:text-gray-400">
                                            {t('daysLeftInPeriod') || 'Days left in current period'}:{' '}
                                            {preview.days_remaining_in_period}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Plans List */}
                    {plansLoading && (
                        <div className="flex justify-center py-8">
                            <Loader variant="primary" className="h-12" />
                        </div>
                    )}

                    {plansError && !plansLoading && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-4 py-3 rounded-md">
                            {plansError}
                        </div>
                    )}

                    {!plansLoading && !plansError && plans.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('noPlansAvailable') || 'No plans available'}
                        </div>
                    )}

                    {!plansLoading && !plansError && plans.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {plans.map((plan) => {
                                const isCurrentPlan =
                                    currentPlanId != null && plan.id === currentPlanId;
                                const trialLocked = freeTrialConsumed && isFreeTrialPlan(plan);
                                const isLocked = isCurrentPlan || trialLocked;
                                const displayName =
                                    language === 'ar' && plan.name_ar && plan.name_ar.trim()
                                        ? plan.name_ar
                                        : plan.name;
                                const explicitDesc =
                                    language === 'ar' && plan.description_ar && plan.description_ar.trim()
                                        ? plan.description_ar.trim()
                                        : (plan.description?.trim() || '');
                                const resolvedDesc =
                                    explicitDesc || (t('planDefaultDescription') || 'All CRM essentials included.');
                                const showPlanDescription = !isRedundantPlanDescription(displayName, resolvedDesc);
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
                                    className={`p-6 border-2 rounded-lg transition-all ${
                                        isLocked
                                            ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 opacity-75 cursor-not-allowed'
                                            : `cursor-pointer ${
                                                  selectedPlan === plan.id
                                                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                              }`
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold">
                                            {displayName}
                                        </h3>
                                        {isCurrentPlan && (
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
                                                {t('currentPlan') || 'Current plan'}
                                            </span>
                                        )}
                                        {trialLocked && !isCurrentPlan && (
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-900/30 text-amber-200 border border-amber-700/50">
                                                {t('trialUnavailable') || 'Trial already used'}
                                            </span>
                                        )}
                                        {!isLocked && selectedPlan === plan.id && (
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {showPlanDescription && (
                                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                            {resolvedDesc}
                                        </p>
                                    )}
                                    <div className="text-2xl font-bold text-primary mb-4">
                                        {getPlanPriceLabel(plan)}
                                    </div>
                                    <PlanEntitlementsSummary
                                        users={plan.users}
                                        clients={plan.clients}
                                        extra_limits={plan.limits}
                                        features={plan.features}
                                        language={language === 'ar' ? 'ar' : 'en'}
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

                    {/* Payment Gateway Selection */}
                    <div className="mb-6">
                        <PaymentGatewaySelector
                            selectedGateway={selectedGateway}
                            onSelect={setSelectedGateway}
                        />
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = '/login'}
                        >
                            {t('cancel') || 'Cancel'}
                        </Button>
                        <Button
                            onClick={handleChangePlan}
                            loading={isProcessing}
                            disabled={
                                !selectedPlan ||
                                !selectedGateway ||
                                isProcessing ||
                                !subscriptionId ||
                                (currentPlanId != null && selectedPlan === currentPlanId) ||
                                (() => {
                                    const sp = plans.find((p) => p.id === selectedPlan);
                                    return !!(sp && freeTrialConsumed && isFreeTrialPlan(sp));
                                })()
                            }
                            className="min-w-[150px]"
                        >
                            {isProcessing ? (t('loadingPaymentLink') || 'Loading...') : (t('changePlan') || 'Change Plan')}
                        </Button>
                    </div>
                </Card>
            </div>
        </PageWrapper>
    );
};

