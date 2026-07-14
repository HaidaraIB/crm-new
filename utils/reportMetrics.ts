import { User } from '../types';
import { showInLeadAssigneePicker } from './roles';

export interface ReportDateFilters {
  startDate?: string;
  endDate?: string;
}

export interface ReportLeadFilters extends ReportDateFilters {
  leadType?: string;
  selectedUserId?: string | number;
  selectedCampaign?: string | number;
}

export interface StatusConfig {
  id?: number;
  name?: string;
  category?: string;
  is_default?: boolean;
  automation_key?: string | null;
}

export interface EmployeeReportRow {
  id: number;
  name: string;
  totalLeads: number;
  touchedLeads: number;
  untouchedLeads: number;
  following: number;
  meeting: number;
  noAnswer: number;
  outOfService: number;
  totalCalls: number;
  answeredCalls: number;
  notAnsweredCalls: number;
  totalDeals: number;
  wonDeals: number;
  totalActivities?: number;
  totalClientTasks?: number;
  totalClientCalls?: number;
}

export interface TeamReportRow extends EmployeeReportRow {
  followingLeads?: number;
  meetingLeads?: number;
  totalActivities: number;
}

export interface MarketingReportRow {
  id: number;
  name: string;
  budget: number;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: string;
  costPerLead: string;
}

export interface EmployeeReportSummary {
  totalCalls: number;
  answeredCalls: number;
  notAnsweredCalls: number;
  employeeCount: number;
}

export interface MarketingReportSummary {
  totalCampaigns: number;
  totalBudget: number;
  totalLeads: number;
  avgConversionRate: string;
}

const UNTOUCHED_SLUGS = new Set(['untouched', 'new_lead', 'new', 'newlead']);
const FOLLOWING_SLUGS = new Set(['following', 'follow_up', 'followup', 'follow-up']);
const MEETING_SLUGS = new Set(['meeting', 'qualified', 'done_meeting', 'done meeting']);
const NO_ANSWER_SLUGS = new Set(['no_answer', 'no answer', 'not_answered', 'not answered']);
const OUT_OF_SERVICE_SLUGS = new Set(['out_of_service', 'out of service', 'outofservice']);
const CONVERTED_SLUGS = new Set([
  ...MEETING_SLUGS,
  ...FOLLOWING_SLUGS,
  'closed_won',
  'closed won',
  'won',
  'contacted',
]);

export function normalizeStatusSlug(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

export function getLeadAssigneeId(lead: any): number | null {
  const raw = lead?.assigned_to ?? lead?.assignedTo;
  if (raw == null || raw === '' || raw === 0) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function getLeadCreatedAt(lead: any): string {
  return lead?.created_at ?? lead?.createdAt ?? '';
}

export function getLeadStatusName(lead: any): string {
  const statusName = lead?.status_name ?? lead?.statusName;
  if (typeof statusName === 'string' && statusName.trim()) return statusName;
  if (typeof lead?.status === 'string' && Number.isNaN(Number(lead.status))) return lead.status;
  return '';
}

export function getLeadCampaignId(lead: any): number | null {
  const raw = lead?.campaign ?? lead?.campaign_id ?? lead?.campaignId;
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function getDealClientId(deal: any): number | null {
  const raw = deal?.client ?? deal?.leadId ?? deal?.lead_id;
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function isWonDeal(deal: any): boolean {
  const stage = String(deal?.stage ?? '').toLowerCase();
  if (stage === 'won') return true;
  return String(deal?.status ?? '').toLowerCase() === 'won';
}

export function isDateInRange(
  dateValue: string | undefined | null,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) return true;
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function buildDefaultStatusIds(statuses: StatusConfig[]): Set<number> {
  return new Set(
    statuses
      .filter((status) => status.is_default)
      .map((status) => Number(status.id))
      .filter((id) => Number.isFinite(id)),
  );
}

function buildStatusCategoryMap(statuses: StatusConfig[]): Map<number, string> {
  const map = new Map<number, string>();
  statuses.forEach((status) => {
    if (status.id != null && status.category) {
      map.set(Number(status.id), String(status.category).toLowerCase());
    }
  });
  return map;
}

export function isUntouchedLead(lead: any, statuses: StatusConfig[] = []): boolean {
  const slug = normalizeStatusSlug(getLeadStatusName(lead));
  if (UNTOUCHED_SLUGS.has(slug)) return true;

  const statusId = Number(lead?.status);
  if (Number.isFinite(statusId)) {
    const defaultIds = buildDefaultStatusIds(statuses);
    if (defaultIds.has(statusId)) return true;
    const category = buildStatusCategoryMap(statuses).get(statusId);
    if (category === 'inactive') return true;
  }

  return slug === '';
}

export function matchesStatusBucket(
  lead: any,
  bucket: 'following' | 'meeting' | 'no_answer' | 'out_of_service',
  statuses: StatusConfig[] = [],
): boolean {
  const slug = normalizeStatusSlug(getLeadStatusName(lead));
  const statusId = Number(lead?.status);
  const category = Number.isFinite(statusId)
    ? buildStatusCategoryMap(statuses).get(statusId)
    : undefined;

  if (bucket === 'following') {
    return FOLLOWING_SLUGS.has(slug) || category === 'follow_up';
  }
  if (bucket === 'meeting') {
    return MEETING_SLUGS.has(slug) || slug.includes('meeting');
  }
  if (bucket === 'no_answer') {
    return NO_ANSWER_SLUGS.has(slug) || slug.includes('no_answer') || slug.includes('noanswer');
  }
  return OUT_OF_SERVICE_SLUGS.has(slug) || slug.includes('out_of_service');
}

export function isConvertedLead(lead: any, statuses: StatusConfig[] = []): boolean {
  const slug = normalizeStatusSlug(getLeadStatusName(lead));
  if (CONVERTED_SLUGS.has(slug) || slug.includes('won')) return true;

  const statusId = Number(lead?.status);
  if (Number.isFinite(statusId)) {
    const category = buildStatusCategoryMap(statuses).get(statusId);
    if (category === 'follow_up') return true;
    if (category === 'closed' && slug.includes('won')) return true;
  }

  return matchesStatusBucket(lead, 'meeting', statuses) || matchesStatusBucket(lead, 'following', statuses);
}

export function classifyCall(call: any): 'answered' | 'missed' | 'unknown' {
  const disposition = String(call?.pbx_disposition ?? call?.pbxDisposition ?? '').toLowerCase();
  if (disposition === 'answered') return 'answered';
  if (disposition === 'no_answer' || disposition === 'busy' || disposition === 'missed') return 'missed';

  const method = String(call?.call_method_name ?? call?.callMethodName ?? '').toLowerCase();
  if (method.includes('no answer') || method.includes('not answered')) return 'missed';
  if (method.includes('answered') || method.includes('following')) return 'answered';
  return 'unknown';
}

export function getRecordCreatedAt(record: any): string {
  return record?.created_at ?? record?.createdAt ?? record?.call_datetime ?? record?.callDatetime ?? '';
}

export function getRecordCreatedById(record: any): number | null {
  const raw = record?.created_by ?? record?.createdBy;
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function getUserDisplayName(user: User): string {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return user.name || user.username || user.email || `User ${user.id}`;
}

function filterLeads(leads: any[], filters: ReportLeadFilters): any[] {
  return leads.filter((lead) => {
    if (filters.leadType && filters.leadType !== 'all') {
      if (String(lead?.type ?? '').toLowerCase() !== String(filters.leadType).toLowerCase()) {
        return false;
      }
    }
    if (filters.selectedCampaign && filters.selectedCampaign !== 'all') {
      const campaignId = Number(filters.selectedCampaign);
      if (getLeadCampaignId(lead) !== campaignId) return false;
    }
    if (filters.selectedUserId && filters.selectedUserId !== 'all') {
      const userId = Number(filters.selectedUserId);
      if (getLeadAssigneeId(lead) !== userId) return false;
    }
    return isDateInRange(getLeadCreatedAt(lead), filters.startDate, filters.endDate);
  });
}

function filterDatedRecords(records: any[], filters: ReportDateFilters): any[] {
  return records.filter((record) =>
    isDateInRange(getRecordCreatedAt(record), filters.startDate, filters.endDate),
  );
}

function buildLeadAssigneeMap(leads: any[]): Map<number, number | null> {
  const map = new Map<number, number | null>();
  leads.forEach((lead) => {
    if (lead?.id != null) map.set(Number(lead.id), getLeadAssigneeId(lead));
  });
  return map;
}

function computeUserLeadStats(userLeads: any[], statuses: StatusConfig[]) {
  return {
    totalLeads: userLeads.length,
    touchedLeads: userLeads.filter((lead) => !isUntouchedLead(lead, statuses)).length,
    untouchedLeads: userLeads.filter((lead) => isUntouchedLead(lead, statuses)).length,
    following: userLeads.filter((lead) => matchesStatusBucket(lead, 'following', statuses)).length,
    meeting: userLeads.filter((lead) => matchesStatusBucket(lead, 'meeting', statuses)).length,
    noAnswer: userLeads.filter((lead) => matchesStatusBucket(lead, 'no_answer', statuses)).length,
    outOfService: userLeads.filter((lead) => matchesStatusBucket(lead, 'out_of_service', statuses)).length,
  };
}

function computeUserCallStats(userCalls: any[]) {
  let answeredCalls = 0;
  let notAnsweredCalls = 0;
  userCalls.forEach((call) => {
    const kind = classifyCall(call);
    if (kind === 'missed') notAnsweredCalls += 1;
    else answeredCalls += 1;
  });
  return {
    totalCalls: userCalls.length,
    answeredCalls,
    notAnsweredCalls,
  };
}

export function computeEmployeeReportRows(
  users: User[],
  leads: any[],
  deals: any[],
  clientTasks: any[],
  clientCalls: any[],
  filters: ReportLeadFilters,
  statuses: StatusConfig[] = [],
): EmployeeReportRow[] {
  const safeUsers = users.filter((user) => showInLeadAssigneePicker(user.role));
  const filteredLeads = filterLeads(leads, filters);
  const filteredTasks = filterDatedRecords(clientTasks, filters);
  const filteredCalls = filterDatedRecords(clientCalls, filters);
  const leadAssigneeMap = buildLeadAssigneeMap(filteredLeads);

  return safeUsers
    .map((user) => {
      const userLeads = filteredLeads.filter((lead) => getLeadAssigneeId(lead) === user.id);
      const userTasks = filteredTasks.filter((task) => getRecordCreatedById(task) === user.id);
      const userCalls = filteredCalls.filter((call) => getRecordCreatedById(call) === user.id);
      const userDeals = deals.filter((deal) => {
        const clientId = getDealClientId(deal);
        if (clientId == null) return false;
        return leadAssigneeMap.get(clientId) === user.id;
      });

      const leadStats = computeUserLeadStats(userLeads, statuses);
      const callStats = computeUserCallStats(userCalls);

      return {
        id: user.id,
        name: getUserDisplayName(user),
        ...leadStats,
        ...callStats,
        totalClientTasks: userTasks.length,
        totalClientCalls: userCalls.length,
        totalDeals: userDeals.length,
        wonDeals: userDeals.filter(isWonDeal).length,
      };
    })
    .filter(
      (row) =>
        row.totalLeads > 0 ||
        row.totalDeals > 0 ||
        row.totalCalls > 0 ||
        (row.totalClientTasks ?? 0) > 0,
    );
}

export function computeTeamReportRows(
  users: User[],
  leads: any[],
  deals: any[],
  clientTasks: any[],
  clientCalls: any[],
  filters: ReportLeadFilters,
  statuses: StatusConfig[] = [],
): TeamReportRow[] {
  const rows = computeEmployeeReportRows(users, leads, deals, clientTasks, clientCalls, filters, statuses);
  return rows.map((row) => ({
    ...row,
    followingLeads: row.following,
    meetingLeads: row.meeting,
    totalActivities: (row.totalClientTasks ?? 0) + (row.totalClientCalls ?? 0),
  }));
}

export function computeMarketingReportRows(
  campaigns: any[],
  leads: any[],
  filters: ReportLeadFilters,
  statuses: StatusConfig[] = [],
): MarketingReportRow[] {
  const filteredLeads = filterLeads(leads, filters);
  const visibleCampaigns =
    filters.selectedCampaign && filters.selectedCampaign !== 'all'
      ? campaigns.filter((campaign) => Number(campaign.id) === Number(filters.selectedCampaign))
      : campaigns;

  return visibleCampaigns.map((campaign) => {
    const campaignLeads = filteredLeads.filter(
      (lead) => getLeadCampaignId(lead) === Number(campaign.id),
    );
    const convertedLeads = campaignLeads.filter((lead) => isConvertedLead(lead, statuses)).length;
    const budget = Number(campaign.budget ?? 0);
    const totalLeads = campaignLeads.length;

    return {
      id: Number(campaign.id),
      name: String(campaign.name ?? ''),
      budget,
      totalLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
      costPerLead: totalLeads > 0 ? (budget / totalLeads).toFixed(2) : '0',
    };
  });
}

export function summarizeEmployeeReport(rows: EmployeeReportRow[]): EmployeeReportSummary {
  return {
    totalCalls: rows.reduce((sum, row) => sum + row.totalCalls, 0),
    answeredCalls: rows.reduce((sum, row) => sum + row.answeredCalls, 0),
    notAnsweredCalls: rows.reduce((sum, row) => sum + row.notAnsweredCalls, 0),
    employeeCount: rows.length,
  };
}

export function summarizeMarketingReport(rows: MarketingReportRow[]): MarketingReportSummary {
  const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
  const totalLeads = rows.reduce((sum, row) => sum + row.totalLeads, 0);
  const avgConversionRate =
    rows.length > 0
      ? (
          rows.reduce((sum, row) => sum + parseFloat(String(row.conversionRate)), 0) / rows.length
        ).toFixed(1)
      : '0';

  return {
    totalCampaigns: rows.length,
    totalBudget,
    totalLeads,
    avgConversionRate,
  };
}

export function mapApiEmployeeReportRow(row: any): EmployeeReportRow {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    totalLeads: Number(row.total_leads ?? row.totalLeads ?? 0),
    touchedLeads: Number(row.touched_leads ?? row.touchedLeads ?? 0),
    untouchedLeads: Number(row.untouched_leads ?? row.untouchedLeads ?? 0),
    following: Number(row.following ?? 0),
    meeting: Number(row.meeting ?? 0),
    noAnswer: Number(row.no_answer ?? row.noAnswer ?? 0),
    outOfService: Number(row.out_of_service ?? row.outOfService ?? 0),
    totalCalls: Number(row.total_calls ?? row.totalCalls ?? 0),
    answeredCalls: Number(row.answered_calls ?? row.answeredCalls ?? 0),
    notAnsweredCalls: Number(row.not_answered_calls ?? row.notAnsweredCalls ?? 0),
    totalDeals: Number(row.total_deals ?? row.totalDeals ?? 0),
    wonDeals: Number(row.won_deals ?? row.wonDeals ?? 0),
    totalClientTasks: Number(row.total_client_tasks ?? row.totalClientTasks ?? 0),
    totalClientCalls: Number(row.total_client_calls ?? row.totalClientCalls ?? 0),
  };
}

export function mapApiTeamReportRow(row: any): TeamReportRow {
  const employeeRow = mapApiEmployeeReportRow(row);
  return {
    ...employeeRow,
    followingLeads: Number(row.following_leads ?? row.followingLeads ?? employeeRow.following),
    meetingLeads: Number(row.meeting_leads ?? row.meetingLeads ?? employeeRow.meeting),
    totalActivities: Number(
      row.total_activities ??
        row.totalActivities ??
        (employeeRow.totalClientTasks ?? 0) + (employeeRow.totalClientCalls ?? 0),
    ),
  };
}

export function mapApiMarketingReportRow(row: any): MarketingReportRow {
  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    budget: Number(row.budget ?? 0),
    totalLeads: Number(row.total_leads ?? row.totalLeads ?? 0),
    convertedLeads: Number(row.converted_leads ?? row.convertedLeads ?? 0),
    conversionRate: String(row.conversion_rate ?? row.conversionRate ?? '0'),
    costPerLead: String(row.cost_per_lead ?? row.costPerLead ?? '0'),
  };
}

export function buildReportDateSubtitle(
  startDate: string | undefined,
  endDate: string | undefined,
  allDatesLabel: string,
  hint: string,
  locale: string,
  withLatinDigits: () => Intl.NumberFormatOptions,
): string {
  let range = allDatesLabel;
  if (startDate || endDate) {
    try {
      const parts: string[] = [];
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          parts.push(start.toLocaleDateString(locale, withLatinDigits()));
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          parts.push(end.toLocaleDateString(locale, withLatinDigits()));
        }
      }
      if (parts.length === 1) range = parts[0];
      else if (parts.length === 2) range = `${parts[0]} — ${parts[1]}`;
    } catch {
      /* ignore */
    }
  }
  return `${range}. ${hint}`;
}
