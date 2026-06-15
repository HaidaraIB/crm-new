/**
 * API Service
 *
 * العقد: Base URL يُفضَّل أن ينتهي بـ `/api/v1` (مثال: https://host/api/v1).
 * مفتاح الويب: `VITE_API_KEY_WEB` (يطابق `API_KEY_WEB` في السيرفر)، مع توافق خلفي مع `VITE_API_KEY`.
 */

import { notifyMaintenanceMode } from '../utils/maintenanceMode';
import type { LeadApiFilters } from '../types';

function normalizeApiBaseUrl(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function alignLocalApiHost(rawBaseUrl: string): string {
  if (!rawBaseUrl || typeof window === 'undefined') return rawBaseUrl;
  try {
    const parsed = new URL(rawBaseUrl);
    const apiHost = parsed.hostname;
    const appHost = window.location.hostname;
    const isLocalApi = apiHost === '127.0.0.1' || apiHost === 'localhost';
    const isLocalApp = appHost === '127.0.0.1' || appHost === 'localhost';
    if (isLocalApi && isLocalApp && apiHost !== appHost) {
      parsed.hostname = appHost;
      return parsed.toString().replace(/\/+$/, '');
    }
  } catch {
    // Keep original base URL if parsing fails.
  }
  return rawBaseUrl;
}

export const BASE_URL = alignLocalApiHost(normalizeApiBaseUrl(import.meta.env.VITE_API_URL || ''));
/** يُرسل كـ X-API-Key — يجب أن يطابق قيمة API_KEY_WEB في الـ backend */
const API_KEY =
  import.meta.env.VITE_API_KEY_WEB || import.meta.env.VITE_API_KEY || '';

// متغير لتتبع عملية refresh token الجارية لتجنب استدعاءات متعددة
let refreshTokenPromise: Promise<void> | null = null;

/**
 * Helper function to add API Key to headers
 */
function getHeadersWithApiKey(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

export type MaintenanceStatus = {
  maintenance_mode: boolean;
  message: string;
};

/** Public maintenance policy (no JWT). Used before app shell loads. */
export async function fetchMaintenanceStatusAPI(): Promise<MaintenanceStatus> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  if (uiLanguage === 'ar' || uiLanguage === 'en') {
    headers['X-Language'] = uiLanguage;
  }
  const response = await fetch(`${BASE_URL}/public/maintenance-status/`, { headers });
  const raw = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(getApiErrorMessage(raw, `HTTP ${response.status}`));
  }
  return unwrapApiSuccess<MaintenanceStatus>(raw);
}

/** Same auth headers as `apiRequest` for binary GETs (e.g. tenant chat attachment). */
export function getAuthenticatedBinaryRequestHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  if (uiLanguage === 'ar' || uiLanguage === 'en') {
    headers['X-Language'] = uiLanguage;
  }
  return headers;
}

// --- Unified envelope (CRM-api EnvelopeJSONRenderer + success_response / exception handler) ---

/**
 * Strip `{ success: true, data }` from API JSON; pass through legacy non-enveloped bodies.
 */
export function unwrapApiSuccess<T = unknown>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'success' in body && (body as { success: unknown }).success === true) {
    const o = body as { success: true; data?: T; message?: string; [key: string]: unknown };
    if ('data' in o) {
      return o.data as T;
    }
    const { success: _ignored, ...rest } = o;
    return rest as unknown as T;
  }
  return body as T;
}

function getErrorMessageFromBody(errorData: unknown): string {
  if (errorData == null || typeof errorData !== 'object') {
    return '';
  }
  const d = errorData as Record<string, unknown>;
  if (d.success === false && d.error && typeof d.error === 'object') {
    const e = d.error as Record<string, unknown>;
    if (e.message != null) return String(e.message);
    if (e.code != null) return String(e.code);
    return '';
  }
  if (d.detail != null) return String(d.detail);
  if (typeof d.message === 'string') return d.message;
  if (typeof d.error === 'string') return d.error;
  return '';
}

function getErrorCodeFromBody(errorData: unknown): string | undefined {
  if (errorData == null || typeof errorData !== 'object') return undefined;
  const d = errorData as Record<string, unknown>;
  if (d.success === false && d.error && typeof d.error === 'object') {
    const c = (d.error as Record<string, unknown>).code;
    return c != null ? String(c) : undefined;
  }
  if (typeof d.error_key === 'string') return d.error_key;
  if (typeof d.code === 'string') return d.code;
  return undefined;
}

function getErrorDetailsFromBody(errorData: unknown): unknown {
  if (errorData == null || typeof errorData !== 'object') return undefined;
  const d = errorData as Record<string, unknown>;
  if (d.success === false && d.error && typeof d.error === 'object') {
    return (d.error as Record<string, unknown>).details;
  }
  return undefined;
}

/** User-facing / logging message from any API error JSON shape */
export function getApiErrorMessage(errorData: unknown, fallback = ''): string {
  return getErrorMessageFromBody(errorData) || fallback;
}

/** رمز الخطأ من الحمولة الموحّدة أو الحقول القديمة */
export function getApiErrorCode(errorData: unknown): string | undefined {
  return getErrorCodeFromBody(errorData);
}

/** تفاصيل التحقق (حقول) من `error.details` */
export function getApiErrorDetails(errorData: unknown): unknown {
  return getErrorDetailsFromBody(errorData);
}

function attachErrorFields(
  err: Error & { fields?: Record<string, unknown> },
  errorData: unknown
): void {
  const details = getErrorDetailsFromBody(errorData);
  if (details != null && typeof details === 'object' && !Array.isArray(details)) {
    err.fields = details as Record<string, unknown>;
    return;
  }
  if (errorData != null && typeof errorData === 'object') {
    const d = errorData as Record<string, unknown>;
    const fieldErrors: Record<string, unknown> = {};
    for (const key of Object.keys(d)) {
      if (!['detail', 'message', 'error', 'error_key', 'success'].includes(key)) {
        fieldErrors[key] = d[key];
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      err.fields = fieldErrors;
    }
  }
}

export type LoginVerificationAction = {
  id?: string;
  label?: string;
  href?: string;
  description?: string;
};

function throwApiError(errorData: unknown, fallbackMessage: string): never {
  const message = getErrorMessageFromBody(errorData) || fallbackMessage;
  const err: Error & {
    data?: unknown;
    code?: string;
    fields?: Record<string, unknown>;
    subscriptionId?: string;
    hint?: string;
    actions?: LoginVerificationAction[];
    changeCredentialsNote?: string;
    verifyEmailUrl?: string;
    verifyPhoneUrl?: string;
  } = new Error(message);
  err.data = errorData;
  const code = getErrorCodeFromBody(errorData);
  if (code) err.code = code;
  attachErrorFields(err, errorData);
  const raw = errorData as Record<string, unknown> | null;
  const sid = raw && (raw.subscriptionId ?? raw.subscription_id);
  if (sid != null) err.subscriptionId = String(sid);
  if (raw && raw.success === false && raw.error && typeof raw.error === 'object') {
    const er = raw.error as Record<string, unknown>;
    if (typeof er.hint === 'string') err.hint = er.hint;
    if (Array.isArray(er.actions)) err.actions = er.actions as LoginVerificationAction[];
    if (typeof er.change_credentials_note === 'string') err.changeCredentialsNote = er.change_credentials_note;
    if (typeof er.verify_email_url === 'string') err.verifyEmailUrl = er.verify_email_url;
    if (typeof er.verify_phone_url === 'string') err.verifyPhoneUrl = er.verify_phone_url;
  }
  throw err;
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Returns true if `v` should actually be forwarded to the backend as a filter.
 * Drops undefined/null/empty strings and the UI "All"/"NaN" sentinels so they
 * never reach integer/ForeignKey lookups (which would otherwise 500).
 */
const isMeaningfulFilterValue = (v: unknown): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'number' && Number.isNaN(v)) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (s === 'All' || s === 'NaN') return false;
  return true;
};

async function parseSuccessJsonResponse<T>(response: Response): Promise<T> {
  const raw = await readJsonResponse(response);
  return unwrapApiSuccess<T>(raw);
}

/**
 * Helper function to make API requests
 * يستخدم JWT Bearer token للـ authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T> {
  const token = localStorage.getItem('accessToken'); // JWT access token
  
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...Object.fromEntries(
      Object.entries(options.headers || {}).map(([k, v]) => [k, String(v)])
    ),
  };

  // Add API Key to all requests for application authentication
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  // Send current UI language so backend can use it for emails and responses
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  if (uiLanguage === 'ar' || uiLanguage === 'en') {
    headers['X-Language'] = uiLanguage;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 401: مفتاح API مفقود/غير صالح — لا نحاول refresh JWT (لن يُصلح المفتاح)
  if (response.status === 401 && retryOn401) {
    const errorData401 = await readJsonResponse(response);
    const keyCode = getErrorCodeFromBody(errorData401);
    if (keyCode === 'missing_api_key' || keyCode === 'invalid_api_key') {
      const err: Error & { code?: string; data?: unknown } = new Error(
        getApiErrorMessage(errorData401, 'Invalid or missing API key (X-API-Key / VITE_API_KEY_WEB).')
      );
      err.code = keyCode;
      err.data = errorData401;
      throw err;
    }
    try {
      if (refreshTokenPromise) {
        await refreshTokenPromise;
      } else {
        refreshTokenPromise = refreshTokenAPI().then(() => {
          refreshTokenPromise = null;
        }).catch((error) => {
          refreshTokenPromise = null;
          throw error;
        });
        await refreshTokenPromise;
      }
      return apiRequest<T>(endpoint, options, false);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const loginUrl = `${protocol}//${hostname}${port}/login`;
      window.location.replace(loginUrl);
      throw new Error('Session expired. Please login again.');
    }
  }

  // إذا كان الخطأ 403 (Forbidden)، قد يكون بسبب عدم وجود اشتراك نشط
  // لكن لا نتحقق من ذلك في endpoint /users/me/ لأنه يستخدم للتحقق من حالة الاشتراك
  if (response.status === 403 && !endpoint.includes('/users/me/')) {
    const errorData = await readJsonResponse(response);
    const errorMessage = getApiErrorMessage(errorData, '');
    
    // إذا كان الخطأ متعلق بعدم وجود اشتراك نشط، قم بتسجيل الخروج تلقائياً
    if (errorMessage.toLowerCase().includes('subscription') || 
        errorMessage.toLowerCase().includes('اشتراك') ||
        errorMessage.toLowerCase().includes('active') ||
        errorMessage.toLowerCase().includes('not active')) {
      // احفظ subscription ID من localStorage إذا كان موجوداً
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        try {
          const currentUser = JSON.parse(currentUserStr);
          // محاولة الحصول على subscription ID من بيانات المستخدم المحفوظة
          // أو من localStorage إذا كان موجوداً
          const pendingSubscriptionId = localStorage.getItem('pendingSubscriptionId');
          if (!pendingSubscriptionId) {
            // محاولة الحصول على subscription ID من API (إذا كان متاحاً)
            try {
              const userData = await getCurrentUserAPI().catch(() => null);
              if (userData?.company?.subscription?.id) {
                localStorage.setItem('pendingSubscriptionId', userData.company.subscription.id.toString());
              }
            } catch (e) {
              // تجاهل الأخطاء في محاولة الحصول على بيانات المستخدم
            }
          }
        } catch (e) {
          // تجاهل الأخطاء في parsing
        }
      }
      
      // قم بتسجيل الخروج
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
      
      // رمي خطأ خاص يمكن التعرف عليه
      const subscriptionError: any = new Error('SUBSCRIPTION_INACTIVE');
      subscriptionError.code = 'SUBSCRIPTION_INACTIVE';
      subscriptionError.subscriptionId = localStorage.getItem('pendingSubscriptionId');
      throw subscriptionError;
    }
  }

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    const code = getErrorCodeFromBody(errorData);
    if (response.status === 503 && code === 'maintenance_mode') {
      const maintenanceMessage = getApiErrorMessage(
        errorData,
        'The system is under maintenance. Please try again later.',
      );
      notifyMaintenanceMode(maintenanceMessage);
      const maintenanceError: Error & { code?: string } = new Error(maintenanceMessage);
      maintenanceError.code = 'maintenance_mode';
      throw maintenanceError;
    }
    const errorMessage =
      getApiErrorMessage(errorData, '') ||
      (typeof errorData === 'object' && errorData !== null
        ? JSON.stringify(errorData)
        : '') ||
      `API Error: ${response.status} ${response.statusText}`;
    console.error('API Error:', response.status, errorData);

    const error: any = new Error(errorMessage);
    if (errorData && typeof errorData === 'object') {
      error.data = errorData;
      if (code) error.code = code;
      attachErrorFields(error, errorData);
    }
    throw error;
  }

  // 204 No Content — لا يوجد جسم JSON (مثلاً حذف نسخ احتياطي)
  if (response.status === 204) {
    return undefined as T;
  }

  // معالجة DELETE requests - قد لا تعيد response body
  if (options.method === 'DELETE') {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    // إذا كان response فارغ أو ليس JSON، أرجع undefined
    if (!text || (contentType && !contentType.includes('application/json'))) {
      return undefined as T;
    }
    
    // إذا كان response JSON، parseه
    try {
      return unwrapApiSuccess<T>(JSON.parse(text));
    } catch {
      return undefined as T;
    }
  }

  // للـ requests الأخرى، parse JSON بشكل عادي
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  
  try {
    return unwrapApiSuccess<T>(JSON.parse(text));
  } catch {
    return undefined as T;
  }
}

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.results) && 'next' in obj && 'previous' in obj && 'count' in obj;
}

function toRelativeApiEndpoint(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('/')) return urlOrPath;
  if (!BASE_URL) return null;
  if (urlOrPath.startsWith(BASE_URL)) {
    const rel = urlOrPath.slice(BASE_URL.length);
    return rel.startsWith('/') ? rel : `/${rel}`;
  }
  return null;
}

/** Matches backend DRF default cap (DRF_MAX_PAGE_SIZE); fewer HTTP round-trips per full sync. */
const DEFAULT_FULL_FETCH_PAGE_SIZE = 100;

function withPageSizeQuery(endpoint: string, pageSize: number): string {
  if (/[?&]page_size=/.test(endpoint)) return endpoint;
  const joiner = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${joiner}page_size=${pageSize}`;
}

async function fetchAllPaginatedPages<T>(initialEndpoint: string): Promise<PaginatedResponse<T>> {
  let endpoint: string | null = withPageSizeQuery(
    initialEndpoint,
    DEFAULT_FULL_FETCH_PAGE_SIZE,
  );
  let count = 0;
  const results: T[] = [];
  let previous: string | null = null;
  let safetyCounter = 0;

  while (endpoint && safetyCounter < 200) {
    safetyCounter += 1;
    const pageData = await apiRequest<unknown>(endpoint);
    if (!isPaginatedResponse<T>(pageData)) {
      break;
    }

    count = pageData.count ?? count;
    previous = previous ?? pageData.previous;
    results.push(...(pageData.results || []));
    endpoint = pageData.next ? toRelativeApiEndpoint(pageData.next) : null;
  }

  return {
    count: Math.max(count, results.length),
    next: null,
    previous,
    results,
  };
}

// ==================== Authentication APIs ====================

/**
 * تسجيل الدخول - يعيد JWT token + بيانات المستخدم
 * POST /api/auth/login/
 * Body: { username: string, password: string }
 * Response: { access: string, refresh: string, user: { id, username, email, first_name, last_name, role, company, company_name } }
 */
export const loginAPI = async (username: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Invalid username or password');
  }

  const data = await parseSuccessJsonResponse<{
    access?: string;
    refresh?: string;
    requires_two_factor?: boolean;
    token?: string;
    message?: string;
    sent?: boolean;
    user?: unknown;
    [key: string]: unknown;
  }>(response);
  if (data.access) {
    localStorage.setItem('accessToken', data.access);
  }
  if (data.refresh) {
    localStorage.setItem('refreshToken', data.refresh);
  }

  return data;
};

/** Unwrapped success body for POST `/auth/register/` */
export interface RegisterCompanyResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    first_name?: string;
    last_name?: string;
    username: string;
    email: string;
    phone?: string;
    language?: string;
  };
  company: {
    id: number;
    name: string;
    domain?: string;
    specialization: 'real_estate' | 'services' | 'products' | string;
  };
  subscription?: { id: number };
  subscription_id?: number;
  requires_payment?: boolean | string;
  requiresPayment?: boolean | string;
}

/**
 * تسجيل شركة جديدة مع المالك
 * POST /api/auth/register/
 * Body: { company: { name, domain, specialization }, owner: { first_name, last_name, email, username, password }, plan_id?, billing_cycle? }
 * Response: { access, refresh, user, company, subscription? }
 */
export type RegistrationPhoneOtpChannel = 'whatsapp' | 'twilio_sms';
export type RegistrationEmailRequirement = { email_verification_required: boolean };

export const registerPhoneSendOtpAPI = async (phone: string, language: string = 'en') => {
  const response = await fetch(`${BASE_URL}/auth/register/phone/send-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to send verification code');
  }
  return parseSuccessJsonResponse<{
    expires_in_seconds: number;
    phone: string;
    channel?: RegistrationPhoneOtpChannel;
  }>(response);
};

export const getPhoneOtpRequirementAPI = async (): Promise<{
  phone_otp_required: boolean;
  phone_otp_channel: RegistrationPhoneOtpChannel | null;
}> => {
  const response = await fetch(`${BASE_URL}/auth/register/phone-otp-requirement/`, {
    method: 'GET',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to load registration phone verification requirement');
  }
  return parseSuccessJsonResponse<{
    phone_otp_required: boolean;
    phone_otp_channel: RegistrationPhoneOtpChannel | null;
  }>(response);
};

export const getRegistrationEmailRequirementAPI = async (): Promise<RegistrationEmailRequirement> => {
  const response = await fetch(`${BASE_URL}/auth/register/email-verification-requirement/`, {
    method: 'GET',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to load registration email verification requirement');
  }
  return parseSuccessJsonResponse<RegistrationEmailRequirement>(response);
};

export const registerEmailSendOtpAPI = async (email: string, language: string = 'en') => {
  const response = await fetch(`${BASE_URL}/auth/register/email/send-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to send email verification code');
  }
  return parseSuccessJsonResponse<{ expires_in_seconds: number; email: string }>(response);
};

export const registerEmailVerifyOtpAPI = async (email: string, code: string, language: string = 'en') => {
  const response = await fetch(`${BASE_URL}/auth/register/email/verify-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Email verification failed');
  }
  return parseSuccessJsonResponse<{ email_verification_token: string; expires_in_seconds: number }>(response);
};

export const registerPhoneVerifyOtpAPI = async (
  phone: string,
  code: string,
  language: string = 'en'
) => {
  const response = await fetch(`${BASE_URL}/auth/register/phone/verify-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Verification failed');
  }
  return parseSuccessJsonResponse<{ phone_verification_token: string; expires_in_seconds: number }>(
    response
  );
};

export const registerCompanyAPI = async (data: {
  company: {
    name: string;
    domain: string;
    specialization: 'real_estate' | 'services' | 'products' | 'medical';
  };
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
  };
  phone_verification_token?: string;
  email_verification_token?: string;
  plan_id?: number | null;
  billing_cycle?: 'monthly' | 'yearly';
}, language: string = 'en'): Promise<RegisterCompanyResponse> => {
  const response = await fetch(`${BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    const msg = getApiErrorMessage(errorData, 'Registration failed');
    const error: any = new Error(msg);
    if (errorData && typeof errorData === 'object') {
      error.data = errorData;
      const code = getErrorCodeFromBody(errorData);
      if (code) error.code = code;
      attachErrorFields(error, errorData);
    }
    throw error;
  }

  const responseData = await parseSuccessJsonResponse<RegisterCompanyResponse>(response);

  if (responseData.access) {
    localStorage.setItem('accessToken', responseData.access);
  }
  if (responseData.refresh) {
    localStorage.setItem('refreshToken', responseData.refresh);
  }

  return responseData;
};

/** Unwrapped body from create-*-session payment endpoints (redirect URL and/or gateway-specific fields). */
export interface CreatePaymentSessionResult {
  redirect_url?: string;
  /** Gateway-specific (numeric id or string ref, e.g. FIB) */
  payment_id?: string | number;
  tran_ref?: string;
  transaction_id?: string;
  session_id?: string;
  qr_code?: string;
  readable_code?: string;
  personal_app_link?: string;
  business_app_link?: string;
  corporate_app_link?: string;
  valid_until?: string;
  subscription_active?: boolean;
  payment_status?: string;
}

/**
 * إنشاء جلسة دفع Paytabs
 * POST /api/payments/create-paytabs-session/
 * Body: { subscription_id: number, plan_id?: number }
 * Response: { payment_id: number, redirect_url: string, tran_ref: string }
 */
export const createPaytabsPaymentSessionAPI = async (
  subscriptionId: number, 
  planId?: number, 
  billingCycle?: 'monthly' | 'yearly'
) => {
  // Use direct fetch instead of apiRequest to avoid token requirement
  const token = localStorage.getItem('accessToken');
  const body: any = { subscription_id: subscriptionId };
  if (planId) {
    body.plan_id = planId;
  }
  if (billingCycle) {
    body.billing_cycle = billingCycle;
  }
  const response = await fetch(`${BASE_URL}/payments/create-paytabs-session/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to create payment session');
  }

  return parseSuccessJsonResponse<CreatePaymentSessionResult>(response);
};


/**
 * Handle Paytabs return URL - verify payment after user returns from Paytabs
 * POST /api/payments/paytabs-return/
 * Body: { tran_ref?: string, subscription_id?: number }
 */
export const paytabsReturnAPI = async (tranRef?: string, subscriptionId?: number) => {
  const response = await fetch(`${BASE_URL}/payments/paytabs-return/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ 
      ...(tranRef && { tran_ref: tranRef }),
      ...(subscriptionId && { subscription_id: subscriptionId })
    }),
  });

  const raw = await readJsonResponse(response);
  const data: any = unwrapApiSuccess(raw ?? {});

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Failed to verify payment return'));
    error.status = response.status;
    error.data = raw;
    throw error;
  }

  if (data.status === 'error' || data.status === 'failed' || (data.payment_status && data.payment_status !== 'A')) {
    const error: any = new Error(
      data?.message || (typeof data?.error === 'string' ? data.error : '') || 'Payment verification failed'
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};


/**
 * إنشاء جلسة دفع Zain Cash
 * POST /api/payments/create-zaincash-session/
 * Body: { subscription_id: number, plan_id?: number }
 * Response: { payment_id: number, redirect_url: string, transaction_id: string }
 */
export const createZaincashPaymentSessionAPI = async (
  subscriptionId: number, 
  planId?: number, 
  billingCycle?: 'monthly' | 'yearly'
) => {
  // Use direct fetch instead of apiRequest to avoid token requirement
  const token = localStorage.getItem('accessToken');
  const body: any = { subscription_id: subscriptionId };
  if (planId) {
    body.plan_id = planId;
  }
  if (billingCycle) {
    body.billing_cycle = billingCycle;
  }
  const response = await fetch(`${BASE_URL}/payments/create-zaincash-session/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to create payment session');
  }

  return parseSuccessJsonResponse<CreatePaymentSessionResult>(response);
};


/**
 * Handle Zain Cash return URL - verify payment after user returns from Zain Cash
 * POST /api/payments/zaincash-return/
 * Body: { token?: string, subscription_id?: number }
 */
export const zaincashReturnAPI = async (token?: string, subscriptionId?: number) => {
  const response = await fetch(`${BASE_URL}/payments/zaincash-return/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ 
      ...(token && { token: token }),
      ...(subscriptionId && { subscription_id: subscriptionId })
    }),
  });

  const raw = await readJsonResponse(response);
  const data: any = unwrapApiSuccess(raw ?? {});

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Failed to verify payment return'));
    error.status = response.status;
    error.data = raw;
    throw error;
  }

  if (data.status === 'error' || data.status === 'failed') {
    const error: any = new Error(
      data?.message || (typeof data?.error === 'string' ? data.error : '') || 'Payment verification failed'
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};


/**
 * إنشاء جلسة دفع Stripe
 * POST /api/payments/create-stripe-session/
 * Body: { subscription_id: number, plan_id?: number }
 * Response: { payment_id: number, redirect_url: string, session_id: string }
 */
export const createStripePaymentSessionAPI = async (
  subscriptionId: number, 
  planId?: number, 
  billingCycle?: 'monthly' | 'yearly'
) => {
  // Use direct fetch instead of apiRequest to avoid token requirement
  const token = localStorage.getItem('accessToken');
  const body: any = { subscription_id: subscriptionId };
  if (planId) {
    body.plan_id = planId;
  }
  if (billingCycle) {
    body.billing_cycle = billingCycle;
  }
  const response = await fetch(`${BASE_URL}/payments/create-stripe-session/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to create payment session');
  }

  return parseSuccessJsonResponse<CreatePaymentSessionResult>(response);
};


/**
 * Handle Stripe return URL - verify payment after user returns from Stripe
 * GET /api/payments/stripe-return/?session_id=xxx&subscription_id=xxx
 */
export const stripeReturnAPI = async (sessionId?: string, subscriptionId?: number) => {
  const params = new URLSearchParams();
  if (sessionId) {
    params.append('session_id', sessionId);
  }
  if (subscriptionId) {
    params.append('subscription_id', subscriptionId.toString());
  }
  
  const response = await fetch(`${BASE_URL}/payments/stripe-return/?${params.toString()}`, {
    method: 'GET',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
  });

  // Stripe return is a redirect, so we just return the response
  return response;
};


/**
 * إنشاء جلسة دفع QiCard
 * POST /api/payments/create-qicard-session/
 * Body: { subscription_id: number, plan_id?: number }
 * Response: { payment_id: number, redirect_url: string, payment_id: string }
 */
export const createQicardPaymentSessionAPI = async (
  subscriptionId: number, 
  planId?: number, 
  billingCycle?: 'monthly' | 'yearly'
) => {
  // Use direct fetch instead of apiRequest to avoid token requirement
  const token = localStorage.getItem('accessToken');
  const body: any = { subscription_id: subscriptionId };
  if (planId) {
    body.plan_id = planId;
  }
  if (billingCycle) {
    body.billing_cycle = billingCycle;
  }
  const response = await fetch(`${BASE_URL}/payments/create-qicard-session/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to create payment session');
  }

  return parseSuccessJsonResponse<CreatePaymentSessionResult>(response);
};


/**
 * Create FIB (First Iraqi Bank) payment session - returns QR code and app links, no redirect
 * POST /api/payments/create-fib-session/
 */
export const createFibPaymentSessionAPI = async (
  subscriptionId: number,
  planId?: number,
  billingCycle?: 'monthly' | 'yearly'
) => {
  const token = localStorage.getItem('accessToken');
  const body: any = { subscription_id: subscriptionId };
  if (planId) body.plan_id = planId;
  if (billingCycle) body.billing_cycle = billingCycle;
  const response = await fetch(`${BASE_URL}/payments/create-fib-session/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throwApiError(errorData, 'Failed to create FIB payment session');
  }
  return parseSuccessJsonResponse<CreatePaymentSessionResult>(response);
};


/**
 * Unified payment function that routes to the correct gateway based on gateway ID
 * @param subscriptionId - Subscription ID
 * @param gatewayId - Payment gateway ID
 * @param planId - Optional plan ID for plan changes
 * @param billingCycle - Optional billing cycle
 */
export const createPaymentSessionAPI = async (
  subscriptionId: number,
  gatewayId: number,
  planId?: number,
  billingCycle?: 'monthly' | 'yearly'
): Promise<CreatePaymentSessionResult> => {
  // Get gateway info to determine which API to call
  const gateways = await getPublicPaymentGatewaysAPI();
  const gateway = gateways.find((g: any) => g.id === gatewayId);
  
  if (!gateway) {
    throw new Error('Payment gateway not found');
  }

  const gatewayName = gateway.name.toLowerCase();
  
  if (gatewayName.includes('paytabs')) {
    return await createPaytabsPaymentSessionAPI(subscriptionId, planId, billingCycle);
  } else if (gatewayName.includes('zaincash') || gatewayName.includes('zain cash')) {
    return await createZaincashPaymentSessionAPI(subscriptionId, planId, billingCycle);
  } else if (gatewayName.includes('stripe')) {
    return await createStripePaymentSessionAPI(subscriptionId, planId, billingCycle);
  } else if (gatewayName.includes('qicard') || gatewayName.includes('qi card') || gatewayName.includes('qi-card')) {
    return await createQicardPaymentSessionAPI(subscriptionId, planId, billingCycle);
  } else if (gatewayName.includes('fib') || gatewayName.includes('first iraqi')) {
    return await createFibPaymentSessionAPI(subscriptionId, planId, billingCycle);
  } else {
    throw new Error(`Payment gateway "${gateway.name}" is not yet supported`);
  }
};


/** Polling payload for GET `/payment-status/{subscription_id}/` */
export interface CheckPaymentStatusResponse {
  subscription_id?: number;
  is_truly_active: boolean;
  end_date?: string | null;
  is_expiring_soon?: boolean;
  days_until_expiry?: number;
  /** Present on some responses (e.g. FIB / payment-complete polling) */
  subscription_active?: boolean;
  payment_status?: string;
  /** Gateway-specific status string from the backend (e.g. FIB: paid/unpaid/declined) */
  gateway_status?: string | null;
  paytabs_status?: string | null;
  payment_exists?: boolean;
}

/**
 * Check payment status by subscription_id - for polling
 * GET /api/payments/subscription/{subscription_id}/status/
 * Returns payment status and subscription status
 */
export const checkPaymentStatusAPI = async (
  subscriptionId: number
): Promise<CheckPaymentStatusResponse> => {
  const response = await fetch(`${BASE_URL}/payment-status/${subscriptionId}/`, {
    method: 'GET',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    throwApiError(raw, 'Failed to check payment status');
  }
  return unwrapApiSuccess<CheckPaymentStatusResponse>(raw);
};

/**
 * الحصول على جميع الخطط المتاحة علنياً للاشتراك
 * GET /api/public/plans/
 */
export const getPublicPlansAPI = async () => {
  return apiRequest<any[]>('/public/plans/', {
    method: 'GET',
  });
};

/**
 * Get available payment gateways (public endpoint)
 * GET /api/public/payment-gateways/
 */
export const getPublicPaymentGatewaysAPI = async () => {
  return apiRequest<any[]>('/public/payment-gateways/', {
    method: 'GET',
  });
};

/**
 * Switch subscription to a free/trial plan (no payment).
 * POST /api/subscriptions/switch-plan-free/
 * Body: { plan_id: number }
 */
export const switchSubscriptionPlanFreeAPI = async (planId: number) => {
  return apiRequest<any>('/subscriptions/switch-plan-free/', {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ plan_id: planId }),
  });
};

/** GET /api/subscriptions/preview-change/?plan_id=&billing_cycle= */
export const previewSubscriptionChangeAPI = async (
  planId: number,
  billingCycle?: 'monthly' | 'yearly'
) => {
  const params = new URLSearchParams({ plan_id: String(planId) });
  if (billingCycle) params.set('billing_cycle', billingCycle);
  return apiRequest<any>(`/subscriptions/preview-change/?${params.toString()}`, {
    method: 'GET',
    headers: getHeadersWithApiKey(),
  });
};

/** POST /api/subscriptions/schedule-downgrade/ */
export const scheduleSubscriptionDowngradeAPI = async (
  planId: number,
  pendingBillingCycle?: 'monthly' | 'yearly'
) => {
  const body: Record<string, unknown> = { plan_id: planId };
  if (pendingBillingCycle) body.pending_billing_cycle = pendingBillingCycle;
  return apiRequest<any>('/subscriptions/schedule-downgrade/', {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });
};

/**
 * التحقق من توفر البيانات أثناء التسجيل (بريد، اسم مستخدم، رقم هاتف، دومين)
 * POST /api/auth/check-availability/
 */
export const checkRegistrationAvailabilityAPI = async (payload: {
  company_domain?: string;
  email?: string;
  username?: string;
  phone?: string;
}) => {
  const response = await fetch(`${BASE_URL}/auth/check-availability/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Availability check failed'));
    const details = getErrorDetailsFromBody(raw);
    if (details && typeof details === 'object') {
      error.fields = details as Record<string, unknown>;
    } else if (raw && typeof raw === 'object' && (raw as any).errors) {
      error.fields = (raw as any).errors;
    }
    throw error;
  }

  return unwrapApiSuccess(raw);
};

/**
 * التحقق من البريد الإلكتروني عبر الرمز / الرابط
 * POST /api/auth/verify-email/
 */
export const verifyEmailAPI = async (payload: {
  email: string;
  code?: string;
  token?: string;
}) => {
  const response = await fetch(`${BASE_URL}/auth/verify-email/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Email verification failed'));
    error.data = raw;
    attachErrorFields(error, raw);
    throw error;
  }

  return unwrapApiSuccess(raw);
};

/** Pre-login (password + username): resend owner email verification — no JWT. */
export const preLoginEmailResendAPI = async (username: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/pre-login/email/resend/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  });
  const raw = await readJsonResponse(response);
  if (!response.ok) throwApiError(raw, 'Failed to resend verification email');
  return unwrapApiSuccess<{ sent?: boolean; expires_at?: string }>(raw);
};

/** Pre-login: change unverified email and send a new code — no JWT. */
export const preLoginEmailChangeAPI = async (username: string, password: string, new_email: string) => {
  const response = await fetch(`${BASE_URL}/auth/pre-login/email/change/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password, new_email }),
  });
  const raw = await readJsonResponse(response);
  if (!response.ok) throwApiError(raw, 'Failed to update email');
  return unwrapApiSuccess<{ expires_at?: string }>(raw);
};

/** Pre-login: send phone OTP to number on file — no JWT. */
export const preLoginPhoneSendOtpAPI = async (username: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/pre-login/phone/send-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  });
  const raw = await readJsonResponse(response);
  if (!response.ok) throwApiError(raw, 'Failed to send verification code');
  return unwrapApiSuccess<{ expires_in_seconds?: number; channel?: string }>(raw);
};

/** Pre-login: verify phone OTP — no JWT. */
export const preLoginPhoneVerifyOtpAPI = async (username: string, password: string, code: string) => {
  const response = await fetch(`${BASE_URL}/auth/pre-login/phone/verify-otp/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password, code }),
  });
  const raw = await readJsonResponse(response);
  if (!response.ok) throwApiError(raw, 'Verification failed');
  return unwrapApiSuccess<Record<string, unknown>>(raw);
};

/** Pre-login: change unverified phone — no JWT. */
export const preLoginPhoneChangeAPI = async (username: string, password: string, new_phone: string) => {
  const response = await fetch(`${BASE_URL}/auth/pre-login/phone/change/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password, new_phone }),
  });
  const raw = await readJsonResponse(response);
  if (!response.ok) throwApiError(raw, 'Failed to update phone');
  return unwrapApiSuccess<Record<string, unknown>>(raw);
};

/**
 * إعادة إرسال رمز التحقق من البريد الإلكتروني
 * POST /api/auth/resend-verification/
 * Body: { email: string }
 * Response: { message: string, sent: bool, expires_at?: string }
 */
export const resendVerificationCodeAPI = async (email: string) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${BASE_URL}/auth/resend-verification/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify({ email }),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Failed to resend verification code'));
    error.data = raw;
    attachErrorFields(error, raw);
    throw error;
  }

  return unwrapApiSuccess<{ message?: string; sent?: boolean; expires_at?: string }>(raw);
};

/**
 * تغيير البريد الإلكتروني (للمستخدمين غير المؤكدين)
 * POST /api/auth/change-email/
 * Body: { email: string, new_email: string }
 * Response: { message: string, sent: bool, expires_at?: string }
 */
export const changeEmailAPI = async (email: string, newEmail: string) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${BASE_URL}/auth/change-email/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    body: JSON.stringify({ email, new_email: newEmail }),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Failed to change email'));
    error.data = raw;
    attachErrorFields(error, raw);
    throw error;
  }

  return unwrapApiSuccess(raw);
};

/**
 * طلب إعادة تعيين كلمة المرور
 * POST /api/auth/forgot-password/
 * Body: { email: string }
 * Response: { message: string, sent: bool }
 */
export const forgotPasswordAPI = async (email: string, language: string = 'en') => {
  const response = await fetch(`${BASE_URL}/auth/forgot-password/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify({ email }),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Failed to send password reset email'));
    error.data = raw;
    attachErrorFields(error, raw);
    throw error;
  }

  return unwrapApiSuccess(raw);
};

/**
 * إعادة تعيين كلمة المرور
 * POST /api/auth/reset-password/
 * Body: { email: string, code?: string, token?: string, new_password: string, confirm_password: string }
 * Response: { message: string }
 */
export const resetPasswordAPI = async (payload: {
  email: string;
  code?: string;
  token?: string;
  new_password: string;
  confirm_password: string;
}) => {
  const response = await fetch(`${BASE_URL}/auth/reset-password/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    const error: any = new Error(getApiErrorMessage(raw, 'Password reset failed'));
    error.data = raw;
    attachErrorFields(error, raw);
    throw error;
  }

  return unwrapApiSuccess(raw);
};

/** Success body for POST `/auth/request-2fa/` */
export interface RequestTwoFactorAuthResponse {
  message?: string;
  sent?: boolean;
  token: string;
}

/**
 * طلب رمز المصادقة الثنائية
 * POST /api/auth/request-2fa/
 * Body: { username: string, password: string }
 * Response: { message: string, sent: bool, token: string }
 */
export const requestTwoFactorAuthAPI = async (
  username: string,
  password: string,
  language: string = 'ar'
): Promise<RequestTwoFactorAuthResponse> => {
  try {
    const url = `${BASE_URL}/auth/request-2fa/`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeadersWithApiKey({
        'Content-Type': 'application/json',
        'Accept-Language': language,
      }),
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Include credentials for CORS
    });
    

    let raw: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      raw = await readJsonResponse(response);
      if (raw === undefined) {
        raw = { success: false, error: { code: 'parse_error', message: 'Invalid response from server' } };
      }
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      raw = { success: false, error: { code: 'non_json', message: text || 'Invalid response from server' } };
    }

    const apiCode = getErrorCodeFromBody(raw) ?? raw?.code;
    const nestedMsg = (raw?.error && typeof raw.error === 'object' ? (raw.error as any).message : '') || '';

    if (!response.ok) {
      if (response.status === 403 && apiCode === 'ACCOUNT_TEMPORARILY_INACTIVE') {
        const accountError: any = new Error(getApiErrorMessage(raw, 'ACCOUNT_TEMPORARILY_INACTIVE'));
        accountError.code = 'ACCOUNT_TEMPORARILY_INACTIVE';
        accountError.status = response.status;
        throw accountError;
      }

      if (
        response.status === 403 &&
        (apiCode === 'SUBSCRIPTION_INACTIVE' ||
          nestedMsg.toLowerCase().includes('subscription') ||
          (typeof raw?.error === 'string' && raw.error.toLowerCase().includes('subscription')))
      ) {
        const subscriptionError: any = new Error(getApiErrorMessage(raw, 'SUBSCRIPTION_INACTIVE'));
        subscriptionError.code = 'SUBSCRIPTION_INACTIVE';
        subscriptionError.subscriptionId = raw?.subscriptionId ?? raw?.subscription_id;
        subscriptionError.status = response.status;
        throw subscriptionError;
      }

      let errorMessage = getApiErrorMessage(raw, 'Failed to request 2FA code');
      const details = getErrorDetailsFromBody(raw) as Record<string, unknown> | undefined;
      const usernameErr = details?.username ?? raw?.username;
      if (usernameErr) {
        if (Array.isArray(usernameErr)) {
          errorMessage = String(usernameErr[0]);
        } else if (typeof usernameErr === 'string') {
          errorMessage = usernameErr;
        }
      }

      if (errorMessage.toLowerCase().includes('user not found') || errorMessage.toLowerCase().includes('not found')) {
        errorMessage = 'Invalid username or password';
      } else if (
        errorMessage.toLowerCase().includes('inactive') &&
        !errorMessage.toLowerCase().includes('account is temporarily')
      ) {
        errorMessage = 'Account is inactive';
      }

      const error: any = new Error(errorMessage);
      if (raw?.errors) {
        error.fields = raw.errors;
      } else {
        attachErrorFields(error, raw);
      }
      error.status = response.status;
      throw error;
    }

    return unwrapApiSuccess<RequestTwoFactorAuthResponse>(raw);
  } catch (error: any) {
    // If it's already our custom error, re-throw it
    if (error.message && error.status) {
      console.error('❌ 2FA request failed with status:', error.status, error.message);
      throw error;
    }
    
    // Handle network errors or other fetch errors
    console.error('❌ Request 2FA error:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🌐 Network error detected');
      throw new Error('Network error. Please check your connection.');
    }
    
    // Re-throw with a user-friendly message
    console.error('❌ Unknown error:', error);
    throw new Error(error.message || 'Failed to request 2FA code. Please try again.');
  }
};

/**
 * التحقق من رمز المصادقة الثنائية والحصول على tokens
 * POST /api/auth/verify-2fa/
 * Body: { username: string, password: string, code?: string, token?: string }
 * Response: { access: string, refresh: string, user: {...} }
 */
export const verifyTwoFactorAuthAPI = async (payload: {
  username: string;
  password: string;
  code?: string;
  token?: string;
  trust_device?: boolean;
}) => {
  const response = await fetch(`${BASE_URL}/auth/verify-2fa/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const raw = await readJsonResponse(response);
  const apiCode = getErrorCodeFromBody(raw) ?? (raw as any)?.code;
  const nestedMsg = (raw && typeof raw === 'object' && (raw as any).error && typeof (raw as any).error === 'object'
    ? String((raw as any).error.message || '')
    : '');

  if (!response.ok) {
    if (response.status === 403 && apiCode === 'ACCOUNT_TEMPORARILY_INACTIVE') {
      const accountError: any = new Error(getApiErrorMessage(raw, 'ACCOUNT_TEMPORARILY_INACTIVE'));
      accountError.code = 'ACCOUNT_TEMPORARILY_INACTIVE';
      throw accountError;
    }

    if (
      response.status === 403 &&
      (apiCode === 'SUBSCRIPTION_INACTIVE' ||
        nestedMsg.toLowerCase().includes('subscription') ||
        (typeof (raw as any)?.error === 'string' && (raw as any).error.toLowerCase().includes('subscription')))
    ) {
      const subscriptionError: any = new Error(getApiErrorMessage(raw, 'SUBSCRIPTION_INACTIVE'));
      subscriptionError.code = 'SUBSCRIPTION_INACTIVE';
      subscriptionError.subscriptionId = (raw as any)?.subscriptionId ?? (raw as any)?.subscription_id;
      throw subscriptionError;
    }

    const error: any = new Error(getApiErrorMessage(raw, 'Invalid 2FA code'));
    if ((raw as any)?.errors) {
      error.fields = (raw as any).errors;
    } else {
      attachErrorFields(error, raw);
    }
    throw error;
  }

  const data = unwrapApiSuccess<any>(raw);
  if (data.access) {
    localStorage.setItem('accessToken', data.access);
  }
  if (data.refresh) {
    localStorage.setItem('refreshToken', data.refresh);
  }

  return data;
};

/**
 * تحديث access token باستخدام refresh token
 * POST /api/auth/refresh/
 * Body: { refresh: string }
 * Response: { access: string, refresh?: string } — عند تفعيل ROTATE_REFRESH_TOKENS يجب حفظ refresh الجديد وإلا يُبطّل الرمز القديم بالقائمة السوداء.
 */
export const refreshTokenAPI = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ refresh: refreshToken }),
  });

  const raw = await readJsonResponse(response);

  if (!response.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throwApiError(raw, 'Token refresh failed');
  }

  const data = unwrapApiSuccess<{ access: string; refresh?: string }>(raw);
  localStorage.setItem('accessToken', data.access);
  if (data.refresh) {
    localStorage.setItem('refreshToken', data.refresh);
  }
  return data;
};

/**
 * الحصول على بيانات المستخدم الحالي
 * GET /api/users/me/
 * Headers: { Authorization: 'Bearer token' }
 * Response: User object with company info
 */
export const getCurrentUserAPI = async () => {
  return apiRequest<any>('/users/me/');
};

/**
 * تحديث لغة المستخدم المفضلة (تخزينها في السيرفر ومزامنتها مع الإيميلات)
 * POST /api/users/update-language/
 * Body: { language: 'ar' | 'en' }
 */
export const updateLanguageAPI = async (lang: 'ar' | 'en') => {
  return apiRequest<{ message: string; language: string }>('/users/update-language/', {
    method: 'POST',
    body: JSON.stringify({ language: lang }),
  });
};

/**
 * تغيير كلمة المرور للمستخدم الحالي
 * POST /api/users/change_password/
 * Headers: { Authorization: 'Bearer token' }
 * Body: { current_password: string, new_password: string, confirm_password: string }
 * Response: { message: string }
 */
export const changePasswordAPI = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
  return apiRequest<{ message: string }>('/users/change_password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
};

// ==================== Users APIs ====================

/**
 * الحصول على جميع المستخدمين
 * GET /api/users/
 * Response: { count, next, previous, results: User[] }
 */
export const getUsersAPI = async (
  page?: number,
  pageSize?: number,
  filters?: { roles?: string[]; excludeRoles?: string[] }
) => {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', String(page));
  if (pageSize) queryParams.append('page_size', String(pageSize));
  if (filters?.roles?.length) queryParams.append('roles', filters.roles.join(','));
  if (filters?.excludeRoles?.length) queryParams.append('exclude_roles', filters.excludeRoles.join(','));
  const endpoint = `/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return page ? apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint) : fetchAllPaginatedPages<any>(endpoint);
};

export const sendPresenceHeartbeatAPI = async (source: 'web' | 'mobile' | 'unknown' = 'web') => {
  return apiRequest<{ last_seen_at: string; last_seen_source: string }>('/users/presence_heartbeat/', {
    method: 'POST',
    body: JSON.stringify({ source }),
  });
};

/**
 * إنشاء مستخدم جديد
 * POST /api/users/
 * Body: { username, email, password, first_name, last_name, role, company }
 * Response: User object
 */
export const createUserAPI = async (userData: any) => {
  return apiRequest<any>('/users/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

/**
 * تحديث مستخدم
 * PUT /api/users/:id/
 * Body: { username, email, first_name, last_name, phone, role, company }
 * Response: User object
 */
export const updateUserAPI = async (userId: number, userData: any) => {
  return apiRequest<any>(`/users/${userId}/`, {
    method: 'PATCH', // Use PATCH for partial updates
    body: userData instanceof FormData ? userData : JSON.stringify(userData),
  });
};

/**
 * حذف مستخدم
 * DELETE /api/users/:id/
 */
export const deleteUserAPI = async (userId: number) => {
  return apiRequest<void>(`/users/${userId}/`, {
    method: 'DELETE',
  });
};

/**
 * Preview assigned leads before deactivating an employee
 * GET /api/users/:id/deactivate-preview/
 */
export const getDeactivateEmployeePreviewAPI = async (userId: number) => {
  return apiRequest<{
    assigned_leads_count: number;
    can_reassign: boolean;
    show_lead_reassign_options: boolean;
  }>(`/users/${userId}/deactivate-preview/`);
};

/**
 * Deactivate an employee (optional lead redistribution)
 * POST /api/users/:id/deactivate/
 */
export const deactivateEmployeeAPI = async (
  userId: number,
  payload: { reassign_leads: boolean }
) => {
  return apiRequest<{
    user: any;
    assigned_lead_count: number;
    skipped_lead_count: number;
    leads_remaining_on_user: number;
  }>(`/users/${userId}/deactivate/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Reactivate a deactivated employee
 * POST /api/users/:id/reactivate/
 */
export const reactivateEmployeeAPI = async (userId: number) => {
  return apiRequest<{ user: any }>(`/users/${userId}/reactivate/`, {
    method: 'POST',
  });
};

// ==================== Supervisors (company-scoped, admin only) ====================

/** GET /api/supervisors/ - returns paginated { count, next, previous, results } */
export const getSupervisorsAPI = async () => {
  return fetchAllPaginatedPages<any>('/supervisors/');
};

/** POST /api/supervisors/ - create supervisor (user + permissions) */
export const createSupervisorAPI = async (data: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active?: boolean;
  can_manage_leads?: boolean;
  can_manage_deals?: boolean;
  can_manage_tasks?: boolean;
  can_view_reports?: boolean;
  can_manage_users?: boolean;
  can_manage_products?: boolean;
  can_manage_services?: boolean;
  can_manage_real_estate?: boolean;
  can_manage_settings?: boolean;
}) => {
  return apiRequest<any>('/supervisors/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** PATCH /api/supervisors/:id/ - update supervisor permissions (partial) */
export const updateSupervisorAPI = async (id: number, data: Partial<{
  user_id: number;
  is_active: boolean;
  can_manage_leads: boolean;
  can_manage_deals: boolean;
  can_manage_tasks: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_manage_real_estate: boolean;
  can_manage_settings: boolean;
}>) => {
  return apiRequest<any>(`/supervisors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

/** DELETE /api/supervisors/:id/ */
export const deleteSupervisorAPI = async (id: number) => {
  return apiRequest<void>(`/supervisors/${id}/`, {
    method: 'DELETE',
  });
};

/** POST /api/supervisors/:id/toggle_active/ */
export const toggleSupervisorActiveAPI = async (id: number) => {
  return apiRequest<any>(`/supervisors/${id}/toggle_active/`, {
    method: 'POST',
  });
};

// ==================== Leads APIs (Clients in API) ====================

function appendLeadApiFilters(queryParams: URLSearchParams, filters?: LeadApiFilters) {
  if (!filters) return;
  if (filters.type && filters.type !== 'All') queryParams.append('type', filters.type.toLowerCase());
  if (filters.priority && filters.priority !== 'All') queryParams.append('priority', filters.priority.toLowerCase());
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.status && filters.status !== 'All') queryParams.append('status', filters.status);
  if (filters.assignedToMe) queryParams.append('assigned_to_me', 'true');
  else if (filters.assignedTo && filters.assignedTo !== 'All') {
    queryParams.append('assigned_to', filters.assignedTo);
  }
  if (filters.communicationWay && filters.communicationWay !== 'All') {
    queryParams.append('communication_way', filters.communicationWay);
  }
  if (filters.budgetMin) queryParams.append('budget_min', filters.budgetMin);
  if (filters.budgetMax) queryParams.append('budget_max', filters.budgetMax);
  if (filters.createdAtFrom) queryParams.append('created_at_from', filters.createdAtFrom);
  if (filters.createdAtTo) queryParams.append('created_at_to', filters.createdAtTo);
}

/**
 * الحصول على جميع Clients (Leads في Frontend)
 * GET /api/clients/
 * Query params: ?type=fresh&priority=high&search=name (اختياري)
 * Response: { count, next, previous, results: Client[] }
 */
export const getLeadsAPI = async (
  filters?: LeadApiFilters,
  page?: number,
  pageSize?: number
) => {
  const queryParams = new URLSearchParams();
  appendLeadApiFilters(queryParams, filters);
  if (typeof page === 'number') queryParams.append('page', String(page));
  if (typeof pageSize === 'number') queryParams.append('page_size', String(pageSize));
  
  const queryString = queryParams.toString();
  const endpoint = `/clients/${queryString ? `?${queryString}` : ''}`;
  if (typeof page === 'number') {
    return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint);
  }
  return fetchAllPaginatedPages<any>(endpoint);
};

/**
 * Global per-status lead counts for tab badges (excludes status filter).
 * GET /api/clients/status-counts/
 */
export const getLeadStatusCountsAPI = async (filters?: LeadApiFilters) => {
  const queryParams = new URLSearchParams();
  const { status: _status, ...rest } = filters || {};
  appendLeadApiFilters(queryParams, rest);
  const queryString = queryParams.toString();
  const endpoint = `/clients/status-counts/${queryString ? `?${queryString}` : ''}`;
  return apiRequest<Record<string, number>>(endpoint);
};

export type MissionBarSummary = {
  contact_today: number;
  overdue_follow_ups: number;
  today_new_leads: number;
  unassigned_leads: number;
};

/**
 * Dashboard mission bar counts (server-side aggregates).
 * GET /api/clients/mission-bar-summary/
 */
export const getMissionBarSummaryAPI = async () => {
  return apiRequest<MissionBarSummary>('/clients/mission-bar-summary/');
};

/**
 * إنشاء Client جديد (Lead)
 * POST /api/clients/
 * Body: { name, phone_number, priority, type, communication_way, budget, company, assigned_to }
 * Response: Client object
 */
export const createLeadAPI = async (leadData: any) => {
  return apiRequest<any>('/clients/', {
    method: 'POST',
    body: JSON.stringify(leadData),
  });
};

/**
 * تحديث Client (Lead)
 * PUT /api/clients/:id/
 * Body: Client data
 * Response: Client object
 */
export const updateLeadAPI = async (leadId: number, leadData: any) => {
  return apiRequest<any>(`/clients/${leadId}/`, {
    method: 'PUT',
    body: JSON.stringify(leadData),
  });
};

/**
 * حذف Client (Lead)
 * DELETE /api/clients/:id/
 */
export const deleteLeadAPI = async (leadId: number) => {
  return apiRequest<void>(`/clients/${leadId}/`, {
    method: 'DELETE',
  });
};

/**
 * إسناد مجموعة من العملاء لموظف معين أو إلغاء التعيين
 * POST /api/clients/bulk_assign/
 * Body: { client_ids: number[], user_id: number | null }
 */
export const bulkAssignLeadsAPI = async (clientIds: number[], userId: number | null) => {
  return apiRequest<any>('/clients/bulk_assign/', {
    method: 'POST',
    body: JSON.stringify({
      client_ids: clientIds,
      user_id: userId,
    }),
  });
};

// ==================== Deals APIs ====================

/**
 * الحصول على جميع Deals
 * GET /api/deals/
 * Response: { count, next, previous, results: Deal[] }
 */
export const getDealsAPI = async (page?: number, pageSize?: number) => {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', String(page));
  if (pageSize) queryParams.append('page_size', String(pageSize));
  const endpoint = `/deals/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return page ? apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint) : fetchAllPaginatedPages<any>(endpoint);
};

/**
 * إنشاء Deal جديد
 * POST /api/deals/
 * Body: { client, company, employee, stage }
 * Response: Deal object
 */
export const createDealAPI = async (dealData: any) => {
  return apiRequest<any>('/deals/', {
    method: 'POST',
    body: JSON.stringify(dealData),
  });
};

/**
 * تحديث Deal
 * PUT /api/deals/:id/
 * Body: { client, company, employee, stage }
 * Response: Deal object
 */
export const updateDealAPI = async (dealId: number, dealData: any) => {
  return apiRequest<any>(`/deals/${dealId}/`, {
    method: 'PUT',
    body: JSON.stringify(dealData),
  });
};

/**
 * حذف Deal
 * DELETE /api/deals/:id/
 */
export const deleteDealAPI = async (dealId: number) => {
  return apiRequest<void>(`/deals/${dealId}/`, {
    method: 'DELETE',
  });
};

// ==================== Real Estate APIs ====================

/**
 * الحصول على جميع Developers
 * GET /api/developers/
 */
export const getDevelopersAPI = async (page?: number, pageSize?: number) => {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', String(page));
  if (pageSize) queryParams.append('page_size', String(pageSize));
  const endpoint = `/developers/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return page ? apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint) : fetchAllPaginatedPages<any>(endpoint);
};

/**
 * إنشاء Developer جديد
 * POST /api/developers/
 */
export const createDeveloperAPI = async (developerData: any) => {
  return apiRequest<any>('/developers/', {
    method: 'POST',
    body: JSON.stringify(developerData),
  });
};

/**
 * تحديث Developer
 * PUT /api/developers/:id/
 */
export const updateDeveloperAPI = async (developerId: number, developerData: any) => {
  return apiRequest<any>(`/developers/${developerId}/`, {
    method: 'PUT',
    body: JSON.stringify(developerData),
  });
};

/**
 * حذف Developer
 * DELETE /api/developers/:id/
 */
export const deleteDeveloperAPI = async (developerId: number) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${BASE_URL}/developers/${developerId}/`, {
    method: 'DELETE',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throw new Error(getApiErrorMessage(errorData, `API Error: ${response.status}`));
  }

  // DELETE قد لا يعيد response body
  return;
};

/**
 * الحصول على جميع Projects
 * GET /api/projects/
 */
export const getProjectsAPI = async (page?: number, pageSize?: number, developerId?: number | null) => {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append('page', String(page));
  if (pageSize) queryParams.append('page_size', String(pageSize));
  if (developerId != null && !Number.isNaN(developerId as number) && isMeaningfulFilterValue(developerId)) {
    queryParams.append('developer', String(developerId));
  }
  const endpoint = `/projects/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return page ? apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint) : fetchAllPaginatedPages<any>(endpoint);
};

/**
 * إنشاء Project جديد
 * POST /api/projects/
 */
export const createProjectAPI = async (projectData: any) => {
  return apiRequest<any>('/projects/', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
};

/**
 * تحديث Project
 * PUT /api/projects/:id/
 */
export const updateProjectAPI = async (projectId: number, projectData: any) => {
  return apiRequest<any>(`/projects/${projectId}/`, {
    method: 'PUT',
    body: JSON.stringify(projectData),
  });
};

/**
 * حذف Project
 * DELETE /api/projects/:id/
 */
export const deleteProjectAPI = async (projectId: number) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`${BASE_URL}/projects/${projectId}/`, {
    method: 'DELETE',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response);
    throw new Error(getApiErrorMessage(errorData, `API Error: ${response.status}`));
  }

  // DELETE قد لا يعيد response body
  return;
};

/**
 * الحصول على جميع Units
 * GET /api/units/
 * Query params: ?project=xxx&bedrooms=xxx (اختياري)
 */
export const getUnitsAPI = async (filters?: any, page?: number) => {
  const queryParams = new URLSearchParams();
  if (isMeaningfulFilterValue(filters?.project)) queryParams.append('project', String(filters.project));
  if (isMeaningfulFilterValue(filters?.bedrooms)) queryParams.append('bedrooms', String(filters.bedrooms));
  if (page) queryParams.append('page', String(page));
  if (filters?.page_size) queryParams.append('page_size', String(filters.page_size));
  const queryString = queryParams.toString();
  const endpoint = `/units/${queryString ? `?${queryString}` : ''}`;
  return page ? apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(endpoint) : fetchAllPaginatedPages<any>(endpoint);
};

/**
 * إنشاء Unit جديد
 * POST /api/units/
 */
export const createUnitAPI = async (unitData: any) => {
  return apiRequest<any>('/units/', {
    method: 'POST',
    body: JSON.stringify(unitData),
  });
};

/**
 * تحديث Unit
 * PUT /api/units/:id/
 */
export const updateUnitAPI = async (unitId: number, unitData: any) => {
  return apiRequest<any>(`/units/${unitId}/`, {
    method: 'PUT',
    body: JSON.stringify(unitData),
  });
};

/**
 * حذف Unit
 * DELETE /api/units/:id/
 */
export const deleteUnitAPI = async (unitId: number) => {
  return apiRequest<void>(`/units/${unitId}/`, {
    method: 'DELETE',
  });
};

/**
 * الحصول على جميع Owners
 * GET /api/owners/
 */
export const getOwnersAPI = async () => {
  return fetchAllPaginatedPages<any>('/owners/');
};

/**
 * إنشاء Owner جديد
 * POST /api/owners/
 */
export const createOwnerAPI = async (ownerData: any) => {
  return apiRequest<any>('/owners/', {
    method: 'POST',
    body: JSON.stringify(ownerData),
  });
};

/**
 * تحديث Owner
 * PUT /api/owners/:id/
 */
export const updateOwnerAPI = async (ownerId: number, ownerData: any) => {
  return apiRequest<any>(`/owners/${ownerId}/`, {
    method: 'PUT',
    body: JSON.stringify(ownerData),
  });
};

/**
 * حذف Owner
 * DELETE /api/owners/:id/
 */
export const deleteOwnerAPI = async (ownerId: number) => {
  return apiRequest<void>(`/owners/${ownerId}/`, {
    method: 'DELETE',
  });
};

// ==================== Services APIs ====================

/**
 * الحصول على جميع Services
 * GET /api/services/
 */
export const getServicesAPI = async () => {
  return fetchAllPaginatedPages<any>('/services/');
};

/**
 * إنشاء Service جديد
 * POST /api/services/
 */
export const createServiceAPI = async (serviceData: any) => {
  return apiRequest<any>('/services/', {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
};

/**
 * تحديث Service
 * PUT /api/services/:id/
 */
export const updateServiceAPI = async (serviceId: number, serviceData: any) => {
  return apiRequest<any>(`/services/${serviceId}/`, {
    method: 'PUT',
    body: JSON.stringify(serviceData),
  });
};

/**
 * حذف Service
 * DELETE /api/services/:id/
 */
export const deleteServiceAPI = async (serviceId: number) => {
  return apiRequest<void>(`/services/${serviceId}/`, {
    method: 'DELETE',
  });
};

/**
 * الحصول على جميع Service Packages
 * GET /api/service-packages/
 */
export const getServicePackagesAPI = async () => {
  return fetchAllPaginatedPages<any>('/service-packages/');
};

/**
 * إنشاء Service Package جديد
 * POST /api/service-packages/
 */
export const createServicePackageAPI = async (packageData: any) => {
  return apiRequest<any>('/service-packages/', {
    method: 'POST',
    body: JSON.stringify(packageData),
  });
};

/**
 * تحديث Service Package
 * PUT /api/service-packages/:id/
 */
export const updateServicePackageAPI = async (packageId: number, packageData: any) => {
  return apiRequest<any>(`/service-packages/${packageId}/`, {
    method: 'PUT',
    body: JSON.stringify(packageData),
  });
};

/**
 * حذف Service Package
 * DELETE /api/service-packages/:id/
 */
export const deleteServicePackageAPI = async (packageId: number) => {
  return apiRequest<void>(`/service-packages/${packageId}/`, {
    method: 'DELETE',
  });
};

/**
 * الحصول على جميع Service Providers
 * GET /api/service-providers/
 */
export const getServiceProvidersAPI = async () => {
  return fetchAllPaginatedPages<any>('/service-providers/');
};

/**
 * إنشاء Service Provider جديد
 * POST /api/service-providers/
 */
export const createServiceProviderAPI = async (providerData: any) => {
  return apiRequest<any>('/service-providers/', {
    method: 'POST',
    body: JSON.stringify(providerData),
  });
};

/**
 * تحديث Service Provider
 * PUT /api/service-providers/:id/
 */
export const updateServiceProviderAPI = async (providerId: number, providerData: any) => {
  return apiRequest<any>(`/service-providers/${providerId}/`, {
    method: 'PUT',
    body: JSON.stringify(providerData),
  });
};

/**
 * حذف Service Provider
 * DELETE /api/service-providers/:id/
 */
export const deleteServiceProviderAPI = async (providerId: number) => {
  return apiRequest<void>(`/service-providers/${providerId}/`, {
    method: 'DELETE',
  });
};

// ==================== Products APIs ====================

/**
 * الحصول على جميع Products
 * GET /api/products/
 */
export const getProductsAPI = async () => {
  return fetchAllPaginatedPages<any>('/products/');
};

/**
 * إنشاء Product جديد
 * POST /api/products/
 */
export const createProductAPI = async (productData: any) => {
  return apiRequest<any>('/products/', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

/**
 * تحديث Product
 * PUT /api/products/:id/
 */
export const updateProductAPI = async (productId: number, productData: any) => {
  return apiRequest<any>(`/products/${productId}/`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

/**
 * حذف Product
 * DELETE /api/products/:id/
 */
export const deleteProductAPI = async (productId: number) => {
  return apiRequest<void>(`/products/${productId}/`, {
    method: 'DELETE',
  });
};

/**
 * الحصول على جميع Product Categories
 * GET /api/product-categories/
 */
export const getProductCategoriesAPI = async () => {
  return fetchAllPaginatedPages<any>('/product-categories/');
};

/**
 * إنشاء Product Category جديد
 * POST /api/product-categories/
 */
export const createProductCategoryAPI = async (categoryData: any) => {
  return apiRequest<any>('/product-categories/', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
};

/**
 * تحديث Product Category
 * PUT /api/product-categories/:id/
 */
export const updateProductCategoryAPI = async (categoryId: number, categoryData: any) => {
  return apiRequest<any>(`/product-categories/${categoryId}/`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
};

/**
 * حذف Product Category
 * DELETE /api/product-categories/:id/
 */
export const deleteProductCategoryAPI = async (categoryId: number) => {
  return apiRequest<void>(`/product-categories/${categoryId}/`, {
    method: 'DELETE',
  });
};

/**
 * الحصول على جميع Suppliers
 * GET /api/suppliers/
 */
export const getSuppliersAPI = async () => {
  return fetchAllPaginatedPages<any>('/suppliers/');
};

/**
 * إنشاء Supplier جديد
 * POST /api/suppliers/
 */
export const createSupplierAPI = async (supplierData: any) => {
  return apiRequest<any>('/suppliers/', {
    method: 'POST',
    body: JSON.stringify(supplierData),
  });
};

/**
 * تحديث Supplier
 * PUT /api/suppliers/:id/
 */
export const updateSupplierAPI = async (supplierId: number, supplierData: any) => {
  return apiRequest<any>(`/suppliers/${supplierId}/`, {
    method: 'PUT',
    body: JSON.stringify(supplierData),
  });
};

/**
 * حذف Supplier
 * DELETE /api/suppliers/:id/
 */
export const deleteSupplierAPI = async (supplierId: number) => {
  return apiRequest<void>(`/suppliers/${supplierId}/`, {
    method: 'DELETE',
  });
};

// ==================== Campaigns APIs ====================

/**
 * الحصول على جميع Campaigns
 * GET /api/campaigns/
 */
export const getCampaignsAPI = async () => {
  return fetchAllPaginatedPages<any>('/campaigns/');
};

/**
 * إنشاء Campaign جديد
 * POST /api/campaigns/
 */
export const createCampaignAPI = async (campaignData: any) => {
  return apiRequest<any>('/campaigns/', {
    method: 'POST',
    body: JSON.stringify(campaignData),
  });
};

/**
 * حذف Campaign
 * DELETE /api/campaigns/:id/
 */
export const updateCampaignAPI = async (campaignId: number, campaignData: any) => {
  return apiRequest<any>(`/campaigns/${campaignId}/`, {
    method: 'PATCH',
    body: JSON.stringify(campaignData),
  });
};

export const deleteCampaignAPI = async (campaignId: number) => {
  return apiRequest<void>(`/campaigns/${campaignId}/`, {
    method: 'DELETE',
  });
};

// ==================== Tasks/Activities APIs ====================

/**
 * الحصول على جميع Tasks
 * GET /api/tasks/
 */
export const getTasksAPI = async () => {
  return fetchAllPaginatedPages<any>('/tasks/');
};

/**
 * إنشاء Task جديد
 * POST /api/tasks/
 */
export const createTaskAPI = async (taskData: any) => {
  return apiRequest<any>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
};

/**
 * تحديث Task
 * PUT /api/tasks/:id/
 */
export const updateTaskAPI = async (taskId: number, taskData: any) => {
  return apiRequest<any>(`/tasks/${taskId}/`, {
    method: 'PUT',
    body: JSON.stringify(taskData),
  });
};

/**
 * حذف Task
 * DELETE /api/tasks/:id/
 */
export const deleteTaskAPI = async (taskId: number) => {
  return apiRequest<void>(`/tasks/${taskId}/`, {
    method: 'DELETE',
  });
};

// ==================== Integrations APIs ====================

/**
 * الحصول على قائمة حسابات التكامل المتصلة
 * GET /api/integrations/accounts/
 * Query params: ?platform=meta (أو tiktok أو whatsapp)
 * Response: IntegrationAccount[]
 */
export const getConnectedAccountsAPI = async (platform?: string) => {
  const query = platform ? `?platform=${platform}` : '';
  return apiRequest<any[]>(`/integrations/accounts${query}`);
};

export const getIntegrationPolicyAPI = async (): Promise<Record<string, { enabled: boolean; message: string; scope: string }>> => {
  return apiRequest('/integrations/policy/');
};

/**
 * الحصول على تفاصيل حساب تكامل
 * GET /api/integrations/accounts/:id/
 */
export const getConnectedAccountAPI = async (accountId: number) => {
  return apiRequest<any>(`/integrations/accounts/${accountId}/`);
};

/**
 * إنشاء حساب تكامل جديد
 * POST /api/integrations/accounts/
 * Body: { platform: 'meta' | 'whatsapp', name: string }
 */
export const createConnectedAccountAPI = async (accountData: {
  platform: string;
  name: string;
}) => {
  return apiRequest<any>('/integrations/accounts/', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

/**
 * تحديث حساب تكامل
 * PATCH /api/integrations/accounts/:id/
 * Body: { name?: string, is_active?: boolean, pixel_id?: string, ... }
 */
export const updateConnectedAccountAPI = async (accountId: number, accountData: {
  name?: string;
  is_active?: boolean;
  pixel_id?: string;
  conversion_leads_enabled?: boolean;
}) => {
  return apiRequest<any>(`/integrations/accounts/${accountId}/`, {
    method: 'PATCH',
    body: JSON.stringify(accountData),
  });
};

/**
 * حذف حساب تكامل
 * DELETE /api/integrations/accounts/:id/
 */
export const deleteConnectedAccountAPI = async (accountId: number) => {
  return apiRequest<void>(`/integrations/accounts/${accountId}/`, {
    method: 'DELETE',
  });
};

/**
 * Test Meta connection (validates token, optionally refreshes pages).
 * POST /api/integrations/accounts/:id/test-connection/
 */
export const testConnectionAPI = async (accountId: number) => {
  return apiRequest<{ valid: boolean; message?: string; expires_at?: number }>(
    `/integrations/accounts/${accountId}/test-connection/`,
    { method: 'POST' }
  );
};

export type MetaHealthPageStatus = {
  id: string;
  name: string;
  has_access_token: boolean;
  app_installed: boolean;
  leadgen_subscribed: boolean;
  error?: string | null;
  subscribe_attempt?: { success: boolean; message?: string };
};

export type MetaHealthResponse = {
  account_id: number;
  status: string;
  token: {
    valid: boolean;
    expires_at?: number;
    scopes?: string[];
    user_id?: string;
    error?: string;
  };
  webhook: {
    callback_url: string;
    verify_token_set: boolean;
    client_secret_set: boolean;
  };
  selection: {
    selected_page_id?: string | null;
    selected_form_id?: string | null;
    page_in_metadata: boolean;
    campaign_linked: boolean;
  };
  pages: MetaHealthPageStatus[];
  recent_activity: {
    last_lead_received_at?: string | null;
    leads_last_7d: number;
    errors_last_7d: number;
  };
  conversion_leads?: {
    pixel_id?: string | null;
    pixel_configured: boolean;
    conversion_leads_enabled?: boolean;
  };
};

/**
 * GET /api/integrations/accounts/:id/meta-health/
 */
export const getMetaHealthAPI = async (
  accountId: number,
  subscribe = false,
  pageId?: string | null
) => {
  const params = new URLSearchParams();
  if (subscribe) params.set('subscribe', '1');
  if (pageId) params.set('page_id', pageId);
  const query = params.toString();
  return apiRequest<MetaHealthResponse>(
    `/integrations/accounts/${accountId}/meta-health/${query ? `?${query}` : ''}`
  );
};

/** WhatsApp Embedded Signup (optional — when set in API env, CRM uses FB SDK instead of URL-only OAuth). */
export type WhatsAppEmbeddedSignupConnectInfo = {
  enabled: boolean;
  app_id: string;
  config_id: string;
  graph_api_version: string;
};

/**
 * بدء عملية OAuth لربط الحساب
 * POST /api/integrations/accounts/:id/connect/
 * Response: { authorization_url, state, embedded_signup? (WhatsApp only) }
 */
export const connectIntegrationAccountAPI = async (accountId: number) => {
  return apiRequest<{
    authorization_url: string;
    state: string;
    embedded_signup?: WhatsAppEmbeddedSignupConnectInfo;
  }>(`/integrations/accounts/${accountId}/connect/`, {
    method: 'POST',
  });
};

/**
 * Complete WhatsApp Embedded Signup after FB.login returns authResponse.code
 * POST /api/integrations/accounts/:id/whatsapp/embedded-signup/complete/
 */
export const completeWhatsAppEmbeddedSignupAPI = async (accountId: number, code: string) => {
  return apiRequest<{ account_id: number; connected: boolean }>(
    `/integrations/accounts/${accountId}/whatsapp/embedded-signup/complete/`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    }
  );
};

/**
 * قطع الاتصال مع حساب تكامل
 * POST /api/integrations/accounts/:id/disconnect/
 */
export const disconnectIntegrationAccountAPI = async (accountId: number) => {
  return apiRequest<void>(`/integrations/accounts/${accountId}/disconnect/`, {
    method: 'POST',
  });
};

/**
 * مزامنة البيانات مع المنصة
 * POST /api/integrations/accounts/:id/sync/
 */
export const syncIntegrationAccountAPI = async (accountId: number) => {
  return apiRequest<void>(`/integrations/accounts/${accountId}/sync/`, {
    method: 'POST',
  });
};

/**
 * جلب صفحات فيسبوك لحساب Meta وحفظها (عند عدم وجود صفحات محفوظة)
 * POST /api/integrations/accounts/:id/sync-pages/
 * Response: { pages: Array<{ id, name, access_token?, category? }> }
 */
export const syncMetaPagesAPI = async (accountId: number) => {
  return apiRequest<{ pages: Array<{ id: string; name: string; access_token?: string; category?: string }> }>(
    `/integrations/accounts/${accountId}/sync-pages/`,
    { method: 'POST' }
  );
};

// ==================== WhatsApp Send & Message Templates ====================

/**
 * POST /api/integrations/whatsapp/send/
 * Body: { to: string, message: string, phone_number_id?: string, client_id?: number }
 */
export const sendWhatsAppMessageAPI = async (data: {
  to: string;
  message: string;
  phone_number_id?: string;
  client_id?: number;
}) => {
  return apiRequest<any>('/integrations/whatsapp/send/', {
    method: 'POST',
    body: JSON.stringify({
      to: data.to,
      message: data.message,
      text: data.message,
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
      ...(data.client_id != null && { client_id: data.client_id }),
    }),
  });
};

export type WhatsAppSessionWindowResponse = {
  in_session: boolean;
  last_inbound_at: string | null;
  session_expires_at: string | null;
  hours_remaining: number | null;
};

/**
 * GET /api/integrations/whatsapp/session-window/?client_id=
 * Open ~24h after the contact's last inbound WhatsApp message stored in the CRM.
 */
export const getWhatsAppSessionWindowAPI = async (
  clientId: number
): Promise<WhatsAppSessionWindowResponse> => {
  return apiRequest<WhatsAppSessionWindowResponse>(
    `/integrations/whatsapp/session-window/?client_id=${clientId}`
  );
};

/**
 * POST /api/integrations/whatsapp/send-template/
 * Sends an approved Meta template (for contacts outside the customer service window).
 */
export const sendWhatsAppTemplateAPI = async (data: {
  to: string;
  template_id: number;
  client_id?: number;
  phone_number_id?: string;
  body_parameters?: string[];
}) => {
  return apiRequest<any>('/integrations/whatsapp/send-template/', {
    method: 'POST',
    body: JSON.stringify({
      to: data.to,
      template_id: data.template_id,
      ...(data.client_id != null && { client_id: data.client_id }),
      ...(data.phone_number_id && { phone_number_id: data.phone_number_id }),
      ...(data.body_parameters && { body_parameters: data.body_parameters }),
    }),
  });
};

export interface LeadWhatsAppMessageResponse {
  id: number;
  client: number;
  phone_number: string;
  body: string;
  direction: 'inbound' | 'outbound';
  whatsapp_message_id: string | null;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
}

/**
 * GET /api/integrations/whatsapp/messages/?client=:clientId
 */
export const getLeadWhatsAppMessagesAPI = async (
  clientId?: number
): Promise<LeadWhatsAppMessageResponse[]> => {
  if (typeof clientId !== 'number' || Number.isNaN(clientId)) return [];
  const res = await apiRequest<
    { results?: LeadWhatsAppMessageResponse[] } | LeadWhatsAppMessageResponse[]
  >(`/integrations/whatsapp/messages/?client=${clientId}`);
  if (Array.isArray(res)) return res;
  return res.results ?? [];
};

/**
 * GET /api/integrations/whatsapp/conversations/
 * قائمة العملاء الذين لديهم محادثات واتساب (مركز المراسلات)
 */
export const getWhatsAppConversationsAPI = async (): Promise<
  Array<{ id: number; name: string; phone_number: string; company_name: string }>
> => {
  return apiRequest<any[]>(`/integrations/whatsapp/conversations/`);
};

export type TemplateButtonPayload = {
  type: 'phone' | 'url' | 'reply';
  button_text: string;
  phone?: string;
  url?: string;
};

export interface MessageTemplateType {
  id: number;
  name: string;
  channel_type: string;
  channel_type_display: string;
  content: string;
  category: string;
  category_display: string;
  language?: string | null;
  header_type?: string | null;
  header_text?: string | null;
  footer?: string | null;
  buttons?: TemplateButtonPayload[] | null;
  meta_template_id?: string | null;
  meta_status?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/integrations/templates/
 */
export const getMessageTemplatesAPI = async (): Promise<MessageTemplateType[]> => {
  const res = await apiRequest<{ results?: MessageTemplateType[] } | MessageTemplateType[]>(
    '/integrations/templates/'
  );
  if (Array.isArray(res)) return res;
  return res.results ?? [];
};

/**
 * POST /api/integrations/templates/
 */
export const createMessageTemplateAPI = async (data: {
  name: string;
  channel_type: string;
  content: string;
  category: string;
  language?: string;
  header_type?: string;
  header_text?: string;
  footer?: string;
  buttons?: TemplateButtonPayload[];
}) => {
  return apiRequest<MessageTemplateType>('/integrations/templates/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * PUT /api/integrations/templates/:id/
 */
export const updateMessageTemplateAPI = async (
  id: number,
  data: {
    name?: string;
    channel_type?: string;
    content?: string;
    category?: string;
    language?: string;
    header_type?: string;
    header_text?: string;
    footer?: string;
    buttons?: TemplateButtonPayload[];
  }
) => {
  return apiRequest<MessageTemplateType>(`/integrations/templates/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * DELETE /api/integrations/templates/:id/
 */
export const deleteMessageTemplateAPI = async (id: number) => {
  return apiRequest<void>(`/integrations/templates/${id}/`, { method: 'DELETE' });
};

/**
 * إرسال قالب واتساب إلى Meta للمراجعة (يظهر في حساب واتساب عند ميتا)
 * POST /api/integrations/templates/:id/submit-to-whatsapp/
 */
export const submitMessageTemplateToWhatsAppAPI = async (
  templateId: number,
  options?: { language?: string }
): Promise<{ meta_template_id?: string; status?: string; message?: string }> => {
  return apiRequest(`/integrations/templates/${templateId}/submit-to-whatsapp/`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
};

/**
 * مزامنة حالات قوالب واتساب من Meta (تتبع المعالجة والموافقة والرفض).
 * POST /api/integrations/templates/sync-whatsapp/
 */
export const syncWhatsAppTemplatesAPI = async (): Promise<{
  message?: string;
  updated?: number;
  total_meta?: number;
}> => {
  return apiRequest('/integrations/templates/sync-whatsapp/', { method: 'POST' });
};

/**
 * جلب حد رسائل واتساب (التير) وجودة الحساب من Meta (٢٥٠/١٠٠٠/... رسالة جماعية يومياً)
 * GET /api/integrations/whatsapp/limits/
 */
export const getWhatsAppLimitsAPI = async (): Promise<{
  messaging_limit_tier?: string;
  quality_rating?: string;
}> => {
  return apiRequest('/integrations/whatsapp/limits/');
};

/**
 * الحصول على قائمة المنصات المدعومة
 * GET /api/integrations/accounts/platforms/
 */
export const getIntegrationPlatformsAPI = async () => {
  return apiRequest<Array<{ value: string; label: string }>>(
    '/integrations/accounts/platforms/'
  );
};

/**
 * الحصول على سجلات التكامل
 * GET /api/integrations/logs/
 * Query params: ?account=1
 */
export const getIntegrationLogsAPI = async (accountId?: number) => {
  const query = accountId ? `?account=${accountId}` : '';
  return apiRequest<any[]>(`/integrations/logs/${query}`);
};

// ==================== Twilio SMS (نقبل Twilio فقط لـ SMS) ====================

export type SmsProviderType = 'twilio' | 'otpiq';

export interface TwilioSettingsResponse {
  id?: number;
  provider?: SmsProviderType;
  account_sid: string;
  twilio_number: string;
  auth_token_masked?: string | null;
  otpiq_api_key_masked?: string | null;
  otpiq_route_provider?: string;
  sender_id: string;
  is_enabled: boolean;
  lead_created_sms_enabled?: boolean;
  lead_created_sms_template?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * GET /api/integrations/twilio/settings/
 */
export const getTwilioSettingsAPI = async (): Promise<TwilioSettingsResponse> => {
  return apiRequest<TwilioSettingsResponse>('/integrations/twilio/settings/');
};

/**
 * PUT /api/integrations/twilio/settings/
 */
export const updateTwilioSettingsAPI = async (data: {
  provider?: SmsProviderType;
  account_sid?: string;
  twilio_number?: string;
  auth_token?: string;
  otpiq_api_key?: string;
  otpiq_route_provider?: string;
  sender_id?: string;
  is_enabled?: boolean;
  lead_created_sms_enabled?: boolean;
  lead_created_sms_template?: string;
}): Promise<TwilioSettingsResponse> => {
  return apiRequest<TwilioSettingsResponse>('/integrations/twilio/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * POST /api/integrations/twilio/send/
 * إرسال SMS إلى رقم الليد وحفظها في التايملاين
 */
export const sendLeadSMSAPI = async (data: {
  lead_id: number;
  phone_number: string;
  body: string;
}): Promise<LeadSMSMessageResponse> => {
  return apiRequest<LeadSMSMessageResponse>('/integrations/twilio/send/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ==================== PBX / ZYCOO Integration ====================

export interface PbxSettingsResponse {
  id?: number;
  provider?: string;
  pbx_host?: string;
  ami_port?: number;
  ami_username?: string;
  ami_password_masked?: string | null;
  webhook_token?: string;
  webhook_url?: string;
  connector_api_key?: string;
  connector_install_key?: string;
  is_enabled?: boolean;
  auto_log_calls?: boolean;
  screen_pop_enabled?: boolean;
  connector_last_seen_at?: string | null;
  connector_online?: boolean;
  connector_package_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PbxExtensionRow {
  id: number;
  user_id?: number;
  username?: string;
  extension: string;
}

export const getPbxSettingsAPI = async (): Promise<PbxSettingsResponse> => {
  return apiRequest<PbxSettingsResponse>('/integrations/pbx/settings/');
};

export const updatePbxSettingsAPI = async (data: {
  pbx_host?: string;
  ami_port?: number;
  ami_username?: string;
  ami_password?: string;
  is_enabled?: boolean;
  auto_log_calls?: boolean;
  screen_pop_enabled?: boolean;
}): Promise<PbxSettingsResponse> => {
  return apiRequest<PbxSettingsResponse>('/integrations/pbx/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const rotatePbxConnectorKeyAPI = async (): Promise<{ connector_api_key: string }> => {
  return apiRequest<{ connector_api_key: string }>('/integrations/pbx/settings/rotate-connector-key/', {
    method: 'POST',
  });
};

export const getPbxExtensionsAPI = async (): Promise<PbxExtensionRow[]> => {
  return apiRequest<PbxExtensionRow[]>('/integrations/pbx/extensions/');
};

export const savePbxExtensionAPI = async (data: { user_id: number; extension: string }) => {
  return apiRequest<PbxExtensionRow>('/integrations/pbx/extensions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deletePbxExtensionAPI = async (id: number) => {
  return apiRequest<{ deleted: boolean }>(`/integrations/pbx/extensions/${id}/`, {
    method: 'DELETE',
  });
};

export const pbxDialAPI = async (data: { client: number; phone_number?: string; extension?: string }) => {
  return apiRequest<{ id: number; status: string }>('/integrations/pbx/dial/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export interface PbxHealthResponse {
  is_enabled: boolean;
  connector_online: boolean;
  connector_last_seen_at?: string | null;
  connector_package_version?: string;
  last_event_at?: string | null;
  extensions_mapped_count: number;
  pbx_host_configured: boolean;
  ami_configured: boolean;
  pbx_host?: string;
  webhook_url?: string;
  push_event_url_hint?: string;
  push_event_connector_hint?: string;
  recordings?: {
    pending: number;
    failed: number;
    last_ready_at?: string | null;
  };
  checks: {
    integration_enabled: boolean;
    pbx_host_configured: boolean;
    ami_configured: boolean;
    connector_online: boolean;
    extensions_mapped: boolean;
    events_received: boolean;
    recordings_clear?: boolean;
  };
}

export const getPbxHealthAPI = async (): Promise<PbxHealthResponse> => {
  return apiRequest<PbxHealthResponse>('/integrations/pbx/health/');
};

export interface PbxDialStatusResponse {
  id: number;
  status: string;
  result_message?: string;
  phone_number?: string;
  extension?: string;
  created_at?: string;
  processed_at?: string | null;
}

export const getPbxDialStatusAPI = async (commandId: number): Promise<PbxDialStatusResponse> => {
  return apiRequest<PbxDialStatusResponse>(`/integrations/pbx/dial/${commandId}/`);
};

export const downloadPbxConnectorPackageAPI = async (): Promise<void> => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  if (uiLanguage === 'ar' || uiLanguage === 'en') headers['X-Language'] = uiLanguage;

  const response = await fetch(`${BASE_URL}/integrations/pbx/connector/download/`, { headers });
  if (!response.ok) {
    let message = 'Download failed';
    try {
      const body = await response.json();
      message = body?.message || body?.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'loop-pbx-connector.zip';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const getPbxReportsSummaryAPI = async (params?: { from?: string; to?: string }) => {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return apiRequest<{
    total: number;
    inbound: number;
    outbound: number;
    answered: number;
    missed: number;
    avg_duration_sec: number;
  }>(`/integrations/pbx/reports/summary/${qs ? `?${qs}` : ''}`);
};

export const getPbxReportsAgentsAPI = async (params?: { from?: string; to?: string }) => {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return apiRequest<{ agents: Array<{
    extension: string;
    user_id?: number;
    username?: string;
    total: number;
    answered: number;
    missed: number;
    avg_duration_sec: number;
  }> }>(`/integrations/pbx/reports/agents/${qs ? `?${qs}` : ''}`);
};

// ==================== OpenAI / AI Insights ====================

export interface OpenAISettingsResponse {
  id?: number;
  api_key_masked?: string | null;
  is_enabled: boolean;
  model: string;
  auto_analyze_enabled: boolean;
  max_leads_per_run: number;
  last_analysis_at?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * GET /api/v1/integrations/openai/settings/
 */
export const getOpenAISettingsAPI = async (): Promise<OpenAISettingsResponse> => {
  return apiRequest<OpenAISettingsResponse>('/integrations/openai/settings/');
};

/**
 * PUT /api/v1/integrations/openai/settings/
 */
export const updateOpenAISettingsAPI = async (data: {
  api_key?: string;
  is_enabled?: boolean;
  model?: string;
  auto_analyze_enabled?: boolean;
  max_leads_per_run?: number;
}): Promise<OpenAISettingsResponse> => {
  return apiRequest<OpenAISettingsResponse>('/integrations/openai/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * POST /api/v1/integrations/openai/settings/test/
 */
export const testOpenAISettingsAPI = async (payload?: {
  api_key?: string;
  model?: string;
}): Promise<{ ok: boolean }> => {
  return apiRequest<{ ok: boolean }>('/integrations/openai/settings/test/', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
};

export type AIInsightStatus = 'pending' | 'approved' | 'dismissed' | 'expired';

export interface ClientAIInsightResponse {
  id: number;
  client_id: number;
  client_name: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  ai_score: number;
  priority_level: string;
  /** Localized for request `lang` / user language */
  summary: string;
  summary_en?: string;
  summary_ar?: string;
  reasoning?: string | null;
  reasoning_en?: string | null;
  reasoning_ar?: string | null;
  suggested_reminder_date: string | null;
  suggested_task_notes: string | null;
  suggested_task_notes_en?: string | null;
  suggested_task_notes_ar?: string | null;
  status: AIInsightStatus;
  approved_at?: string | null;
  approved_by?: number | null;
  approved_by_name?: string | null;
  created_client_task?: number | null;
  analyzed_at: string;
  model_used?: string;
}

export interface AIInsightsDashboardResponse {
  pending: ClientAIInsightResponse[];
  priority: ClientAIInsightResponse[];
  ai_enabled: boolean;
}

export interface AIManagementReportEmployeeRow {
  user_id: number;
  name: string;
  role: string;
  tasks_today: number;
  calls_today: number;
  visits_today: number;
  activity_total: number;
  assigned_leads: number;
}

export interface AIManagementReportHotLead {
  client_id: number;
  name: string;
  type: string;
  priority: string;
  stage: string;
  ai_score: number | null;
  summary_en: string;
  summary_ar: string;
  assigned_to_name: string | null;
  source: string;
}

export interface AIManagementReportResponse {
  ai_enabled?: boolean;
  generated_at: string | null;
  model_used?: string;
  report_date?: string | null;
  employees: AIManagementReportEmployeeRow[];
  hot_leads: AIManagementReportHotLead[];
  employee_performance_en?: string;
  employee_performance_ar?: string;
  hot_leads_summary_en?: string;
  hot_leads_summary_ar?: string;
  has_ai_summary: boolean;
}

/**
 * GET /api/v1/integrations/ai-insights/dashboard/
 */
export const getAIInsightsDashboardAPI = async (
  language?: string,
): Promise<AIInsightsDashboardResponse> => {
  const lang = language === 'ar' || language === 'en' ? language : undefined;
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return apiRequest<AIInsightsDashboardResponse>(`/integrations/ai-insights/dashboard${query}`);
};

/**
 * GET /api/v1/integrations/ai-insights/
 */
export const getAIInsightsAPI = async (status?: AIInsightStatus): Promise<ClientAIInsightResponse[]> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<ClientAIInsightResponse[]>(`/integrations/ai-insights/${query}`);
};

/**
 * POST /api/v1/integrations/ai-insights/run/
 */
export const runAIAnalysisAPI = async (force?: boolean): Promise<Record<string, unknown>> => {
  return apiRequest<Record<string, unknown>>('/integrations/ai-insights/run/', {
    method: 'POST',
    body: JSON.stringify({ force: !!force }),
  });
};

/**
 * POST /api/v1/integrations/ai-insights/{id}/approve/
 */
export const approveAIInsightAPI = async (
  insightId: number,
  language?: string,
): Promise<{ insight: ClientAIInsightResponse; client_task_id: number }> => {
  const lang = language === 'ar' || language === 'en' ? language : undefined;
  return apiRequest<{ insight: ClientAIInsightResponse; client_task_id: number }>(
    `/integrations/ai-insights/${insightId}/approve/`,
    { method: 'POST', body: JSON.stringify(lang ? { language: lang } : {}) },
  );
};

/**
 * POST /api/v1/integrations/ai-insights/{id}/dismiss/
 */
export const dismissAIInsightAPI = async (insightId: number): Promise<ClientAIInsightResponse> => {
  return apiRequest<ClientAIInsightResponse>(`/integrations/ai-insights/${insightId}/dismiss/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

/**
 * GET /api/v1/integrations/openai/management-report/
 */
export const getAIManagementReportAPI = async (): Promise<AIManagementReportResponse> => {
  return apiRequest<AIManagementReportResponse>('/integrations/openai/management-report/');
};

/**
 * POST /api/v1/integrations/openai/management-report/generate/
 */
export const generateAIManagementReportAPI = async (): Promise<AIManagementReportResponse> => {
  return apiRequest<AIManagementReportResponse>('/integrations/openai/management-report/generate/', {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export interface LeadSMSMessageResponse {
  id: number;
  client: number;
  phone_number: string;
  body: string;
  direction: string;
  provider?: SmsProviderType | null;
  external_message_id?: string | null;
  twilio_sid: string | null;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
}

/**
 * GET /api/integrations/sms/?client=:clientId
 */
export const getLeadSMSMessagesAPI = async (clientId: number): Promise<LeadSMSMessageResponse[]> => {
  const res = await apiRequest<{ results?: LeadSMSMessageResponse[] } | LeadSMSMessageResponse[]>(
    `/integrations/sms/?client=${clientId}`
  );
  if (Array.isArray(res)) return res;
  return res.results ?? [];
};

/**
 * GET /api/integrations/accounts/:id/lead_forms/?page_id={page_id}
 * جلب قائمة Lead Forms من صفحة Meta
 */
export const getLeadFormsAPI = async (accountId: number, pageId: string) => {
  return apiRequest<{
    page_id: string;
    lead_forms: Array<{
      id: string;
      name: string;
      status: string;
      leads_count: number;
      created_time: string;
    }>;
  }>(`/integrations/accounts/${accountId}/lead_forms/?page_id=${pageId}`);
};

/**
 * POST /api/integrations/accounts/:id/select_lead_form/
 * ربط Lead Form معين بكامبين
 */
export const selectLeadFormAPI = async (
  accountId: number,
  data: {
    page_id: string;
    form_id: string;
    campaign_id?: number;
  }
) => {
  return apiRequest<{
    message: string;
    page_id: string;
    form_id: string;
    campaign_id?: number;
  }>(`/integrations/accounts/${accountId}/select_lead_form/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * TikTok Lead Gen only: get webhook URL for this company to register in TikTok Ads Manager.
 * GET /api/integrations/accounts/tiktok-leadgen-config/
 */
export const getTikTokLeadgenConfigAPI = async () => {
  return apiRequest<{
    webhook_url: string;
    company_id: number;
    integration_status?: string;
    last_received_at?: string | null;
    last_sync_at?: string | null;
  }>(
    '/integrations/accounts/tiktok-leadgen-config/'
  );
};

/** Custom Lead API: endpoint URL and masked keys. GET /integrations/accounts/lead-api-config/ */
export type LeadApiKeySummary = {
  id: number;
  name: string;
  key_prefix: string;
  key_suffix?: string;
  is_active: boolean;
  created_at: string | null;
  last_used_at: string | null;
};

export type LeadApiConfig = {
  endpoint_url: string;
  documentation_path: string;
  keys: LeadApiKeySummary[];
  integration_status?: string;
  last_received_at?: string | null;
  last_sync_at?: string | null;
};

export const getLeadApiConfigAPI = async () => {
  return apiRequest<LeadApiConfig>('/integrations/accounts/lead-api-config/');
};

export const createLeadApiKeyAPI = async (name: string) => {
  return apiRequest<LeadApiKeySummary & { api_key: string }>(
    '/integrations/accounts/lead-api-keys/',
    { method: 'POST', body: JSON.stringify({ name }) }
  );
};

export const rotateLeadApiKeyAPI = async (keyId: number) => {
  return apiRequest<LeadApiKeySummary & { api_key: string }>(
    `/integrations/accounts/lead-api-keys/${keyId}/rotate/`,
    { method: 'POST' }
  );
};

export const revokeLeadApiKeyAPI = async (keyId: number) => {
  return apiRequest<{ message?: string }>(
    `/integrations/accounts/lead-api-keys/${keyId}/`,
    { method: 'DELETE' }
  );
};

// ==================== Activities/Tasks APIs ====================

/**
 * الحصول على Tasks (Activities في Frontend)
 * GET /api/tasks/
 * Query params: ?deal=xxx&stage=xxx&search=xxx
 * Response: { count, next, previous, results: Task[] }
 */
export const getActivitiesAPI = async (filters?: any) => {
  const queryParams = new URLSearchParams();
  if (isMeaningfulFilterValue(filters?.deal)) queryParams.append('deal', String(filters.deal));
  if (isMeaningfulFilterValue(filters?.stage)) queryParams.append('stage', String(filters.stage));
  if (filters?.search) queryParams.append('search', filters.search);
  
  const queryString = queryParams.toString();
  return fetchAllPaginatedPages<any>(`/tasks/${queryString ? `?${queryString}` : ''}`);
};

/**
 * إنشاء Task جديد (Activity)
 * POST /api/tasks/
 * Body: { deal, stage, notes, reminder_date }
 */
export const createActivityAPI = async (activityData: any) => {
  return apiRequest<any>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(activityData),
  });
};

// ==================== Client Tasks APIs (Actions for Leads) ====================

/**
 * الحصول على جميع Client Tasks (Actions)
 * GET /api/client-tasks/
 */
export const getClientTasksAPI = async () => {
  return fetchAllPaginatedPages<any>('/client-tasks/');
};

// ==================== Client Calls APIs ====================

/**
 * الحصول على جميع Client Calls
 * GET /api/client-calls/
 */
export const getClientCallsAPI = async () => {
  return fetchAllPaginatedPages<any>('/client-calls/');
};

/**
 * إنشاء Client Call جديد
 * POST /api/client-calls/
 * Body: { client, call_method, notes, call_datetime?, follow_up_date? }
 */
export const createClientCallAPI = async (clientCallData: any) => {
  return apiRequest<any>('/client-calls/', {
    method: 'POST',
    body: JSON.stringify(clientCallData),
  });
};

/**
 * تحديث Client Call
 * PUT /api/client-calls/{id}/
 */
export const updateClientCallAPI = async (clientCallId: number, clientCallData: any) => {
  return apiRequest<any>(`/client-calls/${clientCallId}/`, {
    method: 'PUT',
    body: JSON.stringify(clientCallData),
  });
};

/**
 * حذف Client Call
 * DELETE /api/client-calls/{id}/
 */
export const deleteClientCallAPI = async (clientCallId: number) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${BASE_URL}/client-calls/${clientCallId}/`, {
    method: 'DELETE',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
  });

  if (response.status === 401) {
    try {
      await refreshTokenAPI();
      return deleteClientCallAPI(clientCallId);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const loginUrl = `${protocol}//${hostname}${port}/login`;
      window.location.replace(loginUrl);
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok && response.status !== 204) {
    const errorData = await readJsonResponse(response);
    throw new Error(getApiErrorMessage(errorData, `API Error: ${response.status} ${response.statusText}`));
  }
};

// ==================== Client Visits APIs ====================

/** GET /client-visits/ */
export const getClientVisitsAPI = async () => {
  return fetchAllPaginatedPages<any>('/client-visits/');
};

/** POST /client-visits/ */
export const createClientVisitAPI = async (data: any) => {
  return apiRequest<any>('/client-visits/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** PUT /client-visits/{id}/ */
export const updateClientVisitAPI = async (clientVisitId: number, data: any) => {
  return apiRequest<any>(`/client-visits/${clientVisitId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// ==================== Client Field Visits APIs ====================

/** GET /client-field-visits/ */
export const getClientFieldVisitsAPI = async () => {
  return fetchAllPaginatedPages<any>('/client-field-visits/');
};

/** POST /client-field-visits/ */
export const createClientFieldVisitAPI = async (data: Record<string, unknown>) => {
  const photo = data.client_location_photo;
  const hasPhoto = photo instanceof File;

  if (hasPhoto) {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (key === 'client_location_photo') continue;
      if (value === undefined || value === null || value === '') continue;
      form.append(key, String(value));
    }
    form.append('client_location_photo', photo);
    return apiRequest<any>('/client-field-visits/', {
      method: 'POST',
      body: form,
    });
  }

  return apiRequest<any>('/client-field-visits/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/** DELETE /client-visits/{id}/ */
export const deleteClientVisitAPI = async (clientVisitId: number) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${BASE_URL}/client-visits/${clientVisitId}/`, {
    method: 'DELETE',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
  });

  if (response.status === 401) {
    try {
      await refreshTokenAPI();
      return deleteClientVisitAPI(clientVisitId);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.replace(`${protocol}//${hostname}${port}/login`);
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok && response.status !== 204) {
    const errorData = await readJsonResponse(response);
    throw new Error(getApiErrorMessage(errorData, `API Error: ${response.status} ${response.statusText}`));
  }
};

/**
 * GET /api/client-events/
 */
export const getClientEventsAPI = async (clientId?: number) => {
  const url = clientId ? `/client-events/?client=${clientId}` : '/client-events/';
  return fetchAllPaginatedPages<any>(url);
};

/**
 * إنشاء Client Task جديد (Action)
 * POST /api/client-tasks/
 * Body: { client, stage, notes, reminder_date }
 */
export const createClientTaskAPI = async (clientTaskData: any) => {
  return apiRequest<any>('/client-tasks/', {
    method: 'POST',
    body: JSON.stringify(clientTaskData),
  });
};

/**
 * تحديث Client Task
 * PUT /api/client-tasks/{id}/
 */
export const updateClientTaskAPI = async (clientTaskId: number, clientTaskData: any) => {
  return apiRequest<any>(`/client-tasks/${clientTaskId}/`, {
    method: 'PUT',
    body: JSON.stringify(clientTaskData),
  });
};

/**
 * حذف Client Task
 * DELETE /api/client-tasks/{id}/
 */
export const deleteClientTaskAPI = async (clientTaskId: number) => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${BASE_URL}/client-tasks/${clientTaskId}/`, {
    method: 'DELETE',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
  });

  if (response.status === 401) {
    try {
      await refreshTokenAPI();
      return deleteClientTaskAPI(clientTaskId);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('currentUser');
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const loginUrl = `${protocol}//${hostname}${port}/login`;
      window.location.replace(loginUrl);
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok && response.status !== 204) {
    const errorData = await readJsonResponse(response);
    throw new Error(getApiErrorMessage(errorData, `API Error: ${response.status} ${response.statusText}`));
  }
};

// ==================== Todos APIs ====================
// TODO: يمكن استخدام Tasks API للـ Todos أيضاً، أو إضافة endpoint منفصل

/**
 * الحصول على Todos (يمكن استخدام Tasks API)
 * GET /api/tasks/
 */
export const getTodosAPI = async () => {
  return fetchAllPaginatedPages<any>('/tasks/');
};

export const createTodoAPI = async (todoData: any) => {
  return apiRequest<any>('/tasks/', {
    method: 'POST',
    body: JSON.stringify(todoData),
  });
};

// ==================== Settings APIs ====================

/**
 * TODO: استدعاء API للحصول على Channels
 * مثال:
 * GET /settings/channels
 */
export const getChannelsAPI = async () => {
  return apiRequest<any[]>('/settings/channels/');
};

export const createChannelAPI = async (channelData: any) => {
  return apiRequest<any>('/settings/channels/', {
    method: 'POST',
    body: JSON.stringify(channelData),
  });
};

export const updateChannelAPI = async (channelId: number, channelData: any) => {
  return apiRequest<any>(`/settings/channels/${channelId}/`, {
    method: 'PUT',
    body: JSON.stringify(channelData),
  });
};

export const deleteChannelAPI = async (channelId: number) => {
  return apiRequest<void>(`/settings/channels/${channelId}/`, {
    method: 'DELETE',
  });
};

/**
 * TODO: استدعاء API للحصول على Stages
 * مثال:
 * GET /settings/stages
 */
export const getStagesAPI = async () => {
  return apiRequest<any[]>('/settings/stages/');
};

export const createStageAPI = async (stageData: any) => {
  return apiRequest<any>('/settings/stages/', {
    method: 'POST',
    body: JSON.stringify(stageData),
  });
};

export const updateStageAPI = async (stageId: number, stageData: any) => {
  return apiRequest<any>(`/settings/stages/${stageId}/`, {
    method: 'PUT',
    body: JSON.stringify(stageData),
  });
};

export const deleteStageAPI = async (stageId: number) => {
  return apiRequest<void>(`/settings/stages/${stageId}/`, {
    method: 'DELETE',
  });
};

/**
 * TODO: استدعاء API للحصول على Statuses
 * مثال:
 * GET /settings/statuses
 */
export const getStatusesAPI = async () => {
  return apiRequest<any[]>('/settings/statuses/');
};

export const createStatusAPI = async (statusData: any) => {
  return apiRequest<any>('/settings/statuses/', {
    method: 'POST',
    body: JSON.stringify(statusData),
  });
};

export const updateStatusAPI = async (statusId: number, statusData: any) => {
  return apiRequest<any>(`/settings/statuses/${statusId}/`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  });
};

export const deleteStatusAPI = async (statusId: number) => {
  return apiRequest<void>(`/settings/statuses/${statusId}/`, {
    method: 'DELETE',
  });
};

/**
 * Call Methods APIs
 * GET /settings/call-methods
 */
export const getCallMethodsAPI = async () => {
  return apiRequest<any[]>('/settings/call-methods/');
};

export const createCallMethodAPI = async (callMethodData: any) => {
  return apiRequest<any>('/settings/call-methods/', {
    method: 'POST',
    body: JSON.stringify(callMethodData),
  });
};

export const updateCallMethodAPI = async (callMethodId: number, callMethodData: any) => {
  return apiRequest<any>(`/settings/call-methods/${callMethodId}/`, {
    method: 'PUT',
    body: JSON.stringify(callMethodData),
  });
};

export const deleteCallMethodAPI = async (callMethodId: number) => {
  return apiRequest<void>(`/settings/call-methods/${callMethodId}/`, {
    method: 'DELETE',
  });
};

/** GET /settings/visit-types/ */
export const getVisitTypesAPI = async () => {
  return apiRequest<any[]>('/settings/visit-types/');
};

export const createVisitTypeAPI = async (visitTypeData: any) => {
  return apiRequest<any>('/settings/visit-types/', {
    method: 'POST',
    body: JSON.stringify(visitTypeData),
  });
};

export const updateVisitTypeAPI = async (visitTypeId: number, visitTypeData: any) => {
  return apiRequest<any>(`/settings/visit-types/${visitTypeId}/`, {
    method: 'PUT',
    body: JSON.stringify(visitTypeData),
  });
};

export const deleteVisitTypeAPI = async (visitTypeId: number) => {
  return apiRequest<void>(`/settings/visit-types/${visitTypeId}/`, {
    method: 'DELETE',
  });
};

// ==================== Company Assignment Settings APIs ====================

/**
 * تحديث إعدادات التوزيع التلقائي وإعادة التعيين للشركة
 * PATCH /api/companies/:id/update_assignment_settings/
 */
export const updateCompanyAssignmentSettingsAPI = async (
  companyId: number,
  settings: {
    auto_assign_enabled?: boolean;
    re_assign_enabled?: boolean;
    re_assign_hours?: number;
    timezone?: string;
  }
) => {
  return apiRequest<any>(`/companies/${companyId}/update_assignment_settings/`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
};

/** PATCH /api/companies/:id/update_field_visit_settings/ */
export const updateCompanyFieldVisitSettingsAPI = async (
  companyId: number,
  settings: {
    field_visit_enabled?: boolean;
  }
) => {
  return apiRequest<any>(`/companies/${companyId}/update_field_visit_settings/`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
};

/**
 * تعيين العملاء غير المعينين تلقائياً
 * POST /api/clients/assign_unassigned/
 */
export const assignUnassignedClientsAPI = async () => {
  return apiRequest<{
    message: string;
    assigned_count: number;
    assigned_to: string;
  }>('/clients/assign_unassigned/', {
    method: 'POST',
  });
};

/** GET /api/support-tickets/ - list current user's support tickets (paginated) */
export const getSupportTicketsAPI = async (params?: { page?: number; page_size?: number }) => {
  const queryString = params
    ? new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString()
    : '';
  return apiRequest<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      title: string;
      description: string;
      status: string;
      created_at: string;
      updated_at: string;
      attachments?: Array<{ id: number; file: string; url: string; created_at: string }>;
    }>;
  }>(`/support-tickets/${queryString ? `?${queryString}` : ''}`);
};

/** POST /api/support-tickets/ - create a support ticket (optionally with screenshot files) */
export const createSupportTicketAPI = async (payload: {
  title: string;
  description: string;
  screenshots?: File[];
}) => {
  const { title, description, screenshots = [] } = payload;
  const hasFiles = screenshots.length > 0;

  if (hasFiles) {
    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    screenshots.forEach((file) => form.append('screenshots', file));
    return apiRequest<{
      id: number;
      title: string;
      description: string;
      status: string;
      created_at: string;
      attachments?: Array<{ id: number; file: string; url: string; created_at: string }>;
    }>('/support-tickets/', {
      method: 'POST',
      body: form,
    });
  }

  return apiRequest<{ id: number; title: string; description: string; status: string; created_at: string }>(
    '/support-tickets/',
    {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }
  );
};

// --- Tenant internal chat (same-company DMs) ---

export type TenantChatPeer = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo?: string | null;
  last_seen_at?: string | null;
  last_seen_source?: string | null;
  is_online?: boolean;
};

export type TenantChatMessageQuote = {
  id: number;
  sender: TenantChatPeer;
  body: string;
  created_at: string;
  attachment_kind?: 'image' | 'video' | 'audio' | 'document' | null;
  attachment_url?: string | null;
};

export type TenantChatPinnedMessageSummary = {
  pin_id: number;
  message_id: number;
  body: string;
  sender: TenantChatPeer;
  pinned_at: string;
  pinned_by_id: number;
  attachment_kind?: 'image' | 'video' | 'audio' | 'document' | null;
};

export type TenantChatKind = 'direct' | 'company_group';

export type TenantChatConversation = {
  id: number;
  /** Omitted on older backends; treat as `direct`. */
  kind?: TenantChatKind;
  other_user: TenantChatPeer | null;
  group_title?: string | null;
  member_count?: number | null;
  online_count?: number | null;
  last_message: {
    id: number;
    body: string;
    created_at: string;
    sender_id: number;
    attachment_kind?: 'image' | 'video' | 'audio' | 'document' | null;
  } | null;
  updated_at: string;
  /** Server-computed; omit on older API responses. */
  unread_count?: number;
  /** Current user's read cursor in this thread; omit on older API responses. */
  last_read_message_id?: number | null;
  pinned_messages?: TenantChatPinnedMessageSummary[];
};

export type TenantChatMessage = {
  id: number;
  sender: TenantChatPeer;
  body: string;
  created_at: string;
  read_by_peer?: boolean;
  reply_to?: TenantChatMessageQuote | null;
  forwarded_from?: TenantChatMessageQuote | null;
  attachment_kind?: 'image' | 'video' | 'audio' | 'document' | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  /** Pixel dimensions when known (images); omitted for older messages or video. */
  attachment_width?: number | null;
  attachment_height?: number | null;
  original_filename?: string | null;
  attachment_url?: string | null;
};

export async function getTenantChatConversationsAPI(params?: { page?: number; page_size?: number }) {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.page_size != null) search.set('page_size', String(params.page_size));
  const q = search.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: TenantChatConversation[] }>(
    `/tenant-chat/conversations/${q ? `?${q}` : ''}`
  );
}

export async function getTenantChatEligibleUsersAPI() {
  return apiRequest<{ count: number; results: TenantChatPeer[] }>(`/tenant-chat/conversations/eligible-users/`);
}

export async function startTenantChatConversationAPI(withUserId: number) {
  return apiRequest<TenantChatConversation>(`/tenant-chat/conversations/`, {
    method: 'POST',
    body: JSON.stringify({ with_user_id: withUserId }),
  });
}

export async function getTenantChatMessagesAPI(
  conversationId: number,
  params?: {
    ordering?: 'created_at' | '-created_at';
    page?: number;
    page_size?: number;
    before_id?: number;
    after_id?: number;
    around_id?: number;
  }
) {
  const search = new URLSearchParams();
  if (params?.ordering) search.set('ordering', params.ordering);
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.page_size != null) search.set('page_size', String(params.page_size));
  if (params?.before_id != null) search.set('before_id', String(params.before_id));
  if (params?.after_id != null) search.set('after_id', String(params.after_id));
  if (params?.around_id != null) search.set('around_id', String(params.around_id));
  const q = search.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: TenantChatMessage[] }>(
    `/tenant-chat/conversations/${conversationId}/messages/${q ? `?${q}` : ''}`
  );
}

export async function sendTenantChatMessageAPI(
  conversationId: number,
  body: string,
  opts?: { replyToMessageId?: number; forwardFromMessageId?: number }
) {
  const payload: Record<string, unknown> = { body };
  if (opts?.replyToMessageId != null) payload.reply_to_message_id = opts.replyToMessageId;
  if (opts?.forwardFromMessageId != null) payload.forward_from_message_id = opts.forwardFromMessageId;
  return apiRequest<TenantChatMessage>(`/tenant-chat/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendTenantChatMessageWithAttachmentAPI(
  conversationId: number,
  file: File,
  opts?: { body?: string; replyToMessageId?: number }
) {
  const form = new FormData();
  form.append('file', file);
  if (opts?.body != null && opts.body !== '') {
    form.append('body', opts.body);
  }
  if (opts?.replyToMessageId != null) {
    form.append('reply_to_message_id', String(opts.replyToMessageId));
  }
  return apiRequest<TenantChatMessage>(`/tenant-chat/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: form,
  });
}

export async function pinTenantChatMessageAPI(conversationId: number, messageId: number) {
  return apiRequest<{ ok: boolean }>(`/tenant-chat/conversations/${conversationId}/pin-message/`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId }),
  });
}

export async function unpinTenantChatMessageAPI(conversationId: number, messageId: number) {
  return apiRequest<{ ok: boolean; removed?: boolean }>(
    `/tenant-chat/conversations/${conversationId}/unpin-message/`,
    {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId }),
    }
  );
}

export async function markTenantChatReadAPI(conversationId: number, messageId: number) {
  return apiRequest<{ last_read_message_id: number | null }>(
    `/tenant-chat/conversations/${conversationId}/mark-read/`,
    {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId }),
    }
  );
}

export type TenantChatPeerPresenceAction =
  | 'idle'
  | 'typing'
  | 'uploading_media'
  | 'recording_voice'
  | 'sending_message';

/** DM thread: single peer activity (legacy shape). */
export type TenantChatPeerPresenceDM = {
  peer_user_id: number;
  activity: TenantChatPeerPresenceAction | null;
};

/** Company-wide group: multiple peers with non-idle activity. */
export type TenantChatPeerPresenceGroup = {
  mode: 'group';
  peers: Array<{
    user_id: number;
    activity: TenantChatPeerPresenceAction;
    peer: TenantChatPeer;
  }>;
};

export type TenantChatPeerPresenceResponse = TenantChatPeerPresenceDM | TenantChatPeerPresenceGroup;

export async function getTenantChatPeerPresenceAPI(conversationId: number) {
  return apiRequest<TenantChatPeerPresenceResponse>(
    `/tenant-chat/conversations/${conversationId}/peer-presence/`
  );
}

export async function postTenantChatPeerPresenceAPI(
  conversationId: number,
  action: TenantChatPeerPresenceAction
) {
  return apiRequest<{ ok: boolean; action: string }>(
    `/tenant-chat/conversations/${conversationId}/peer-presence/`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    }
  );
}

// --- In-app notifications (Django notifications app) ---

export type AppNotification = {
  id: number;
  type: string;
  type_display?: string;
  title: string;
  body: string;
  read: boolean;
  sent_at?: string | null;
  created_at?: string | null;
  data?: Record<string, unknown> | null;
};

export async function getNotificationsAPI(params?: { page?: number; page_size?: number; read?: boolean }) {
  const search = new URLSearchParams();
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.page_size != null) search.set('page_size', String(params.page_size));
  if (params?.read !== undefined) search.set('read', params.read ? 'true' : 'false');
  const q = search.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: AppNotification[] }>(
    `/notifications/${q ? `?${q}` : ''}`
  );
}

export async function getNotificationsUnreadCountAPI() {
  return apiRequest<{ unread_count: number }>(`/notifications/unread_count/`);
}

export async function markNotificationReadAPI(notificationId: number) {
  return apiRequest<unknown>(`/notifications/${notificationId}/mark_read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsReadAPI() {
  return apiRequest<{ count?: number }>(`/notifications/mark_all_read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

