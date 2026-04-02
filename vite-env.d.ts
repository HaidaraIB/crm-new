/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Same as Django `API_KEY_WEB`; sent as X-API-Key */
  readonly VITE_API_KEY_WEB?: string;
  /** @deprecated use VITE_API_KEY_WEB */
  readonly VITE_API_KEY?: string;
  readonly VITE_BASE_DOMAIN?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

