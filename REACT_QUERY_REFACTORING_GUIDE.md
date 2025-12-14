# React Query Refactoring Guide

This document outlines the refactoring work done to migrate the codebase from manual data fetching to TanStack React Query.

## ✅ Completed Work

### 1. Installation & Setup
- ✅ Installed `@tanstack/react-query`
- ✅ Set up `QueryClient` and `QueryClientProvider` in `index.tsx`
- ✅ Configured default query options (staleTime, retry, etc.)

### 2. Query Hooks Created
- ✅ Created `hooks/useQueries.ts` with all reusable query hooks:
  - `useCurrentUser`, `useUsers`, `useLeads`, `useDeals`
  - `useTasks`, `useActivities`, `useClientTasks`
  - `useDevelopers`, `useProjects`, `useUnits`, `useOwners`
  - `useServices`, `useServicePackages`, `useServiceProviders`
  - `useProducts`, `useProductCategories`, `useSuppliers`
  - `useCampaigns`, `useChannels`, `useStages`, `useStatuses`

### 3. Mutation Hooks Created
- ✅ Created mutation hooks for all CRUD operations:
  - Lead mutations: `useCreateLead`, `useUpdateLead`, `useDeleteLead`
  - User mutations: `useCreateUser`, `useUpdateUser`, `useDeleteUser`
  - Deal mutations: `useCreateDeal`, `useUpdateDeal`, `useDeleteDeal`
  - And all other entity mutations

### 4. Refactored Components
- ✅ `pages/LeadsPage.tsx` - Now uses `useLeads`, `useDeleteLead`
- ✅ `pages/UsersPage.tsx` - Now uses `useUsers`
- ✅ `pages/DashboardPage.tsx` - Now uses multiple query hooks
- ✅ `pages/DealsPage.tsx` - Now uses `useDeals`, `useDeleteDeal`
- ✅ `components/modals/AddLeadModal.tsx` - Now uses `useCreateLead`

## 📋 Remaining Work

### Pages to Refactor

Follow the pattern established in `LeadsPage.tsx` and `UsersPage.tsx`:

1. **PropertiesPage.tsx**
   - Replace `developers`, `projects`, `units` from context with:
     - `useDevelopers()`, `useProjects()`, `useUnits()`
   - Remove manual loading states
   - Use `isLoading` from React Query

2. **OwnersPage.tsx**
   - Replace `owners` from context with `useOwners()`
   - Remove `useEffect` with timer
   - Use `isLoading` from React Query

3. **ServicesPage.tsx**, **ServicePackagesPage.tsx**, **ServiceProvidersPage.tsx**
   - Replace data from context with respective hooks
   - Remove manual loading states

4. **ProductsPage.tsx**, **ProductCategoriesPage.tsx**, **SuppliersPage.tsx**
   - Replace data from context with respective hooks
   - Remove manual loading states

5. **CampaignsPage.tsx**
   - Replace `campaigns` from context with `useCampaigns()`
   - Remove manual loading states

6. **ActivitiesPage.tsx**
   - Replace `activities` from context with `useActivities()`
   - Remove manual loading states

7. **TodosPage.tsx**
   - Replace `todos` from context with `useTasks()`
   - Remove manual loading states

8. **SettingsPage.tsx**
   - Replace `channels`, `stages`, `statuses` from context with:
     - `useChannels()`, `useStages()`, `useStatuses()`
   - Remove manual loading states

9. **ProfilePage.tsx**
   - Replace `currentUser` from context with `useCurrentUser()`
   - Remove manual loading states

10. **IntegrationsPage.tsx**
    - Check if it needs React Query hooks (may need custom hooks)

### Modals to Refactor

Follow the pattern established in `AddLeadModal.tsx`:

1. **EditLeadModal.tsx**
   - Use `useUpdateLead` mutation
   - Use `useLeads` to fetch lead data if needed
   - Use `useUsers`, `useStatuses`, `useChannels` for dropdowns

2. **AddUserModal.tsx**, **EditUserModal.tsx**
   - Use `useCreateUser`, `useUpdateUser` mutations
   - Use `useUsers` for any user lists

3. **AddDealModal.tsx**, **EditDealModal.tsx**
   - Use `useCreateDeal`, `useUpdateDeal` mutations
   - Use `useLeads`, `useProjects`, `useUnits` for dropdowns

4. **All other modals** (Add/Edit/Delete modals for all entities)
   - Replace context methods with mutation hooks
   - Use query hooks for dropdown data

## 🔄 Refactoring Pattern

### For Pages:

**Before:**
```tsx
const { leads, users } = useAppContext();
const [loading, setLoading] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setLoading(false), 1000);
  return () => clearTimeout(timer);
}, []);

if (loading) {
  return <Loader />;
}
```

**After:**
```tsx
import { useLeads, useUsers } from '../hooks/useQueries';

const { data: leadsResponse, isLoading: leadsLoading, error: leadsError } = useLeads();
const leads = leadsResponse?.results || [];

const { data: usersResponse } = useUsers();
const users = usersResponse?.results || [];

if (leadsLoading) {
  return <Loader />;
}

if (leadsError) {
  return <ErrorDisplay />;
}
```

### For Modals:

**Before:**
```tsx
const { addLead, users, statuses } = useAppContext();
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e) => {
  setIsLoading(true);
  try {
    await addLead(data);
  } finally {
    setIsLoading(false);
  }
};
```

**After:**
```tsx
import { useCreateLead, useUsers, useStatuses } from '../../hooks/useQueries';

const { data: usersResponse } = useUsers();
const users = usersResponse?.results || [];

const { data: statusesData } = useStatuses();
const statuses = statusesData || [];

const createLeadMutation = useCreateLead();
const isLoading = createLeadMutation.isPending;

const handleSubmit = async (e) => {
  try {
    await createLeadMutation.mutateAsync(data);
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

## 🔁 Polling with refetchInterval

For components that need real-time updates, use `refetchInterval` instead of manual polling:

**Before:**
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**After:**
```tsx
const { data } = useLeads(undefined, {
  refetchInterval: 5000, // Refetch every 5 seconds
});
```

**Note:** Consider using WebSockets for true real-time updates instead of polling.

## 🎯 Key Benefits

1. **Automatic Caching**: Data is cached and shared across components
2. **No Infinite Loops**: React Query handles dependencies correctly
3. **Loading States**: Built-in `isLoading`, `isError`, `isSuccess` states
4. **Automatic Refetching**: Data refetches when needed (window focus, network reconnect)
5. **Optimistic Updates**: Easy to implement optimistic UI updates
6. **Error Handling**: Built-in error states and retry logic
7. **Form State Preservation**: Form state is separate from server state

## ⚠️ Important Notes

1. **API Response Structure**: All API endpoints return `{ count, next, previous, results: [] }`. Access data via `.results`.

2. **Query Keys**: Query keys are defined in `queryKeys` object. Use them for cache invalidation:
   ```tsx
   queryClient.invalidateQueries({ queryKey: queryKeys.leads() });
   ```

3. **Mutations Auto-Invalidate**: All mutation hooks automatically invalidate related queries on success.

4. **Form State**: Keep form `useState` separate from query data. Don't tie form inputs to query state.

5. **Stable Keys**: Don't change component keys based on query state. Use stable keys to prevent remounting.

## 📝 Checklist for Each Component

- [ ] Remove `useState` for loading states
- [ ] Remove `useEffect` that only calls fetch/setLoading
- [ ] Import query hooks from `hooks/useQueries`
- [ ] Replace context data with query hooks
- [ ] Replace context mutations with mutation hooks
- [ ] Use `isLoading` from React Query instead of manual state
- [ ] Add error handling with `isError` from React Query
- [ ] Remove manual timers/setTimeout for loading
- [ ] Ensure form state is separate from query state
- [ ] Test that components don't remount unnecessarily

## 🚀 Next Steps

1. Continue refactoring remaining pages following the established pattern
2. Refactor all modal components to use mutations
3. Replace any polling loops with `refetchInterval`
4. Consider WebSocket integration for real-time updates
5. Remove unused data from AppContext once all components are migrated
6. Update AppContext to optionally use React Query hooks for backward compatibility during migration

## 📚 Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

