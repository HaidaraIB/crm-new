import { Lead, MetaQualificationError } from '../types';

function normalizeMetaQualificationError(raw: unknown): MetaQualificationError {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return { key: raw, message: '' };
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const key = String(obj.key ?? obj.error_key ?? '');
    const message = String(obj.message ?? '');
    if (!key) return null;
    return { key, message };
  }
  return null;
}

/** Normalize lead from API (snake_case) for forms and display. */
export function normalizeLead(lead: any): any {
  if (!lead) return lead;
  return {
    ...lead,
    leadCompanyName: lead.leadCompanyName ?? lead.lead_company_name ?? undefined,
    profession: lead.profession ?? undefined,
    residence: lead.residence ?? undefined,
    locationLatitude: lead.locationLatitude ?? lead.location_latitude ?? undefined,
    locationLongitude: lead.locationLongitude ?? lead.location_longitude ?? undefined,
    patientFileNumber: lead.patientFileNumber ?? lead.patient_file_number ?? undefined,
    budgetMax: lead.budgetMax ?? lead.budget_max ?? undefined,
    lastFeedback: lead.lastFeedback ?? lead.last_feedback ?? undefined,
    lastStage: lead.lastStage ?? lead.last_stage ?? undefined,
    lastFeedbackAt: lead.lastFeedbackAt ?? lead.last_feedback_at ?? undefined,
    createdBy: lead.createdBy ?? lead.created_by ?? null,
    createdByName: lead.createdByName ?? lead.created_by_name ?? null,
    notes: lead.notes ?? undefined,
    interestedDeveloper: lead.interestedDeveloper ?? lead.interested_developer ?? null,
    interestedProject: lead.interestedProject ?? lead.interested_project ?? null,
    interestedUnit: lead.interestedUnit ?? lead.interested_unit ?? null,
    interestedDeveloperName: lead.interestedDeveloperName ?? lead.interested_developer_name ?? null,
    interestedProjectName: lead.interestedProjectName ?? lead.interested_project_name ?? null,
    interestedUnitName: lead.interestedUnitName ?? lead.interested_unit_name ?? null,
    interestedUnitCode: lead.interestedUnitCode ?? lead.interested_unit_code ?? null,
    metaLeadgenId: lead.metaLeadgenId ?? lead.meta_leadgen_id ?? null,
    metaQualificationStatus: lead.metaQualificationStatus ?? lead.meta_qualification_status ?? null,
    metaQualificationSentAt: lead.metaQualificationSentAt ?? lead.meta_qualification_sent_at ?? null,
    metaQualificationError: normalizeMetaQualificationError(
      lead.metaQualificationError ?? lead.meta_qualification_error ?? null
    ),
  };
}

/** Map API list/detail payload to the Lead shape used by view/edit pages. */
export function mapApiLeadToDisplayLead(apiLead: any): Lead {
  const base = normalizeLead(apiLead);
  const transformedLead: Lead = {
    id: base.id,
    name: base.name,
    phone: base.phone_number || base.phone || '',
    phoneNumbers: base.phone_numbers || base.phoneNumbers || [],
    status: base.status_name || base.status || '',
    type: base.type || '',
    assignedTo: base.assigned_to ?? base.assignedTo ?? 0,
    budget: base.budget || 0,
    budgetMax: base.budgetMax,
    communicationWay: base.communication_way_name || base.communicationWay || '',
    priority: base.priority || '',
    createdAt: base.created_at || base.createdAt || '',
    lastFeedback: base.lastFeedback || '',
    notes: base.notes ?? '',
    campaign: base.campaign || null,
    campaign_name: base.campaign_name || (base.campaign ? String(base.campaign) : null),
    source: base.source || 'manual',
    integration_account: base.integration_account || null,
    metaLeadgenId: base.metaLeadgenId,
    metaQualificationStatus: base.metaQualificationStatus,
    metaQualificationSentAt: base.metaQualificationSentAt,
    metaQualificationError: base.metaQualificationError,
    leadCompanyName: base.leadCompanyName,
    profession: base.profession,
    residence: base.residence,
    patientFileNumber: base.patientFileNumber,
    locationLatitude: base.locationLatitude,
    locationLongitude: base.locationLongitude,
    interestedDeveloper: base.interestedDeveloper,
    interestedProject: base.interestedProject,
    interestedUnit: base.interestedUnit,
    interestedDeveloperName: base.interestedDeveloperName,
    interestedProjectName: base.interestedProjectName,
    interestedUnitName: base.interestedUnitName,
    interestedUnitCode: base.interestedUnitCode,
  };
  (transformedLead as any).assigned_to = base.assigned_to;
  (transformedLead as any).assigned_to_username = base.assigned_to_username;
  (transformedLead as any).created_by = base.created_by;
  (transformedLead as any).created_by_name = base.created_by_name;
  return transformedLead;
}
