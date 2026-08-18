/**
 * React Query hooks for data fetching
 * This file contains all reusable query hooks for the application
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { companyHasServiceInventory } from '../utils/serviceInventorySpecialization';
import type { LeadApiFilters, LeadArrival } from '../types';
import { normalizeLead } from '../utils/normalizeLead';
import { normalizeUser } from '../utils/userUtils';
import {
  getLeadsAPI, getLeadAPI, getLeadStatusCountsAPI, getMissionBarSummaryAPI, getDashboardSummaryAPI, getUsersAPI, getDealsAPI, getTasksAPI, getClientTasksAPI, getClientCallsAPI, getClientVisitsAPI, getClientFieldVisitsAPI, getClientEventsAPI,
  getDevelopersAPI, getProjectsAPI, getUnitsAPI, getOwnersAPI,
  getServicesAPI, getServicePackagesAPI, getServiceProvidersAPI,
  getProductsAPI, getProductCategoriesAPI, getSuppliersAPI,
  getCampaignsAPI, getChannelsAPI, getStagesAPI, getStatusesAPI, getTagsAPI, getCallMethodsAPI, getVisitTypesAPI,
  getCurrentUserAPI, getActivitiesAPI,
  getConnectedAccountsAPI, createConnectedAccountAPI, updateConnectedAccountAPI, deleteConnectedAccountAPI, disconnectIntegrationAccountAPI, testConnectionAPI,
  getLeadFormsAPI, selectLeadFormAPI, getLeadSMSMessagesAPI, getLeadWhatsAppMessagesAPI, getWhatsAppMessagesAPI, getWhatsAppConversationsAPI,
  getWhatsAppUnreadCountAPI, markWhatsAppConversationReadAPI, getWhatsAppCallsPendingAPI, getWhatsAppCallsLiveAPI,
  getNewsUnreadCountAPI, markNewsReadAPI,
  getSyncDigestAPI,
  type SyncDigest,
  type WhatsAppCallRecord,
  createLeadAPI, updateLeadAPI, patchLeadAPI, deleteLeadAPI,
  announceLeadArrivalAPI, acknowledgeLeadArrivalAPI, getLeadArrivalsAPI, getPendingLeadArrivalsAPI,
  createUserAPI, updateUserAPI, deleteUserAPI,
  getDeactivateEmployeePreviewAPI, deactivateEmployeeAPI, reactivateEmployeeAPI,
  createDealAPI, updateDealAPI, patchDealAPI, deleteDealAPI,
  createTaskAPI, updateTaskAPI, patchTaskAPI, deleteTaskAPI, completeTaskAPI,
  createClientTaskAPI, updateClientTaskAPI, deleteClientTaskAPI, completeClientTaskReminderAPI,
  createClientCallAPI, updateClientCallAPI, deleteClientCallAPI, completeClientCallFollowUpAPI,
  createClientVisitAPI, updateClientVisitAPI, deleteClientVisitAPI,
  createClientFieldVisitAPI,
  createDeveloperAPI, updateDeveloperAPI, deleteDeveloperAPI,
  createProjectAPI, updateProjectAPI, deleteProjectAPI,
  createUnitAPI, updateUnitAPI, deleteUnitAPI,
  createOwnerAPI, updateOwnerAPI, deleteOwnerAPI,
  createServiceAPI, updateServiceAPI, deleteServiceAPI,
  createServicePackageAPI, updateServicePackageAPI, deleteServicePackageAPI,
  createServiceProviderAPI, updateServiceProviderAPI, deleteServiceProviderAPI,
  createProductAPI, updateProductAPI, deleteProductAPI,
  createProductCategoryAPI, updateProductCategoryAPI, deleteProductCategoryAPI,
  createSupplierAPI, updateSupplierAPI, deleteSupplierAPI,
  createCampaignAPI, updateCampaignAPI, deleteCampaignAPI,
  createChannelAPI, updateChannelAPI, deleteChannelAPI,
  createStageAPI, updateStageAPI, deleteStageAPI,
  createStatusAPI, updateStatusAPI, deleteStatusAPI,
  createTagAPI, updateTagAPI, deleteTagAPI,
  createCallMethodAPI, updateCallMethodAPI, deleteCallMethodAPI,
  createVisitTypeAPI, updateVisitTypeAPI, deleteVisitTypeAPI,
  bulkAssignLeadsAPI,
  assignUnassignedClientsAPI,
  getAIInsightsDashboardAPI,
  getAIManagementReportAPI,
  generateAIManagementReportAPI,
  getEmployeeReportAPI,
  getTeamsReportAPI,
  getMarketingReportAPI,
  getCallReportAPI,
  approveAIInsightAPI,
  dismissAIInsightAPI,
  runAIAnalysisAPI,
} from '../services/api';
import type { MissionBarSummary, DashboardSummary, ReportQueryParams, CallReportResponse } from '../services/api';

// ==================== Query Keys ====================
export const queryKeys = {
  currentUser: ['currentUser'] as const,
  users: (page?: number, pageSize?: number, filters?: { roles?: string[]; excludeRoles?: string[] }) =>
    ['users', page ?? 'all', pageSize ?? 'default', filters?.roles?.join('|') ?? '', filters?.excludeRoles?.join('|') ?? ''] as const,
  leads: (filters?: LeadApiFilters, page?: number, pageSize?: number) => ['leads', filters, page ?? 'all', pageSize ?? 'default'] as const,
  lead: (id?: number) => ['lead', id] as const,
  leadStatusCounts: (filters?: LeadApiFilters) => ['leadStatusCounts', filters] as const,
  missionBarSummary: ['missionBarSummary'] as const,
  dashboardSummary: (days?: number, source?: string, dailyTarget?: number) =>
    ['dashboardSummary', days ?? 7, source ?? 'all', dailyTarget ?? 5] as const,
  employeeReport: (params?: ReportQueryParams) => ['employeeReport', params] as const,
  teamsReport: (params?: ReportQueryParams) => ['teamsReport', params] as const,
  marketingReport: (params?: ReportQueryParams) => ['marketingReport', params] as const,
  callReport: (params?: ReportQueryParams) => ['callReport', params] as const,
  deals: (page?: number, pageSize?: number, search?: string, stage?: string) =>
    ['deals', page ?? 'all', pageSize ?? 'default', search ?? '', stage ?? ''] as const,
  tasks: (filters?: any) => ['tasks', filters] as const,
  activities: (filters?: any) => ['activities', filters] as const,
  clientTasks: ['clientTasks'] as const,
  clientCalls: ['clientCalls'] as const,
  clientVisits: ['clientVisits'] as const,
  clientFieldVisits: ['clientFieldVisits'] as const,
  clientEvents: (clientId?: number) => ['clientEvents', clientId] as const,
  leadArrivals: (params?: { date?: string; status?: string; mine?: boolean }) =>
    ['leadArrivals', params?.date ?? 'today', params?.status ?? 'all', params?.mine ?? false] as const,
  pendingLeadArrivals: ['pendingLeadArrivals'] as const,
  developers: (page?: number, pageSize?: number) => ['developers', page ?? 'all', pageSize ?? 'default'] as const,
  projects: (page?: number, pageSize?: number, developerId?: number | null) =>
    ['projects', page ?? 'all', pageSize ?? 'default', developerId ?? 'all'] as const,
  units: (filters?: any, page?: number, pageSize?: number) => ['units', filters, page ?? 'all', pageSize ?? 'default'] as const,
  owners: ['owners'] as const,
  services: ['services'] as const,
  servicePackages: ['servicePackages'] as const,
  serviceProviders: ['serviceProviders'] as const,
  products: ['products'] as const,
  productCategories: ['productCategories'] as const,
  suppliers: ['suppliers'] as const,
  campaigns: ['campaigns'] as const,
  channels: ['channels'] as const,
  stages: ['stages'] as const,
  statuses: ['statuses'] as const,
  tags: ['tags'] as const,
  callMethods: ['callMethods'] as const,
  visitTypes: ['visitTypes'] as const,
  connectedAccounts: (platform?: string) => ['connectedAccounts', platform] as const,
  leadSMSMessages: (leadId?: number) => ['leadSMSMessages', leadId] as const,
  leadWhatsAppMessages: (leadId?: number) => ['leadWhatsAppMessages', leadId] as const,
  whatsappChatMessages: (clientId?: number, phone?: string) =>
    ['whatsappChatMessages', clientId ?? null, phone ?? ''] as const,
  whatsAppConversations: ['whatsAppConversations'] as const,
  whatsAppUnreadCount: ['whatsAppUnreadCount'] as const,
  /** Pending / live WhatsApp Cloud Calling rings (shared by Calls page, sidebar, toast). */
  whatsappCallsLive: ['whatsappCalls', 'live'] as const,
  newsUnreadCount: ['newsUnreadCount'] as const,
  syncDigest: ['syncDigest'] as const,
};

/** Cuts refetch bursts on data-heavy views (aligns with API UserRateThrottle). */
export const dashboardHeavyListQueryOptions = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const satisfies Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>;

// ==================== Query Hooks ====================

export const useCurrentUser = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const data = await getCurrentUserAPI();
      return normalizeUser(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUsers = (
  pageOrOptions?: number | Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number,
  filters?: { roles?: string[]; excludeRoles?: string[] }
) => {
  const page = typeof pageOrOptions === 'number' ? pageOrOptions : undefined;
  const resolvedOptions = (typeof pageOrOptions === 'number' ? options : pageOrOptions) || options;
  return useQuery({
    queryKey: queryKeys.users(page, pageSize, filters),
    queryFn: async () => {
      const response = await getUsersAPI(page, pageSize, filters);
      if (response && response.results) {
        return {
          ...response,
          results: response.results.map(user => normalizeUser(user))
        };
      }
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...resolvedOptions,
  });
};

export const useLeads = (
  filters?: LeadApiFilters,
  page?: number,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number
) => {
  return useQuery({
    queryKey: queryKeys.leads(filters, page, pageSize),
    queryFn: async () => {
      const data = await getLeadsAPI(filters, page, pageSize);
      if (data?.results && Array.isArray(data.results)) {
        data.results = data.results.map(normalizeLead);
      }
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useLead = (
  id?: number | null,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.lead(id ?? undefined),
    queryFn: async () => {
      if (!id) throw new Error('Lead id is required');
      return normalizeLead(await getLeadAPI(id));
    },
    enabled: typeof id === 'number' && id > 0,
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useLeadStatusCounts = (
  filters?: LeadApiFilters,
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.leadStatusCounts(filters),
    queryFn: () => getLeadStatusCountsAPI(filters),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useMissionBarSummary = (
  options?: Omit<UseQueryOptions<MissionBarSummary, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.missionBarSummary,
    queryFn: () => getMissionBarSummaryAPI(),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useDashboardSummary = (
  params?: {
    days?: 7 | 14 | 30;
    source?: 'all' | 'meta_lead_form' | 'whatsapp' | 'manual';
    daily_target?: number;
  },
  options?: Omit<UseQueryOptions<DashboardSummary, Error>, 'queryKey' | 'queryFn'>
) => {
  const days = params?.days ?? 7;
  const source = params?.source ?? 'all';
  const dailyTarget = params?.daily_target ?? 5;
  return useQuery({
    queryKey: queryKeys.dashboardSummary(days, source, dailyTarget),
    queryFn: () => getDashboardSummaryAPI({ days, source, daily_target: dailyTarget }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDeals = (
  pageOrOptions?: number | Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number,
  search?: string,
  stage?: string,
) => {
  const page = typeof pageOrOptions === 'number' ? pageOrOptions : undefined;
  const resolvedOptions = (typeof pageOrOptions === 'number' ? options : pageOrOptions) || options;
  const searchKey = search?.trim() || '';
  const stageKey = stage?.trim() || '';
  return useQuery({
    queryKey: queryKeys.deals(page, pageSize, searchKey, stageKey),
    queryFn: () =>
      getDealsAPI(page, pageSize, {
        ...(searchKey ? { search: searchKey } : {}),
        ...(stageKey ? { stage: stageKey } : {}),
      }),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...resolvedOptions,
  });
};

export const useTasks = (
  filters?: any,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => getTasksAPI(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useActivities = (
  filters?: any,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.activities(filters),
    queryFn: () => getActivitiesAPI(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useClientTasks = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientTasks,
    queryFn: () => getClientTasksAPI(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useClientCalls = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientCalls,
    queryFn: () => getClientCallsAPI(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useClientVisits = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientVisits,
    queryFn: () => getClientVisitsAPI(),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useClientFieldVisits = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientFieldVisits,
    queryFn: () => getClientFieldVisitsAPI(),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
};

export const useCreateClientFieldVisit = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createClientFieldVisitAPI(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientFieldVisits });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
      if (variables.client || variables.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clientEvents(variables.client || variables.clientId),
        });
      }
    },
    ...options,
  });
};

export const useClientEvents = (clientId?: number, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientEvents(clientId),
    queryFn: () => getClientEventsAPI(clientId),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useDevelopers = (
  pageOrOptions?: number | Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number
) => {
  const page = typeof pageOrOptions === 'number' ? pageOrOptions : undefined;
  const resolvedOptions = (typeof pageOrOptions === 'number' ? options : pageOrOptions) || options;
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = resolvedOptions || {};
  
  return useQuery({
    queryKey: queryKeys.developers(page, pageSize),
    queryFn: () => getDevelopersAPI(page, pageSize),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useProjects = (
  pageOrOptions?: number | Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number,
  developerId?: number | null
) => {
  const page = typeof pageOrOptions === 'number' ? pageOrOptions : undefined;
  const resolvedOptions = (typeof pageOrOptions === 'number' ? options : pageOrOptions) || options;
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = resolvedOptions || {};
  
  return useQuery({
    queryKey: queryKeys.projects(page, pageSize, developerId),
    queryFn: () => getProjectsAPI(page, pageSize, developerId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useUnits = (
  filters?: any,
  pageOrOptions?: number | Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
  pageSize?: number
) => {
  const page = typeof pageOrOptions === 'number' ? pageOrOptions : undefined;
  const resolvedOptions = (typeof pageOrOptions === 'number' ? options : pageOrOptions) || options;
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = resolvedOptions || {};

  // Only project + bedrooms hit the API — keep queryKey aligned to avoid extra refetches
  const apiFilters =
    filters == null
      ? undefined
      : {
          ...(filters.project && filters.project !== 'All' ? { project: String(filters.project) } : {}),
          ...(filters.bedrooms && filters.bedrooms !== 'All' ? { bedrooms: String(filters.bedrooms) } : {}),
        };
  const apiFiltersKey =
    apiFilters && Object.keys(apiFilters).length > 0 ? apiFilters : undefined;

  return useQuery({
    queryKey: queryKeys.units(apiFiltersKey, page, pageSize),
    queryFn: () =>
      getUnitsAPI({ ...(apiFiltersKey || {}), ...(pageSize ? { page_size: pageSize } : {}) }, page),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useOwners = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.owners,
    queryFn: () => getOwnersAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useServices = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = companyHasServiceInventory(specialization);
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => getServicesAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useServicePackages = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = companyHasServiceInventory(specialization);
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.servicePackages,
    queryFn: () => getServicePackagesAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useServiceProviders = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = companyHasServiceInventory(specialization);
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.serviceProviders,
    queryFn: () => getServiceProvidersAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useProducts = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'products';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: () => getProductsAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useProductCategories = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'products';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.productCategories,
    queryFn: () => getProductCategoriesAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useSuppliers = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'products';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: () => getSuppliersAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useCampaigns = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: () => getCampaignsAPI(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useChannels = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.channels,
    queryFn: () => getChannelsAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useStages = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.stages,
    queryFn: () => getStagesAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useStatuses = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.statuses,
    queryFn: () => getStatusesAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useTags = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => getTagsAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useEmployeeReport = (
  params?: ReportQueryParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: queryKeys.employeeReport(params),
    queryFn: () => getEmployeeReportAPI(params),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useTeamsReport = (
  params?: ReportQueryParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: queryKeys.teamsReport(params),
    queryFn: () => getTeamsReportAPI(params),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useMarketingReport = (
  params?: ReportQueryParams,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: queryKeys.marketingReport(params),
    queryFn: () => getMarketingReportAPI(params),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCallReport = (
  params?: ReportQueryParams,
  options?: Omit<UseQueryOptions<CallReportResponse, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: queryKeys.callReport(params),
    queryFn: () => getCallReportAPI(params),
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCallMethods = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.callMethods,
    queryFn: () => getCallMethodsAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useVisitTypes = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.visitTypes,
    queryFn: () => getVisitTypesAPI(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useLeadSMSMessages = (
  leadId: number | undefined,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.leadSMSMessages(leadId),
    queryFn: () => getLeadSMSMessagesAPI(leadId!),
    enabled: !!leadId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useLeadWhatsAppMessages = (
  leadId: number | undefined,
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.leadWhatsAppMessages(leadId),
    queryFn: () => getLeadWhatsAppMessagesAPI(leadId!),
    enabled: !!leadId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

/** WhatsApp thread for a lead id and/or phone (refetches on window focus when chat is open). */
export const useWhatsAppChatMessages = (
  params: { clientId?: number; phone?: string; enabled?: boolean; refetchInterval?: number | false },
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn' | 'enabled' | 'refetchInterval'>
) => {
  const { clientId, phone, enabled = true, refetchInterval = false } = params;
  const canFetch = enabled && (!!clientId || !!(phone && phone.replace(/\D/g, '').length >= 7));
  return useQuery({
    queryKey: queryKeys.whatsappChatMessages(clientId, phone),
    queryFn: () => getWhatsAppMessagesAPI({ clientId, phone }),
    enabled: canFetch,
    staleTime: 3 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval,
    ...options,
  });
};

export const useWhatsAppConversations = (
  options?: Omit<UseQueryOptions<any[], Error>, 'queryKey' | 'queryFn'> & {
    refetchInterval?: number | false;
    enabled?: boolean;
  }
) => {
  const { refetchInterval = false, enabled = true, ...rest } = options || {};
  return useQuery({
    queryKey: queryKeys.whatsAppConversations,
    queryFn: getWhatsAppConversationsAPI,
    staleTime: 3 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval,
    enabled,
    ...rest,
  });
};

export const useSyncDigest = (
  options?: Omit<UseQueryOptions<SyncDigest, Error>, 'queryKey' | 'queryFn'> & {
    enabled?: boolean;
  }
) => {
  const { refetchInterval = 5_000, enabled = true, ...rest } = options || {};
  return useQuery<SyncDigest, Error>({
    queryKey: queryKeys.syncDigest,
    queryFn: getSyncDigestAPI,
    staleTime: 4_000,
    refetchOnWindowFocus: true,
    refetchInterval,
    enabled,
    ...rest,
  });
};

/** Sidebar badge: unread inbound WhatsApp messages in the caller's ACL scope. */
export const useWhatsAppUnreadCount = (
  options?: Omit<UseQueryOptions<{ unread_count: number }, Error, number>, 'queryKey' | 'queryFn'> & {
    enabled?: boolean;
  }
) => {
  const { refetchInterval = 15_000, enabled = true, ...rest } = options || {};
  return useQuery<{ unread_count: number }, Error, number>({
    queryKey: queryKeys.whatsAppUnreadCount,
    queryFn: getWhatsAppUnreadCountAPI,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval,
    enabled,
    select: (d) => d?.unread_count ?? 0,
    ...rest,
  });
};

/** Inbound ringing calls the agent can answer (from pending endpoint). */
export function selectAnswerableLiveCalls(
  results: WhatsAppCallRecord[] | undefined
): WhatsAppCallRecord[] {
  return (results || []).filter(
    (c) => c.direction === 'inbound' && c.status === 'ringing'
  );
}

export function selectLiveCallsForPanel(
  results: WhatsAppCallRecord[] | undefined
): WhatsAppCallRecord[] {
  return (results || []).filter(
    (c) => c.status === 'ringing' || c.status === 'answered'
  );
}

/**
 * Shared poll for WhatsApp live/pending calls (~2s).
 * Does not poll while the tab is in the background (`refetchIntervalInBackground: false`).
 */
export const useWhatsAppLiveCalls = (
  options?: Omit<
    UseQueryOptions<{ results: WhatsAppCallRecord[] }, Error, WhatsAppCallRecord[]>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean; /** Include answered in-progress (Calls page). */ includeAnswered?: boolean }
) => {
  const {
    refetchInterval = 2_000,
    enabled = true,
    includeAnswered = false,
    ...rest
  } = options || {};
  return useQuery<
    { results: WhatsAppCallRecord[] },
    Error,
    WhatsAppCallRecord[]
  >({
    queryKey: includeAnswered
      ? ([...queryKeys.whatsappCallsLive, 'withAnswered'] as const)
      : queryKeys.whatsappCallsLive,
    queryFn: includeAnswered ? getWhatsAppCallsLiveAPI : getWhatsAppCallsPendingAPI,
    staleTime: 1_000,
    refetchOnWindowFocus: true,
    refetchInterval,
    refetchIntervalInBackground: false,
    enabled,
    select: (d) =>
      includeAnswered
        ? selectLiveCallsForPanel(d?.results)
        : selectAnswerableLiveCalls(d?.results),
    ...rest,
  });
};

/** Sidebar badge: count of answerable inbound ringing WhatsApp calls. */
export const useWhatsAppLiveCallsCount = (
  options?: Omit<
    UseQueryOptions<{ results: WhatsAppCallRecord[] }, Error, number>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean }
) => {
  const { refetchInterval = 2_000, enabled = true, ...rest } = options || {};
  return useQuery<{ results: WhatsAppCallRecord[] }, Error, number>({
    queryKey: queryKeys.whatsappCallsLive,
    queryFn: getWhatsAppCallsPendingAPI,
    staleTime: 1_000,
    refetchOnWindowFocus: true,
    refetchInterval,
    refetchIntervalInBackground: false,
    enabled,
    select: (d) => selectAnswerableLiveCalls(d?.results).length,
    ...rest,
  });
};

export const useMarkWhatsAppConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markWhatsAppConversationReadAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsAppUnreadCount });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncDigest });
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsAppConversations });
    },
  });
};

/** Sidebar badge: published news newer than the user's last_read_at. */
export const useNewsUnreadCount = (
  options?: Omit<UseQueryOptions<{ unread_count: number }, Error, number>, 'queryKey' | 'queryFn'> & {
    enabled?: boolean;
  }
) => {
  const { refetchInterval = 60_000, enabled = true, ...rest } = options || {};
  return useQuery<{ unread_count: number }, Error, number>({
    queryKey: queryKeys.newsUnreadCount,
    queryFn: getNewsUnreadCountAPI,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval,
    enabled,
    select: (d) => d?.unread_count ?? 0,
    ...rest,
  });
};

export const useMarkNewsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNewsReadAPI,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.newsUnreadCount, { unread_count: 0 });
      queryClient.invalidateQueries({ queryKey: queryKeys.newsUnreadCount });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncDigest });
    },
  });
};

export const useConnectedAccounts = (
  platform?: string,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.connectedAccounts(platform),
    queryFn: () => getConnectedAccountsAPI(platform),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useLeadArrivals = (
  params?: { date?: string; status?: 'waiting' | 'acknowledged' | 'escalated' | 'all'; mine?: boolean },
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.leadArrivals(params),
    queryFn: () => getLeadArrivalsAPI(params),
    refetchInterval: 15000,
    staleTime: 10000,
    ...options,
  });
};

export const usePendingLeadArrivals = (
  options?: Omit<UseQueryOptions<LeadArrival[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.pendingLeadArrivals,
    queryFn: () => getPendingLeadArrivalsAPI(),
    refetchInterval: 20000,
    staleTime: 10000,
    ...options,
  });
};

// ==================== Mutation Hooks ====================

export const useAnnounceLeadArrival = (
  options?: UseMutationOptions<LeadArrival, Error, { clientId: number; notes?: string }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, notes }: { clientId: number; notes?: string }) =>
      announceLeadArrivalAPI(clientId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leadArrivals'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingLeadArrivals });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(data.client) });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    ...options,
  });
};

export const useAcknowledgeLeadArrival = (
  options?: UseMutationOptions<LeadArrival, Error, number>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arrivalId: number) => acknowledgeLeadArrivalAPI(arrivalId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leadArrivals'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingLeadArrivals });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(data.client) });
    },
    ...options,
  });
};

export const useCreateLead = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLeadAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    ...options,
  });
};

export const useUpdateLead = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateLeadAPI(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      // Invalidate events for this specific lead to show updates in timeline
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(variables.id) });
      // Also invalidate client tasks since they might be related
      queryClient.invalidateQueries({ queryKey: ['clientTasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      // Return the updated data so components can use it
      return data;
    },
    ...options,
  });
};

/** Partial lead update (e.g. Kanban status move) — uses PATCH. */
export const usePatchLead = (
  options?: UseMutationOptions<any, Error, { id: number; data: Record<string, unknown> }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      patchLeadAPI(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['clientTasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      return data;
    },
    ...options,
  });
};

export const useDeleteLead = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteLeadAPI(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.removeQueries({ queryKey: queryKeys.lead(id) });
      queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    ...options,
  });
};

export const useAssignLeads = (options?: UseMutationOptions<any, Error, { clientIds: number[]; userId: number | null }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientIds, userId }: { clientIds: number[]; userId: number | null }) => bulkAssignLeadsAPI(clientIds, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      // Invalidate events for all affected leads
      variables.clientIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(id) });
      });
      // Clear checked IDs if needed (this might be handled in the component)
    },
    ...options,
  });
};

export const useAssignUnassignedClients = (options?: UseMutationOptions<any, Error, void>) => {
  const queryClient = useQueryClient();
  const { onSuccess: userOnSuccess, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: () => assignUnassignedClientsAPI(),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['leadStatusCounts'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      await queryClient.invalidateQueries({ queryKey: ['clientEvents'] });
      await queryClient.refetchQueries({ queryKey: ['leads'] });
      userOnSuccess?.(data, variables, onMutateResult, context);
    },
  });
};

export const useCreateUser = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createUserAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};

export const useUpdateUser = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUserAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
    ...options,
  });
};

export const useDeleteUser = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUserAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};

export const useDeactivateEmployee = (
  options?: UseMutationOptions<
    Awaited<ReturnType<typeof deactivateEmployeeAPI>>,
    Error,
    { id: number; reassign_leads: boolean }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reassign_leads }: { id: number; reassign_leads: boolean }) =>
      deactivateEmployeeAPI(id, { reassign_leads }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    ...options,
  });
};

export const useReactivateEmployee = (
  options?: UseMutationOptions<Awaited<ReturnType<typeof reactivateEmployeeAPI>>, Error, number>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reactivateEmployeeAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};

export const useCreateDeal = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createDealAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    ...options,
  });
};

export const useUpdateDeal = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDealAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    ...options,
  });
};

/** Partial deal update (e.g. Kanban stage move) — uses PATCH. */
export const usePatchDeal = (
  options?: UseMutationOptions<any, Error, { id: number; data: Record<string, unknown> }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      patchDealAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    ...options,
  });
};

export const useDeleteDeal = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDealAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    ...options,
  });
};

export const useCreateTask = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createTaskAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useUpdateTask = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTaskAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const usePatchTask = (
  options?: UseMutationOptions<any, Error, { id: number; data: Record<string, unknown> }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      patchTaskAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useDeleteTask = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTaskAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCompleteTask = (options?: UseMutationOptions<any, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeTaskAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCreateClientTask = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createClientTaskAPI(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
      // Also invalidate events for this lead if task creation triggers an event
      if (variables.client || variables.clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(variables.client || variables.clientId) });
      }
    },
    ...options,
  });
};

export const useUpdateClientTask = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateClientTaskAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useDeleteClientTask = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClientTaskAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCompleteClientTaskReminder = (options?: UseMutationOptions<any, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeClientTaskReminderAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCreateClientCall = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createClientCallAPI(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientCalls });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
      // Also invalidate events for this lead if call creation triggers an event
      if (variables.client || variables.clientId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(variables.client || variables.clientId) });
      }
    },
    ...options,
  });
};

export const useUpdateClientCall = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateClientCallAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientCalls });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useDeleteClientCall = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClientCallAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientCalls });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCompleteClientCallFollowUp = (options?: UseMutationOptions<any, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeClientCallFollowUpAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientCalls });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useCreateClientVisit = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createClientVisitAPI(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientVisits });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
      if (variables.client || variables.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clientEvents(variables.client || variables.clientId),
        });
      }
    },
    ...options,
  });
};

export const useUpdateClientVisit = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateClientVisitAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientVisits });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

export const useDeleteClientVisit = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteClientVisitAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientVisits });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activities() });
    },
    ...options,
  });
};

// Real Estate mutations
export const useCreateDeveloper = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createDeveloperAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers'] });
    },
    ...options,
  });
};

export const useUpdateDeveloper = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDeveloperAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers'] });
    },
    ...options,
  });
};

export const useDeleteDeveloper = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDeveloperAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers'] });
    },
    ...options,
  });
};

export const useCreateProject = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProjectAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
};

export const useUpdateProject = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProjectAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
};

export const useDeleteProject = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProjectAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
};

export const useCreateUnit = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createUnitAPI(data),
    onSuccess: () => {
      // Invalidate all units queries regardless of filters to refresh tables without manual reload
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    ...options,
  });
};

export const useUpdateUnit = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUnitAPI(id, data),
    onSuccess: () => {
      // Invalidate all units queries regardless of filters to refresh tables without manual reload
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    ...options,
  });
};

export const useDeleteUnit = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUnitAPI(id),
    onSuccess: () => {
      // Invalidate all units queries regardless of filters to refresh tables without manual reload
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    ...options,
  });
};

export const useCreateOwner = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createOwnerAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners });
    },
    ...options,
  });
};

export const useUpdateOwner = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateOwnerAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners });
    },
    ...options,
  });
};

export const useDeleteOwner = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteOwnerAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners });
    },
    ...options,
  });
};

// Services mutations
export const useCreateService = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServiceAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
    ...options,
  });
};

export const useUpdateService = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateServiceAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
    ...options,
  });
};

export const useDeleteService = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteServiceAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
    ...options,
  });
};

export const useCreateServicePackage = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServicePackageAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servicePackages });
    },
    ...options,
  });
};

export const useUpdateServicePackage = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateServicePackageAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servicePackages });
    },
    ...options,
  });
};

export const useDeleteServicePackage = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteServicePackageAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servicePackages });
    },
    ...options,
  });
};

export const useCreateServiceProvider = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServiceProviderAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceProviders });
    },
    ...options,
  });
};

export const useUpdateServiceProvider = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateServiceProviderAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceProviders });
    },
    ...options,
  });
};

export const useDeleteServiceProvider = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteServiceProviderAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.serviceProviders });
    },
    ...options,
  });
};

// Products mutations
export const useCreateProduct = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProductAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
    ...options,
  });
};

export const useUpdateProduct = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProductAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
    ...options,
  });
};

export const useDeleteProduct = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProductAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
    ...options,
  });
};

export const useCreateProductCategory = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProductCategoryAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories });
    },
    ...options,
  });
};

export const useUpdateProductCategory = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProductCategoryAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories });
    },
    ...options,
  });
};

export const useDeleteProductCategory = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProductCategoryAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productCategories });
    },
    ...options,
  });
};

export const useCreateSupplier = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createSupplierAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
    ...options,
  });
};

export const useUpdateSupplier = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSupplierAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
    ...options,
  });
};

export const useDeleteSupplier = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSupplierAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
    ...options,
  });
};

export const useCreateCampaign = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createCampaignAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
    },
    ...options,
  });
};

export const useUpdateCampaign = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCampaignAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
    },
    ...options,
  });
};

export const useDeleteCampaign = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCampaignAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns });
    },
    ...options,
  });
};

// Settings mutations
export const useCreateChannel = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createChannelAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels });
    },
    ...options,
  });
};

export const useUpdateChannel = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateChannelAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels });
    },
    ...options,
  });
};

export const useDeleteChannel = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChannelAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels });
    },
    ...options,
  });
};

export const useCreateStage = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createStageAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
    ...options,
  });
};

export const useUpdateStage = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStageAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
    ...options,
  });
};

export const useDeleteStage = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteStageAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
    ...options,
  });
};

export const useCreateStatus = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createStatusAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statuses });
    },
    ...options,
  });
};

export const useUpdateStatus = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStatusAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statuses });
    },
    ...options,
  });
};

export const useDeleteStatus = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteStatusAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statuses });
    },
    ...options,
  });
};

export const useCreateTag = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createTagAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
    ...options,
  });
};

export const useUpdateTag = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTagAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
    ...options,
  });
};

export const useDeleteTag = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTagAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      // Deleting a tag detaches it from every lead — drop cached lead data too
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    ...options,
  });
};

export const useCreateCallMethod = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createCallMethodAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callMethods });
    },
    ...options,
  });
};

export const useUpdateCallMethod = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateCallMethodAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callMethods });
    },
    ...options,
  });
};

export const useDeleteCallMethod = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCallMethodAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.callMethods });
    },
    ...options,
  });
};

export const useCreateVisitType = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createVisitTypeAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitTypes });
    },
    ...options,
  });
};

export const useUpdateVisitType = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateVisitTypeAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitTypes });
    },
    ...options,
  });
};

export const useDeleteVisitType = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVisitTypeAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitTypes });
    },
    ...options,
  });
};

// Connected Accounts mutations
export const useCreateConnectedAccount = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createConnectedAccountAPI(data),
    onSuccess: (_, variables) => {
      // Invalidate queries for the specific platform
      const platform = variables.platform;
      queryClient.invalidateQueries({ queryKey: queryKeys.connectedAccounts(platform) });
    },
    ...options,
  });
};

export const useUpdateConnectedAccount = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateConnectedAccountAPI(id, data),
    onSuccess: () => {
      // Invalidate all connected accounts queries
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
    },
    ...options,
  });
};

export const useDeleteConnectedAccount = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConnectedAccountAPI(id),
    onSuccess: () => {
      // Invalidate all connected accounts queries
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
    },
    ...options,
  });
};

/** Soft-disconnect: clears tokens and marks WhatsApp phone rows disconnected (does not delete the row). */
export const useDisconnectConnectedAccount = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => disconnectIntegrationAccountAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.whatsAppConversations });
      queryClient.invalidateQueries({ queryKey: ['whatsappChatMessages'] });
    },
    ...options,
  });
};

/**
 * Test Meta connection (validates token, refreshes pages).
 */
export const useTestConnection = (options?: UseMutationOptions<{ valid: boolean; message?: string; message_key?: string; expires_at?: number }, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: number) => testConnectionAPI(accountId),
    onSuccess: (_, __, ___) => {
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
    },
    ...options,
  });
};

/**
 * Hook لجلب Lead Forms من Meta
 */
export const useLeadForms = (
  accountId: number | null,
  pageId: string | null,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['leadForms', accountId, pageId],
    queryFn: () => {
      if (!accountId || !pageId) {
        throw new Error('Account ID and Page ID are required');
      }
      return getLeadFormsAPI(accountId, pageId);
    },
    enabled: !!accountId && !!pageId,
    ...options,
  });
};

/**
 * Hook لربط Lead Form بكامبين
 */
export const useSelectLeadForm = (options?: UseMutationOptions<any, Error, { accountId: number; data: { page_id: string; form_id: string; campaign_id?: number } }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }: { accountId: number; data: { page_id: string; form_id: string; campaign_id?: number } }) =>
      selectLeadFormAPI(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectedAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['leadForms'] });
    },
    ...options,
  });
};

// ==================== AI Insights ====================

export const useAIInsightsDashboard = (language?: string) => {
  return useQuery({
    queryKey: ['aiInsightsDashboard', language ?? ''],
    queryFn: () => getAIInsightsDashboardAPI(language),
    staleTime: 60 * 1000,
  });
};

export const useApproveAIInsight = (language?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: number) => approveAIInsightAPI(insightId, language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiInsightsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['clientTasks'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missionBarSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
};

export const useDismissAIInsight = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (insightId: number) => dismissAIInsightAPI(insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiInsightsDashboard'] });
    },
  });
};

export const useRunAIAnalysis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (force?: boolean) => runAIAnalysisAPI(force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiInsightsDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['aiManagementReport'] });
    },
  });
};

export const useAIManagementReport = (enabled: boolean) => {
  return useQuery({
    queryKey: ['aiManagementReport'],
    queryFn: getAIManagementReportAPI,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useGenerateAIManagementReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateAIManagementReportAPI,
    onSuccess: (data) => {
      queryClient.setQueryData(['aiManagementReport'], data);
    },
  });
};

// ==================== Alias Exports for "Add" Modals ====================
// These aliases provide consistent naming for modal components
export const useAddLead = useCreateLead;
export const useAddUser = useCreateUser;
export const useAddDeal = useCreateDeal;
export const useAddTask = useCreateTask;
export const useAddClientTask = useCreateClientTask;
export const useAddDeveloper = useCreateDeveloper;
export const useAddProject = useCreateProject;
export const useAddUnit = useCreateUnit;
export const useAddOwner = useCreateOwner;
export const useAddService = useCreateService;
export const useAddServicePackage = useCreateServicePackage;
export const useAddServiceProvider = useCreateServiceProvider;
export const useAddProduct = useCreateProduct;
export const useAddProductCategory = useCreateProductCategory;
export const useAddSupplier = useCreateSupplier;
export const useAddCampaign = useCreateCampaign;
export const useAddChannel = useCreateChannel;
export const useAddStage = useCreateStage;
export const useAddStatus = useCreateStatus;
export const useAddTag = useCreateTag;

