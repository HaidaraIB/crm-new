import { Page } from '../../types';
import { IntegrationPlatform } from '../../components/integrations/IntegrationPlatformIcon';

export type IntegrationCategory = 'leads' | 'messaging' | 'communication' | 'ai' | 'developer';

export type IntegrationTabDef = {
  id: string;
  labelKey: string;
  policyKey?: string;
};

export type IntegrationEntry = {
  page: Page;
  titleKey: string;
  descriptionKey: string;
  category: IntegrationCategory;
  policyKeys: string[];
  helpVideoPageKey: string;
  platform?: IntegrationPlatform;
  overviewKey: string;
  tabs?: IntegrationTabDef[];
};

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  'leads',
  'messaging',
  'communication',
  'ai',
  'developer',
];

export const CATEGORY_LABEL_KEY: Record<IntegrationCategory, string> = {
  leads: 'integrationCategoryLeads',
  messaging: 'integrationCategoryMessaging',
  communication: 'integrationCategoryCommunication',
  ai: 'integrationCategoryAi',
  developer: 'integrationCategoryDeveloper',
};

export const INTEGRATIONS: IntegrationEntry[] = [
  {
    page: 'Meta',
    titleKey: 'meta',
    descriptionKey: 'integrationHubMetaDesc',
    category: 'leads',
    policyKeys: ['meta', 'meta_inbox'],
    helpVideoPageKey: 'meta',
    platform: 'meta',
    overviewKey: 'meta',
    tabs: [
      { id: 'leadAds', labelKey: 'metaTabLeadAds', policyKey: 'meta' },
      { id: 'inbox', labelKey: 'connectInstagramMessenger', policyKey: 'meta_inbox' },
    ],
  },
  {
    page: 'TikTok',
    titleKey: 'tikTok',
    descriptionKey: 'integrationHubTiktokDesc',
    category: 'leads',
    policyKeys: ['tiktok'],
    helpVideoPageKey: 'tiktok',
    platform: 'tiktok',
    overviewKey: 'tiktok',
  },
  {
    page: 'WhatsApp',
    titleKey: 'whatsApp',
    descriptionKey: 'integrationHubWhatsappDesc',
    category: 'messaging',
    policyKeys: ['whatsapp', 'whatsapp_inbox'],
    helpVideoPageKey: 'whatsapp',
    platform: 'whatsapp',
    overviewKey: 'whatsapp',
    tabs: [
      { id: 'crm', labelKey: 'whatsApp', policyKey: 'whatsapp' },
      { id: 'inbox', labelKey: 'whatsappInboxTab', policyKey: 'whatsapp_inbox' },
    ],
  },
  {
    page: 'Twilio',
    titleKey: 'twilio',
    descriptionKey: 'integrationHubSmsDesc',
    category: 'messaging',
    policyKeys: ['twilio', 'otpiq'],
    helpVideoPageKey: 'twilio',
    platform: 'sms',
    overviewKey: 'sms',
  },
  {
    page: 'AI',
    titleKey: 'ai',
    descriptionKey: 'integrationHubAiDesc',
    category: 'ai',
    policyKeys: ['openai'],
    helpVideoPageKey: 'ai',
    overviewKey: 'openai',
  },
  {
    page: 'Lead API',
    titleKey: 'leadApi',
    descriptionKey: 'integrationHubLeadApiDesc',
    category: 'developer',
    policyKeys: ['api'],
    helpVideoPageKey: 'lead_api',
    overviewKey: 'api',
  },
  {
    page: 'Mujeb',
    titleKey: 'mujeb',
    descriptionKey: 'integrationHubMujebDesc',
    category: 'leads',
    policyKeys: ['mujeb'],
    helpVideoPageKey: 'mujeb',
    overviewKey: 'mujeb',
  },
  {
    page: 'PBX',
    titleKey: 'pbxIntegration',
    descriptionKey: 'integrationHubPbxDesc',
    category: 'communication',
    policyKeys: ['pbx'],
    helpVideoPageKey: 'pbx',
    overviewKey: 'pbx',
  },
];

export function integrationByPage(page: Page): IntegrationEntry | undefined {
  return INTEGRATIONS.find((entry) => entry.page === page);
}
