/**
 * Display helpers for WhatsApp Messaging Center contact rows.
 * Never use tenant `company_name` (API serializer maps company.name) as the contact title.
 */

export type WhatsAppContactLike = {
  id?: number | string;
  name?: string | null;
  lead_company_name?: string | null;
  phone_number?: string | null;
  phone?: string | null;
  company_name?: string | null;
  is_manual?: boolean;
  [k: string]: unknown;
};

export function getWhatsAppContactTitle(c: WhatsAppContactLike | null | undefined): string {
  if (!c) return '';
  const name = String(c.name || '').trim();
  if (name) return name;
  const leadCompany = String(c.lead_company_name || '').trim();
  if (leadCompany) return leadCompany;
  const phone = String(c.phone_number || c.phone || '').trim();
  if (phone) return phone;
  if (c.id != null && c.id !== '') return `#${c.id}`;
  return '';
}

export function getWhatsAppContactSubtitle(c: WhatsAppContactLike | null | undefined): string {
  if (!c) return '';
  const name = String(c.name || '').trim();
  const leadCompany = String(c.lead_company_name || '').trim();
  const phone = String(c.phone_number || c.phone || '').trim();
  if (name && leadCompany) return leadCompany;
  if (name && phone) return phone;
  if (leadCompany && phone && getWhatsAppContactTitle(c) === leadCompany) return phone;
  return phone && getWhatsAppContactTitle(c) !== phone ? phone : '';
}

export function getWhatsAppContactAvatarLabel(c: WhatsAppContactLike | null | undefined): string {
  const title = getWhatsAppContactTitle(c);
  const digitsOnly = title.replace(/\s/g, '').replace(/\D/g, '') === title.replace(/\s/g, '');
  if (title && !digitsOnly) {
    return title.charAt(0).toUpperCase();
  }
  const phone = String(c?.phone_number || c?.phone || (digitsOnly ? title : '') || '').replace(/\D/g, '');
  if (phone.length >= 2) return phone.slice(-2);
  if (phone.length === 1) return phone;
  return '?';
}
