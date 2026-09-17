/**
 * Tab-scoped registration wizard draft (survives refresh, cleared on tab close).
 */

const STORAGE_KEY = 'crm:registrationDraft';
const TTL_MS = 24 * 60 * 60 * 1000;

export type RegistrationSpecialization = 'real_estate' | 'services' | 'products' | 'medical';

export type RegistrationDraft = {
    currentStep: number;
    companyName: string;
    companyDomain: string;
    specialization: RegistrationSpecialization;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    phone: string;
    password: string;
    confirmPassword: string;
    billingCycle: 'monthly' | 'yearly';
    selectedPlan: number | null;
    trialCodeInput: string;
    phoneOtpRequired?: boolean;
    emailVerificationRequired?: boolean;
    savedAt: number;
};

export type RegistrationDraftInput = Omit<RegistrationDraft, 'savedAt'>;

export type RegistrationDraftBootstrap = {
    companyName: string;
    companyDomain: string;
    specialization: RegistrationSpecialization;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    phone: string;
    password: string;
    confirmPassword: string;
    billingCycle: 'monthly' | 'yearly';
    selectedPlan: number | null;
    trialCodeInput: string;
    currentStep: number;
    phoneOtpRequired: boolean;
    emailVerificationRequired: boolean;
};

const DEFAULT_BOOTSTRAP: RegistrationDraftBootstrap = {
    companyName: '',
    companyDomain: '',
    specialization: 'real_estate',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    billingCycle: 'monthly',
    selectedPlan: null,
    trialCodeInput: '',
    currentStep: 1,
    phoneOtpRequired: false,
    emailVerificationRequired: false,
};

let draftCache: RegistrationDraft | null | undefined;

/** Read the draft once per page load (sync) for first-paint bootstrap. */
export function peekRegistrationDraft(): RegistrationDraft | null {
    if (draftCache === undefined) {
        draftCache = loadRegistrationDraft();
    }
    return draftCache;
}

export function bootstrapRegistrationDraft(): RegistrationDraftBootstrap {
    const draft = peekRegistrationDraft();
    if (!draft) return { ...DEFAULT_BOOTSTRAP };

    const phoneOtpRequired = draft.phoneOtpRequired ?? false;
    const emailVerificationRequired = draft.emailVerificationRequired ?? false;
    const anyOtp = phoneOtpRequired || emailVerificationRequired;

    return {
        companyName: draft.companyName,
        companyDomain: draft.companyDomain,
        specialization: draft.specialization,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        username: draft.username,
        phone: draft.phone,
        password: draft.password,
        confirmPassword: draft.confirmPassword,
        billingCycle: draft.billingCycle,
        selectedPlan: draft.selectedPlan,
        trialCodeInput: draft.trialCodeInput,
        currentStep: clampRestoredRegistrationStep(draft.currentStep, anyOtp),
        phoneOtpRequired,
        emailVerificationRequired,
    };
}

/**
 * Restore wizard step after refresh.
 * - No OTP: steps 1–3 (plan is step 3).
 * - With OTP: steps 1–2 only; OTP tokens are not persisted so step 3+ falls back to owner.
 */
export function clampRestoredRegistrationStep(step: number, anyOtpRequired: boolean): number {
    if (!Number.isFinite(step) || step < 1) return 1;
    const normalized = Math.floor(step);
    if (!anyOtpRequired) {
        return Math.min(normalized, 3);
    }
    if (normalized <= 2) return normalized;
    return 2;
}

export function loadRegistrationDraft(): RegistrationDraft | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as RegistrationDraft;
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function saveRegistrationDraft(draft: RegistrationDraftInput): void {
    if (typeof window === 'undefined') return;
    try {
        const payload: RegistrationDraft = {
            ...draft,
            savedAt: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        draftCache = payload;
    } catch {
        /* ignore quota / private mode */
    }
}

export function clearRegistrationDraft(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        draftCache = null;
    } catch {
        /* ignore */
    }
}
