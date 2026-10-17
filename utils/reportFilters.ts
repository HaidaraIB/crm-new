import type { ReportFilters } from '../types';
import type { ReportQuery } from '../services/reportsTypes';

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  userIds: [],
  statusIds: [],
  sources: [],
  campaignIds: [],
  channelIds: [],
  leadTypes: [],
};

/** Filters -> the list params shared by every /reports/v2/ section. */
export function filtersToQuery(filters: ReportFilters): Pick<
  ReportQuery,
  'user_ids' | 'status_ids' | 'sources' | 'campaign_ids' | 'channel_ids' | 'lead_types'
> {
  return {
    user_ids: filters.userIds,
    status_ids: filters.statusIds,
    sources: filters.sources,
    campaign_ids: filters.campaignIds,
    channel_ids: filters.channelIds,
    lead_types: filters.leadTypes,
  };
}
