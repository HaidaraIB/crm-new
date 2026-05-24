type FieldVisitCompany = {
  field_visit_allowed?: boolean;
  field_visit_enabled?: boolean;
  field_visit_admin_allowed?: boolean;
} | null | undefined;

/** True only when field visits are enabled for this company (admin + owner). */
export function isFieldVisitAllowed(company: FieldVisitCompany): boolean {
  if (!company) return false;
  if (typeof company.field_visit_allowed === 'boolean') {
    return company.field_visit_allowed;
  }
  if (company.field_visit_admin_allowed === false) return false;
  if (company.field_visit_enabled === false) return false;
  return true;
}
