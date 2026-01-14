/**
 * React Query hooks for data fetching
 * This file contains all reusable query hooks for the application
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { normalizeUser } from '../utils/userUtils';
import {
  getLeadsAPI, getUsersAPI, getDealsAPI, getTasksAPI, getClientTasksAPI, getClientCallsAPI, getClientEventsAPI,
  getDevelopersAPI, getProjectsAPI, getUnitsAPI, getOwnersAPI,
  getServicesAPI, getServicePackagesAPI, getServiceProvidersAPI,
  getProductsAPI, getProductCategoriesAPI, getSuppliersAPI,
  getCampaignsAPI, getChannelsAPI, getStagesAPI, getStatusesAPI, getCallMethodsAPI,
  getCurrentUserAPI, getActivitiesAPI,
  getConnectedAccountsAPI, createConnectedAccountAPI, updateConnectedAccountAPI, deleteConnectedAccountAPI,
  getLeadFormsAPI, selectLeadFormAPI,
  createLeadAPI, updateLeadAPI, deleteLeadAPI,
  createUserAPI, updateUserAPI, deleteUserAPI,
  createDealAPI, updateDealAPI, deleteDealAPI,
  createTaskAPI, updateTaskAPI, deleteTaskAPI,
  createClientTaskAPI, updateClientTaskAPI, deleteClientTaskAPI,
  createClientCallAPI, updateClientCallAPI, deleteClientCallAPI,
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
  createCallMethodAPI, updateCallMethodAPI, deleteCallMethodAPI,
  bulkAssignLeadsAPI,
  assignUnassignedClientsAPI,
} from '../services/api';

// ==================== Query Keys ====================
export const queryKeys = {
  currentUser: ['currentUser'] as const,
  users: ['users'] as const,
  leads: (filters?: { type?: string; priority?: string; search?: string }) => ['leads', filters] as const,
  deals: ['deals'] as const,
  tasks: (filters?: any) => ['tasks', filters] as const,
  activities: (filters?: any) => ['activities', filters] as const,
  clientTasks: ['clientTasks'] as const,
  clientCalls: ['clientCalls'] as const,
  clientEvents: (clientId?: number) => ['clientEvents', clientId] as const,
  developers: ['developers'] as const,
  projects: ['projects'] as const,
  units: (filters?: any) => ['units', filters] as const,
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
  callMethods: ['callMethods'] as const,
  connectedAccounts: (platform?: string) => ['connectedAccounts', platform] as const,
};

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

export const useUsers = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const response = await getUsersAPI();
      if (response && response.results) {
        return {
          ...response,
          results: response.results.map(user => normalizeUser(user))
        };
      }
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useLeads = (
  filters?: { type?: string; priority?: string; search?: string },
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: () => getLeadsAPI(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useDeals = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.deals,
    queryFn: () => getDealsAPI(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
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

export const useClientEvents = (clientId?: number, options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.clientEvents(clientId),
    queryFn: () => getClientEventsAPI(clientId),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

export const useDevelopers = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.developers,
    queryFn: () => getDevelopersAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useProjects = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => getProjectsAPI(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: shouldEnable && (optionsEnabled !== false),
    ...restOptions,
  });
};

export const useUnits = (
  filters?: any,
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) => {
  const { currentUser } = useAppContext();
  const specialization = currentUser?.company?.specialization;
  const shouldEnable = specialization === 'real_estate';
  const { enabled: optionsEnabled, ...restOptions } = options || {};
  
  return useQuery({
    queryKey: queryKeys.units(filters),
    queryFn: () => getUnitsAPI(filters),
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
  const shouldEnable = specialization === 'services';
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
  const shouldEnable = specialization === 'services';
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
  const shouldEnable = specialization === 'services';
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

export const useCallMethods = (options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: queryKeys.callMethods,
    queryFn: () => getCallMethodsAPI(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
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

// ==================== Mutation Hooks ====================

export const useCreateLead = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createLeadAPI(data),
    onSuccess: () => {
      // Invalidate all leads queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    ...options,
  });
};

export const useUpdateLead = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateLeadAPI(id, data),
    onSuccess: (data, variables) => {
      // Invalidate all leads queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Invalidate events for this specific lead to show updates in timeline
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEvents(variables.id) });
      // Also invalidate client tasks since they might be related
      queryClient.invalidateQueries({ queryKey: ['clientTasks'] });
      // Return the updated data so components can use it
      return data;
    },
    ...options,
  });
};

export const useDeleteLead = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteLeadAPI(id),
    onSuccess: () => {
      // Invalidate all leads queries regardless of filters to refresh tables without manual reload
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    ...options,
  });
};

export const useAssignLeads = (options?: UseMutationOptions<any, Error, { clientIds: number[]; userId: number | null }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientIds, userId }: { clientIds: number[]; userId: number | null }) => bulkAssignLeadsAPI(clientIds, userId),
    onSuccess: (_, variables) => {
      // Invalidate all leads queries to refresh the list with new assignments
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
  const customOnSuccess = options?.onSuccess;
  
  return useMutation({
    mutationFn: () => assignUnassignedClientsAPI(),
    onSuccess: (data, variables, context) => {
      // Invalidate all leads queries regardless of filters to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['leads'],
        exact: false // Invalidate all queries that start with 'leads'
      });
      // Also invalidate client events for all leads that might have been assigned
      queryClient.invalidateQueries({ 
        queryKey: ['clientEvents'],
        exact: false
      });
      // Refetch all leads queries to ensure UI is updated immediately
      queryClient.refetchQueries({ 
        queryKey: ['leads'],
        exact: false
      });
      
      // Call custom onSuccess if provided
      if (customOnSuccess) {
        customOnSuccess(data, variables, context);
      }
    },
    ...options,
  });
};

export const useCreateUser = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createUserAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
    ...options,
  });
};

export const useUpdateUser = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUserAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
    ...options,
  });
};

export const useCreateDeal = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createDealAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
    },
    ...options,
  });
};

export const useUpdateDeal = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDealAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
    },
    ...options,
  });
};

export const useDeleteDeal = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDealAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
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

export const useCreateClientTask = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createClientTaskAPI(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientTasks });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.developers });
    },
    ...options,
  });
};

export const useUpdateDeveloper = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDeveloperAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.developers });
    },
    ...options,
  });
};

export const useDeleteDeveloper = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDeveloperAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.developers });
    },
    ...options,
  });
};

export const useCreateProject = (options?: UseMutationOptions<any, Error, any>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProjectAPI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    ...options,
  });
};

export const useUpdateProject = (options?: UseMutationOptions<any, Error, { id: number; data: any }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProjectAPI(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    ...options,
  });
};

export const useDeleteProject = (options?: UseMutationOptions<void, Error, number>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProjectAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
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

