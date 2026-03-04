/**
 * API Service
 * 
 * هذا الملف يحتوي على جميع استدعاءات API
 * TODO: تأكد من أن API يعمل على هذا الرابط (افتراضي: https://haidaraib.pythonanywhere.com)
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

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

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // إذا كان الخطأ 401 و retryOn401 = true، حاول refresh token
  if (response.status === 401 && retryOn401) {
    try {
      // إذا كانت هناك عملية refresh جارية، انتظرها بدلاً من بدء عملية جديدة
      if (refreshTokenPromise) {
        await refreshTokenPromise;
      } else {
        // بدء عملية refresh جديدة
        refreshTokenPromise = refreshTokenAPI().then(() => {
          refreshTokenPromise = null; // إعادة تعيين بعد النجاح
        }).catch((error) => {
          refreshTokenPromise = null; // إعادة تعيين بعد الفشل
          throw error;
        });
        await refreshTokenPromise;
      }
      // أعد المحاولة مرة أخرى بدون retry
      return apiRequest<T>(endpoint, options, false);
    } catch (refreshError) {
      // إذا فشل refresh، أعد المستخدم إلى صفحة تسجيل الدخول على نفس النطاق الفرعي
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
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || errorData.error || '';
    
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
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData) || `API Error: ${response.status} ${response.statusText}`;
    console.error('API Error:', response.status, errorData);
    
    // Create error object with fields for Django REST Framework validation errors
    const error: any = new Error(errorMessage);
    if (errorData && typeof errorData === 'object') {
      error.data = errorData;
      // Check for field-specific errors (e.g., { email: ["error message"], username: ["error message"] })
      const fieldErrors: Record<string, any> = {};
      Object.keys(errorData).forEach(key => {
        if (key !== 'detail' && key !== 'message' && key !== 'error' && key !== 'error_key') {
          fieldErrors[key] = errorData[key];
        }
      });
      if (Object.keys(fieldErrors).length > 0) {
        error.fields = fieldErrors;
      }
    }
    throw error;
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
      return JSON.parse(text);
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
    return JSON.parse(text);
  } catch {
    return undefined as T;
  }
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Invalid username or password');
  }

  const data = await response.json();
  // احفظ tokens
  localStorage.setItem('accessToken', data.access);
  localStorage.setItem('refreshToken', data.refresh);
  
  return data;
};

/**
 * تسجيل شركة جديدة مع المالك
 * POST /api/auth/register/
 * Body: { company: { name, domain, specialization }, owner: { first_name, last_name, email, username, password }, plan_id?, billing_cycle? }
 * Response: { access, refresh, user, company, subscription? }
 */
export const registerCompanyAPI = async (data: {
  company: {
    name: string;
    domain: string;
    specialization: 'real_estate' | 'services' | 'products';
  };
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
  };
  plan_id?: number | null;
  billing_cycle?: 'monthly' | 'yearly';
}, language: string = 'en') => {
  const response = await fetch(`${BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
      'Accept-Language': language,
    }),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Registration failed'
    );
    if (errorData && typeof errorData === 'object') {
      error.fields = errorData;
    }
    throw error;
  }

  const responseData = await response.json();
  
  // Save tokens
  if (responseData.access) {
    localStorage.setItem('accessToken', responseData.access);
  }
  if (responseData.refresh) {
    localStorage.setItem('refreshToken', responseData.refresh);
  }
  
  return responseData;
};

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
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Failed to create payment session'
    );
    throw error;
  }

  return response.json();
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to verify payment return'
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Also check if the response indicates failure even with 200 status
  if (data.status === 'error' || data.status === 'failed' || (data.payment_status && data.payment_status !== 'A')) {
    const error: any = new Error(
      data?.message || data?.error || 'Payment verification failed'
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
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Failed to create payment session'
    );
    throw error;
  }

  return response.json();
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to verify payment return'
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  // Also check if the response indicates failure even with 200 status
  if (data.status === 'error' || data.status === 'failed') {
    const error: any = new Error(
      data?.message || data?.error || 'Payment verification failed'
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
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Failed to create payment session'
    );
    throw error;
  }

  return response.json();
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
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Failed to create payment session'
    );
    throw error;
  }

  return response.json();
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
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.detail || errorData.message || errorData.error || 'Failed to create FIB payment session'
    );
    throw error;
  }
  return response.json();
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
) => {
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


/**
 * Check payment status by subscription_id - for polling
 * GET /api/payments/subscription/{subscription_id}/status/
 * Returns payment status and subscription status
 */
export const checkPaymentStatusAPI = async (subscriptionId: number) => {
  const response = await fetch(`${BASE_URL}/payment-status/${subscriptionId}/`, {
    method: 'GET',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to check payment status'
    );
    throw error;
  }
  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Availability check failed'
    );
    if (data?.errors) {
      error.fields = data.errors;
    }
    throw error;
  }

  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Email verification failed'
    );
    if (data?.error) {
      error.fields = data;
    }
    throw error;
  }

  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to resend verification code'
    );
    if (data?.error) {
      error.fields = data;
    }
    throw error;
  }

  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to change email'
    );
    if (data?.error) {
      error.fields = data;
    }
    throw error;
  }

  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Failed to send password reset email'
    );
    if (data?.error) {
      error.fields = data;
    }
    throw error;
  }

  return data;
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(
      data?.detail || data?.message || data?.error || 'Password reset failed'
    );
    if (data?.error) {
      error.fields = data;
    }
    throw error;
  }

  return data;
};

/**
 * طلب رمز المصادقة الثنائية
 * POST /api/auth/request-2fa/
 * Body: { username: string, password: string }
 * Response: { message: string, sent: bool, token: string }
 */
export const requestTwoFactorAuthAPI = async (username: string, password: string, language: string = 'ar') => {
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
    

    // Try to parse response as JSON, but handle non-JSON responses
    let data: any = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        data = { error: 'Invalid response from server' };
      }
    } else {
      // If response is not JSON, try to get text
      const text = await response.text();
      console.error('Non-JSON response:', text);
      data = { error: text || 'Invalid response from server' };
    }

    if (!response.ok) {
      // Handle account temporarily inactive error (for employees)
      if (response.status === 403 && data?.code === 'ACCOUNT_TEMPORARILY_INACTIVE') {
        const accountError: any = new Error(data?.error || data?.message || 'ACCOUNT_TEMPORARILY_INACTIVE');
        accountError.code = 'ACCOUNT_TEMPORARILY_INACTIVE';
        accountError.status = response.status;
        throw accountError;
      }
      
      // Handle subscription inactive error (for admins)
      if (response.status === 403 && (data?.code === 'SUBSCRIPTION_INACTIVE' || data?.error?.toLowerCase().includes('subscription'))) {
        const subscriptionError: any = new Error(data?.error || data?.message || 'SUBSCRIPTION_INACTIVE');
        subscriptionError.code = 'SUBSCRIPTION_INACTIVE';
        subscriptionError.subscriptionId = data?.subscriptionId;
        subscriptionError.status = response.status;
        throw subscriptionError;
      }
      
      // Handle different error formats
      let errorMessage = data?.detail || data?.error || data?.message || 'Failed to request 2FA code';
      
      // Check for field-specific errors (from serializer)
      if (data?.username) {
        if (Array.isArray(data.username)) {
          errorMessage = data.username[0];
        } else if (typeof data.username === 'string') {
          errorMessage = data.username;
        }
      }
      
      // Map common error messages
      if (errorMessage.toLowerCase().includes('user not found') || 
          errorMessage.toLowerCase().includes('not found')) {
        errorMessage = 'Invalid username or password';
      } else if (errorMessage.toLowerCase().includes('inactive') && !errorMessage.toLowerCase().includes('account is temporarily')) {
        errorMessage = 'Account is inactive';
      }
      
      const error: any = new Error(errorMessage);
      if (data?.errors) {
        error.fields = data.errors;
      }
      // Add status code for better error handling
      error.status = response.status;
      throw error;
    }

    return data;
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
}) => {
  const response = await fetch(`${BASE_URL}/auth/verify-2fa/`, {
    method: 'POST',
    headers: getHeadersWithApiKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle account temporarily inactive error (for employees)
    if (response.status === 403 && data?.code === 'ACCOUNT_TEMPORARILY_INACTIVE') {
      const accountError: any = new Error(data?.error || data?.message || 'ACCOUNT_TEMPORARILY_INACTIVE');
      accountError.code = 'ACCOUNT_TEMPORARILY_INACTIVE';
      throw accountError;
    }
    
    // Handle subscription inactive error (for admins)
    if (response.status === 403 && (data?.code === 'SUBSCRIPTION_INACTIVE' || data?.error?.toLowerCase().includes('subscription'))) {
      const subscriptionError: any = new Error(data?.error || data?.message || 'SUBSCRIPTION_INACTIVE');
      subscriptionError.code = 'SUBSCRIPTION_INACTIVE';
      subscriptionError.subscriptionId = data?.subscriptionId;
      throw subscriptionError;
    }
    
    const error: any = new Error(
      data?.detail || data?.error || data?.message || 'Invalid 2FA code'
    );
    if (data?.errors) {
      error.fields = data.errors;
    }
    throw error;
  }

  // Save tokens
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
 * Response: { access: string }
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

  if (!response.ok) {
    // إذا فشل refresh، احذف tokens وأعد المستخدم إلى صفحة تسجيل الدخول
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  localStorage.setItem('accessToken', data.access);
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
export const getUsersAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/users/');
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

// ==================== Supervisors (company-scoped, admin only) ====================

/** GET /api/supervisors/ - returns paginated { count, next, previous, results } */
export const getSupervisorsAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(`/supervisors/`);
};

/** POST /api/supervisors/ - create supervisor (user + permissions) */
export const createSupervisorAPI = async (data: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
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

/** PUT /api/supervisors/:id/ - update supervisor permissions and user fields */
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
    method: 'PUT',
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

/**
 * الحصول على جميع Clients (Leads في Frontend)
 * GET /api/clients/
 * Query params: ?type=fresh&priority=high&search=name (اختياري)
 * Response: { count, next, previous, results: Client[] }
 */
export const getLeadsAPI = async (filters?: { type?: string; priority?: string; search?: string }) => {
  const queryParams = new URLSearchParams();
  if (filters?.type && filters.type !== 'All') queryParams.append('type', filters.type.toLowerCase());
  if (filters?.priority && filters.priority !== 'All') queryParams.append('priority', filters.priority.toLowerCase());
  if (filters?.search) queryParams.append('search', filters.search);
  
  const queryString = queryParams.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(`/clients/${queryString ? `?${queryString}` : ''}`);
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
export const getDealsAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/deals/');
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
export const getDevelopersAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/developers/');
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }

  // DELETE قد لا يعيد response body
  return;
};

/**
 * الحصول على جميع Projects
 * GET /api/projects/
 */
export const getProjectsAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/projects/');
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }

  // DELETE قد لا يعيد response body
  return;
};

/**
 * الحصول على جميع Units
 * GET /api/units/
 * Query params: ?project=xxx&bedrooms=xxx (اختياري)
 */
export const getUnitsAPI = async (filters?: any) => {
  const queryParams = new URLSearchParams();
  if (filters?.project) queryParams.append('project', filters.project);
  if (filters?.bedrooms) queryParams.append('bedrooms', filters.bedrooms);
  const queryString = queryParams.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(`/units/${queryString ? `?${queryString}` : ''}`);
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/owners/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/services/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/service-packages/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/service-providers/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/products/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/product-categories/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/suppliers/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/campaigns/');
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/tasks/');
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
 * Body: { platform: 'meta' | 'tiktok' | 'whatsapp', name: string, account_link?: string, phone_number?: string }
 */
export const createConnectedAccountAPI = async (accountData: {
  platform: string;
  name: string;
  account_link?: string;
  phone_number?: string;
}) => {
  return apiRequest<any>('/integrations/accounts/', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

/**
 * تحديث حساب تكامل
 * PUT /api/integrations/accounts/:id/
 * Body: { name?: string, account_link?: string, phone_number?: string, is_active?: boolean }
 */
export const updateConnectedAccountAPI = async (accountId: number, accountData: {
  name?: string;
  account_link?: string;
  phone_number?: string;
  is_active?: boolean;
}) => {
  return apiRequest<any>(`/integrations/accounts/${accountId}/`, {
    method: 'PUT',
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

/**
 * بدء عملية OAuth لربط الحساب
 * POST /api/integrations/accounts/:id/connect/
 * Response: { authorization_url: string, state: string }
 */
export const connectIntegrationAccountAPI = async (accountId: number) => {
  return apiRequest<{ authorization_url: string; state: string }>(
    `/integrations/accounts/${accountId}/connect/`,
    {
      method: 'POST',
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
  clientId: number
): Promise<LeadWhatsAppMessageResponse[]> => {
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

export interface MessageTemplateType {
  id: number;
  name: string;
  channel_type: string;
  channel_type_display: string;
  content: string;
  category: string;
  category_display: string;
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
  data: { name?: string; channel_type?: string; content?: string; category?: string }
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

export interface TwilioSettingsResponse {
  id?: number;
  account_sid: string;
  twilio_number: string;
  auth_token_masked?: string | null;
  sender_id: string;
  is_enabled: boolean;
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
  account_sid?: string;
  twilio_number?: string;
  auth_token?: string;
  sender_id?: string;
  is_enabled?: boolean;
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

export interface LeadSMSMessageResponse {
  id: number;
  client: number;
  phone_number: string;
  body: string;
  direction: string;
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
  return apiRequest<{ webhook_url: string; company_id: number }>(
    '/integrations/accounts/tiktok-leadgen-config/'
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
  if (filters?.deal) queryParams.append('deal', filters.deal);
  if (filters?.stage) queryParams.append('stage', filters.stage);
  if (filters?.search) queryParams.append('search', filters.search);
  
  const queryString = queryParams.toString();
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(`/tasks/${queryString ? `?${queryString}` : ''}`);
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
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/client-tasks/');
};

// ==================== Client Calls APIs ====================

/**
 * الحصول على جميع Client Calls
 * GET /api/client-calls/
 */
export const getClientCallsAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/client-calls/');
};

/**
 * إنشاء Client Call جديد
 * POST /api/client-calls/
 * Body: { client, call_method, notes, follow_up_date }
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }
};

/**
 * GET /api/client-events/
 */
export const getClientEventsAPI = async (clientId?: number) => {
  const url = clientId ? `/client-events/?client=${clientId}` : '/client-events/';
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(url);
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }
};

// ==================== Todos APIs ====================
// TODO: يمكن استخدام Tasks API للـ Todos أيضاً، أو إضافة endpoint منفصل

/**
 * الحصول على Todos (يمكن استخدام Tasks API)
 * GET /api/tasks/
 */
export const getTodosAPI = async () => {
  return apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>('/tasks/');
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
  }
) => {
  return apiRequest<any>(`/companies/${companyId}/update_assignment_settings/`, {
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



