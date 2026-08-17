import { buildInterestedInventoryApiBody } from '../components/LeadInterestInventoryFields';
import { buildLeadLocationApiBody } from './leadLocation';
import { buildUpdateDiff } from './buildUpdateDiff';

export type LeadEditFormLike = {
  name: string;
  phone: string;
  budget: string;
  budgetMax: string;
  assignedTo: string;
  type: string;
  communicationWay: string;
  priority: string;
  isUrgent: boolean;
  status: string;
  leadCompanyName: string;
  profession: string;
  residence: string;
  locationLatitude: string;
  locationLongitude: string;
  notes: string;
  interestedDeveloper: string;
  interestedProject: string;
  interestedUnit: string;
};

export type LeadPhoneRowLike = {
  phone_number: string;
  phone_type?: string;
  is_primary?: boolean;
  notes?: string;
  id?: number;
};

type BuildLeadUpdatePayloadArgs = {
  formState: LeadEditFormLike;
  phoneNumbers: LeadPhoneRowLike[];
  channels: Array<{ id: number; name: string }>;
  statuses: Array<{ id: number; name: string }>;
  /** Selected tag ids; sorted into the payload so the diff ignores pick order */
  tagIds?: number[];
  companyId: number;
  specialization?: string;
};

/** Canonical API body for a lead edit form (same shape every save). */
export function buildLeadUpdatePayload({
  formState,
  phoneNumbers,
  channels,
  statuses,
  tagIds,
  companyId,
  specialization,
}: BuildLeadUpdatePayloadArgs): Record<string, unknown> {
  const finalPhoneNumbers =
    phoneNumbers.length > 0
      ? phoneNumbers
          .filter((pn) => pn.phone_number.trim() !== '')
          .map((pn) => ({
            phone_number: pn.phone_number.trim(),
            phone_type: pn.phone_type || 'mobile',
            is_primary: Boolean(pn.is_primary),
            notes: pn.notes || '',
          }))
      : formState.phone
        ? [
            {
              phone_number: formState.phone.trim(),
              phone_type: 'mobile',
              is_primary: true,
              notes: '',
            },
          ]
        : [];

  const channelId = formState.communicationWay
    ? channels.find(
        (c) =>
          c.id.toString() === formState.communicationWay ||
          c.name === formState.communicationWay
      )?.id ?? null
    : null;
  const statusId = formState.status
    ? statuses.find(
        (s) => s.id.toString() === formState.status || s.name === formState.status
      )?.id ?? null
    : null;

  const priorityValue = formState.priority
    ? (formState.priority.toLowerCase() as 'low' | 'medium' | 'high')
    : null;
  const typeValue = formState.type
    ? (formState.type.toLowerCase() as 'fresh' | 'hot' | 'cold')
    : null;

  const primaryPhone =
    finalPhoneNumbers.find((pn) => pn.is_primary)?.phone_number ||
    finalPhoneNumbers[0]?.phone_number ||
    '';

  const payload: Record<string, unknown> = {
    name: formState.name,
    phone_numbers: finalPhoneNumbers,
    budget: formState.budget ? Number(formState.budget) : null,
    budget_max: formState.budgetMax?.trim() ? Number(formState.budgetMax) : null,
    assigned_to: formState.assignedTo ? Number(formState.assignedTo) : null,
    type: typeValue,
    communication_way: channelId,
    priority: priorityValue,
    is_urgent: Boolean(formState.isUrgent),
    status: statusId,
    tags: [...(tagIds ?? [])].sort((a, b) => a - b),
    company: companyId,
    lead_company_name: formState.leadCompanyName?.trim() || null,
    profession: formState.profession?.trim() || null,
    residence: formState.residence?.trim() ? formState.residence.trim() : null,
    notes: formState.notes?.trim() ? formState.notes.trim() : null,
    ...buildLeadLocationApiBody(formState.locationLatitude, formState.locationLongitude),
    ...buildInterestedInventoryApiBody(specialization, {
      interestedDeveloper: formState.interestedDeveloper,
      interestedProject: formState.interestedProject,
      interestedUnit: formState.interestedUnit,
    }),
  };

  if (primaryPhone) {
    payload.phone_number = primaryPhone;
  }

  return payload;
}

/** Sparse PATCH body: only keys that differ from the snapshot taken at form load. */
export function buildLeadUpdateDiff(
  initial: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> {
  return buildUpdateDiff(initial, next, { phoneListKeys: ['phone_numbers'] });
}
