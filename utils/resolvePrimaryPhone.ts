import type { PhoneNumber } from '../types';

/** Resolve the lead's primary dial/display number from phone_numbers or legacy phone field. */
export function resolvePrimaryPhone(lead: {
  phone?: string;
  phoneNumbers?: PhoneNumber[];
}): string {
  const numbers = lead.phoneNumbers;
  if (numbers && numbers.length > 0) {
    const primary = numbers.find((p) => p.is_primary) ?? numbers[0];
    if (primary?.phone_number) return primary.phone_number;
  }
  return lead.phone?.trim() ?? '';
}
