/** Types for GET /reports/v2/<section>/ (see CRM-api-1/reports/). Durations are always seconds. */

export type ReportSection =
  | 'overview'
  | 'leads'
  | 'status-journey'
  | 'response-time'
  | 'employees'
  | 'sources'
  | 'calls'
  | 'deals';

export type ReportGranularity = 'hour' | 'day' | 'week' | 'month';

export type ReportQuery = {
  /** ISO-8601; a datetime without offset is read in the company timezone, a bare date means the whole day. */
  start: string;
  end: string;
  compare?: boolean;
  granularity?: ReportGranularity;
  user_ids?: number[];
  status_ids?: number[];
  sources?: string[];
  campaign_ids?: number[];
  channel_ids?: number[];
  lead_types?: string[];
};

export type ReportMeta = {
  section: ReportSection;
  start: string;
  end: string;
  timezone: string;
  granularity: ReportGranularity;
  data_quality: {
    live_history_since: string | null;
    backfilled_share: number;
    has_backfilled: boolean;
  };
};

export type DurationStats = { count: number; avg: number | null; median: number | null; p90: number | null };
export type ResponseStats = { wall: DurationStats; business: DurationStats };
export type SeriesPoint = { bucket: string } & Record<string, number | string>;
export type CountRow = { key: string | number | null; label: string; count: number };

export type OverviewMetrics = {
  new_leads: number;
  assignments: number;
  leads_worked: number;
  response_time: ResponseStats;
  within_sla_pct: number | null;
  sla_seconds: number;
  status_changes: number;
  calls: number;
  deals_won: number;
  revenue: number;
  conversion_rate: number | null;
  unanswered_customer_messages: number;
};

export type OverviewReport = {
  current: OverviewMetrics;
  previous: OverviewMetrics | null;
  previous_range?: { start: string; end: string };
  series: Array<{ bucket: string; new_leads: number }>;
  meta: ReportMeta;
};

export type StatusAsOfRow = {
  status_id: number | null;
  status: string;
  color: string | null;
  category: string | null;
  count: number;
};

export type LeadsReport = {
  total: number;
  unassigned: number;
  series: Array<{ bucket: string; new_leads: number }>;
  funnel: { created: number; assigned: number; touched: number; untouched: number };
  by_source: CountRow[];
  by_campaign: CountRow[];
  by_channel: CountRow[];
  by_type: CountRow[];
  by_assignee: CountRow[];
  status_as_of_end: StatusAsOfRow[];
  status_as_of_start: StatusAsOfRow[] | null;
  meta: ReportMeta;
};

export type StatusJourneyReport = {
  transitions: number;
  leads_with_changes: number;
  matrix: Array<{
    from: string;
    from_status_id: number | null;
    to: string;
    to_status_id: number | null;
    count: number;
  }>;
  sankey: {
    nodes: Array<{ name: string }>;
    links: Array<{ source: number; target: number; value: number }>;
  };
  entered: Array<{ status_id: number | null; status: string; entries: number; leads: number }>;
  time_in_status: Array<{ status: string } & DurationStats>;
  common_paths: Array<{ path: string; leads: number }>;
  reopened: number;
  by_source: Array<{ source: string; count: number }>;
  meta: ReportMeta;
};

export type ResponseBucketKey = 'lt_5m' | '5_15m' | '15_60m' | '1_4h' | '4_24h' | 'gt_24h' | 'no_response';

export type ResponseEmployeeRow = {
  user_id: number;
  name: string;
  assignments: number;
  responded: number;
  pending: number;
  missed: number;
  wall: DurationStats;
  business: DurationStats;
  within_sla: number;
  within_sla_pct: number | null;
};

export type ResponseTimeReport = {
  sla_seconds: number;
  summary: {
    assignments: number;
    responded: number;
    pending: number;
    wall: DurationStats;
    business: DurationStats;
  };
  employees: ResponseEmployeeRow[];
  distribution: Record<'business' | 'wall', Array<{ bucket: ResponseBucketKey; count: number }>>;
  /** [weekday Mon=0..Sun=6][hour 0..23] in the company timezone. */
  heatmap: Array<Array<{ count: number; avg_business: number | null }>>;
  by_kind: Array<{ kind: string; count: number }>;
  oldest_pending: Array<{
    client_id: number;
    client: string;
    user_id: number;
    user: string;
    assigned_at: string;
    waiting_seconds: number;
    waiting_business_seconds: number;
  }>;
  conversation_replies: {
    total: number;
    by_channel: Array<{ channel: string; count: number } & ResponseStats>;
    by_employee: Array<{ user_id: number | null; name: string; count: number } & ResponseStats>;
  };
  meta: ReportMeta;
};

export type CallBreakdown = { total: number; answered: number; missed: number; unknown: number };

export type EmployeesReport = {
  rows: Array<{
    user_id: number;
    name: string;
    role: string;
    leads_assigned: number;
    leads_touched: number;
    touch_rate: number | null;
    response_wall: DurationStats;
    response_business: DurationStats;
    calls: CallBreakdown;
    tasks: number;
    visits: number;
    whatsapp_sent: number;
    sms_sent: number;
    status_changes: number;
    deals_created: number;
    deals_won: number;
    revenue: number;
    worked_seconds: number;
  }>;
  totals: {
    leads_assigned: number;
    leads_touched: number;
    calls: number;
    deals_won: number;
    revenue: number;
    worked_seconds: number;
  };
  work_hours_tracking_enabled: boolean;
  meta: ReportMeta;
};

export type SourceRow = {
  key: string | number | null;
  label: string;
  leads: number;
  converted_leads: number;
  conversion_rate: number;
  deals_won: number;
  revenue: number;
  avg_business_response_seconds: number | null;
  budget?: number | null;
  cost_per_lead?: number | null;
};

export type SourcesReport = { by_source: SourceRow[]; by_campaign: SourceRow[]; meta: ReportMeta };

export type CallsReport = {
  summary: CallBreakdown & { by_source: Record<string, number>; avg_recorded_duration_seconds: number | null };
  by_user: Array<{ id: number; name: string } & CallBreakdown>;
  by_method: Array<{ name: string } & CallBreakdown>;
  by_hour: number[];
  series: Array<{ bucket: string; calls: number }>;
  meta: ReportMeta;
};

export type DealsReport = {
  summary: {
    created: number;
    won: number;
    lost: number;
    revenue: number;
    win_rate: number | null;
    avg_cycle_days: number | null;
  };
  series: Array<{ bucket: string; won: number; revenue: number }>;
  lost_reasons: Array<{ reason: string; count: number }>;
  stage_movement: Array<{ stage: string; count: number }>;
  by_employee: Array<{ user_id: number | null; name: string; won: number; revenue: number }>;
  meta: ReportMeta;
};

export type ReportSectionMap = {
  overview: OverviewReport;
  leads: LeadsReport;
  'status-journey': StatusJourneyReport;
  'response-time': ResponseTimeReport;
  employees: EmployeesReport;
  sources: SourcesReport;
  calls: CallsReport;
  deals: DealsReport;
};

export type ReportLeadListMetric =
  | 'created'
  | 'status_entered'
  | 'status_left'
  | 'responded'
  | 'unanswered'
  | 'response_bucket'
  | 'unassigned';

export type ReportLeadListQuery = ReportQuery & {
  metric?: ReportLeadListMetric;
  status_id?: number;
  bucket?: ResponseBucketKey;
  search?: string;
  page?: number;
  page_size?: number;
};

export type ReportLeadRow = {
  id: number;
  name: string;
  phone_number: string | null;
  status: string | null;
  assigned_to: string | null;
  source: string | null;
  campaign: string | null;
  created_at: string;
  status_path: string[];
  first_response_at: string | null;
  first_response_kind: string | null;
  response_seconds: number | null;
  business_response_seconds: number | null;
};

export type ReportLeadList = { count: number; page: number; page_size: number; results: ReportLeadRow[] };

export type LeadJourney = {
  lead: { id: number; name: string; created_at: string };
  status_path: Array<{
    status: string;
    entered_at: string;
    left_at: string | null;
    seconds_in_status: number;
    changed_by: string | null;
    source: string;
    reason: string;
    is_backfilled: boolean;
  }>;
  assignments: Array<{
    user_id: number;
    user: string;
    assigned_at: string;
    ended_at: string | null;
    first_response_at: string | null;
    first_response_kind: string;
    response_seconds: number | null;
    business_response_seconds: number | null;
    is_backfilled: boolean;
  }>;
  total_seconds: number;
};

export type BusinessHours = Record<string, { open: string; close: string } | null>;
