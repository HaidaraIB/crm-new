/**
 * Meta WhatsApp Embedded Signup: FB JS SDK + FB.login with config_id (Facebook Login for Business).
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation
 */

export type WhatsAppEmbeddedSignupSdkConfig = {
  app_id: string;
  config_id: string;
  graph_api_version: string;
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

/**
 * Opens Meta Embedded Signup UI and returns the authorization code for server-side exchange.
 * Returns null if the user cancels or login does not return a code.
 */
export async function obtainWhatsAppEmbeddedSignupCode(
  cfg: WhatsAppEmbeddedSignupSdkConfig
): Promise<string | null> {
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

  return new Promise((resolve) => {
    FB.login(
      (response: unknown) => {
        const r = response as { authResponse?: { code?: string } };
        const code = r?.authResponse?.code;
        resolve(code ?? null);
      },
      {
        config_id: cfg.config_id,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  });
}
