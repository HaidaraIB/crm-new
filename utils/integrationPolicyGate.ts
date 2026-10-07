import type { Page } from '../types';
import { getIntegrationPolicyAPI } from '../services/api';

export type IntegrationPlatform =
  | 'meta'
  | 'tiktok'
  | 'whatsapp'
  | 'twilio'
  | 'otpiq'
  | 'openai'
  | 'api'
  | 'mujeb'
  | 'meta_inbox';

/** Pages that should show the admin policy warning instead of opening into a 403. */
export const integrationPlatformByPage: Partial<Record<Page, IntegrationPlatform>> = {
  Integrations: 'meta',
  Meta: 'meta',
  TikTok: 'tiktok',
  WhatsApp: 'whatsapp',
  Chats: 'whatsapp',
  'Messaging Center': 'whatsapp',
  Calls: 'whatsapp',
  Inbox: 'meta_inbox',
  Twilio: 'twilio',
  AI: 'openai',
  'Lead API': 'api',
  Mujeb: 'mujeb',
};

export type IntegrationPolicyEntry = { enabled: boolean; message: string; scope: string };

export function pageHasIntegrationPolicy(page: Page): boolean {
  return integrationPlatformByPage[page] != null;
}

/**
 * Policy that should block this page, or null if it may open.
 * A failed policy fetch does not block navigation.
 */
export async function blockedPolicyForPage(
  page: Page,
  companyId: number | string | undefined | null,
): Promise<IntegrationPolicyEntry | null> {
  if (companyId == null || companyId === '' || !pageHasIntegrationPolicy(page)) return null;
  let policies: Record<string, IntegrationPolicyEntry>;
  try {
    policies = await getIntegrationPolicyAPI();
  } catch {
    return null;
  }
  if (page === 'Twilio') {
    const twilioOk = policies?.twilio?.enabled !== false;
    const otpiqOk = policies?.otpiq?.enabled !== false;
    if (twilioOk || otpiqOk) return null;
    return (policies?.otpiq?.enabled === false ? policies.otpiq : policies?.twilio) ?? null;
  }
  const policy = policies?.[integrationPlatformByPage[page]!];
  if (policy && policy.enabled === false) return policy;
  return null;
}
