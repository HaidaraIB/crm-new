
export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';
export type Page = 
  | 'Dashboard' | 'Leads' | 'Activities' | 'Inventory' | 'Deals' 
  | 'Users' | 'Employees' | 'Marketing'   | 'Todos' | 'Team Chat' | 'Reports' | 'Integrations' 
  | 'Billing' | 'Settings' | 'ViewLead' | 'CreateDeal' | 'EditDeal' | 'CreateLead' | 'EditLead' | 'Profile'
  // Sub-pages
  | 'All Leads' | 'Fresh Leads' | 'Hot Leads' | 'Cold Leads' | 'My Leads' | 'Rotated Leads'
  | 'Properties' | 'Owners'
  | 'Services' | 'Service Packages' | 'Service Providers'
  | 'Products' | 'Product Categories' | 'Suppliers'
  | 'Campaigns'
  | 'Messaging Center'
  | 'Chats'
  | 'Calls'
  | 'Teams Report' | 'Employees Report' | 'Marketing Report'
  | 'Meta' | 'TikTok' | 'WhatsApp' | 'Twilio' | 'AI' | 'Lead API' | 'Mujeb' | 'PBX'
  | 'Call Reports'
  | 'Change Plan' | 'Payment' | 'Subscription' | 'PaymentSuccess'
  | 'Support Center'
  // Auth / onboarding pages
  | 'Login' | 'Register' | 'ForgotPassword' | 'ResetPassword'
  | 'VerifyEmail' | 'VerifyPhone' | 'TwoFactorAuth'
  // Legal pages
  | 'TermsOfService' | 'PrivacyPolicy' | 'DataDeletionPolicy';

export interface Subscription {
  id: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  plan?: {
    id: number;
    name?: string;
    name_ar?: string;
  };
}

export type AutoAssignAlgorithm = 'least_busy' | 'round_robin';

export interface Company {
  id: number;
  name: string;
  domain?: string;
  specialization: 'real_estate' | 'services' | 'products' | 'medical';
  /** IANA timezone for business calendar (weekly day off). */
  timezone?: string;
  auto_assign_enabled?: boolean;
  auto_assign_algorithm?: AutoAssignAlgorithm;
  re_assign_enabled?: boolean;
  re_assign_hours?: number;
  field_visit_enabled?: boolean;
  field_visit_allowed?: boolean;
  field_visit_admin_allowed?: boolean;
  field_visit_admin_message?: string;
  /** True after any paid conversion or expired/forfeited trial — no new time-limited trials. */
  free_trial_consumed?: boolean;
  subscription?: Subscription;
}

/** Supervisor permissions (company CRM, granted by admin) */
export interface SupervisorPermissionsMap {
  can_manage_leads: boolean;
  can_manage_deals: boolean;
  can_manage_tasks: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_manage_real_estate: boolean;
  can_manage_settings: boolean;
}

export interface SupervisorPermissionPayload {
  id: number;
  is_active: boolean;
  permissions: SupervisorPermissionsMap;
  created_at?: string;
  updated_at?: string;
}

export interface Supervisor {
  id: number;
  user: { id: number; username: string; email: string; first_name: string; last_name: string; phone?: string; is_active?: boolean; can_delete_clients?: boolean };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  can_manage_leads: boolean;
  can_manage_deals: boolean;
  can_manage_tasks: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_manage_real_estate: boolean;
  can_manage_settings: boolean;
  /** Stored on User; grantable by company owner */
  can_delete_clients?: boolean;
}

export interface User {
  id: number;
  name?: string; // Computed from first_name + last_name, kept for backward compatibility
  first_name?: string;
  last_name?: string;
  role: string;
  phone: string;
  avatar: string;
  profile_photo?: string;
  email?: string;
  username?: string;
  password?: string;
  company?: Company;
  /** Present on some API payloads when company is not nested */
  company_id?: number;
  emailVerified?: boolean;
  /** Set when role is supervisor (from /users/me/ or login) */
  supervisor_permissions?: SupervisorPermissionPayload | null;
  /** User preferred language (ar/en), synced with API for emails and UI */
  language?: 'ar' | 'en';
  last_seen_at?: string | null;
  last_seen_source?: 'web' | 'mobile' | 'unknown' | string;
  is_online?: boolean;
  /** 0=Mon .. 6=Sun; null/undefined = no fixed weekly day off */
  weekly_day_off?: number | null;
  is_active?: boolean;
  /** When true, employee/supervisor may delete customers (clients) */
  can_delete_clients?: boolean;
}

export interface TimelineWhatsAppThreadMessage {
  id: string | number;
  direction: 'inbound' | 'outbound';
  body: string;
  date: string;
  timestamp: number;
  user: string;
}

export interface TimelineEntry {
  id: string | number; // Support string IDs like 'action-1' or 'event-1'
  user: string;
  avatar: string;
  action: string;
  details: string;
  date: string;
  timestamp: number; // For sorting
  type?: 'action' | 'event' | 'call' | 'visit' | 'field_visit' | 'location_update' | 'sms' | 'whatsapp' | 'whatsapp_thread';
  stage?: string; // Optional: formatted stage name for better display
  color?: string; // Optional: color for the stage or event
  oldValue?: string;
  newValue?: string;
  /** Localized label for which field changed (edit events). */
  fieldLabel?: string;
  callDatetime?: string; // Optional: formatted call datetime for calls
  followUpDate?: string; // Optional: formatted follow-up date for calls
  locationPhotoUrl?: string; // Optional: client location photo for field visits
  recordingUrl?: string; // Optional: WhatsApp call recording playback URL
  recordingStatus?: 'pending' | 'processing' | 'ready' | 'failed' | 'skipped' | string;
  /** Direction for individual WhatsApp timeline rows (before thread collapse). */
  direction?: 'inbound' | 'outbound';
  /** Messages inside a collapsed WhatsApp conversation block. */
  messages?: TimelineWhatsAppThreadMessage[];
}

export interface ClientTask {
  id: number;
  clientId: number;
  stage: string;
  notes: string;
  reminderDate: string | null;
  createdBy: number;
  createdAt: string;
}

export interface PhoneNumber {
  id: number;
  phone_number: string;
  phone_type: 'mobile' | 'home' | 'work' | 'other';
  is_primary: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type MetaQualificationError = { key: string; message: string } | null;

export interface Lead {
  id: number;
  name: string;
  phone: string; // Keep for backward compatibility
  phoneNumbers?: PhoneNumber[]; // New field for multiple phone numbers
  status?: 'Untouched' | 'Touched' | 'Following' | 'Meeting' | 'No Answer' | 'Out Of Service' | 'All' | string; // Optional, can be undefined or any status name from settings
  type: 'Fresh' | 'Cold' | 'My' | 'Rotated' | 'All';
  assignedTo: number; // User ID
  budget: number;
  /** Upper budget bound when stored as a range (API: budget_max); omit or null for a single amount */
  budgetMax?: number | null;
  communicationWay: string;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  // Integration fields
  campaign?: number | null; // Campaign ID
  campaign_name?: string; // Campaign name (from API)
  source?: 'meta_lead_form' | 'whatsapp' | 'tiktok' | 'manual' | 'other' | string; // Lead source
  integration_account?: number | null; // IntegrationAccount ID
  /** Meta Lead Ads: leadgen_id from webhook (read-only from API) */
  metaLeadgenId?: string | null;
  /** Meta Conversion Leads qualification: null | qualified | unqualified */
  metaQualificationStatus?: 'qualified' | 'unqualified' | null;
  metaQualificationSentAt?: string | null;
  metaQualificationError?: MetaQualificationError;
  /** CRM user id who created the lead (API); null for integrations or legacy */
  createdBy?: number | null;
  /** Display name from API (full name or username) */
  createdByName?: string | null;
  // Computed fields (not in API, calculated from ClientTasks)
  lastFeedback?: string; // From last ClientTask notes
  /** Optional notes stored on the lead record (API: notes); not the same as last task feedback */
  notes?: string | null;
  lastStage?: string; // From last ClientTask stage or status
  lastFeedbackAt?: string; // Latest task/call timestamp from API
  leadCompanyName?: string; // Optional company name for the lead
  /** Optional job / occupation (API: profession) */
  profession?: string | null;
  /** Clinic / medical: residence (API: residence) */
  residence?: string | null;
  /** Optional map coordinates (API: location_latitude / location_longitude) */
  locationLatitude?: number | string | null;
  locationLongitude?: number | string | null;
  /** Per-company patient file number (API: patient_file_number), read-only from API */
  patientFileNumber?: number | null;
  /** Real-estate: optional inventory interest (API: interested_developer / _project / _unit) */
  interestedDeveloper?: number | null;
  interestedProject?: number | null;
  interestedUnit?: number | null;
  interestedDeveloperName?: string | null;
  interestedProjectName?: string | null;
  interestedUnitName?: string | null;
  interestedUnitCode?: string | null;
}

export interface LeadFilters {
  status: string; // 'All' or specific status
  type: string; // 'All' or specific type
  priority: string; // 'All' or specific priority
  assignedTo: string; // 'All' or user ID
  communicationWay: string; // 'All' or specific way
  budgetMin: string; // Minimum budget
  budgetMax: string; // Maximum budget
  createdAtFrom: string; // Date from
  createdAtTo: string; // Date to
  search: string; // Search by name or phone
  source: string; // 'All' or source key (manual, meta_lead_form, …)
  campaign: string; // 'All' | 'None' | campaign id
  createdBy: string; // 'All' | 'None' | user id
  interestedDeveloper: string; // 'All' or developer id (real estate)
  interestedProject: string; // 'All' or project id (real estate)
  lastContactedFrom: string;
  lastContactedTo: string;
}

/** WhatsApp Calls inbox filters (drawer + URL deep links). */
export interface CallFilters {
  /** Sidebar status key: all | ringing | answered | missed | no_answer | rejected */
  status: string;
  /** 'All' | inbound | outbound */
  direction: string;
  /** 'All' | 'me' | user id string (owners/supervisors) */
  agent: string;
  /** Lead/client id as string, or '' */
  clientId: string;
  hasRecording: boolean;
  search: string;
}

/** Query params sent to GET /clients/ and /clients/status-counts/ */
export interface LeadApiFilters {
  type?: string | string[];
  priority?: string | string[];
  search?: string;
  status?: string | string[];
  assignedTo?: string | string[];
  assignedToMe?: boolean;
  communicationWay?: string | string[];
  budgetMin?: string;
  budgetMax?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  source?: string | string[];
  campaign?: string | string[];
  createdBy?: string | string[];
  interestedDeveloper?: string | string[];
  interestedProject?: string | string[];
  interestedUnit?: string | string[];
  lastContactedFrom?: string;
  lastContactedTo?: string;
}

export interface Deal {
  id: number;
  clientName: string;
  paymentMethod: string;
  status: string; // For display (Reservation, Contracted, Closed)
  stage: 'won' | 'lost' | 'on_hold' | 'in_progress' | 'cancelled'; // API stage field
  value: number;
  /** Optional follow-up reminder datetime (ISO string) */
  reminderDate?: string | null;
  leadId?: number;
  client?: number; // API client ID
  employee?: number; // API employee ID
  startedBy?: number; // user ID
  closedBy?: number; // user ID
  startDate?: string;
  closedDate?: string;
  discountPercentage?: number;
  discountAmount?: number;
  salesCommissionPercentage?: number;
  salesCommissionAmount?: number;
  description?: string;
  /** Real estate: unit id, code, or nested object from API */
  unit?: number | string | { id: number; code?: string; name?: string } | null;
  /** Real estate: project id, name, or nested object from API */
  project?: number | string | { id: number; name?: string } | null;
  unit_code?: string; // Read-only field from API serializer
  project_name?: string; // Read-only field from API serializer
  createdAt?: string;
  updatedAt?: string;
}

export interface DealFilters {
  status: string; // 'All' or specific status
  paymentMethod: string; // 'All' or specific payment method
  unit: string; // 'All' or specific unit (for real estate)
  project: string; // 'All' or specific project (for real estate)
  valueMin: string; // Minimum value
  valueMax: string; // Maximum value
  search: string; // Search by client name or deal ID
}

// TaskStage enum values matching API TaskStage enum
export type TaskStage = 
  | 'following'
  | 'meeting'
  | 'done_meeting'
  | 'follow_after_meeting'
  | 'reschedule_meeting'
  | 'cancellation'
  | 'no_answer'
  | 'out_of_service'
  | 'not_interested'
  | 'whatsapp_pending'
  | 'hold'
  | 'broker'
  | 'resale';

export interface Activity {
  id: number;
  user: string;
  lead: string;
  stage: TaskStage; // Changed from 'type' to 'stage' to match API
  date: string;
  notes: string;
}

export interface ActivityFilters {
  user: string; // 'All' or user ID
  stage: string; // 'All' or specific stage
  leadType: string; // 'All', 'Fresh', 'Cold'
  timePeriod: string; // 'All', 'today', 'yesterday', 'last7', 'thisMonth'
  dateFrom: string; // Date from
  dateTo: string; // Date to
  search: string; // Search by lead name or notes
}

// Inventory Filters
export interface DeveloperFilters {
  search: string;
}

export interface ProjectFilters {
  developer: string; // 'All' or developer name
  type: string; // 'All' or specific type
  city: string; // 'All' or specific city
  paymentMethod: string; // 'All' or specific payment method
  search: string;
}

export interface UnitFilters {
  project: string; // 'All' or project id (stringified)
  type: string; // 'All' or specific type
  finishing: string; // 'All' or specific finishing
  city: string; // 'All' or specific city
  district: string; // 'All' or specific district
  zone: string; // 'All' or specific zone
  isSold: string; // 'All', 'true', 'false'
  bedrooms: string; // 'All' or number
  bathrooms: string; // 'All' or number
  priceMin: string;
  priceMax: string;
  search: string;
}

export interface OwnerFilters {
  city: string; // 'All' or specific city
  district: string; // 'All' or specific district
  search: string;
}

export interface ProductFilters {
  category: string; // 'All' or category name
  supplier: string; // 'All' or supplier name
  isActive: string; // 'All', 'true', 'false'
  stockMin: string;
  stockMax: string;
  priceMin: string;
  priceMax: string;
  search: string;
}

export interface ProductCategoryFilters {
  search: string;
}

export interface SupplierFilters {
  specialization: string; // 'All' or specific specialization
  search: string;
}

export interface ServiceFilters {
  category: string; // 'All' or category name
  provider: string; // 'All' or provider name
  isActive: string; // 'All', 'true', 'false'
  priceMin: string;
  priceMax: string;
  search: string;
}

export interface ServicePackageFilters {
  isActive: string; // 'All', 'true', 'false'
  priceMin: string;
  priceMax: string;
  search: string;
}

export interface ServiceProviderFilters {
  specialization: string; // 'All' or specific specialization
  search: string;
}

export interface Todo {
  id: number;
  stage: TaskStage; // Changed from 'type' to 'stage' to match API
  leadName: string;
  leadPhone: string;
  dueDate: string;
}

export interface Campaign {
  id: number;
  name: string;
  code: string;
  budget: number;
  createdAt: string;
  isActive: boolean;
}

export interface CampaignFilters {
  isActive: string; // 'All', 'true', 'false'
  budgetMin: string; // Minimum budget
  budgetMax: string; // Maximum budget
  createdAtFrom: string; // Date from
  createdAtTo: string; // Date to
  search: string; // Search by name or code
}

export interface TeamsReportFilters {
  selectedTeam: string; // 'all' or user ID
  leadType: string; // 'all', 'fresh', 'cold'
  startDate: string;
  endDate: string;
}

export interface EmployeesReportFilters {
  leadType: string; // 'all', 'fresh', 'cold'
  startDate: string;
  endDate: string;
}

export interface MarketingReportFilters {
  selectedCampaign: string; // 'all' or campaign ID
  startDate: string;
  endDate: string;
}

export interface Developer {
  id: number;
  code: string;
  name: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  /** Developer id, name, or nested object from API */
  developer: string | number | { id: number; name?: string } | null;
  type: string;
  city: string;
  paymentMethod: string;
}

export interface Unit {
  id: number;
  code: string;
  /** Optional display name when API provides it */
  name?: string;
  /** Project id, name, or nested object from API */
  project: string | number | { id: number; name?: string } | null;
  bedrooms: number;
  price: number;
  bathrooms: number;
  type: string;
  finishing: string;
  city: string;
  district: string;
  zone: string;
  lounge?: number;
  area?: number;
  currency?: string;
  isSold: boolean;
}

export interface Owner {
  id: number;
  code: string;
  city: string;
  district: string;
  name: string;
  phone: string;
}

// Services Types
export interface Service {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  duration: string; // e.g., "1 hour", "30 minutes"
  category: string;
  /** Provider id or name from API */
  provider?: string | number;
  isActive: boolean;
}

export interface ServicePackage {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  services: number[]; // Service IDs
  duration: string;
  isActive: boolean;
}

export interface ServiceProvider {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  rating?: number;
}

// Products Types
export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  /** Category id or name from API */
  category: string | number;
  /** Supplier id or name from API */
  supplier?: string | number;
  sku?: string;
  image?: string;
  isActive: boolean;
}

export interface ProductCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  parentCategory?: number; // For nested categories
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  specialization: string;
}

// Settings Page Types
export interface Channel {
    id: number;
    name: string;
    type: string;
    priority: 'High' | 'Medium' | 'Low';
    isDefault?: boolean;
    is_default?: boolean;
}

export interface Stage {
    id: number;
    name: string;
    description: string;
    color: string;
    required: boolean;
    autoAdvance: boolean;
    isDefault?: boolean;
}

export interface Status {
    id: number;
    name: string;
    description: string;
    category: 'Active' | 'Inactive' | 'Follow Up' | 'Closed';
    color: string;
    isDefault?: boolean;
    is_default?: boolean;
    isHidden?: boolean;
    /** Hours in this status before scheduled hard-delete; null/undefined = disabled */
    auto_delete_after_hours?: number | null;
}

// Helper function to get user display name
export const getUserDisplayName = (user: User): string => {
    if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.name || user.username || user.email || `User ${user.id}`;
};