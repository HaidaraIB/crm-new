/**
 * Meta WhatsApp Embedded Signup: FB JS SDK + FB.login with config_id (Facebook Login for Business).
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
 */

export type WhatsAppEmbeddedSignupSdkConfig = {
  app_id: string;
  config_id: string;
  graph_api_version: string;
};

export type WhatsAppEmbeddedSignupResult = {
  code: string | null;
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  signup_event?: string;
};

let lastFbInitKey: string | null = null;

function loadFacebookSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as unknown as { FB?: unknown }).FB) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) {
      const deadline = Date.now() + 20000;
      const t = setInterval(() => {
        if ((window as unknown as { FB?: unknown }).FB) {
          clearInterval(t);
          resolve();
        } else if (Date.now() > deadline) {
          clearInterval(t);
          reject(new Error('Facebook SDK load timeout'));
        }
      }, 50);
      return;
    }

    (window as unknown as { fbAsyncInit?: () => void }).fbAsyncInit = () => {
      resolve();
    };

    const js = document.createElement('script');
    js.id = id;
    js.async = true;
    js.crossOrigin = 'anonymous';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.body.appendChild(js);
  });
}

function normalizeGraphVersion(v: string): string {
  const s = (v || 'v18.0').trim();
  return s.startsWith('v') ? s : `v${s}`;
}

function parseEmbeddedSignupMessage(event: MessageEvent): Partial<WhatsAppEmbeddedSignupResult> | null {
  if (!event.origin.endsWith('facebook.com')) return null;
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (!data || data.type !== 'WA_EMBEDDED_SIGNUP' || !data.data) return null;
    const payload = data.data as Record<string, unknown>;
    const out: Partial<WhatsAppEmbeddedSignupResult> = { signup_event: data.event };
    if (payload.phone_number_id != null) out.phone_number_id = String(payload.phone_number_id);
    if (payload.waba_id != null) out.waba_id = String(payload.waba_id);
    if (payload.business_id != null) out.business_id = String(payload.business_id);
    return out;
  } catch {
    return null;
  }
}

/**
 * Opens Meta Embedded Signup UI and returns the authorization code plus session asset IDs
 * (phone_number_id, waba_id) from Meta's WA_EMBEDDED_SIGNUP postMessage.
 */
export async function obtainWhatsAppEmbeddedSignupCode(
  cfg: WhatsAppEmbeddedSignupSdkConfig
): Promise<WhatsAppEmbeddedSignupResult> {
  await loadFacebookSdk();
  const FB = (window as unknown as { FB?: { init: (o: Record<string, unknown>) => void; login: (cb: (r: unknown) => void, opts: Record<string, unknown>) => void } }).FB;
  if (!FB) {
    throw new Error('Facebook SDK is not available');
  }

  const version = normalizeGraphVersion(cfg.graph_api_version);
  const initKey = `${cfg.app_id}|${version}`;
  if (lastFbInitKey !== initKey) {
    FB.init({
      appId: cfg.app_id,
      cookie: true,
      xfbml: true,
      version,
    });
    lastFbInitKey = initKey;
  }

  const session: Partial<WhatsAppEmbeddedSignupResult> = {};
  const onMessage = (event: MessageEvent) => {
    const parsed = parseEmbeddedSignupMessage(event);
    if (!parsed) return;
    if (parsed.phone_number_id) session.phone_number_id = parsed.phone_number_id;
    if (parsed.waba_id) session.waba_id = parsed.waba_id;
    if (parsed.business_id) session.business_id = parsed.business_id;
    if (parsed.signup_event) session.signup_event = parsed.signup_event;
  };
  window.addEventListener('message', onMessage);

  try {
    const code = await new Promise<string | null>((resolve) => {
      FB.login(
        (response: unknown) => {
          const r = response as { authResponse?: { code?: string } };
          resolve(r?.authResponse?.code ?? null);
        },
        {
          config_id: cfg.config_id,
          response_type: 'code',
          override_default_response_type: true,
        }
      );
    });

    // WA_EMBEDDED_SIGNUP postMessage often arrives after the FB.login callback.
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (session.phone_number_id && session.waba_id) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    return { code, ...session };
  } finally {
    window.removeEventListener('message', onMessage);
  }
}
