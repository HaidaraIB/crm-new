

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Theme, Language, Page, Lead, User, Deal, Campaign, Developer, Project, Unit, Owner, Service, ServicePackage, ServiceProvider, Product, ProductCategory, Supplier, Activity, Todo, ClientTask, TimelineEntry, TaskStage, Channel, Stage, Status, LeadFilters, ActivityFilters, DeveloperFilters, ProjectFilters, UnitFilters, OwnerFilters, ProductFilters, ProductCategoryFilters, SupplierFilters, ServiceFilters, ServicePackageFilters, ServiceProviderFilters, DealFilters, CampaignFilters, TeamsReportFilters, EmployeesReportFilters, MarketingReportFilters } from '../types';
import { translations } from '../constants';
import { formatStageName, getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { formatDateToLocal, parseUTCDate } from '../utils/dateUtils';
import { generateColorShades } from '../utils/colors';
import { getCurrentUserAPI } from '../services/api';

// --- Helper Functions ---
/**
 * Safely extract company ID from company field (handles both object and ID formats)
 */
const getCompanyId = (company: any): number | null => {
  if (!company) return null;
  if (typeof company === 'object' && company.id !== undefined) {
    return company.id;
  }
  if (typeof company === 'number') {
    return company;
  }
  return null;
};

/**
 * Get company route path
 */
const getCompanyRoute = (companyDomain?: string, page?: string): string => {
  if (!companyDomain) {
    return '/';
  }
  if (page && page !== 'Dashboard') {
    return `/company/${companyDomain}/${page.toLowerCase()}`;
  }
  return `/company/${companyDomain}`;
};

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
  isAddCallModalOpen: boolean;
  setIsAddCallModalOpen: (isOpen: boolean) => void;
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
    confirmButtonText?: string;
    confirmButtonVariant?: 'danger' | 'primary';
    showWarning?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
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
  isViewDealModalOpen: boolean;
  setIsViewDealModalOpen: (isOpen: boolean) => void;
  viewingDeal: Deal | null;
  setViewingDeal: React.Dispatch<React.SetStateAction<Deal | null>>;

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
  isEditCampaignModalOpen: boolean;
  setIsEditCampaignModalOpen: (isOpen: boolean) => void;
  editingCampaign: Campaign | null;
  setEditingCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;

  // Integrations states
  isManageIntegrationAccountModalOpen: boolean;
  setIsManageIntegrationAccountModalOpen: (isOpen: boolean) => void;
  connectedAccounts: { facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] };
  setConnectedAccounts: React.Dispatch<React.SetStateAction<{ facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] }>>;
  editingAccount: ConnectedAccount | null;
  setEditingAccount: React.Dispatch<React.SetStateAction<ConnectedAccount | null>>;
  /** بعد إنشاء حساب تكامل جديد (Meta/WhatsApp) يُضبط هنا لفتح نافذة الربط تلقائياً */
  pendingConnectAccountId: number | null;
  setPendingConnectAccountId: (id: number | null) => void;
  
  // Select Lead Form Modal state
  isSelectLeadFormModalOpen: boolean;
  setIsSelectLeadFormModalOpen: (isOpen: boolean) => void;
  selectLeadFormConfig: { accountId: number; pageId: string; pageName: string } | null;
  setSelectLeadFormConfig: React.Dispatch<React.SetStateAction<{ accountId: number; pageId: string; pageName: string } | null>>;
  
  // Change Password Modal state
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (isOpen: boolean) => void;

  // Email Verification Modal state
  isEmailVerificationModalOpen: boolean;
  setIsEmailVerificationModalOpen: (isOpen: boolean) => void;

  // Success Modal state
  isSuccessModalOpen: boolean;
  setIsSuccessModalOpen: (isOpen: boolean) => void;
  successMessage: string;
  setSuccessMessage: (message: string) => void;

  // Filters (UI state only)
  leadFilters: LeadFilters;
  setLeadFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
  dealFilters: DealFilters;
  setDealFilters: React.Dispatch<React.SetStateAction<DealFilters>>;
  isEditDealModalOpen: boolean;
  setIsEditDealModalOpen: (isOpen: boolean) => void;
  editingDeal: Deal | null;
  setEditingDeal: React.Dispatch<React.SetStateAction<Deal | null>>;
  campaignFilters: CampaignFilters;
  setCampaignFilters: React.Dispatch<React.SetStateAction<CampaignFilters>>;
  activityFilters: ActivityFilters;
  setActivityFilters: React.Dispatch<React.SetStateAction<ActivityFilters>>;
  developerFilters: DeveloperFilters;
  setDeveloperFilters: React.Dispatch<React.SetStateAction<DeveloperFilters>>;
  projectFilters: ProjectFilters;
  setProjectFilters: React.Dispatch<React.SetStateAction<ProjectFilters>>;
  unitFilters: UnitFilters;
  setUnitFilters: React.Dispatch<React.SetStateAction<UnitFilters>>;
  ownerFilters: OwnerFilters;
  setOwnerFilters: React.Dispatch<React.SetStateAction<OwnerFilters>>;
  serviceFilters: ServiceFilters;
  setServiceFilters: React.Dispatch<React.SetStateAction<ServiceFilters>>;
  servicePackageFilters: ServicePackageFilters;
  setServicePackageFilters: React.Dispatch<React.SetStateAction<ServicePackageFilters>>;
  serviceProviderFilters: ServiceProviderFilters;
  setServiceProviderFilters: React.Dispatch<React.SetStateAction<ServiceProviderFilters>>;
  productFilters: ProductFilters;
  setProductFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  productCategoryFilters: ProductCategoryFilters;
  setProductCategoryFilters: React.Dispatch<React.SetStateAction<ProductCategoryFilters>>;
  supplierFilters: SupplierFilters;
  setSupplierFilters: React.Dispatch<React.SetStateAction<SupplierFilters>>;
  // Reports filters
  teamsReportFilters: TeamsReportFilters;
  setTeamsReportFilters: React.Dispatch<React.SetStateAction<TeamsReportFilters>>;
  employeesReportFilters: EmployeesReportFilters;
  setEmployeesReportFilters: React.Dispatch<React.SetStateAction<EmployeesReportFilters>>;
  marketingReportFilters: MarketingReportFilters;
  setMarketingReportFilters: React.Dispatch<React.SetStateAction<MarketingReportFilters>>;
  // Settings modals state
  isAddChannelModalOpen: boolean;
  setIsAddChannelModalOpen: (isOpen: boolean) => void;
  isEditChannelModalOpen: boolean;
  setIsEditChannelModalOpen: (isOpen: boolean) => void;
  editingChannel: Channel | null;
  setEditingChannel: React.Dispatch<React.SetStateAction<Channel | null>>;
  isAddStageModalOpen: boolean;
  setIsAddStageModalOpen: (isOpen: boolean) => void;
  isEditStageModalOpen: boolean;
  setIsEditStageModalOpen: (isOpen: boolean) => void;
  editingStage: Stage | null;
  setEditingStage: React.Dispatch<React.SetStateAction<Stage | null>>;
  isAddStatusModalOpen: boolean;
  setIsAddStatusModalOpen: (isOpen: boolean) => void;
  isAddCallMethodModalOpen: boolean;
  setIsAddCallMethodModalOpen: (isOpen: boolean) => void;
  isEditCallMethodModalOpen: boolean;
  setIsEditCallMethodModalOpen: (isOpen: boolean) => void;
  editingCallMethod: { id: number; name: string; description?: string; color: string; is_active: boolean } | null;
  setEditingCallMethod: React.Dispatch<React.SetStateAction<{ id: number; name: string; description?: string; color: string; is_active: boolean } | null>>;
  isEditStatusModalOpen: boolean;
  setIsEditStatusModalOpen: (isOpen: boolean) => void;
  editingStatus: Status | null;
  setEditingStatus: React.Dispatch<React.SetStateAction<Status | null>>;
  channelTypes: string[]; // Derived from channels (will be computed from React Query data)
  isCompanySubscriptionInactive: boolean;
  setIsCompanySubscriptionInactive: (isInactive: boolean) => void;
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

import { normalizeUser, getAvatarUrl } from '../utils/userUtils';

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
    // Simply load login state from localStorage
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
  
  // Company subscription status for employees
  const [isCompanySubscriptionInactive, setIsCompanySubscriptionInactive] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('isCompanySubscriptionInactive');
      return stored === 'true';
    }
    return false;
  });
  
  // Data states removed - now using React Query hooks in components
  
  // Modals and drawers state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [isAddCallModalOpen, setIsAddCallModalOpen] = useState(false);
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
    confirmButtonText?: string;
    confirmButtonVariant?: 'danger' | 'primary';
    showWarning?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
  } | null>(null);
  
  // Deals state
  const [isDealsFilterDrawerOpen, setIsDealsFilterDrawerOpen] = useState(false);
  const [isEditDealModalOpen, setIsEditDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isViewDealModalOpen, setIsViewDealModalOpen] = useState(false);
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  
  // Users state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  
  // Marketing state
  const [isAddCampaignModalOpen, setIsAddCampaignModalOpen] = useState(false);
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Settings modals state
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [isEditChannelModalOpen, setIsEditChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [isEditStageModalOpen, setIsEditStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [isAddCallMethodModalOpen, setIsAddCallMethodModalOpen] = useState(false);
  const [isEditCallMethodModalOpen, setIsEditCallMethodModalOpen] = useState(false);
  const [editingCallMethod, setEditingCallMethod] = useState<{ id: number; name: string; description?: string; color: string; is_active: boolean } | null>(null);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);

  // Integrations state
  const [isManageIntegrationAccountModalOpen, setIsManageIntegrationAccountModalOpen] = useState(false);
  const [isSelectLeadFormModalOpen, setIsSelectLeadFormModalOpen] = useState(false);
  const [selectLeadFormConfig, setSelectLeadFormConfig] = useState<{ accountId: number; pageId: string; pageName: string } | null>(null);
  // TODO: استدعي getConnectedAccountsAPI() عند تحميل صفحة Integrations
  // مثال: getConnectedAccountsAPI('meta').then(data => setConnectedAccounts(prev => ({ ...prev, facebook: data })));
  const [connectedAccounts, setConnectedAccounts] = useState<{ facebook: ConnectedAccount[]; tiktok: ConnectedAccount[]; whatsapp: ConnectedAccount[] }>({
    facebook: [],
    tiktok: [],
    whatsapp: []
  });
  const [editingAccount, setEditingAccount] = useState<ConnectedAccount | null>(null);
  const [pendingConnectAccountId, setPendingConnectAccountId] = useState<number | null>(null);
  
  // Change Password Modal state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // Email Verification Modal state
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState(false);

  // Success Modal state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');


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

    // Check user authentication and subscription status
    const checkUserAuth = async () => {
      if (!isLoggedIn || !localStorage.getItem('accessToken')) {
        return;
      }

      try {
        const userData = await getCurrentUserAPI();
        
        // Check subscription for all users (employees and admins)
        const isEmployee = userData.role === 'employee';
        const subscriptionId = userData.company?.subscription?.id;
        
        // Check subscription status with end_date validation
        let hasActiveSubscription = false;
        let subscriptionStatus = null;
        
        if (subscriptionId) {
          try {
            const { checkPaymentStatusAPI } = await import('../services/api');
            subscriptionStatus = await checkPaymentStatusAPI(subscriptionId);
            hasActiveSubscription = subscriptionStatus.is_truly_active === true;
            
            // Update userData with latest subscription info
            if (userData.company?.subscription) {
              userData.company.subscription.is_active = subscriptionStatus.is_truly_active;
              userData.company.subscription.end_date = subscriptionStatus.end_date;
            }
            
            // Check if subscription is expiring soon
            if (subscriptionStatus.is_expiring_soon && subscriptionStatus.days_until_expiry > 0) {
              // Store subscription warning in localStorage for display
              localStorage.setItem('subscriptionExpiringWarning', JSON.stringify({
                days: subscriptionStatus.days_until_expiry,
                endDate: subscriptionStatus.end_date,
                timestamp: Date.now()
              }));
            } else {
              localStorage.removeItem('subscriptionExpiringWarning');
            }
          } catch (error) {
            console.error('Error checking subscription status:', error);
            // Fallback to basic check
            hasActiveSubscription = userData.company?.subscription?.is_active === true;
          }
        } else {
          hasActiveSubscription = userData.company?.subscription?.is_active === true;
        }
        
        // If subscription is inactive, logout the user (both employees and admins)
        if (!hasActiveSubscription) {
          setIsLoggedIn(false);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('subscriptionExpiringWarning');
          window.location.href = '/login';
          return;
        }
        
        // Reset subscription inactive flag since subscription is active
        setIsCompanySubscriptionInactive(false);
        localStorage.removeItem('isCompanySubscriptionInactive');
        
        // Convert user data from API to Frontend format using the helper
        const frontendUser = normalizeUser(userData);
        
        // Clear old user data before setting new user to avoid conflicts
        const oldUserId = currentUser?.id;
        if (oldUserId && oldUserId !== frontendUser.id) {
          localStorage.removeItem('currentUser');
        }
        
        setCurrentUserState(frontendUser);
        localStorage.setItem('currentUser', JSON.stringify(frontendUser));
        setDataLoaded(true);
      } catch (error) {
        console.error('Error checking user authentication:', error);
        setIsLoggedIn(false);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
      }
    };

    // Call checkUserAuth if user is logged in and data not loaded yet
    if (isLoggedIn && !dataLoaded) {
      checkUserAuth();
    }

    const handleResize = () => {
        if (window.innerWidth >= 1024) { // Tailwind's lg breakpoint
            setIsSidebarOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoggedIn, dataLoaded, currentUser?.id]);

  // Poll subscription status every 5 minutes when user is logged in
  // Use refs to avoid triggering re-renders that could affect forms
  const currentUserRef = React.useRef(currentUser);
  const isLoggedInRef = React.useRef(isLoggedIn);
  
  // Update refs when values change
  React.useEffect(() => {
    currentUserRef.current = currentUser;
    isLoggedInRef.current = isLoggedIn;
  }, [currentUser, isLoggedIn]);
  
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.company?.subscription?.id) {
      return;
    }
    
    const subscriptionId = currentUser.company.subscription.id;
    const pollSubscriptionStatus = async () => {
      try {
        const { checkPaymentStatusAPI } = await import('../services/api');
        const status = await checkPaymentStatusAPI(subscriptionId);
        
        // Use ref to get latest currentUser without causing dependency issues
        const latestUser = currentUserRef.current;
        if (!latestUser?.company?.subscription) {
          return;
        }
        
        // Only update if subscription status actually changed to minimize re-renders
        const currentIsActive = latestUser.company.subscription.is_active;
        const currentEndDate = latestUser.company.subscription.end_date;
        
        if (currentIsActive !== status.is_truly_active || currentEndDate !== status.end_date) {
          const updatedUser = {
            ...latestUser,
            company: {
              ...latestUser.company,
              subscription: {
                ...latestUser.company.subscription,
                is_active: status.is_truly_active,
                end_date: status.end_date
              }
            }
          };
          setCurrentUserState(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        
        // Check if subscription expired
        if (!status.is_truly_active) {
          // Subscription expired, logout user
          setIsLoggedInState(false);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          window.location.href = '/login';
          return;
        }
        
        // Check if subscription is expiring soon
        if (status.is_expiring_soon && status.days_until_expiry > 0) {
          localStorage.setItem('subscriptionExpiringWarning', JSON.stringify({
            days: status.days_until_expiry,
            endDate: status.end_date,
            timestamp: Date.now()
          }));
        } else {
          localStorage.removeItem('subscriptionExpiringWarning');
        }
      } catch (error) {
        console.error('Error polling subscription status:', error);
      }
    };
    
    // Poll immediately, then every 5 minutes
    pollSubscriptionStatus();
    const interval = setInterval(pollSubscriptionStatus, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser?.company?.subscription?.id, setCurrentUserState, setIsLoggedInState]);

  const setIsLoggedIn = (loggedIn: boolean) => {
    setIsLoggedInState(loggedIn);
    if (loggedIn) {
      // Save login state to localStorage when logging in
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      // Clear all user data FIRST before redirecting
      // Clear multiple times to ensure it's gone
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('pendingUserData');
      localStorage.removeItem('isCompanySubscriptionInactive');
      sessionStorage.clear(); // Clear session storage as well
      
      setCurrentUserState(null);
      setIsCompanySubscriptionInactive(false);
      setDataLoaded(false); // إعادة تعيين dataLoaded عند تسجيل الخروج
      
      // Redirect to login page on the same domain (no subdomain redirect)
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      // Use current origin to stay on same domain
      const loginUrl = `${protocol}//${hostname}${port}/login?logout=true&t=${Date.now()}`;
      // Use window.location.replace to avoid back button issues and ensure clean logout
      // Add a small delay to ensure localStorage is cleared
      setTimeout(() => {
        window.location.replace(loginUrl);
      }, 100);
    }
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      // تنظيف الدور قبل الحفظ في localStorage
      const cleanedRole = normalizeRole(user.role);
      // Save full user data including company info
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: cleanedRole,
        phone: user.phone,
        avatar: user.avatar,
        company: user.company ? {
          id: user.company.id,
          name: user.company.name,
          domain: user.company.domain,
          specialization: user.company.specialization,
        } : null,
      }));
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

  // --- CRUD Functions removed - now using React Query hooks in components ---
  // All data fetching and mutations are handled by hooks in hooks/useQueries.ts
  // Components should use useQuery and useMutation hooks directly instead of AppContext

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
    isAddCallModalOpen, setIsAddCallModalOpen,
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
    isEditDealModalOpen, setIsEditDealModalOpen,
    editingDeal, setEditingDeal,
    isViewDealModalOpen, setIsViewDealModalOpen,
    viewingDeal, setViewingDeal,
    isAddUserModalOpen, setIsAddUserModalOpen,
    isViewUserModalOpen, setIsViewUserModalOpen,
    isEditUserModalOpen, setIsEditUserModalOpen,
    isDeleteUserModalOpen, setIsDeleteUserModalOpen,
    isAddCampaignModalOpen, setIsAddCampaignModalOpen,
    isEditCampaignModalOpen, setIsEditCampaignModalOpen,
    editingCampaign, setEditingCampaign,
    isManageIntegrationAccountModalOpen, setIsManageIntegrationAccountModalOpen,
    connectedAccounts, setConnectedAccounts,
    editingAccount, setEditingAccount,
    pendingConnectAccountId, setPendingConnectAccountId,
    isSelectLeadFormModalOpen, setIsSelectLeadFormModalOpen,
    selectLeadFormConfig, setSelectLeadFormConfig,
    isChangePasswordModalOpen, setIsChangePasswordModalOpen,
    isEmailVerificationModalOpen, setIsEmailVerificationModalOpen,
    isSuccessModalOpen, setIsSuccessModalOpen,
    successMessage, setSuccessMessage,
    // Filters (UI state only)
    leadFilters, setLeadFilters,
    dealFilters, setDealFilters,
    campaignFilters, setCampaignFilters,
    activityFilters, setActivityFilters,
    developerFilters, setDeveloperFilters,
    projectFilters, setProjectFilters,
    unitFilters, setUnitFilters,
    ownerFilters, setOwnerFilters,
    serviceFilters, setServiceFilters,
    servicePackageFilters, setServicePackageFilters,
    serviceProviderFilters, setServiceProviderFilters,
    productFilters, setProductFilters,
    productCategoryFilters, setProductCategoryFilters,
    supplierFilters, setSupplierFilters,
    // Reports filters
    teamsReportFilters, setTeamsReportFilters,
    employeesReportFilters, setEmployeesReportFilters,
    marketingReportFilters, setMarketingReportFilters,
    // Settings modals state
    isAddChannelModalOpen, setIsAddChannelModalOpen,
    isEditChannelModalOpen, setIsEditChannelModalOpen,
    editingChannel, setEditingChannel,
    isAddStageModalOpen, setIsAddStageModalOpen,
    isEditStageModalOpen, setIsEditStageModalOpen,
    editingStage, setEditingStage,
    isAddStatusModalOpen, setIsAddStatusModalOpen,
    isEditStatusModalOpen, setIsEditStatusModalOpen,
    editingStatus, setEditingStatus,
    isAddCallMethodModalOpen, setIsAddCallMethodModalOpen,
    isEditCallMethodModalOpen, setIsEditCallMethodModalOpen,
    editingCallMethod, setEditingCallMethod,
    channelTypes: [], // Will be computed from React Query data in components that need it
    isCompanySubscriptionInactive, setIsCompanySubscriptionInactive,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};