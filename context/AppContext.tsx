

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Theme, Language, Page, Lead, User, Deal, Campaign, Developer, Project, Unit, Owner, Service, ServicePackage, ServiceProvider, Product, ProductCategory, Supplier, Activity, Todo, ClientTask, TimelineEntry, TaskStage, Channel, Stage, Status, LeadFilters, ActivityFilters, DeveloperFilters, ProjectFilters, UnitFilters, OwnerFilters, ProductFilters, ProductCategoryFilters, SupplierFilters, ServiceFilters, ServicePackageFilters, ServiceProviderFilters, DealFilters, CampaignFilters, TeamsReportFilters, EmployeesReportFilters, MarketingReportFilters } from '../types';
import { translations } from '../constants';
import { formatStageName, getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { formatDateToLocal, parseUTCDate } from '../utils/dateUtils';
import { generateColorShades } from '../utils/colors';
import { 
  getCurrentUserAPI, getUsersAPI, getLeadsAPI, getDealsAPI, createUserAPI, updateUserAPI, deleteUserAPI, createLeadAPI, updateLeadAPI, deleteLeadAPI, createDealAPI, deleteDealAPI,
  getDevelopersAPI, createDeveloperAPI, updateDeveloperAPI, deleteDeveloperAPI,
  getProjectsAPI, createProjectAPI, updateProjectAPI, deleteProjectAPI,
  getUnitsAPI, createUnitAPI, updateUnitAPI, deleteUnitAPI,
  getOwnersAPI, createOwnerAPI, updateOwnerAPI, deleteOwnerAPI,
  getServicesAPI, createServiceAPI, updateServiceAPI, deleteServiceAPI,
  getServicePackagesAPI, createServicePackageAPI, updateServicePackageAPI, deleteServicePackageAPI,
  getServiceProvidersAPI, createServiceProviderAPI, updateServiceProviderAPI, deleteServiceProviderAPI,
  getProductsAPI, createProductAPI, updateProductAPI, deleteProductAPI,
  getProductCategoriesAPI, createProductCategoryAPI, updateProductCategoryAPI, deleteProductCategoryAPI,
  getSuppliersAPI, createSupplierAPI, updateSupplierAPI, deleteSupplierAPI,
  getCampaignsAPI, createCampaignAPI, deleteCampaignAPI,
  getTasksAPI, createTaskAPI, updateTaskAPI,
  getClientTasksAPI, createClientTaskAPI, updateClientTaskAPI, deleteClientTaskAPI,
  getChannelsAPI, createChannelAPI, updateChannelAPI, deleteChannelAPI,
  getStagesAPI, createStageAPI, updateStageAPI, deleteStageAPI,
  getStatusesAPI, createStatusAPI, updateStatusAPI, deleteStatusAPI
} from '../services/api';

// --- Helper Functions ---
const hexToHsl = (hex: string): [number, number, number] | null => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

type ConnectedAccount = { id: number; name: string; status: string; link?: string; phone?: string; };

// --- CONTEXT ---
export interface AppContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  t: (key: keyof typeof translations.en) => string;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  selectedLeadForDeal: number | null;
  setSelectedLeadForDeal: (leadId: number | null) => void;
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isAddLeadModalOpen: boolean;
  setIsAddLeadModalOpen: (isOpen: boolean) => void;
  isEditLeadModalOpen: boolean;
  setIsEditLeadModalOpen: (isOpen: boolean) => void;
  editingLead: Lead | null;
  setEditingLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  isAddActionModalOpen: boolean;
  setIsAddActionModalOpen: (isOpen: boolean) => void;
  isAddTodoModalOpen: boolean;
  setIsAddTodoModalOpen: (isOpen: boolean) => void;
  isAssignLeadModalOpen: boolean;
  setIsAssignLeadModalOpen: (isOpen: boolean) => void;
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: (isOpen: boolean) => void;
  isActivitiesFilterDrawerOpen: boolean;
  setIsActivitiesFilterDrawerOpen: (isOpen: boolean) => void;
  isDeveloperFilterDrawerOpen: boolean;
  setIsDeveloperFilterDrawerOpen: (isOpen: boolean) => void;
  isProjectFilterDrawerOpen: boolean;
  setIsProjectFilterDrawerOpen: (isOpen: boolean) => void;
  isOwnerFilterDrawerOpen: boolean;
  setIsOwnerFilterDrawerOpen: (isOpen: boolean) => void;
  isProductFilterDrawerOpen: boolean;
  setIsProductFilterDrawerOpen: (isOpen: boolean) => void;
  isProductCategoryFilterDrawerOpen: boolean;
  setIsProductCategoryFilterDrawerOpen: (isOpen: boolean) => void;
  isSupplierFilterDrawerOpen: boolean;
  setIsSupplierFilterDrawerOpen: (isOpen: boolean) => void;
  isServiceFilterDrawerOpen: boolean;
  setIsServiceFilterDrawerOpen: (isOpen: boolean) => void;
  isServicePackageFilterDrawerOpen: boolean;
  setIsServicePackageFilterDrawerOpen: (isOpen: boolean) => void;
  isServiceProviderFilterDrawerOpen: boolean;
  setIsServiceProviderFilterDrawerOpen: (isOpen: boolean) => void;
  isCampaignsFilterDrawerOpen: boolean;
  setIsCampaignsFilterDrawerOpen: (isOpen: boolean) => void;
  isTeamsReportFilterDrawerOpen: boolean;
  setIsTeamsReportFilterDrawerOpen: (isOpen: boolean) => void;
  isEmployeesReportFilterDrawerOpen: boolean;
  setIsEmployeesReportFilterDrawerOpen: (isOpen: boolean) => void;
  isMarketingReportFilterDrawerOpen: boolean;
  setIsMarketingReportFilterDrawerOpen: (isOpen: boolean) => void;
  checkedLeadIds: Set<number>;
  setCheckedLeadIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  activeSubPageColor: string;
  setActiveSubPageColor: (color: string) => void;

  // Inventory states
  isUnitsFilterDrawerOpen: boolean;
  setIsUnitsFilterDrawerOpen: (isOpen: boolean) => void;
  isAddDeveloperModalOpen: boolean;
  setIsAddDeveloperModalOpen: (isOpen: boolean) => void;
  isAddProjectModalOpen: boolean;
  setIsAddProjectModalOpen: (isOpen: boolean) => void;
  isAddUnitModalOpen: boolean;
  setIsAddUnitModalOpen: (isOpen: boolean) => void;
  isAddOwnerModalOpen: boolean;
  setIsAddOwnerModalOpen: (isOpen: boolean) => void;
  isEditOwnerModalOpen: boolean;
  setIsEditOwnerModalOpen: (isOpen: boolean) => void;
  editingOwner: Owner | null;
  setEditingOwner: React.Dispatch<React.SetStateAction<Owner | null>>;
  isEditDeveloperModalOpen: boolean;
  setIsEditDeveloperModalOpen: (isOpen: boolean) => void;
  editingDeveloper: Developer | null;
  setEditingDeveloper: React.Dispatch<React.SetStateAction<Developer | null>>;
  isDeleteDeveloperModalOpen: boolean;
  setIsDeleteDeveloperModalOpen: (isOpen: boolean) => void;
  deletingDeveloper: Developer | null;
  setDeletingDeveloper: React.Dispatch<React.SetStateAction<Developer | null>>;
  // General confirm delete modal
  isConfirmDeleteModalOpen: boolean;
  setIsConfirmDeleteModalOpen: (isOpen: boolean) => void;
  confirmDeleteConfig: {
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => void | Promise<void>;
  } | null;
  setConfirmDeleteConfig: React.Dispatch<React.SetStateAction<{
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => void | Promise<void>;
  } | null>>;
  isEditProjectModalOpen: boolean;
  setIsEditProjectModalOpen: (isOpen: boolean) => void;
  editingProject: Project | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Project | null>>;
  isEditUnitModalOpen: boolean;
  setIsEditUnitModalOpen: (isOpen: boolean) => void;
  editingUnit: Unit | null;
  setEditingUnit: React.Dispatch<React.SetStateAction<Unit | null>>;
  // Services modals
  isAddServiceModalOpen: boolean;
  setIsAddServiceModalOpen: (isOpen: boolean) => void;
  isEditServiceModalOpen: boolean;
  setIsEditServiceModalOpen: (isOpen: boolean) => void;
  editingService: Service | null;
  setEditingService: React.Dispatch<React.SetStateAction<Service | null>>;
  isAddServicePackageModalOpen: boolean;
  setIsAddServicePackageModalOpen: (isOpen: boolean) => void;
  isEditServicePackageModalOpen: boolean;
  setIsEditServicePackageModalOpen: (isOpen: boolean) => void;
  editingServicePackage: ServicePackage | null;
  setEditingServicePackage: React.Dispatch<React.SetStateAction<ServicePackage | null>>;
  isAddServiceProviderModalOpen: boolean;
  setIsAddServiceProviderModalOpen: (isOpen: boolean) => void;
  isEditServiceProviderModalOpen: boolean;
  setIsEditServiceProviderModalOpen: (isOpen: boolean) => void;
  editingServiceProvider: ServiceProvider | null;
  setEditingServiceProvider: React.Dispatch<React.SetStateAction<ServiceProvider | null>>;
  // Products modals
  isAddProductModalOpen: boolean;
  setIsAddProductModalOpen: (isOpen: boolean) => void;
  isEditProductModalOpen: boolean;
  setIsEditProductModalOpen: (isOpen: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<Product | null>>;
  isAddProductCategoryModalOpen: boolean;
  setIsAddProductCategoryModalOpen: (isOpen: boolean) => void;
  isEditProductCategoryModalOpen: boolean;
  setIsEditProductCategoryModalOpen: (isOpen: boolean) => void;
  editingProductCategory: ProductCategory | null;
  setEditingProductCategory: React.Dispatch<React.SetStateAction<ProductCategory | null>>;
  isAddSupplierModalOpen: boolean;
  setIsAddSupplierModalOpen: (isOpen: boolean) => void;
  isEditSupplierModalOpen: boolean;
  setIsEditSupplierModalOpen: (isOpen: boolean) => void;
  editingSupplier: Supplier | null;
  setEditingSupplier: React.Dispatch<React.SetStateAction<Supplier | null>>;


  // Deals states
  isDealsFilterDrawerOpen: boolean;
  setIsDealsFilterDrawerOpen: (isOpen: boolean) => void;

  // Users states
  isAddUserModalOpen: boolean;
  setIsAddUserModalOpen: (isOpen: boolean) => void;
  isViewUserModalOpen: boolean;
  setIsViewUserModalOpen: (isOpen: boolean) => void;
  isEditUserModalOpen: boolean;
  setIsEditUserModalOpen: (isOpen: boolean) => void;
  isDeleteUserModalOpen: boolean;
  setIsDeleteUserModalOpen: (isOpen: boolean) => void;

  // Marketing states
  isAddCampaignModalOpen: boolean;
  setIsAddCampaignModalOpen: (isOpen: boolean) => void;

  // Integrations states
  isManageIntegrationAccountModalOpen: boolean;
  setIsManageIntegrationAccountModalOpen: (isOpen: boolean) => void;
  connectedAccounts: { facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] };
  setConnectedAccounts: React.Dispatch<React.SetStateAction<{ facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] }>>;
  editingAccount: ConnectedAccount | null;
  setEditingAccount: React.Dispatch<React.SetStateAction<ConnectedAccount | null>>;
  
  // Change Password Modal state
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (isOpen: boolean) => void;

  // Data states
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>; // TODO: استخدم هذا لتحديث users من API
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (userId: number, userData: Partial<User>) => Promise<void>;
  deleteUser: (userId: number) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>; // TODO: استخدم هذا لتحديث leads من API
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'history' | 'lastFeedback' | 'notes' | 'lastStage' | 'reminder'>) => void;
  updateLead: (leadId: number, leadData: Partial<Lead>) => void;
  deleteLead: (leadId: number) => Promise<void>;
  assignLeads: (leadIds: number[], userId: number) => void;
  leadFilters: LeadFilters;
  setLeadFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
  deals: Deal[];
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>; // TODO: استخدم هذا لتحديث deals من API
  addDeal: (deal: Omit<Deal, 'id'>) => void;
  deleteDeal: (dealId: number) => void;
  dealFilters: DealFilters;
  setDealFilters: React.Dispatch<React.SetStateAction<DealFilters>>;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'code' | 'createdAt'>) => void;
  deleteCampaign: (campaignId: number) => void;
  campaignFilters: CampaignFilters;
  setCampaignFilters: React.Dispatch<React.SetStateAction<CampaignFilters>>;
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  activityFilters: ActivityFilters;
  setActivityFilters: React.Dispatch<React.SetStateAction<ActivityFilters>>;
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  completedTodos: Todo[];
  setCompletedTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  addTodo: (todoData: { dealId: number; stage: TaskStage; notes: string; reminderDate: string }) => Promise<void>;
  completeTodo: (todoId: number) => Promise<void>;
  developers: Developer[];
  setDevelopers: React.Dispatch<React.SetStateAction<Developer[]>>; // TODO: استخدم هذا لتحديث developers من API
  addDeveloper: (developer: Omit<Developer, 'id' | 'code'>) => void;
  updateDeveloper: (developer: Developer) => void;
  deleteDeveloper: (developerId: number) => void;
  developerFilters: DeveloperFilters;
  setDeveloperFilters: React.Dispatch<React.SetStateAction<DeveloperFilters>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>; // TODO: استخدم هذا لتحديث projects من API
  addProject: (project: Omit<Project, 'id' | 'code'>) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: number) => void;
  projectFilters: ProjectFilters;
  setProjectFilters: React.Dispatch<React.SetStateAction<ProjectFilters>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>; // TODO: استخدم هذا لتحديث units من API
  addUnit: (unit: Omit<Unit, 'id' | 'code' | 'isSold'>) => void;
  updateUnit: (unit: Unit) => void;
  deleteUnit: (unitId: number) => void;
  unitFilters: UnitFilters;
  setUnitFilters: React.Dispatch<React.SetStateAction<UnitFilters>>;
  owners: Owner[];
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>; // TODO: استخدم هذا لتحديث owners من API
  addOwner: (owner: Omit<Owner, 'id' | 'code'>) => void;
  updateOwner: (owner: Owner) => void;
  deleteOwner: (ownerId: number) => void;
  ownerFilters: OwnerFilters;
  setOwnerFilters: React.Dispatch<React.SetStateAction<OwnerFilters>>;
  // Services data
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>; // TODO: استخدم هذا لتحديث services من API
  addService: (service: Omit<Service, 'id' | 'code'>) => void;
  updateService: (service: Service) => void;
  deleteService: (serviceId: number) => void;
  serviceFilters: ServiceFilters;
  setServiceFilters: React.Dispatch<React.SetStateAction<ServiceFilters>>;
  servicePackages: ServicePackage[];
  setServicePackages: React.Dispatch<React.SetStateAction<ServicePackage[]>>; // TODO: استخدم هذا لتحديث servicePackages من API
  addServicePackage: (servicePackage: Omit<ServicePackage, 'id' | 'code'>) => void;
  updateServicePackage: (servicePackage: ServicePackage) => void;
  deleteServicePackage: (packageId: number) => void;
  servicePackageFilters: ServicePackageFilters;
  setServicePackageFilters: React.Dispatch<React.SetStateAction<ServicePackageFilters>>;
  serviceProviders: ServiceProvider[];
  setServiceProviders: React.Dispatch<React.SetStateAction<ServiceProvider[]>>; // TODO: استخدم هذا لتحديث serviceProviders من API
  addServiceProvider: (provider: Omit<ServiceProvider, 'id' | 'code'>) => void;
  updateServiceProvider: (provider: ServiceProvider) => void;
  deleteServiceProvider: (providerId: number) => void;
  serviceProviderFilters: ServiceProviderFilters;
  setServiceProviderFilters: React.Dispatch<React.SetStateAction<ServiceProviderFilters>>;
  // Products data
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>; // TODO: استخدم هذا لتحديث products من API
  addProduct: (product: Omit<Product, 'id' | 'code'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: number) => void;
  productFilters: ProductFilters;
  setProductFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  productCategories: ProductCategory[];
  setProductCategories: React.Dispatch<React.SetStateAction<ProductCategory[]>>; // TODO: استخدم هذا لتحديث productCategories من API
  addProductCategory: (category: Omit<ProductCategory, 'id' | 'code'>) => void;
  updateProductCategory: (category: ProductCategory) => void;
  deleteProductCategory: (categoryId: number) => void;
  productCategoryFilters: ProductCategoryFilters;
  setProductCategoryFilters: React.Dispatch<React.SetStateAction<ProductCategoryFilters>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>; // TODO: استخدم هذا لتحديث suppliers من API
  addSupplier: (supplier: Omit<Supplier, 'id' | 'code'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: number) => void;
  supplierFilters: SupplierFilters;
  setSupplierFilters: React.Dispatch<React.SetStateAction<SupplierFilters>>;
  // Reports filters
  teamsReportFilters: TeamsReportFilters;
  setTeamsReportFilters: React.Dispatch<React.SetStateAction<TeamsReportFilters>>;
  employeesReportFilters: EmployeesReportFilters;
  setEmployeesReportFilters: React.Dispatch<React.SetStateAction<EmployeesReportFilters>>;
  marketingReportFilters: MarketingReportFilters;
  setMarketingReportFilters: React.Dispatch<React.SetStateAction<MarketingReportFilters>>;
  // Client Tasks (Actions) data
  clientTasks: ClientTask[];
  setClientTasks: React.Dispatch<React.SetStateAction<ClientTask[]>>;
  addClientTask: (clientTaskData: { clientId: number; stage: string; notes: string; reminderDate: string | null }) => Promise<void>;
  updateClientTask: (clientTaskId: number, clientTaskData: Partial<ClientTask>) => Promise<void>;
  deleteClientTask: (clientTaskId: number) => Promise<void>;
  // Settings data
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  addChannel: (channel: Omit<Channel, 'id'>) => Promise<void>;
  updateChannel: (channel: Channel) => Promise<void>;
  deleteChannel: (channelId: number) => Promise<void>;
  stages: Stage[];
  setStages: React.Dispatch<React.SetStateAction<Stage[]>>;
  addStage: (stage: Omit<Stage, 'id'>) => Promise<void>;
  updateStage: (stage: Stage) => Promise<void>;
  deleteStage: (stageId: number) => Promise<void>;
  statuses: Status[];
  setStatuses: React.Dispatch<React.SetStateAction<Status[]>>;
  addStatus: (status: Omit<Status, 'id'>) => Promise<void>;
  updateStatus: (status: Status) => Promise<void>;
  deleteStatus: (statusId: number) => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// Helper function to normalize user roles - only Owner and Employee are valid
const normalizeRole = (role: string | undefined): 'Owner' | 'Employee' => {
  if (!role || typeof role !== 'string') return 'Employee';
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin' || role === 'Owner') return 'Owner';
  // Convert any old roles (Sales Agent, Sales Manager, etc.) to Employee
  if (roleLower.includes('sales') || roleLower.includes('manager') || roleLower.includes('assistant')) {
    return 'Employee';
  }
  if (roleLower === 'employee' || role === 'Employee') return 'Employee';
  // Default to Employee for any unknown role
  return 'Employee';
};

// FIX: Made children optional to fix missing children prop error.
type AppProviderProps = { children?: ReactNode };
export const AppProvider = ({ children }: AppProviderProps) => {
  // Initialize theme from localStorage or default to 'light'
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        // Apply theme immediately to prevent flash
        document.documentElement.classList.toggle('dark', stored === 'dark');
        return stored as Theme;
      }
    }
    return 'light';
  });
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language');
      if (stored === 'en' || stored === 'ar') {
        return stored as Language;
      }
    }
    return 'en';
  });
  const [isLoggedIn, setIsLoggedInState] = useState(() => {
    const stored = localStorage.getItem('isLoggedIn');
    return stored === 'true';
  });
  const [dataLoaded, setDataLoaded] = useState(false); // لتتبع ما إذا تم تحميل البيانات بالفعل
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({
    status: 'All',
    type: 'All',
    priority: 'All',
    assignedTo: 'All',
    communicationWay: 'All',
    budgetMin: '',
    budgetMax: '',
    createdAtFrom: '',
    createdAtTo: '',
    search: '',
  });
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>({
    user: 'All',
    stage: 'All',
    leadType: 'All',
    timePeriod: 'All',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [developerFilters, setDeveloperFilters] = useState<DeveloperFilters>({
    search: '',
  });
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>({
    developer: 'All',
    type: 'All',
    city: 'All',
    paymentMethod: 'All',
    search: '',
  });
  const [unitFilters, setUnitFilters] = useState<UnitFilters>({
    project: 'All',
    type: 'All',
    finishing: 'All',
    city: 'All',
    district: 'All',
    zone: 'All',
    isSold: 'All',
    bedrooms: 'All',
    bathrooms: 'All',
    priceMin: '',
    priceMax: '',
    search: '',
  });
  const [ownerFilters, setOwnerFilters] = useState<OwnerFilters>({
    city: 'All',
    district: 'All',
    search: '',
  });
  const [productFilters, setProductFilters] = useState<ProductFilters>({
    category: 'All',
    supplier: 'All',
    isActive: 'All',
    stockMin: '',
    stockMax: '',
    priceMin: '',
    priceMax: '',
    search: '',
  });
  const [productCategoryFilters, setProductCategoryFilters] = useState<ProductCategoryFilters>({
    search: '',
  });
  const [supplierFilters, setSupplierFilters] = useState<SupplierFilters>({
    specialization: 'All',
    search: '',
  });
  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>({
    category: 'All',
    provider: 'All',
    isActive: 'All',
    priceMin: '',
    priceMax: '',
    search: '',
  });
  const [servicePackageFilters, setServicePackageFilters] = useState<ServicePackageFilters>({
    isActive: 'All',
    priceMin: '',
    priceMax: '',
    search: '',
  });
  const [serviceProviderFilters, setServiceProviderFilters] = useState<ServiceProviderFilters>({
    specialization: 'All',
    search: '',
  });
  const [dealFilters, setDealFilters] = useState<DealFilters>({
    status: 'All',
    paymentMethod: 'All',
    unit: 'All',
    project: 'All',
    valueMin: '',
    valueMax: '',
    search: '',
  });
  const [campaignFilters, setCampaignFilters] = useState<CampaignFilters>({
    isActive: 'All',
    budgetMin: '',
    budgetMax: '',
    createdAtFrom: '',
    createdAtTo: '',
    search: '',
  });
  const [teamsReportFilters, setTeamsReportFilters] = useState<TeamsReportFilters>({
    selectedTeam: 'all',
    leadType: 'all',
    startDate: '',
    endDate: '',
  });
  const [employeesReportFilters, setEmployeesReportFilters] = useState<EmployeesReportFilters>({
    leadType: 'all',
    startDate: '',
    endDate: '',
  });
  const [marketingReportFilters, setMarketingReportFilters] = useState<MarketingReportFilters>({
    selectedCampaign: 'all',
    startDate: '',
    endDate: '',
  });
  const [selectedLeadForDeal, setSelectedLeadForDeal] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    // محاولة تحميل المستخدم من localStorage مع تنظيف الأدوار القديمة
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // تنظيف الدور القديم
        parsed.role = normalizeRole(parsed.role);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Always use fixed purple color - never load from localStorage
  const [primaryColor, setPrimaryColorState] = useState(() => {
    // Remove any old color from localStorage to ensure consistency
    if (typeof window !== 'undefined') {
      localStorage.removeItem('primaryColor');
    }
    return '#9333ea'; // Purple (fixed, not customizable)
  });
  const [activeSubPageColor, setActiveSubPageColorState] = useState(() => {
    // Remove any old color from localStorage to ensure consistency
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeSubPageColor');
    }
    return '#9333ea'; // Purple (same as primary color, fixed, not customizable)
  });
  
  // Data states - TODO: سيتم تحميل البيانات من API بدلاً من البيانات الثابتة
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  // Services data
  const [services, setServices] = useState<Service[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  // Products data
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  // Settings data
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  
  // Modals and drawers state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
  const [isAssignLeadModalOpen, setIsAssignLeadModalOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isActivitiesFilterDrawerOpen, setIsActivitiesFilterDrawerOpen] = useState(false);
  const [isDeveloperFilterDrawerOpen, setIsDeveloperFilterDrawerOpen] = useState(false);
  const [isProjectFilterDrawerOpen, setIsProjectFilterDrawerOpen] = useState(false);
  const [isOwnerFilterDrawerOpen, setIsOwnerFilterDrawerOpen] = useState(false);
  const [isProductFilterDrawerOpen, setIsProductFilterDrawerOpen] = useState(false);
  const [isProductCategoryFilterDrawerOpen, setIsProductCategoryFilterDrawerOpen] = useState(false);
  const [isSupplierFilterDrawerOpen, setIsSupplierFilterDrawerOpen] = useState(false);
  const [isServiceFilterDrawerOpen, setIsServiceFilterDrawerOpen] = useState(false);
  const [isServicePackageFilterDrawerOpen, setIsServicePackageFilterDrawerOpen] = useState(false);
  const [isServiceProviderFilterDrawerOpen, setIsServiceProviderFilterDrawerOpen] = useState(false);
  const [isCampaignsFilterDrawerOpen, setIsCampaignsFilterDrawerOpen] = useState(false);
  const [isTeamsReportFilterDrawerOpen, setIsTeamsReportFilterDrawerOpen] = useState(false);
  const [isEmployeesReportFilterDrawerOpen, setIsEmployeesReportFilterDrawerOpen] = useState(false);
  const [isMarketingReportFilterDrawerOpen, setIsMarketingReportFilterDrawerOpen] = useState(false);
  const [checkedLeadIds, setCheckedLeadIds] = useState<Set<number>>(new Set());

  // Inventory state
  const [isUnitsFilterDrawerOpen, setIsUnitsFilterDrawerOpen] = useState(false);
  const [isAddDeveloperModalOpen, setIsAddDeveloperModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);
  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  // Services modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddServicePackageModalOpen, setIsAddServicePackageModalOpen] = useState(false);
  const [isEditServicePackageModalOpen, setIsEditServicePackageModalOpen] = useState(false);
  const [editingServicePackage, setEditingServicePackage] = useState<ServicePackage | null>(null);
  const [isAddServiceProviderModalOpen, setIsAddServiceProviderModalOpen] = useState(false);
  const [isEditServiceProviderModalOpen, setIsEditServiceProviderModalOpen] = useState(false);
  const [editingServiceProvider, setEditingServiceProvider] = useState<ServiceProvider | null>(null);
  // Products modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductCategoryModalOpen, setIsAddProductCategoryModalOpen] = useState(false);
  const [isEditProductCategoryModalOpen, setIsEditProductCategoryModalOpen] = useState(false);
  const [editingProductCategory, setEditingProductCategory] = useState<ProductCategory | null>(null);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isEditDeveloperModalOpen, setIsEditDeveloperModalOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [isDeleteDeveloperModalOpen, setIsDeleteDeveloperModalOpen] = useState(false);
  const [deletingDeveloper, setDeletingDeveloper] = useState<Developer | null>(null);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  // General confirm delete modal
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [confirmDeleteConfig, setConfirmDeleteConfig] = useState<{
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  
  // Deals state
  const [isDealsFilterDrawerOpen, setIsDealsFilterDrawerOpen] = useState(false);
  
  // Users state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  
  // Marketing state
  const [isAddCampaignModalOpen, setIsAddCampaignModalOpen] = useState(false);

  // Integrations state
  const [isManageIntegrationAccountModalOpen, setIsManageIntegrationAccountModalOpen] = useState(false);
  // TODO: استدعي getConnectedAccountsAPI() عند تحميل صفحة Integrations
  // مثال: getConnectedAccountsAPI('meta').then(data => setConnectedAccounts(prev => ({ ...prev, facebook: data })));
  const [connectedAccounts, setConnectedAccounts] = useState<{ facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] }>({
    facebook: [],
    tiktok: [],
    whatsapp: []
  });
  const [editingAccount, setEditingAccount] = useState<ConnectedAccount | null>(null);
  
  // Change Password Modal state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);


  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) setThemeState(storedTheme);
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang) setLanguage(storedLang);
    // Primary color is fixed to purple - no longer loads from localStorage
    // Removed: const storedColor = localStorage.getItem('primaryColor');
    // activeSubPageColor is now fixed to purple - no longer loads from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeSubPageColor');
      localStorage.removeItem('siteLogo');
    }

    // تحميل البيانات من API عند تسجيل الدخول (مرة واحدة فقط)
    if (isLoggedIn && localStorage.getItem('accessToken') && !dataLoaded) {
      setDataLoaded(true); // ضع علامة أننا بدأنا التحميل
      
      // تحميل بيانات المستخدم الحالي أولاً (مطلوب لمعرفة specialization)
      getCurrentUserAPI()
        .then((userData) => {
          // تحويل بيانات المستخدم من API إلى تنسيق Frontend - تنظيف الأدوار القديمة
          const frontendUser: User = {
            id: userData.id,
            name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username,
            username: userData.username,
            email: userData.email,
            role: normalizeRole(userData.role === 'admin' ? 'Owner' : userData.role),
            phone: userData.phone || '',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`,
            company: userData.company ? {
              id: userData.company,
              name: userData.company_name || 'Unknown Company',
              specialization: (userData.company_specialization || 'real_estate') as 'real_estate' | 'services' | 'products',
            } : undefined,
            emailVerified: userData.email_verified || userData.is_email_verified || false,
          };
          setCurrentUserState(frontendUser);
          localStorage.setItem('currentUser', JSON.stringify(frontendUser));

          const specialization = frontendUser.company?.specialization;

          // تحميل البيانات الأساسية بشكل متوازي (مطلوبة دائماً)
          const essentialDataPromises = [
            getDealsAPI(),
            getLeadsAPI(),
            getUsersAPI(),
            getClientTasksAPI(),
            getCampaignsAPI(),
            getChannelsAPI(),
            getStagesAPI(),
            getStatusesAPI(),
          ];

          // إضافة بيانات حسب specialization
          if (specialization === 'real_estate') {
            essentialDataPromises.push(
              getDevelopersAPI(),
              getProjectsAPI(),
              getUnitsAPI(),
              getOwnersAPI()
            );
          } else if (specialization === 'services') {
            essentialDataPromises.push(
              getServicesAPI(),
              getServicePackagesAPI(),
              getServiceProvidersAPI()
            );
          } else if (specialization === 'products') {
            essentialDataPromises.push(
              getProductsAPI(),
              getProductCategoriesAPI(),
              getSuppliersAPI()
            );
          }

          // تحميل جميع البيانات الأساسية بشكل متوازي
          Promise.all(essentialDataPromises)
            .then((responses) => {
              // معالجة البيانات الأساسية
              const [dealsResponse, leadsResponse, usersResponse, clientTasksResponse, campaignsResponse, channelsResponse, stagesResponse, statusesResponse, ...specializationResponses] = responses;

              // معالجة Campaigns
              const campaignsData = Array.isArray(campaignsResponse) ? campaignsResponse : campaignsResponse.results || [];
              const frontendCampaigns: Campaign[] = campaignsData.map((c: any) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                budget: c.budget ? parseFloat(c.budget.toString()) : 0,
                createdAt: c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                isActive: c.is_active !== false,
              }));
              setCampaigns(frontendCampaigns);

              // معالجة Channels
              const channelsResults = Array.isArray(channelsResponse) ? channelsResponse : ((channelsResponse as any)?.results || []);
              const frontendChannels: Channel[] = channelsResults.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                priority: c.priority.charAt(0).toUpperCase() + c.priority.slice(1) as 'High' | 'Medium' | 'Low',
              }));
              setChannels(frontendChannels);

              // معالجة Stages
              const stagesResults = Array.isArray(stagesResponse) ? stagesResponse : ((stagesResponse as any)?.results || []);
              const frontendStages: Stage[] = stagesResults.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                color: s.color || '#808080',
                required: s.required || false,
                autoAdvance: s.auto_advance || false,
              }));
              setStages(frontendStages);

              // معالجة Statuses
              const statusesResults = Array.isArray(statusesResponse) ? statusesResponse : ((statusesResponse as any)?.results || []);
              const frontendStatuses: Status[] = statusesResults.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                category: s.category.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') as 'Active' | 'Inactive' | 'Follow Up' | 'Closed',
                color: s.color || '#808080',
                isDefault: s.is_default || false,
                isHidden: s.is_hidden || false,
              }));
              setStatuses(frontendStatuses);

              // معالجة بيانات Real Estate
              if (specialization === 'real_estate' && specializationResponses.length >= 4) {
                const [developersResponse, projectsResponse, unitsResponse, ownersResponse] = specializationResponses;
                
                // التأكد من أن responses هي objects مع results
                const developersData = Array.isArray(developersResponse) ? developersResponse : developersResponse.results || [];
                const projectsData = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse.results || [];
                const unitsData = Array.isArray(unitsResponse) ? unitsResponse : unitsResponse.results || [];
                const ownersData = Array.isArray(ownersResponse) ? ownersResponse : ownersResponse.results || [];

                const frontendDevelopers: Developer[] = developersData.map((d: any) => ({
                  id: d.id,
                  code: d.code,
                  name: d.name,
                }));
                setDevelopers(frontendDevelopers);

                const frontendProjects: Project[] = projectsData.map((p: any) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  developer: p.developer_name || '',
                  type: p.type || '',
                  city: p.city || '',
                  paymentMethod: p.payment_method || '',
                }));
                setProjects(frontendProjects);

                const frontendUnits: Unit[] = unitsData.map((u: any) => ({
                  id: u.id,
                  code: u.code,
                  project: u.project_name || '',
                  bedrooms: u.bedrooms || 0,
                  price: u.price ? parseFloat(u.price.toString()) : 0,
                  bathrooms: u.bathrooms || 0,
                  type: u.type || '',
                  finishing: u.finishing || '',
                  city: u.city || '',
                  district: u.district || '',
                  zone: u.zone || '',
                  isSold: u.is_sold || false,
                }));
                setUnits(frontendUnits);

                const frontendOwners: Owner[] = ownersData.map((o: any) => ({
                  id: o.id,
                  code: o.code,
                  name: o.name,
                  phone: o.phone || '',
                  city: o.city || '',
                  district: o.district || '',
                }));
                setOwners(frontendOwners);
              }

              // معالجة بيانات Services
              if (specialization === 'services' && specializationResponses.length >= 3) {
                const [servicesResponse, servicePackagesResponse, serviceProvidersResponse] = specializationResponses;
                
                // التأكد من أن responses هي objects مع results
                const servicesData = Array.isArray(servicesResponse) ? servicesResponse : servicesResponse.results || [];
                const servicePackagesData = Array.isArray(servicePackagesResponse) ? servicePackagesResponse : servicePackagesResponse.results || [];
                const serviceProvidersData = Array.isArray(serviceProvidersResponse) ? serviceProvidersResponse : serviceProvidersResponse.results || [];

                const frontendServices: Service[] = servicesData.map((s: any) => ({
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  description: s.description || '',
                  price: s.price ? parseFloat(s.price.toString()) : 0,
                  duration: s.duration || '',
                  category: s.category || '',
                  provider: s.provider_name || undefined,
                  isActive: s.is_active !== false,
                }));
                setServices(frontendServices);

                const frontendPackages: ServicePackage[] = servicePackagesData.map((p: any) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  description: p.description || '',
                  price: p.price ? parseFloat(p.price.toString()) : 0,
                  duration: p.duration || '',
                  services: p.services || [],
                  isActive: p.is_active !== false,
                }));
                setServicePackages(frontendPackages);

                const frontendProviders: ServiceProvider[] = serviceProvidersData.map((p: any) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  phone: p.phone || '',
                  email: p.email || '',
                  specialization: p.specialization || '',
                  rating: p.rating ? parseFloat(p.rating.toString()) : undefined,
                }));
                setServiceProviders(frontendProviders);
              }

              // معالجة بيانات Products
              if (specialization === 'products' && specializationResponses.length >= 3) {
                const [productsResponse, productCategoriesResponse, suppliersResponse] = specializationResponses;
                
                // التأكد من أن responses هي objects مع results
                const productsData = Array.isArray(productsResponse) ? productsResponse : productsResponse.results || [];
                const productCategoriesData = Array.isArray(productCategoriesResponse) ? productCategoriesResponse : productCategoriesResponse.results || [];
                const suppliersData = Array.isArray(suppliersResponse) ? suppliersResponse : suppliersResponse.results || [];

                const frontendProducts: Product[] = productsData.map((p: any) => ({
                  id: p.id,
                  code: p.code,
                  name: p.name,
                  description: p.description || '',
                  price: p.price ? parseFloat(p.price.toString()) : 0,
                  cost: p.cost ? parseFloat(p.cost.toString()) : 0,
                  stock: p.stock || 0,
                  category: p.category_name || '',
                  supplier: p.supplier_name || undefined,
                  sku: p.sku || undefined,
                  image: undefined,
                  isActive: p.is_active !== false,
                }));
                setProducts(frontendProducts);

                const frontendCategories: ProductCategory[] = productCategoriesData.map((c: any) => ({
                  id: c.id,
                  code: c.code,
                  name: c.name,
                  description: c.description || '',
                  parentCategory: c.parent_category || undefined,
                }));
                setProductCategories(frontendCategories);

                const frontendSuppliers: Supplier[] = suppliersData.map((s: any) => ({
                  id: s.id,
                  code: s.code,
                  name: s.name,
                  logo: '',
                  phone: s.phone || '',
                  email: s.email || '',
                  address: s.address || '',
                  contactPerson: s.contact_person || '',
                  specialization: s.specialization || '',
                }));
                setSuppliers(frontendSuppliers);
              }

              // معالجة Deals, Leads, Users, ClientTasks
              // تحميل Tasks وتحويلها إلى Activities و Todos
              // يجب تحميلها بعد تحميل deals و leads و users
              return Promise.all([dealsResponse, leadsResponse, usersResponse, clientTasksResponse]);
            })
            .then(([dealsResponse, leadsResponse, usersResponse, clientTasksResponse]) => {
          // تحويل بيانات Deals
          const dealsData = Array.isArray(dealsResponse) ? dealsResponse : dealsResponse.results || [];
          const frontendDeals: Deal[] = dealsData.map((d: any) => ({
            id: d.id,
            clientName: d.client_name || '',
            paymentMethod: d.payment_method || 'Cash',
            status: d.stage === 'won' ? 'Won' : d.stage === 'lost' ? 'Lost' : d.stage === 'on_hold' ? 'On Hold' : d.stage === 'in_progress' ? 'In Progress' : 'Cancelled',
            value: d.value ? parseFloat(d.value.toString()) : 0,
            leadId: d.client,
            unit: d.unit_name || undefined,
            project: d.project_name || undefined,
          }));

          // تحويل ClientTasks
          const clientTasksData = Array.isArray(clientTasksResponse) ? clientTasksResponse : clientTasksResponse.results || [];
          const frontendClientTasks: ClientTask[] = clientTasksData.map((ct: any) => {
            // استخدام stage_name من API (إذا كان موجود) أو stage object
            const stageName = ct.stage_name || (ct.stage?.name) || ct.stage || '';
            return {
              id: ct.id,
              clientId: ct.client,
              stage: stageName,
              notes: ct.notes || '',
              reminderDate: ct.reminder_date || null,
              createdBy: ct.created_by || 0,
              createdAt: ct.created_at || new Date().toISOString(),
            };
          });
          setClientTasks(frontendClientTasks);

          // تحويل بيانات Leads
          const leadsData = Array.isArray(leadsResponse) ? leadsResponse : leadsResponse.results || [];
          const frontendLeads: Lead[] = leadsData.map((c: any) => {
            // استخدام status_name من API (إذا كان موجود) أو status object
            const statusName = c.status_name || (c.status?.name) || c.status || 'Untouched';
            const status = statusName as Lead['status'];
            
            // استخدام communication_way_name من API (إذا كان موجود) أو communication_way object
            const communicationWayName = c.communication_way_name || (c.communication_way?.name) || c.communication_way || 'Call';
            const communicationWay = communicationWayName === 'WhatsApp' ? 'WhatsApp' : 'Call';
            
            // البحث عن آخر ClientTask لهذا Lead
            const clientTasksForLead = frontendClientTasks.filter(ct => ct.clientId === c.id);
            let lastFeedback = '';
            let notes = '';
            let lastStage: Lead['status'] = status;
            
            if (clientTasksForLead.length > 0) {
              const lastTask = clientTasksForLead.sort((a, b) => 
                parseUTCDate(b.createdAt).getTime() - parseUTCDate(a.createdAt).getTime()
              )[0];
              lastFeedback = lastTask.notes || '';
              notes = lastTask.notes || '';
              // استخدام stage_name من ClientTask
              const taskStageName = lastTask.stage || '';
              // البحث عن stage في stages من الإعدادات (سيتم تحميلها لاحقاً)
              // نستخدم stage مباشرة من ClientTask
              lastStage = taskStageName as Lead['status'] || status;
            }
            
            // تحويل phone numbers
            const phoneNumbers = c.phone_numbers && Array.isArray(c.phone_numbers) 
              ? c.phone_numbers.map((pn: any) => ({
                  id: pn.id,
                  phone_number: pn.phone_number || '',
                  phone_type: pn.phone_type || 'mobile',
                  is_primary: pn.is_primary || false,
                  notes: pn.notes || '',
                  created_at: pn.created_at,
                  updated_at: pn.updated_at,
                }))
              : [];
            
            // تحديد رقم الهاتف الأساسي (primary) أو الأول
            const primaryPhone = phoneNumbers.find((pn: any) => pn.is_primary) || phoneNumbers[0] || null;
            const phone = primaryPhone?.phone_number || c.phone_number || '';
            
            return {
              id: c.id,
              name: c.name,
              phone: phone, // Keep for backward compatibility
              phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
              type: c.type === 'fresh' ? 'Fresh' : 'Cold',
              priority: c.priority === 'high' ? 'High' : c.priority === 'medium' ? 'Medium' : 'Low',
              status: status,
              assignedTo: typeof c.assigned_to === 'number' ? c.assigned_to : 0,
              createdAt: formatDateToLocal(c.created_at),
              communicationWay: communicationWay,
              budget: c.budget ? parseFloat(c.budget.toString()) : 0,
              // Computed fields from ClientTasks
              lastFeedback: lastFeedback,
              notes: notes,
              lastStage: lastStage,
            };
          });

          // تحويل بيانات Users - تنظيف الأدوار القديمة
          const usersData = Array.isArray(usersResponse) ? usersResponse : usersResponse.results || [];
          const frontendUsers: User[] = usersData.map((u: any) => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
            username: u.username,
            email: u.email,
            phone: u.phone || '',
            role: normalizeRole(u.role === 'admin' ? 'Owner' : u.role),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random`,
            company: u.company ? {
              id: u.company,
              name: u.company_name || 'Unknown Company',
              specialization: (u.company_specialization || 'real_estate') as 'real_estate' | 'services' | 'products',
            } : undefined,
          }));

          // تنظيف الأدوار القديمة في جميع المستخدمين قبل التحديث
          const cleanedUsers = frontendUsers.map(user => ({
            ...user,
            role: normalizeRole(user.role)
          }));
          
          // تحديث state
          setDeals(frontendDeals);
          setLeads(frontendLeads);
          setUsers(cleanedUsers);

          // الآن تحميل Tasks
          return getTasksAPI().then((tasksResponse) => {
            // تحويل Tasks إلى Activities - من API فقط، بدون أي mock data
            // جميع Activities تأتي من Tasks في قاعدة البيانات
            const frontendActivities: Activity[] = tasksResponse.results.map((t: any) => {
              // استخدام stage_name من API (إذا كان موجود) أو stage object
              const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
              const stage = stageName as TaskStage;

              // البحث عن اسم المستخدم من deal
              const employeeUsername = t.deal_employee_username;
              const user = employeeUsername ? frontendUsers.find(u => u.username === employeeUsername) : null;

              return {
                id: t.id,
                user: user?.name || employeeUsername || 'Unknown',
                lead: t.deal_client_name || '',
                stage: stage,
                date: formatDateToLocal(t.created_at),
                notes: t.notes || '',
              };
            });
            // تحديث Activities من API فقط - لا mock data
            setActivities(frontendActivities);

            // تحويل Tasks التي لها reminder_date إلى Todos (Active) - من API فقط
            const frontendTodos: Todo[] = tasksResponse.results
              .filter((t: any) => t.reminder_date)
              .map((t: any) => {
                // استخدام stage_name من API (إذا كان موجود) أو stage object
                const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
                const stage = stageName as TaskStage;

                const deal = frontendDeals.find(d => d.id === t.deal);
                const lead = frontendLeads.find(l => l.id === deal?.leadId);

                return {
                  id: t.id,
                  stage: stage,
                  leadName: lead?.name || t.deal_client_name || '',
                  leadPhone: lead?.phone || '',
                  dueDate: formatDateToLocal(t.reminder_date),
                };
              });
            // تحديث TODOs Active من API فقط
            setTodos(frontendTodos);

            // تحويل Tasks التي ليس لها reminder_date إلى Todos (Completed) - من API فقط
            // هذه هي Tasks التي تم إكمالها (reminder_date = null)
            const frontendCompletedTodos: Todo[] = tasksResponse.results
              .filter((t: any) => !t.reminder_date)
              .map((t: any) => {
                // استخدام stage_name من API (إذا كان موجود) أو stage object
                const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
                const stage = stageName as TaskStage;

                const deal = frontendDeals.find(d => d.id === t.deal);
                const lead = frontendLeads.find(l => l.id === deal?.leadId);

                return {
                  id: t.id,
                  stage: stage,
                  leadName: lead?.name || t.deal_client_name || '',
                  leadPhone: lead?.phone || '',
                  dueDate: formatDateToLocal(t.created_at), // استخدام created_at كـ dueDate للـ completed todos
                };
              });
            // تحديث TODOs Completed من API فقط
            setCompletedTodos(frontendCompletedTodos);
          });
            })
            .catch((error) => {
              console.error('Error loading essential data:', error);
              // إذا فشل تحميل البيانات الأساسية، أعد إلى صفحة تسجيل الدخول
              setIsLoggedInState(false);
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('currentUser');
            });
        })
        .catch(() => {
          // إذا فشل تحميل المستخدم، أعد إلى صفحة تسجيل الدخول
          setIsLoggedInState(false);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
        });
    }

    const handleResize = () => {
        if (window.innerWidth >= 1024) { // Tailwind's lg breakpoint
            setIsSidebarOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoggedIn, dataLoaded, currentUser?.company?.specialization]); // إضافة specialization للتحميل عند تغيير التخصص

  const setIsLoggedIn = (loggedIn: boolean) => {
    setIsLoggedInState(loggedIn);
    localStorage.setItem('isLoggedIn', loggedIn.toString());
    if (!loggedIn) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setCurrentUserState(null);
      setDataLoaded(false); // إعادة تعيين dataLoaded عند تسجيل الخروج
    }
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      // تنظيف الدور قبل الحفظ في localStorage
      const cleanedRole = normalizeRole(user.role);
      localStorage.setItem('currentUser', JSON.stringify({ id: user.id, name: user.name, role: cleanedRole }));
    } else {
      localStorage.removeItem('currentUser');
    }
  };

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    localStorage.setItem('theme', theme);
    // Theme will be applied via useEffect
  };
  
  const setLang = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  const setAppColor = (color: string) => {
    // Color customization disabled - primary color is fixed to purple
    // Do nothing - color cannot be changed
  };

  const setAppSubPageColor = (color: string) => {
    // Color customization disabled - active sub-page color is fixed to purple
    // Do nothing - color cannot be changed
  };

  useEffect(() => {
    const shades = generateColorShades(primaryColor);
    const root = document.documentElement;

    // Set all primary color shades using the same method as admin-panel
    // Only set --color-primary-* to match admin-panel exactly
    for (const [shade, hslValue] of Object.entries(shades)) {
      root.style.setProperty(`--color-primary-${shade}`, hslValue);
    }
    
    // Also set legacy --primary-* variables for backward compatibility with existing CSS
    for (const [shade, hslValue] of Object.entries(shades)) {
      if (shade === '500') {
        root.style.setProperty('--primary', hslValue);
      }
      root.style.setProperty(`--primary-${shade}`, hslValue);
    }
    
    // Foreground color logic - extract lightness from the 500 shade
    const hsl500 = shades['500'];
    if (hsl500) {
      const lMatch = hsl500.match(/(\d+)\s+\d+%\s+(\d+)%/);
      if (lMatch) {
        const l = parseInt(lMatch[2]);
        const foregroundColor = l > 50 ? '222.2 47.4% 11.2%' : '210 40% 98%';
        root.style.setProperty('--primary-foreground', foregroundColor);
      }
    }
  }, [primaryColor]);
  
  useEffect(() => {
    const hsl = hexToHsl(activeSubPageColor);
    if(hsl) {
        const [h, s, l] = hsl;
        const root = document.documentElement;
        root.style.setProperty('--primary-active-sub', `${h} ${s}% ${l}%`);
    }
  }, [activeSubPageColor]);

  useEffect(() => {
    setTheme(theme);
    setLang(language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, language]);

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  };

  // --- CRUD Functions ---
  const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => {
    try {
      // التحقق من وجود company للمستخدم الحالي
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // تحويل بيانات المستخدم من Frontend إلى تنسيق API
      const [firstName, ...lastNameParts] = (userData.name || '').split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
      // التحقق من وجود كلمة المرور
      if (!userData.password || !userData.password.trim()) {
        throw new Error('Password is required');
      }

      const apiUserData = {
        username: userData.username || '',
        email: userData.email || '',
        password: userData.password,
        first_name: firstName,
        last_name: lastName,
        phone: userData.phone || '',
        role: userData.role === 'Owner' ? 'admin' : userData.role === 'Employee' ? 'employee' : 'employee', // Employee يترجم إلى employee
        company: currentUser.company.id, // استخدام company المالك الحالي
      };

      const newUserResponse = await createUserAPI(apiUserData);
      
      // تحويل بيانات المستخدم الجديد من API إلى تنسيق Frontend
      const newUser: User = {
        id: newUserResponse.id,
        name: `${newUserResponse.first_name || ''} ${newUserResponse.last_name || ''}`.trim() || newUserResponse.username,
        username: newUserResponse.username,
        email: newUserResponse.email,
        role: normalizeRole(newUserResponse.role === 'admin' ? 'Owner' : newUserResponse.role), // فقط Owner أو Employee
        phone: newUserResponse.phone || userData.phone || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserResponse.username)}&background=random`,
        company: currentUser.company ? {
          id: currentUser.company.id,
          name: currentUser.company.name,
          specialization: currentUser.company.specialization,
        } : undefined,
      };
      
      setUsers(prev => [...prev, newUser]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // أعد الخطأ للسماح للمكونات الأخرى بالتعامل معه
    }
  };
  
  const updateUser = async (userId: number, userData: Partial<User>) => {
    try {
      // التحقق من أن المستخدم الحالي هو Admin
      if (currentUser?.role !== 'Owner') {
        throw new Error('Only admins can update users');
      }
      
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // الحصول على المستخدم الحالي للحصول على username
      const existingUser = users.find(u => u.id === userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // تحويل بيانات المستخدم من Frontend إلى تنسيق API
      const [firstName, ...lastNameParts] = (userData.name || '').split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
      const apiUserData: any = {
        username: existingUser.username, // username مطلوب من API
        email: userData.email || existingUser.email || '',
        first_name: firstName || existingUser.name?.split(' ')[0] || '',
        last_name: lastName || existingUser.name?.split(' ').slice(1).join(' ') || '',
        phone: userData.phone !== undefined ? userData.phone : existingUser.phone || '',
        role: userData.role ? (userData.role === 'Owner' ? 'admin' : 'employee') : existingUser.role === 'Owner' ? 'admin' : 'employee', // فقط Owner أو Employee
        company: currentUser.company.id,
      };

      // إذا تم توفير password، أضفه
      if (userData.password) {
        apiUserData.password = userData.password;
      }

      const updatedUserResponse = await updateUserAPI(userId, apiUserData);
      
      // تحويل بيانات المستخدم المحدث من API إلى تنسيق Frontend
      const updatedUser: User = {
        id: updatedUserResponse.id,
        name: `${updatedUserResponse.first_name || ''} ${updatedUserResponse.last_name || ''}`.trim() || updatedUserResponse.username,
        username: updatedUserResponse.username,
        email: updatedUserResponse.email,
        phone: updatedUserResponse.phone || '',
        role: normalizeRole(updatedUserResponse.role === 'admin' ? 'Owner' : updatedUserResponse.role), // فقط Owner أو Employee
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUserResponse.username)}&background=random`,
        company: updatedUserResponse.company ? {
          id: updatedUserResponse.company,
          name: updatedUserResponse.company_name || 'Unknown Company',
          specialization: (updatedUserResponse.company_specialization || 'real_estate') as 'real_estate' | 'services' | 'products',
        } : undefined,
      };
      
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      
      // إذا كان المستخدم المحدث هو currentUser، قم بتحديثه أيضاً
      if (currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };
  
  const deleteUser = async (userId: number) => {
    try {
      // التحقق من أن المستخدم الحالي هو Admin
      if (currentUser?.role !== 'Owner') {
        throw new Error('Only admins can delete users');
      }
      
      // منع المستخدم من حذف نفسه
      if (currentUser.id === userId) {
        throw new Error('You cannot delete yourself');
      }
      
      await deleteUserAPI(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'history' | 'lastFeedback' | 'notes' | 'lastStage' | 'reminder'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن Channel من الإعدادات بناءً على الاسم
      const channel = channels.find(c => c.name === leadData.communicationWay);
      const channelId = channel?.id || null;
      
      // البحث عن Status من الإعدادات بناءً على الاسم
      const statusObj = statuses.find(s => s.name === leadData.status);
      const statusId = statusObj?.id || null;
      
      // تحويل phone numbers من Frontend إلى تنسيق API
      const phoneNumbers = leadData.phoneNumbers && leadData.phoneNumbers.length > 0
        ? leadData.phoneNumbers.map(pn => ({
            phone_number: pn.phone_number,
            phone_type: pn.phone_type || 'mobile',
            is_primary: pn.is_primary || false,
            notes: pn.notes || '',
          }))
        : leadData.phone
        ? [{
            phone_number: leadData.phone,
            phone_type: 'mobile',
            is_primary: true,
            notes: '',
          }]
        : [];

      // تحويل بيانات Lead من Frontend إلى تنسيق API (Client)
      const apiLeadData: any = {
        name: leadData.name,
        phone_number: leadData.phone || '', // Keep for backward compatibility
        priority: leadData.priority?.toLowerCase() || 'medium',
        type: leadData.type?.toLowerCase() || 'fresh',
        communication_way: channelId,
        status: statusId,
        budget: leadData.budget || null,
        company: currentUser.company.id,
        assigned_to: leadData.assignedTo && leadData.assignedTo > 0 ? leadData.assignedTo : null,
        phone_numbers: phoneNumbers,
      };

      const newLeadResponse = await createLeadAPI(apiLeadData);
      
      // تحويل بيانات Lead الجديد من API إلى تنسيق Frontend
      const statusName = newLeadResponse.status_name || (newLeadResponse.status?.name) || newLeadResponse.status || 'Untouched';
      const communicationWayName = newLeadResponse.communication_way_name || (newLeadResponse.communication_way?.name) || newLeadResponse.communication_way || 'Call';
      
      // تحويل phone numbers من API
      const phoneNumbersFromAPI = newLeadResponse.phone_numbers && Array.isArray(newLeadResponse.phone_numbers)
        ? newLeadResponse.phone_numbers.map((pn: any) => ({
            id: pn.id,
            phone_number: pn.phone_number || '',
            phone_type: pn.phone_type || 'mobile',
            is_primary: pn.is_primary || false,
            notes: pn.notes || '',
            created_at: pn.created_at,
            updated_at: pn.updated_at,
          }))
        : undefined;
      
      const primaryPhone = phoneNumbersFromAPI?.find(pn => pn.is_primary) || phoneNumbersFromAPI?.[0];
      const phone = primaryPhone?.phone_number || newLeadResponse.phone_number || '';
      
      const newLead: Lead = {
        id: newLeadResponse.id,
        name: newLeadResponse.name,
        phone: phone,
        phoneNumbers: phoneNumbersFromAPI,
        type: newLeadResponse.type === 'fresh' ? 'Fresh' : 'Cold',
        priority: newLeadResponse.priority === 'high' ? 'High' : newLeadResponse.priority === 'medium' ? 'Medium' : 'Low',
        status: statusName as Lead['status'],
        assignedTo: typeof newLeadResponse.assigned_to === 'number' ? newLeadResponse.assigned_to : 0,
        createdAt: formatDateToLocal(newLeadResponse.created_at),
        communicationWay: communicationWayName === 'WhatsApp' ? 'WhatsApp' : 'Call',
        budget: newLeadResponse.budget ? parseFloat(newLeadResponse.budget.toString()) : 0,
      };
      
      setLeads(prev => [newLead, ...prev]);
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  };

  const updateLead = async (leadId: number, leadData: Partial<Lead>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // البحث عن Channel من الإعدادات بناءً على الاسم
      const communicationWayName = leadData.communicationWay || lead.communicationWay;
      const channel = channels.find(c => c.name === communicationWayName);
      const channelId = channel?.id || null;
      
      // البحث عن Status من الإعدادات بناءً على الاسم
      const statusName = leadData.status || lead.status;
      const statusObj = statuses.find(s => s.name === statusName);
      const statusId = statusObj?.id || null;
      
      // تحويل بيانات Lead من Frontend إلى تنسيق API
      // تحديد assigned_to بشكل صريح
      let assignedToValue: number | null = null;
      if (leadData.assignedTo !== undefined) {
        assignedToValue = (leadData.assignedTo && leadData.assignedTo > 0) ? Number(leadData.assignedTo) : null;
      } else if (lead.assignedTo > 0) {
        assignedToValue = Number(lead.assignedTo);
      }

      // تحويل phone numbers من Frontend إلى تنسيق API
      const phoneNumbers = leadData.phoneNumbers && leadData.phoneNumbers.length > 0
        ? leadData.phoneNumbers.map(pn => ({
            phone_number: pn.phone_number,
            phone_type: pn.phone_type || 'mobile',
            is_primary: pn.is_primary || false,
            notes: pn.notes || '',
          }))
        : leadData.phone
        ? [{
            phone_number: leadData.phone,
            phone_type: 'mobile',
            is_primary: true,
            notes: '',
          }]
        : undefined; // undefined means don't update phone numbers

      const apiLeadData: any = {
        name: leadData.name || lead.name,
        phone_number: leadData.phone || lead.phone || '', // Keep for backward compatibility
        priority: leadData.priority?.toLowerCase() || lead.priority?.toLowerCase() || 'medium',
        type: leadData.type?.toLowerCase() || lead.type?.toLowerCase() || 'fresh',
        communication_way: channelId,
        status: statusId,
        budget: leadData.budget !== undefined ? leadData.budget : lead.budget || null,
        company: currentUser.company.id,
        assigned_to: assignedToValue,
      };
      
      // إضافة phone_numbers فقط إذا تم توفيرها
      if (phoneNumbers !== undefined) {
        apiLeadData.phone_numbers = phoneNumbers;
      }

      console.log('Updating lead:', leadId, 'with data:', apiLeadData);
      console.log('assigned_to value:', assignedToValue, 'type:', typeof assignedToValue);

      const updatedLeadResponse = await updateLeadAPI(leadId, apiLeadData);
      
      // استخدام status_name و communication_way_name من API
      const statusNameFromAPI = updatedLeadResponse.status_name || (updatedLeadResponse.status?.name) || updatedLeadResponse.status || lead.status;
      const communicationWayNameFromAPI = updatedLeadResponse.communication_way_name || (updatedLeadResponse.communication_way?.name) || updatedLeadResponse.communication_way || lead.communicationWay;
      
      // تحويل phone numbers من API
      const phoneNumbersFromAPI = updatedLeadResponse.phone_numbers && Array.isArray(updatedLeadResponse.phone_numbers)
        ? updatedLeadResponse.phone_numbers.map((pn: any) => ({
            id: pn.id,
            phone_number: pn.phone_number || '',
            phone_type: pn.phone_type || 'mobile',
            is_primary: pn.is_primary || false,
            notes: pn.notes || '',
            created_at: pn.created_at,
            updated_at: pn.updated_at,
          }))
        : lead.phoneNumbers; // Keep existing if not updated
      
      const primaryPhone = phoneNumbersFromAPI?.find(pn => pn.is_primary) || phoneNumbersFromAPI?.[0];
      const phone = primaryPhone?.phone_number || updatedLeadResponse.phone_number || lead.phone || '';
      
      // تحويل بيانات Lead المحدث من API إلى تنسيق Frontend
      const updatedLead: Lead = {
        id: updatedLeadResponse.id,
        name: updatedLeadResponse.name,
        phone: phone,
        phoneNumbers: phoneNumbersFromAPI,
        type: updatedLeadResponse.type === 'fresh' ? 'Fresh' : 'Cold',
        priority: updatedLeadResponse.priority === 'high' ? 'High' : updatedLeadResponse.priority === 'medium' ? 'Medium' : 'Low',
        status: statusNameFromAPI as Lead['status'],
        assignedTo: typeof updatedLeadResponse.assigned_to === 'number' ? updatedLeadResponse.assigned_to : 0,
        createdAt: lead.createdAt, // الحفاظ على createdAt
        communicationWay: communicationWayNameFromAPI === 'WhatsApp' ? 'WhatsApp' : 'Call',
        budget: updatedLeadResponse.budget ? parseFloat(updatedLeadResponse.budget.toString()) : 0,
        // الحفاظ على computed fields من lead
        lastFeedback: lead.lastFeedback,
        notes: lead.notes,
        lastStage: lead.lastStage,
      };
      
      // تحديث state بشكل صريح
      setLeads(prev => {
        const updatedLeads = prev.map(l => l.id === leadId ? updatedLead : l);
        return [...updatedLeads];
      });
      
      // تحديث selectedLead إذا كان هو Lead المحدث
      setSelectedLead(prev => {
        if (prev && prev.id === leadId) {
          return updatedLead;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  };

  const deleteLead = async (leadId: number) => {
    try {
      // التحقق من أن المستخدم الحالي هو Admin أو الموظف المعين للـ Lead
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      const isAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'admin';
      const isAssignedEmployee = lead.assignedTo === currentUser?.id;

      if (!isAdmin && !isAssignedEmployee) {
        throw new Error('You do not have permission to delete this lead');
      }

      await deleteLeadAPI(leadId);
      
      // تحديث state بشكل صريح
      setLeads(prev => prev.filter(l => l.id !== leadId));
      
      // إذا كان Lead المحذوف هو selectedLead، امسحه
      setSelectedLead(prev => {
        if (prev && prev.id === leadId) {
          return null;
        }
        return prev;
      });
      
      // إزالة Lead من checkedLeadIds إذا كان محدد
      setCheckedLeadIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  };

  const assignLeads = async (leadIds: number[], userId: number) => {
    try {
      // تحديث جميع Leads المحددة
      await Promise.all(
        leadIds.map(leadId => updateLead(leadId, { assignedTo: userId }))
      );
      
      // مسح checkedLeadIds بعد الإسناد
      setCheckedLeadIds(new Set());
    } catch (error) {
      console.error('Error assigning leads:', error);
      throw error;
    }
  };

  const addDeal = async (dealData: Omit<Deal, 'id'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // تحويل بيانات Deal من Frontend إلى تنسيق API
      const apiDealData: any = {
        client: dealData.leadId || null,
        company: currentUser.company.id,
        employee: currentUser.id,
        stage: dealData.status?.toLowerCase() === 'won' ? 'won' : 
               dealData.status?.toLowerCase() === 'lost' ? 'lost' :
               dealData.status?.toLowerCase() === 'on hold' ? 'on_hold' :
               dealData.status?.toLowerCase() === 'in progress' ? 'in_progress' : 'cancelled',
      };

      const newDealResponse = await createDealAPI(apiDealData);
      
      // تحويل بيانات Deal الجديد من API إلى تنسيق Frontend
      const newDeal: Deal = {
        id: newDealResponse.id,
        clientName: newDealResponse.client_name || dealData.clientName,
        paymentMethod: dealData.paymentMethod || 'Cash',
        status: newDealResponse.stage === 'won' ? 'Won' : newDealResponse.stage === 'lost' ? 'Lost' : newDealResponse.stage === 'on_hold' ? 'On Hold' : newDealResponse.stage === 'in_progress' ? 'In Progress' : 'Cancelled',
        value: dealData.value || 0,
        leadId: newDealResponse.client,
        ...(dealData.unit && { unit: dealData.unit }),
        ...(dealData.project && { project: dealData.project }),
      };
      
      setDeals(prev => [newDeal, ...prev]);
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  };

  const deleteDeal = async (dealId: number) => {
    try {
      await deleteDealAPI(dealId);
      // تحديث state بشكل صريح
      setDeals(prev => {
        const filtered = prev.filter(d => d.id !== dealId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  };

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'code' | 'createdAt'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiCampaignData: any = {
        name: campaignData.name,
        budget: campaignData.budget || 0,
        is_active: campaignData.isActive !== false,
        company: currentUser.company.id,
      };

      console.log('Creating campaign with data:', apiCampaignData);
      const newCampaignResponse = await createCampaignAPI(apiCampaignData);
      console.log('Campaign created successfully:', newCampaignResponse);
      
      const newCampaign: Campaign = {
        id: newCampaignResponse.id,
        code: newCampaignResponse.code,
        name: newCampaignResponse.name,
        budget: newCampaignResponse.budget ? parseFloat(newCampaignResponse.budget.toString()) : 0,
        createdAt: formatDateToLocal(newCampaignResponse.created_at),
        isActive: newCampaignResponse.is_active !== false,
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      const errorMessage = error?.message || 'Failed to create campaign';
      throw new Error(errorMessage);
    }
  };

  const deleteCampaign = async (campaignId: number) => {
    try {
      await deleteCampaignAPI(campaignId);
      // تحديث state بشكل صريح
      setCampaigns(prev => {
        const filtered = prev.filter(c => c.id !== campaignId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  };

  const addActivity = async (activityData: Omit<Activity, 'id'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن Lead ID من الاسم
      const lead = leads.find(l => l.name === activityData.lead);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // البحث عن Deal المرتبط بـ Lead
      const deal = deals.find(d => d.leadId === lead.id);
      if (!deal) {
        throw new Error('Deal not found for this lead');
      }

      // البحث عن Stage من الإعدادات بناءً على الاسم
      const stageName = activityData.stage;
      const stageObj = stages.find(s => 
        s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
        s.name === stageName
      );
      const stageId = stageObj?.id || null;
      
      if (!stageId) {
        throw new Error('Stage not found in settings');
      }

      const apiTaskData = {
        deal: deal.id,
        stage: stageId,
        notes: activityData.notes || '',
        reminder_date: null,
      };

      const newTaskResponse = await createTaskAPI(apiTaskData);
      
      // استخدام stage_name من API
      const stageNameFromAPI = newTaskResponse.stage_name || (newTaskResponse.stage?.name) || activityData.stage;
      
      // إضافة Activity جديد
      const newActivity: Activity = {
        id: newTaskResponse.id,
        user: activityData.user,
        lead: activityData.lead,
        stage: stageNameFromAPI as TaskStage,
        date: newTaskResponse.created_at?.split('T')[0] || activityData.date,
        notes: newTaskResponse.notes || activityData.notes,
      };
      
      setActivities(prev => [newActivity, ...prev]);
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  // Add Todo function - creates a new Task with reminder_date
  const addTodo = async (todoData: { dealId: number; stage: TaskStage; notes: string; reminderDate: string }) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // Find the deal
      const deal = deals.find(d => d.id === todoData.dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // البحث عن Stage من الإعدادات بناءً على الاسم
      const stageName = todoData.stage;
      const stageObj = stages.find(s => 
        s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
        s.name === stageName
      );
      const stageId = stageObj?.id || null;
      
      if (!stageId) {
        throw new Error('Stage not found in settings');
      }

      // Create Task with reminder_date
      const apiTaskData = {
        deal: todoData.dealId,
        stage: stageId,
        notes: todoData.notes || '',
        reminder_date: todoData.reminderDate || null,
      };

      const newTaskResponse = await createTaskAPI(apiTaskData);
      
      // إضافة Activity جديد إلى state مباشرة
      const dealObj = deals.find(d => d.id === todoData.dealId);
      const lead = leads.find(l => l.id === dealObj?.leadId);
      
      // استخدام stage_name من API
      const stageNameFromAPI = newTaskResponse.stage_name || (newTaskResponse.stage?.name) || todoData.stage;
      
      const newActivity: Activity = {
        id: newTaskResponse.id,
        user: currentUser?.name || 'Unknown',
        lead: lead?.name || dealObj?.clientName || '',
        stage: stageNameFromAPI as TaskStage,
        date: formatDateToLocal(newTaskResponse.created_at),
        notes: newTaskResponse.notes || todoData.notes || '',
      };
      
      setActivities(prev => [newActivity, ...prev]);
      
      // إعادة تحميل TODOs من API لضمان التزامن (Active و Completed)
      const tasksResponse = await getTasksAPI();
      
      // Active TODOs (مع reminder_date)
      const activeTodos = tasksResponse.results
        .filter((t: any) => t.reminder_date)
        .map((t: any) => {
          // استخدام stage_name من API
          const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
          const stage = stageName as TaskStage;

          const dealObj = deals.find(d => d.id === t.deal);
          const lead = leads.find(l => l.id === dealObj?.leadId);

          return {
            id: t.id,
            stage: stage,
            leadName: lead?.name || t.deal_client_name || '',
            leadPhone: lead?.phone || '',
            dueDate: formatDateToLocal(t.reminder_date),
          };
        });
      
      // Completed TODOs (بدون reminder_date)
      const completedTodos = tasksResponse.results
        .filter((t: any) => !t.reminder_date)
        .map((t: any) => {
          // استخدام stage_name من API
          const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
          const stage = stageName as TaskStage;

          const dealObj = deals.find(d => d.id === t.deal);
          const lead = leads.find(l => l.id === dealObj?.leadId);

          return {
            id: t.id,
            stage: stage,
            leadName: lead?.name || t.deal_client_name || '',
            leadPhone: lead?.phone || '',
            dueDate: formatDateToLocal(t.created_at),
          };
        });
      
      setTodos(activeTodos);
      setCompletedTodos(completedTodos);
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  };

  // Complete Todo function - removes reminder_date from Task
  const completeTodo = async (todoId: number) => {
    try {
      // Find the Task that corresponds to this Todo
      const taskResponse = await getTasksAPI();
      const task = taskResponse.results.find((t: any) => t.id === todoId);

      if (!task) {
        throw new Error('Task not found');
      }

      // Find the todo before removing it
      const todoToComplete = todos.find(t => t.id === todoId);
      
      // البحث عن Stage ID من الإعدادات
      const stageName = task.stage_name || task.stage || '';
      const stageObj = stages.find(s => 
        s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
        s.name === stageName
      );
      const stageId = stageObj?.id || null;
      
      if (!stageId) {
        throw new Error('Stage not found in settings');
      }
      
      // Update Task to remove reminder_date (mark as completed)
      await updateTaskAPI(todoId, {
        deal: task.deal,
        stage: stageId,
        notes: task.notes || '',
        reminder_date: null, // Remove reminder_date to complete the todo
      });

      // إعادة تحميل TODOs من API لضمان التزامن (Active و Completed)
      const updatedTasksResponse = await getTasksAPI();
      
      // Active TODOs (مع reminder_date)
      const activeTodos = updatedTasksResponse.results
        .filter((t: any) => t.reminder_date)
        .map((t: any) => {
          // استخدام stage_name من API
          const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
          const stage = stageName as TaskStage;

          const dealObj = deals.find(d => d.id === t.deal);
          const lead = leads.find(l => l.id === dealObj?.leadId);

          return {
            id: t.id,
            stage: stage,
            leadName: lead?.name || t.deal_client_name || '',
            leadPhone: lead?.phone || '',
            dueDate: formatDateToLocal(t.reminder_date),
          };
        });
      
      // Completed TODOs (بدون reminder_date)
      const completedTodos = updatedTasksResponse.results
        .filter((t: any) => !t.reminder_date)
        .map((t: any) => {
          // استخدام stage_name من API
          const stageName = t.stage_name || (t.stage?.name) || t.stage || '';
          const stage = stageName as TaskStage;

          const dealObj = deals.find(d => d.id === t.deal);
          const lead = leads.find(l => l.id === dealObj?.leadId);

          return {
            id: t.id,
            stage: stage,
            leadName: lead?.name || t.deal_client_name || '',
            leadPhone: lead?.phone || '',
            dueDate: formatDateToLocal(t.created_at),
          };
        });
      
      setTodos(activeTodos);
      setCompletedTodos(completedTodos);
    } catch (error) {
      console.error('Error completing todo:', error);
      throw error;
    }
  };
  
  const addDeveloper = async (developerData: Omit<Developer, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiDeveloperData = {
        name: developerData.name,
        company: currentUser.company.id,
      };

      const newDeveloperResponse = await createDeveloperAPI(apiDeveloperData);
      
      const newDeveloper: Developer = {
        id: newDeveloperResponse.id,
        code: newDeveloperResponse.code,
        name: newDeveloperResponse.name,
      };
      
      setDevelopers(prev => [newDeveloper, ...prev]);
    } catch (error) {
      console.error('Error creating developer:', error);
      throw error;
    }
  };

  const updateDeveloper = async (updatedDeveloper: Developer) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // الحصول على الاسم القديم للمطور قبل التحديث
      const oldDeveloperName = updatedDeveloper.name;

      const apiDeveloperData = {
        name: updatedDeveloper.name,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateDeveloperAPI(updatedDeveloper.id, apiDeveloperData);
      
      const updated: Developer = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
      };
      
      setDevelopers(prev => {
        const updatedDevelopers = prev.map(d => d.id === updated.id ? updated : d);
        // إرجاع array جديد لضمان أن React يكتشف التغيير
        return [...updatedDevelopers];
      });
      
      // تحديث جميع Projects المرتبطة بهذا المطور (cascading update)
      const newDeveloperName = updatedResponse.name;
      if (oldDeveloperName !== newDeveloperName) {
        console.log(`Updating projects: changing developer name from "${oldDeveloperName}" to "${newDeveloperName}"`);
        setProjects(prev => {
          const beforeCount = prev.filter(p => p.developer === oldDeveloperName).length;
          const updatedProjects = prev.map(p => 
            p.developer === oldDeveloperName ? { ...p, developer: newDeveloperName } : p
          );
          const afterCount = updatedProjects.filter(p => p.developer === newDeveloperName).length;
          console.log(`Projects updated: ${beforeCount} projects changed from "${oldDeveloperName}" to "${newDeveloperName}"`);
          // إرجاع array جديد لضمان أن React يكتشف التغيير
          return [...updatedProjects];
        });
      }
    } catch (error) {
      console.error('Error updating developer:', error);
      throw error;
    }
  };

  const deleteDeveloper = async (developerId: number) => {
    try {
      // البحث عن المطور قبل حذفه للحصول على اسمه
      const developerToDelete = developers.find(d => d.id === developerId);
      
      await deleteDeveloperAPI(developerId);
      
      // تحديث state بشكل صريح
      setDevelopers(prev => {
        const filtered = prev.filter(d => d.id !== developerId);
        return filtered;
      });
      
      // حذف جميع Projects المرتبطة بهذا المطور (cascading delete)
      if (developerToDelete) {
        const projectsToDelete = projects.filter(p => p.developer === developerToDelete.name);
        
        // حذف Projects
        setProjects(prev => {
          const filtered = prev.filter(p => p.developer !== developerToDelete.name);
          return filtered;
        });
        
        // حذف جميع Units المرتبطة بهذه Projects
        const projectNames = projectsToDelete.map(p => p.name);
        setUnits(prev => {
          const filtered = prev.filter(u => !projectNames.includes(u.project));
          return filtered;
        });
        
        // تحديث جميع Deals المرتبطة بهذه Projects (إزالة project و unit)
        setDeals(prev => {
          const updated = prev.map(d => {
            if (d.project && projectNames.includes(d.project)) {
              const { project, unit, ...rest } = d;
              return rest;
            }
            return d;
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error deleting developer:', error);
      throw error;
    }
  };


  const addProject = async (projectData: Omit<Project, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // التحقق من أن developers موجود
      if (!developers || developers.length === 0) {
        throw new Error('No developers available. Please add a developer first.');
      }

      // البحث عن developer ID من الاسم
      const developer = developers.find(d => d.name === projectData.developer);
      if (!developer) {
        throw new Error(`Developer "${projectData.developer}" not found`);
      }

      const apiProjectData = {
        name: projectData.name,
        developer: developer.id,
        type: projectData.type || '',
        city: projectData.city || '',
        payment_method: projectData.paymentMethod || '',
        company: currentUser.company.id,
      };

      console.log('Creating project with data:', apiProjectData);
      const newProjectResponse = await createProjectAPI(apiProjectData);
      console.log('Project created, response:', newProjectResponse);
      
      // التحقق من أن الـ response يحتوي على البيانات المطلوبة
      if (!newProjectResponse || !newProjectResponse.id) {
        console.error('Invalid response:', newProjectResponse);
        throw new Error('Invalid response from API');
      }
      
      const newProject: Project = {
        id: newProjectResponse.id,
        code: newProjectResponse.code,
        name: newProjectResponse.name,
        developer: newProjectResponse.developer_name || projectData.developer,
        type: newProjectResponse.type || '',
        city: newProjectResponse.city || '',
        paymentMethod: newProjectResponse.payment_method || '',
      };
      
      console.log('Adding project to state:', newProject);
      // تحديث state بشكل صريح
      setProjects(prev => {
        return [newProject, ...prev];
      });
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const updateProject = async (updatedProject: Project) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // الحصول على الاسم القديم للمشروع من الـ state الحالي قبل التحديث
      const oldProject = projects.find(p => p.id === updatedProject.id);
      const oldProjectName = oldProject?.name || updatedProject.name;

      const developer = developers.find(d => d.name === updatedProject.developer);
      if (!developer) {
        throw new Error('Developer not found');
      }

      const apiProjectData = {
        name: updatedProject.name,
        developer: developer.id,
        type: updatedProject.type || '',
        city: updatedProject.city || '',
        payment_method: updatedProject.paymentMethod || '',
        company: currentUser.company.id,
      };

      console.log('Updating project with data:', apiProjectData);
      console.log('Old project name:', oldProjectName);
      const updatedResponse = await updateProjectAPI(updatedProject.id, apiProjectData);
      console.log('Update response:', updatedResponse);
      
      if (!updatedResponse || !updatedResponse.id) {
        console.error('Invalid response:', updatedResponse);
        throw new Error('Invalid response from API');
      }
      
      // البحث عن اسم المطور من الـ response أو استخدام القيمة الحالية
      const developerName = updatedResponse.developer_name || updatedProject.developer;
      
      // الحصول على الاسم الجديد للمشروع من الـ response
      const newProjectName = updatedResponse.name;
      
      const updated: Project = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: newProjectName,
        developer: developerName,
        type: updatedResponse.type || '',
        city: updatedResponse.city || '',
        paymentMethod: updatedResponse.payment_method || '',
      };
      
      // تحديث state بشكل صريح
      setProjects(prev => {
        const updatedProjects = prev.map(p => p.id === updated.id ? updated : p);
        // إرجاع array جديد لضمان أن React يكتشف التغيير
        return [...updatedProjects];
      });
      
      // تحديث جميع الوحدات المرتبطة بهذا المشروع (cascading update)
      if (oldProjectName !== newProjectName) {
        console.log(`Updating units: changing project name from "${oldProjectName}" to "${newProjectName}"`);
        setUnits(prev => {
          const beforeCount = prev.filter(u => u.project === oldProjectName).length;
          const updatedUnits = prev.map(u => 
            u.project === oldProjectName ? { ...u, project: newProjectName } : u
          );
          const afterCount = updatedUnits.filter(u => u.project === newProjectName).length;
          console.log(`Units updated: ${beforeCount} units changed from "${oldProjectName}" to "${newProjectName}"`);
          // إرجاع array جديد لضمان أن React يكتشف التغيير
          return [...updatedUnits];
        });
        
        // تحديث جميع Deals المرتبطة بهذا المشروع
        setDeals(prev => {
          const updated = prev.map(d => {
            if (d.project === oldProjectName) {
              return { ...d, project: newProjectName };
            }
            return d;
          });
          // إرجاع array جديد لضمان أن React يكتشف التغيير
          return [...updated];
        });
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const deleteProject = async (projectId: number) => {
    try {
      // البحث عن المشروع قبل حذفه للحصول على اسمه
      const projectToDelete = projects.find(p => p.id === projectId);
      
      if (!projectToDelete) {
        console.error('Project not found:', projectId);
        throw new Error('Project not found');
      }
      
      console.log('Deleting project:', projectToDelete.name);
      await deleteProjectAPI(projectId);
      
      // تحديث state بشكل صريح
      setProjects(prev => {
        const filtered = prev.filter(p => p.id !== projectId);
        console.log('Projects after delete:', filtered.length);
        return filtered;
      });
      
      // حذف جميع الوحدات المرتبطة بهذا المشروع (cascading delete)
      const projectName = projectToDelete.name;
      console.log('Deleting units for project:', projectName);
      
      setUnits(prev => {
        const beforeCount = prev.length;
        const filtered = prev.filter(u => u.project !== projectName);
        const afterCount = filtered.length;
        console.log(`Units before: ${beforeCount}, after: ${afterCount}, deleted: ${beforeCount - afterCount}`);
        // إرجاع array جديد لضمان أن React يكتشف التغيير
        return [...filtered];
      });
      
      // تحديث جميع Deals المرتبطة بهذا المشروع (إزالة project و unit)
      setDeals(prev => {
        const updated = prev.map(d => {
          if (d.project === projectName) {
            const { project, unit, ...rest } = d;
            return rest;
          }
          return d;
        });
        // إرجاع array جديد لضمان أن React يكتشف التغيير
        return [...updated];
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  };
  
  const addUnit = async (unitData: Omit<Unit, 'id' | 'code' | 'isSold'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن project ID من الاسم
      const project = projects.find(p => p.name === unitData.project);
      if (!project) {
        throw new Error('Project not found');
      }

      const apiUnitData = {
        name: unitData.project || '', // API يتطلب name - نستخدم project name كاسم مؤقت
        project: project.id,
        bedrooms: unitData.bedrooms || null,
        price: unitData.price || null,
        bathrooms: unitData.bathrooms || null,
        type: unitData.type || '',
        finishing: unitData.finishing || '',
        city: unitData.city || '',
        district: unitData.district || '',
        zone: unitData.zone || '',
        is_sold: false,
        company: currentUser.company.id,
      };

      const newUnitResponse = await createUnitAPI(apiUnitData);
      
      const newUnit: Unit = {
        id: newUnitResponse.id,
        code: newUnitResponse.code,
        project: unitData.project,
        bedrooms: newUnitResponse.bedrooms || 0,
        price: newUnitResponse.price ? parseFloat(newUnitResponse.price.toString()) : 0,
        bathrooms: newUnitResponse.bathrooms || 0,
        type: newUnitResponse.type || '',
        finishing: newUnitResponse.finishing || '',
        city: newUnitResponse.city || '',
        district: newUnitResponse.district || '',
        zone: newUnitResponse.zone || '',
        isSold: newUnitResponse.is_sold || false,
      };
      
      setUnits(prev => [newUnit, ...prev]);
    } catch (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
  };

  const updateUnit = async (updatedUnit: Unit) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن project ID من الاسم
      const project = projects.find(p => p.name === updatedUnit.project);
      if (!project) {
        throw new Error('Project not found');
      }

      const apiUnitData = {
        name: updatedUnit.project || '',
        project: project.id,
        bedrooms: updatedUnit.bedrooms || null,
        price: updatedUnit.price || null,
        bathrooms: updatedUnit.bathrooms || null,
        type: updatedUnit.type || '',
        finishing: updatedUnit.finishing || '',
        city: updatedUnit.city || '',
        district: updatedUnit.district || '',
        zone: updatedUnit.zone || '',
        is_sold: updatedUnit.isSold || false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateUnitAPI(updatedUnit.id, apiUnitData);
      
      if (!updatedResponse || !updatedResponse.id) {
        console.error('Invalid response:', updatedResponse);
        throw new Error('Invalid response from API');
      }
      
      const updated: Unit = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        project: updatedUnit.project, // استخدام الاسم من updatedUnit
        bedrooms: updatedResponse.bedrooms || 0,
        price: updatedResponse.price ? parseFloat(updatedResponse.price.toString()) : 0,
        bathrooms: updatedResponse.bathrooms || 0,
        type: updatedResponse.type || '',
        finishing: updatedResponse.finishing || '',
        city: updatedResponse.city || '',
        district: updatedResponse.district || '',
        zone: updatedResponse.zone || '',
        isSold: updatedResponse.is_sold || false,
      };
      
      // تحديث state بشكل صريح
      setUnits(prev => {
        const updatedUnits = prev.map(u => u.id === updated.id ? updated : u);
        return [...updatedUnits];
      });
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  };

  const deleteUnit = async (unitId: number) => {
    try {
      await deleteUnitAPI(unitId);
      // تحديث state بشكل صريح
      setUnits(prev => {
        const filtered = prev.filter(u => u.id !== unitId);
        return [...filtered];
      });
    } catch (error) {
      console.error('Error deleting unit:', error);
      throw error;
    }
  };

  const addOwner = async (ownerData: Omit<Owner, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiOwnerData = {
        name: ownerData.name,
        phone: ownerData.phone || '',
        city: ownerData.city || '',
        district: ownerData.district || '',
        company: currentUser.company.id,
      };

      const newOwnerResponse = await createOwnerAPI(apiOwnerData);
      
      const newOwner: Owner = {
        id: newOwnerResponse.id,
        code: newOwnerResponse.code,
        name: newOwnerResponse.name,
        phone: newOwnerResponse.phone || '',
        city: newOwnerResponse.city || '',
        district: newOwnerResponse.district || '',
      };
      
      setOwners(prev => [newOwner, ...prev]);
    } catch (error) {
      console.error('Error creating owner:', error);
      throw error;
    }
  };

  const updateOwner = async (updatedOwner: Owner) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiOwnerData = {
        name: updatedOwner.name,
        phone: updatedOwner.phone || '',
        city: updatedOwner.city || '',
        district: updatedOwner.district || '',
        company: currentUser.company.id,
      };

      const updatedResponse = await updateOwnerAPI(updatedOwner.id, apiOwnerData);
      
      const updated: Owner = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        phone: updatedResponse.phone || '',
        city: updatedResponse.city || '',
        district: updatedResponse.district || '',
      };
      
      setOwners(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (error) {
      console.error('Error updating owner:', error);
      throw error;
    }
  };

  const deleteOwner = async (ownerId: number) => {
    try {
      await deleteOwnerAPI(ownerId);
      // تحديث state بشكل صريح
      setOwners(prev => {
        const filtered = prev.filter(o => o.id !== ownerId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting owner:', error);
      throw error;
    }
  };

  // Services CRUD
  const addService = async (serviceData: Omit<Service, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن provider ID من الاسم (إن وجد)
      let providerId = null;
      if (serviceData.provider) {
        const provider = serviceProviders.find(p => p.name === serviceData.provider);
        providerId = provider?.id || null;
      }

      const apiServiceData = {
        name: serviceData.name,
        category: serviceData.category || '',
        price: serviceData.price || 0,
        duration: serviceData.duration || '',
        description: serviceData.description || '',
        provider: providerId,
        is_active: serviceData.isActive !== false,
        company: currentUser.company.id,
      };

      const newServiceResponse = await createServiceAPI(apiServiceData);
      
      const newService: Service = {
        id: newServiceResponse.id,
        code: newServiceResponse.code,
        name: newServiceResponse.name,
        description: newServiceResponse.description || '',
        price: newServiceResponse.price ? parseFloat(newServiceResponse.price.toString()) : 0,
        duration: newServiceResponse.duration || '',
        category: newServiceResponse.category || '',
        provider: newServiceResponse.provider_name || undefined,
        isActive: newServiceResponse.is_active !== false,
      };
      
      setServices(prev => [newService, ...prev]);
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  };

  const updateService = async (updatedService: Service) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      let providerId = null;
      if (updatedService.provider) {
        const provider = serviceProviders.find(p => p.name === updatedService.provider);
        providerId = provider?.id || null;
      }

      const apiServiceData = {
        name: updatedService.name,
        category: updatedService.category || '',
        price: updatedService.price || 0,
        duration: updatedService.duration || '',
        description: updatedService.description || '',
        provider: providerId,
        is_active: updatedService.isActive !== false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateServiceAPI(updatedService.id, apiServiceData);
      
      const updated: Service = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        price: updatedResponse.price ? parseFloat(updatedResponse.price.toString()) : 0,
        duration: updatedResponse.duration || '',
        category: updatedResponse.category || '',
        provider: updatedResponse.provider_name || undefined,
        isActive: updatedResponse.is_active !== false,
      };
      
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  };

  const deleteService = async (serviceId: number) => {
    try {
      await deleteServiceAPI(serviceId);
      // تحديث state بشكل صريح
      setServices(prev => {
        const filtered = prev.filter(s => s.id !== serviceId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  };

  const addServicePackage = async (packageData: Omit<ServicePackage, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن service IDs من الأسماء
      const serviceIds = packageData.services
        .map(serviceName => {
          const service = services.find(s => s.name === serviceName);
          return service?.id;
        })
        .filter((id): id is number => id !== undefined);

      const apiPackageData = {
        name: packageData.name,
        description: packageData.description || '',
        price: packageData.price || 0,
        duration: packageData.duration || '',
        services: serviceIds,
        is_active: packageData.isActive !== false,
        company: currentUser.company.id,
      };

      const newPackageResponse = await createServicePackageAPI(apiPackageData);
      
      const newPackage: ServicePackage = {
        id: newPackageResponse.id,
        code: newPackageResponse.code,
        name: newPackageResponse.name,
        description: newPackageResponse.description || '',
        price: newPackageResponse.price ? parseFloat(newPackageResponse.price.toString()) : 0,
        duration: newPackageResponse.duration || '',
        services: packageData.services, // نحتفظ بالأسماء
        isActive: newPackageResponse.is_active !== false,
      };
      
      setServicePackages(prev => [newPackage, ...prev]);
    } catch (error) {
      console.error('Error creating service package:', error);
      throw error;
    }
  };

  const updateServicePackage = async (updatedPackage: ServicePackage) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const serviceIds = updatedPackage.services
        .map(serviceName => {
          const service = services.find(s => s.name === serviceName);
          return service?.id;
        })
        .filter((id): id is number => id !== undefined);

      const apiPackageData = {
        name: updatedPackage.name,
        description: updatedPackage.description || '',
        price: updatedPackage.price || 0,
        duration: updatedPackage.duration || '',
        services: serviceIds,
        is_active: updatedPackage.isActive !== false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateServicePackageAPI(updatedPackage.id, apiPackageData);
      
      const updated: ServicePackage = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        price: updatedResponse.price ? parseFloat(updatedResponse.price.toString()) : 0,
        duration: updatedResponse.duration || '',
        services: updatedPackage.services,
        isActive: updatedResponse.is_active !== false,
      };
      
      setServicePackages(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (error) {
      console.error('Error updating service package:', error);
      throw error;
    }
  };

  const deleteServicePackage = async (packageId: number) => {
    try {
      await deleteServicePackageAPI(packageId);
      // تحديث state بشكل صريح
      setServicePackages(prev => {
        const filtered = prev.filter(p => p.id !== packageId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting service package:', error);
      throw error;
    }
  };

  const addServiceProvider = async (providerData: Omit<ServiceProvider, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiProviderData = {
        name: providerData.name,
        phone: providerData.phone || '',
        email: providerData.email || '',
        specialization: providerData.specialization || '',
        rating: providerData.rating || null,
        company: currentUser.company.id,
      };

      const newProviderResponse = await createServiceProviderAPI(apiProviderData);
      
      const newProvider: ServiceProvider = {
        id: newProviderResponse.id,
        code: newProviderResponse.code,
        name: newProviderResponse.name,
        phone: newProviderResponse.phone || '',
        email: newProviderResponse.email || '',
        specialization: newProviderResponse.specialization || '',
        rating: newProviderResponse.rating ? parseFloat(newProviderResponse.rating.toString()) : undefined,
      };
      
      setServiceProviders(prev => [newProvider, ...prev]);
    } catch (error) {
      console.error('Error creating service provider:', error);
      throw error;
    }
  };

  const updateServiceProvider = async (updatedProvider: ServiceProvider) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiProviderData = {
        name: updatedProvider.name,
        phone: updatedProvider.phone || '',
        email: updatedProvider.email || '',
        specialization: updatedProvider.specialization || '',
        rating: updatedProvider.rating || null,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateServiceProviderAPI(updatedProvider.id, apiProviderData);
      
      const updated: ServiceProvider = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        phone: updatedResponse.phone || '',
        email: updatedResponse.email || '',
        specialization: updatedResponse.specialization || '',
        rating: updatedResponse.rating ? parseFloat(updatedResponse.rating.toString()) : undefined,
      };
      
      setServiceProviders(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (error) {
      console.error('Error updating service provider:', error);
      throw error;
    }
  };

  const deleteServiceProvider = async (providerId: number) => {
    try {
      await deleteServiceProviderAPI(providerId);
      // تحديث state بشكل صريح
      setServiceProviders(prev => {
        const filtered = prev.filter(p => p.id !== providerId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting service provider:', error);
      throw error;
    }
  };

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن category ID من الاسم
      const category = productCategories.find(c => c.name === productData.category);
      if (!category) {
        throw new Error('Product category not found');
      }

      // البحث عن supplier ID من الاسم (إن وجد)
      let supplierId = null;
      if (productData.supplier) {
        const supplier = suppliers.find(s => s.name === productData.supplier);
        supplierId = supplier?.id || null;
      }

      const apiProductData = {
        name: productData.name,
        description: productData.description || '',
        category: category.id,
        price: productData.price || 0,
        cost: productData.cost || null,
        stock: productData.stock || 0,
        supplier: supplierId,
        sku: productData.sku || '',
        is_active: productData.isActive !== false,
        company: currentUser.company.id,
      };

      const newProductResponse = await createProductAPI(apiProductData);
      
      const newProduct: Product = {
        id: newProductResponse.id,
        code: newProductResponse.code,
        name: newProductResponse.name,
        description: newProductResponse.description || '',
        price: newProductResponse.price ? parseFloat(newProductResponse.price.toString()) : 0,
        cost: newProductResponse.cost ? parseFloat(newProductResponse.cost.toString()) : 0,
        stock: newProductResponse.stock || 0,
        category: productData.category,
        supplier: newProductResponse.supplier_name || undefined,
        sku: newProductResponse.sku || undefined,
        image: undefined, // Image removed
        isActive: newProductResponse.is_active !== false,
      };
      
      setProducts(prev => [newProduct, ...prev]);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const category = productCategories.find(c => c.name === updatedProduct.category);
      if (!category) {
        throw new Error('Product category not found');
      }

      let supplierId = null;
      if (updatedProduct.supplier) {
        const supplier = suppliers.find(s => s.name === updatedProduct.supplier);
        supplierId = supplier?.id || null;
      }

      const apiProductData = {
        name: updatedProduct.name,
        description: updatedProduct.description || '',
        category: category.id,
        price: updatedProduct.price || 0,
        cost: updatedProduct.cost || null,
        stock: updatedProduct.stock || 0,
        supplier: supplierId,
        sku: updatedProduct.sku || '',
        is_active: updatedProduct.isActive !== false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateProductAPI(updatedProduct.id, apiProductData);
      
      const updated: Product = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        price: updatedResponse.price ? parseFloat(updatedResponse.price.toString()) : 0,
        cost: updatedResponse.cost ? parseFloat(updatedResponse.cost.toString()) : 0,
        stock: updatedResponse.stock || 0,
        category: updatedProduct.category,
        supplier: updatedResponse.supplier_name || undefined,
        sku: updatedResponse.sku || undefined,
        image: undefined, // Image removed
        isActive: updatedResponse.is_active !== false,
      };
      
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (productId: number) => {
    try {
      await deleteProductAPI(productId);
      // تحديث state بشكل صريح
      setProducts(prev => {
        const filtered = prev.filter(p => p.id !== productId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addProductCategory = async (categoryData: Omit<ProductCategory, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن parent category ID من الاسم (إن وجد)
      let parentCategoryId = null;
      if (categoryData.parentCategory) {
        const parentCategory = productCategories.find(c => c.name === categoryData.parentCategory);
        parentCategoryId = parentCategory?.id || null;
      }

      const apiCategoryData = {
        name: categoryData.name,
        description: categoryData.description || '',
        parent_category: parentCategoryId,
        company: currentUser.company.id,
      };

      const newCategoryResponse = await createProductCategoryAPI(apiCategoryData);
      
      const newCategory: ProductCategory = {
        id: newCategoryResponse.id,
        code: newCategoryResponse.code,
        name: newCategoryResponse.name,
        description: newCategoryResponse.description || '',
        parentCategory: newCategoryResponse.parent_category_name || undefined,
      };
      
      setProductCategories(prev => [newCategory, ...prev]);
    } catch (error) {
      console.error('Error creating product category:', error);
      throw error;
    }
  };

  const updateProductCategory = async (updatedCategory: ProductCategory) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      let parentCategoryId = null;
      if (updatedCategory.parentCategory) {
        const parentCategory = productCategories.find(c => c.name === updatedCategory.parentCategory);
        parentCategoryId = parentCategory?.id || null;
      }

      const apiCategoryData = {
        name: updatedCategory.name,
        description: updatedCategory.description || '',
        parent_category: parentCategoryId,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateProductCategoryAPI(updatedCategory.id, apiCategoryData);
      
      const updated: ProductCategory = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        parentCategory: updatedResponse.parent_category_name || undefined,
      };
      
      setProductCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (error) {
      console.error('Error updating product category:', error);
      throw error;
    }
  };

  const deleteProductCategory = async (categoryId: number) => {
    try {
      await deleteProductCategoryAPI(categoryId);
      // تحديث state بشكل صريح
      setProductCategories(prev => {
        const filtered = prev.filter(c => c.id !== categoryId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting product category:', error);
      throw error;
    }
  };

  const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'code'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiSupplierData = {
        name: supplierData.name,
        phone: supplierData.phone || '',
        email: supplierData.email || '',
        address: supplierData.address || '',
        contact_person: supplierData.contactPerson || '',
        specialization: supplierData.specialization || '',
        company: currentUser.company.id,
      };

      const newSupplierResponse = await createSupplierAPI(apiSupplierData);
      
      const newSupplier: Supplier = {
        id: newSupplierResponse.id,
        code: newSupplierResponse.code,
        name: newSupplierResponse.name,
        logo: '', // Logo removed
        phone: newSupplierResponse.phone || '',
        email: newSupplierResponse.email || '',
        address: newSupplierResponse.address || '',
        contactPerson: newSupplierResponse.contact_person || '',
        specialization: newSupplierResponse.specialization || '',
      };
      
      setSuppliers(prev => [newSupplier, ...prev]);
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  };

  const updateSupplier = async (updatedSupplier: Supplier) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiSupplierData = {
        name: updatedSupplier.name,
        phone: updatedSupplier.phone || '',
        email: updatedSupplier.email || '',
        address: updatedSupplier.address || '',
        contact_person: updatedSupplier.contactPerson || '',
        specialization: updatedSupplier.specialization || '',
        company: currentUser.company.id,
      };

      const updatedResponse = await updateSupplierAPI(updatedSupplier.id, apiSupplierData);
      
      const updated: Supplier = {
        id: updatedResponse.id,
        code: updatedResponse.code,
        name: updatedResponse.name,
        logo: '', // Logo removed
        phone: updatedResponse.phone || '',
        email: updatedResponse.email || '',
        address: updatedResponse.address || '',
        contactPerson: updatedResponse.contact_person || '',
        specialization: updatedResponse.specialization || '',
      };
      
      setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  const deleteSupplier = async (supplierId: number) => {
    try {
      await deleteSupplierAPI(supplierId);
      // تحديث state بشكل صريح
      setSuppliers(prev => {
        const filtered = prev.filter(s => s.id !== supplierId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  };

  // Client Tasks (Actions) functions
  const addClientTask = async (clientTaskData: { clientId: number; stage: string; notes: string; reminderDate: string | null }) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      // البحث عن Stage من الإعدادات بناءً على الاسم
      const stageName = clientTaskData.stage;
      const stageObj = stages.find(s => 
        s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
        s.name === stageName
      );
      const stageId = stageObj?.id || null;
      
      if (!stageId) {
        throw new Error('Stage not found in settings');
      }

      const apiClientTaskData = {
        client: clientTaskData.clientId,
        stage: stageId,
        notes: clientTaskData.notes || '',
        reminder_date: clientTaskData.reminderDate || null,
      };

      const newClientTaskResponse = await createClientTaskAPI(apiClientTaskData);
      
      // استخدام stage_name من API
      const stageNameFromAPI = newClientTaskResponse.stage_name || (newClientTaskResponse.stage?.name) || clientTaskData.stage;
      
      const newClientTask: ClientTask = {
        id: newClientTaskResponse.id,
        clientId: newClientTaskResponse.client,
        stage: stageNameFromAPI,
        notes: newClientTaskResponse.notes || '',
        reminderDate: newClientTaskResponse.reminder_date || null,
        createdBy: newClientTaskResponse.created_by || currentUser.id,
        createdAt: newClientTaskResponse.created_at || new Date().toISOString(),
      };
      
      setClientTasks(prev => [newClientTask, ...prev]);

      // تحديث Lead's history إذا كان selectedLead (مع معالجة الأخطاء)
      try {
        if (selectedLead && selectedLead.id === clientTaskData.clientId) {
          const user = users.find(u => u.id === currentUser.id);
          const newHistoryEntry: TimelineEntry = {
            id: newClientTask.id,
            user: user?.name || 'Unknown',
            avatar: user?.avatar || '',
            action: `Updated stage to ${stageNameFromAPI}`,
            details: clientTaskData.notes || '',
            date: formatDateToLocal(newClientTask.createdAt),
          };
          // تحديث selectedLead بشكل آمن
          const currentHistory = selectedLead.history || [];
          setSelectedLead({
            ...selectedLead,
            history: [newHistoryEntry, ...currentHistory],
            lastStage: stageNameFromAPI as Lead['status'],
          });
        }
      } catch (historyError) {
        // تجاهل أخطاء تحديث history - الـ task تم إنشاؤه بنجاح
        console.warn('Error updating lead history (non-critical):', historyError);
      }
    } catch (error) {
      console.error('Error creating client task:', error);
      throw error;
    }
  };

  const updateClientTask = async (clientTaskId: number, clientTaskData: Partial<ClientTask>) => {
    try {
      const apiClientTaskData: any = {};
      
      // إذا تم تحديث stage، البحث عن ID من الإعدادات
      if (clientTaskData.stage !== undefined) {
        const stageName = clientTaskData.stage;
        const stageObj = stages.find(s => 
          s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
          s.name === stageName
        );
        const stageId = stageObj?.id || null;
        if (stageId) {
          apiClientTaskData.stage = stageId;
        } else {
          throw new Error('Stage not found in settings');
        }
      }
      
      if (clientTaskData.notes !== undefined) apiClientTaskData.notes = clientTaskData.notes;
      if (clientTaskData.reminderDate !== undefined) apiClientTaskData.reminder_date = clientTaskData.reminderDate;

      const updatedResponse = await updateClientTaskAPI(clientTaskId, apiClientTaskData);
      
      // استخدام stage_name من API
      const stageNameFromAPI = updatedResponse.stage_name || (updatedResponse.stage?.name) || clientTaskData.stage || '';
      
      const updated: ClientTask = {
        id: updatedResponse.id,
        clientId: updatedResponse.client,
        stage: stageNameFromAPI,
        notes: updatedResponse.notes || '',
        reminderDate: updatedResponse.reminder_date || null,
        createdBy: updatedResponse.created_by || 0,
        createdAt: updatedResponse.created_at || new Date().toISOString(),
      };
      
      setClientTasks(prev => {
        const updatedTasks = prev.map(t => t.id === clientTaskId ? updated : t);
        return [...updatedTasks];
      });
    } catch (error) {
      console.error('Error updating client task:', error);
      throw error;
    }
  };

  const deleteClientTask = async (clientTaskId: number) => {
    try {
      await deleteClientTaskAPI(clientTaskId);
      // تحديث state بشكل صريح
      setClientTasks(prev => {
        const filtered = prev.filter(t => t.id !== clientTaskId);
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting client task:', error);
      throw error;
    }
  };

  // Settings functions
  const addChannel = async (channelData: Omit<Channel, 'id'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiChannelData = {
        name: channelData.name || 'New Channel',
        type: channelData.type || 'Web',
        priority: channelData.priority.toLowerCase(),
        company: currentUser.company.id,
      };

      const newChannelResponse = await createChannelAPI(apiChannelData);
      
      const newChannel: Channel = {
        id: newChannelResponse.id,
        name: newChannelResponse.name,
        type: newChannelResponse.type,
        priority: newChannelResponse.priority.charAt(0).toUpperCase() + newChannelResponse.priority.slice(1) as 'High' | 'Medium' | 'Low',
      };
      
      setChannels(prev => [newChannel, ...prev]);
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  };

  const updateChannel = async (updatedChannel: Channel) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiChannelData = {
        name: updatedChannel.name,
        type: updatedChannel.type,
        priority: updatedChannel.priority.toLowerCase(),
        company: currentUser.company.id,
      };

      const updatedResponse = await updateChannelAPI(updatedChannel.id, apiChannelData);
      
      const updated: Channel = {
        id: updatedResponse.id,
        name: updatedResponse.name,
        type: updatedResponse.type,
        priority: updatedResponse.priority.charAt(0).toUpperCase() + updatedResponse.priority.slice(1) as 'High' | 'Medium' | 'Low',
      };
      
      setChannels(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  };

  const deleteChannel = async (channelId: number) => {
    try {
      await deleteChannelAPI(channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  };

  const addStage = async (stageData: Omit<Stage, 'id'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiStageData = {
        name: stageData.name || 'New Stage',
        description: stageData.description || '',
        color: stageData.color || '#808080',
        required: stageData.required || false,
        auto_advance: stageData.autoAdvance || false,
        company: currentUser.company.id,
      };

      const newStageResponse = await createStageAPI(apiStageData);
      
      const newStage: Stage = {
        id: newStageResponse.id,
        name: newStageResponse.name,
        description: newStageResponse.description || '',
        color: newStageResponse.color || '#808080',
        required: newStageResponse.required || false,
        autoAdvance: newStageResponse.auto_advance || false,
      };
      
      setStages(prev => [...prev, newStage].sort((a, b) => {
        // Sort by order if available, otherwise by name
        const orderA = (newStageResponse as any).order || 0;
        const orderB = (prev.find(s => s.id === b.id) as any)?.order || 0;
        return orderA - orderB;
      }));
    } catch (error) {
      console.error('Error creating stage:', error);
      throw error;
    }
  };

  const updateStage = async (updatedStage: Stage) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiStageData = {
        name: updatedStage.name,
        description: updatedStage.description || '',
        color: updatedStage.color || '#808080',
        required: updatedStage.required || false,
        auto_advance: updatedStage.autoAdvance || false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateStageAPI(updatedStage.id, apiStageData);
      
      const updated: Stage = {
        id: updatedResponse.id,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        color: updatedResponse.color || '#808080',
        required: updatedResponse.required || false,
        autoAdvance: updatedResponse.auto_advance || false,
      };
      
      setStages(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (error) {
      console.error('Error updating stage:', error);
      throw error;
    }
  };

  const deleteStage = async (stageId: number) => {
    try {
      await deleteStageAPI(stageId);
      setStages(prev => prev.filter(s => s.id !== stageId));
    } catch (error) {
      console.error('Error deleting stage:', error);
      throw error;
    }
  };

  const addStatus = async (statusData: Omit<Status, 'id'>) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiStatusData = {
        name: statusData.name || 'New Status',
        description: statusData.description || '',
        category: statusData.category.toLowerCase().replace(' ', '_'),
        color: statusData.color || '#808080',
        is_default: statusData.isDefault || false,
        is_hidden: statusData.isHidden || false,
        company: currentUser.company.id,
      };

      const newStatusResponse = await createStatusAPI(apiStatusData);
      
      const newStatus: Status = {
        id: newStatusResponse.id,
        name: newStatusResponse.name,
        description: newStatusResponse.description || '',
        category: newStatusResponse.category.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') as 'Active' | 'Inactive' | 'Follow Up' | 'Closed',
        color: newStatusResponse.color || '#808080',
        isDefault: newStatusResponse.is_default || false,
        isHidden: newStatusResponse.is_hidden || false,
      };
      
      setStatuses(prev => [newStatus, ...prev]);
    } catch (error) {
      console.error('Error creating status:', error);
      throw error;
    }
  };

  const updateStatus = async (updatedStatus: Status) => {
    try {
      if (!currentUser?.company?.id) {
        throw new Error('User must be associated with a company');
      }

      const apiStatusData = {
        name: updatedStatus.name,
        description: updatedStatus.description || '',
        category: updatedStatus.category.toLowerCase().replace(' ', '_'),
        color: updatedStatus.color || '#808080',
        is_default: updatedStatus.isDefault || false,
        is_hidden: updatedStatus.isHidden || false,
        company: currentUser.company.id,
      };

      const updatedResponse = await updateStatusAPI(updatedStatus.id, apiStatusData);
      
      const updated: Status = {
        id: updatedResponse.id,
        name: updatedResponse.name,
        description: updatedResponse.description || '',
        category: updatedResponse.category.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') as 'Active' | 'Inactive' | 'Follow Up' | 'Closed',
        color: updatedResponse.color || '#808080',
        isDefault: updatedResponse.is_default || false,
        isHidden: updatedResponse.is_hidden || false,
      };
      
      setStatuses(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const deleteStatus = async (statusId: number) => {
    try {
      await deleteStatusAPI(statusId);
      setStatuses(prev => prev.filter(s => s.id !== statusId));
    } catch (error) {
      console.error('Error deleting status:', error);
      throw error;
    }
  };


  const value: AppContextType = { 
    theme, setTheme, 
    language, setLanguage: setLang, 
    isLoggedIn, setIsLoggedIn, 
    currentPage, setCurrentPage, 
    t, 
    selectedLead, setSelectedLead,
    selectedLeadForDeal, setSelectedLeadForDeal,
    selectedUser, setSelectedUser,
    currentUser, setCurrentUser,
    isSidebarOpen, setIsSidebarOpen,
    isAddLeadModalOpen, setIsAddLeadModalOpen,
    isEditLeadModalOpen, setIsEditLeadModalOpen,
    editingLead, setEditingLead,
    isAddActionModalOpen, setIsAddActionModalOpen,
    isAddTodoModalOpen, setIsAddTodoModalOpen,
    isAssignLeadModalOpen, setIsAssignLeadModalOpen,
    isFilterDrawerOpen, setIsFilterDrawerOpen,
    isActivitiesFilterDrawerOpen, setIsActivitiesFilterDrawerOpen,
    isDeveloperFilterDrawerOpen, setIsDeveloperFilterDrawerOpen,
    isProjectFilterDrawerOpen, setIsProjectFilterDrawerOpen,
    isOwnerFilterDrawerOpen, setIsOwnerFilterDrawerOpen,
    isProductFilterDrawerOpen, setIsProductFilterDrawerOpen,
    isProductCategoryFilterDrawerOpen, setIsProductCategoryFilterDrawerOpen,
    isSupplierFilterDrawerOpen, setIsSupplierFilterDrawerOpen,
    isServiceFilterDrawerOpen, setIsServiceFilterDrawerOpen,
    isServicePackageFilterDrawerOpen, setIsServicePackageFilterDrawerOpen,
    isServiceProviderFilterDrawerOpen, setIsServiceProviderFilterDrawerOpen,
    isCampaignsFilterDrawerOpen, setIsCampaignsFilterDrawerOpen,
    isTeamsReportFilterDrawerOpen, setIsTeamsReportFilterDrawerOpen,
    isEmployeesReportFilterDrawerOpen, setIsEmployeesReportFilterDrawerOpen,
    isMarketingReportFilterDrawerOpen, setIsMarketingReportFilterDrawerOpen,
    checkedLeadIds, setCheckedLeadIds,
    primaryColor, setPrimaryColor: setAppColor,
    activeSubPageColor, setActiveSubPageColor: setAppSubPageColor,
    isUnitsFilterDrawerOpen, setIsUnitsFilterDrawerOpen,
    isAddDeveloperModalOpen, setIsAddDeveloperModalOpen,
    isAddProjectModalOpen, setIsAddProjectModalOpen,
    isAddUnitModalOpen, setIsAddUnitModalOpen,
    isAddOwnerModalOpen, setIsAddOwnerModalOpen,
    isEditOwnerModalOpen, setIsEditOwnerModalOpen,
    editingOwner, setEditingOwner,
    isEditDeveloperModalOpen, setIsEditDeveloperModalOpen,
    editingDeveloper, setEditingDeveloper,
    isDeleteDeveloperModalOpen, setIsDeleteDeveloperModalOpen,
    deletingDeveloper, setDeletingDeveloper,
    isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen,
    confirmDeleteConfig, setConfirmDeleteConfig,
    isEditProjectModalOpen, setIsEditProjectModalOpen,
    editingProject, setEditingProject,
    isEditUnitModalOpen, setIsEditUnitModalOpen,
    editingUnit, setEditingUnit,
    // Services modals
    isAddServiceModalOpen, setIsAddServiceModalOpen,
    isEditServiceModalOpen, setIsEditServiceModalOpen,
    editingService, setEditingService,
    isAddServicePackageModalOpen, setIsAddServicePackageModalOpen,
    isEditServicePackageModalOpen, setIsEditServicePackageModalOpen,
    editingServicePackage, setEditingServicePackage,
    isAddServiceProviderModalOpen, setIsAddServiceProviderModalOpen,
    isEditServiceProviderModalOpen, setIsEditServiceProviderModalOpen,
    editingServiceProvider, setEditingServiceProvider,
    // Products modals
    isAddProductModalOpen, setIsAddProductModalOpen,
    isEditProductModalOpen, setIsEditProductModalOpen,
    editingProduct, setEditingProduct,
    isAddProductCategoryModalOpen, setIsAddProductCategoryModalOpen,
    isEditProductCategoryModalOpen, setIsEditProductCategoryModalOpen,
    editingProductCategory, setEditingProductCategory,
    isAddSupplierModalOpen, setIsAddSupplierModalOpen,
    isEditSupplierModalOpen, setIsEditSupplierModalOpen,
    editingSupplier, setEditingSupplier,
    isDealsFilterDrawerOpen, setIsDealsFilterDrawerOpen,
    isAddUserModalOpen, setIsAddUserModalOpen,
    isViewUserModalOpen, setIsViewUserModalOpen,
    isEditUserModalOpen, setIsEditUserModalOpen,
    isDeleteUserModalOpen, setIsDeleteUserModalOpen,
    isAddCampaignModalOpen, setIsAddCampaignModalOpen,
    isManageIntegrationAccountModalOpen, setIsManageIntegrationAccountModalOpen,
    connectedAccounts, setConnectedAccounts,
    editingAccount, setEditingAccount,
    isChangePasswordModalOpen, setIsChangePasswordModalOpen,
    // Data and functions
    users, setUsers, addUser, updateUser, deleteUser,
    leads, setLeads, addLead, updateLead, deleteLead, assignLeads,
    leadFilters, setLeadFilters,
    deals, setDeals, addDeal, deleteDeal,
    dealFilters, setDealFilters,
    campaigns, setCampaigns, addCampaign, deleteCampaign,
    campaignFilters, setCampaignFilters,
    activities, setActivities, addActivity,
    activityFilters, setActivityFilters,
    todos, setTodos, completedTodos, setCompletedTodos, addTodo, completeTodo,
    developers, setDevelopers, addDeveloper, updateDeveloper, deleteDeveloper,
    developerFilters, setDeveloperFilters,
    projects, setProjects, addProject, updateProject, deleteProject,
    projectFilters, setProjectFilters,
    units, setUnits, addUnit, updateUnit, deleteUnit,
    unitFilters, setUnitFilters,
    owners, setOwners, addOwner, updateOwner, deleteOwner,
    ownerFilters, setOwnerFilters,
    // Services
    services, setServices, addService, updateService, deleteService,
    serviceFilters, setServiceFilters,
    servicePackages, setServicePackages, addServicePackage, updateServicePackage, deleteServicePackage,
    servicePackageFilters, setServicePackageFilters,
    serviceProviders, setServiceProviders, addServiceProvider, updateServiceProvider, deleteServiceProvider,
    serviceProviderFilters, setServiceProviderFilters,
    // Products
    products, setProducts, addProduct, updateProduct, deleteProduct,
    productFilters, setProductFilters,
    productCategories, setProductCategories, addProductCategory, updateProductCategory, deleteProductCategory,
    productCategoryFilters, setProductCategoryFilters,
    suppliers, setSuppliers, addSupplier, updateSupplier, deleteSupplier,
    supplierFilters, setSupplierFilters,
    // Reports filters
    teamsReportFilters, setTeamsReportFilters,
    employeesReportFilters, setEmployeesReportFilters,
    marketingReportFilters, setMarketingReportFilters,
    // Client Tasks (Actions)
    clientTasks, setClientTasks, addClientTask, updateClientTask, deleteClientTask,
    // Settings
    channels, setChannels, addChannel, updateChannel, deleteChannel,
    stages, setStages, addStage, updateStage, deleteStage,
    statuses, setStatuses, addStatus, updateStatus, deleteStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};