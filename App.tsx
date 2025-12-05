

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { getCompanyRoute, isOnSubdomain, isSubdomainMatch, getCurrentSubdomain, getCompanySubdomainUrl } from './utils/routing';
import { Sidebar, Header, PageWrapper, AddLeadModal, EditLeadModal, AddActionModal, AssignLeadModal, FilterDrawer, ActivitiesFilterDrawer, DevelopersFilterDrawer, ProjectsFilterDrawer, OwnersFilterDrawer, ProductsFilterDrawer, ProductCategoriesFilterDrawer, SuppliersFilterDrawer, ServicesFilterDrawer, ServicePackagesFilterDrawer, ServiceProvidersFilterDrawer, CampaignsFilterDrawer, TeamsReportFilterDrawer, EmployeesReportFilterDrawer, MarketingReportFilterDrawer, AddDeveloperModal, AddProjectModal, AddUnitModal, UnitsFilterDrawer, AddOwnerModal, EditOwnerModal, DealsFilterDrawer, AddUserModal, ViewUserModal, EditUserModal, DeleteUserModal, AddCampaignModal, ManageIntegrationAccountModal, ChangePasswordModal, EditDeveloperModal, DeleteDeveloperModal, ConfirmDeleteModal, EditProjectModal, EditUnitModal, AddTodoModal, AddServiceModal, EditServiceModal, AddServicePackageModal, EditServicePackageModal, AddServiceProviderModal, EditServiceProviderModal, AddProductModal, EditProductModal, AddProductCategoryModal, EditProductCategoryModal, AddSupplierModal, EditSupplierModal, EditDealModal, ViewDealModal, SuccessModal } from './components/index';
import { ActivitiesPage, CampaignsPage, CreateDealPage, CreateLeadPage, EditLeadPage, DashboardPage, DealsPage, EmployeesReportPage, IntegrationsPage, LeadsPage, LoginPage, RegisterPage, PaymentPage, PaymentSuccessPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage, TwoFactorAuthPage, MarketingReportPage, OwnersPage, ProfilePage, PropertiesPage, SettingsPage, TeamsReportPage, TodosPage, UsersPage, ViewLeadPage, ServicesInventoryPage, ProductsInventoryPage, ServicesPage, ServicePackagesPage, ServiceProvidersPage, ProductsPage, ProductCategoriesPage, SuppliersPage, ChangePlanPage } from './pages';

const CurrentPageContent = () => {
    const { currentPage } = useAppContext();
    switch (currentPage) {
        case 'Dashboard':
            return <DashboardPage />;
        case 'Leads':
        case 'All Leads':
        case 'Fresh Leads':
        case 'Cold Leads':
        case 'My Leads':
        case 'Rotated Leads':
            return <LeadsPage key={currentPage} />;
        case 'ViewLead':
            return <ViewLeadPage />;
        case 'CreateLead':
            return <CreateLeadPage />;
        case 'EditLead':
            return <EditLeadPage />;
        case 'Activities':
            return <ActivitiesPage />;
        case 'Inventory':
        case 'Properties':
            return <PropertiesPage />;
        case 'Services':
            return <ServicesPage />;
        case 'Service Packages':
            return <ServicePackagesPage />;
        case 'Service Providers':
            return <ServiceProvidersPage />;
        case 'Products':
            return <ProductsPage />;
        case 'Product Categories':
            return <ProductCategoriesPage />;
        case 'Suppliers':
            return <SuppliersPage />;
        case 'Owners':
            return <OwnersPage />;
        case 'Deals':
            return <DealsPage />;
        case 'CreateDeal':
            return <CreateDealPage />;
        case 'Users':
        case 'Employees':
            return <UsersPage />;
        case 'Marketing':
        case 'Campaigns':
            return <CampaignsPage />;
        case 'Todos':
            return <TodosPage />;
        case 'Reports':
        case 'Teams Report':
            return <TeamsReportPage />;
        case 'Employees Report':
            return <EmployeesReportPage />;
        case 'Marketing Report':
            return <MarketingReportPage />;
        case 'Integrations':
        case 'Meta':
        case 'TikTok':
        case 'WhatsApp':
            return <IntegrationsPage key={currentPage} />;
        case 'Settings':
            return <SettingsPage />;
        case 'Profile':
            return <ProfilePage />;
        case 'ChangePlan':
            return <ChangePlanPage />;
        // ... add other pages here
        default:
            // FIX: The PageWrapper component requires children.
            return <PageWrapper title={currentPage}><div>Content for {currentPage}</div></PageWrapper>;
    }
}

const TheApp = () => {
    const { isLoggedIn, language, isSidebarOpen, setIsSidebarOpen, isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen, confirmDeleteConfig, setConfirmDeleteConfig, currentPage, currentUser } = useAppContext();
    
    // Helper function to sanitize company name for URL
    const sanitizeCompanyName = (name: string): string => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    };
    
    // Track if we've already redirected to avoid loops
    const redirectRef = React.useRef(false);
    const lastUserRef = React.useRef<string | null>(null);
    const redirectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    
    // Check subdomain routing - only on initial load or when user changes
    // Don't redirect on every page change to avoid interfering with navigation
    React.useEffect(() => {
        // Only check subdomain routing if logged in and user data is loaded
        // Skip if we're already on the correct subdomain or if redirect is in progress
        if (!isLoggedIn || !currentUser?.company || redirectRef.current) {
            return;
        }
        
        const companyDomain = currentUser.company.domain;
        const isOnSubdomainNow = isOnSubdomain();
        
        // If company has domain and we're not on the correct subdomain, redirect
        // But only do this once when user first logs in or when user changes
        const currentUserId = currentUser?.id?.toString() || null;
        if (companyDomain && !isSubdomainMatch(companyDomain) && currentUserId !== lastUserRef.current) {
            // Set flag to prevent multiple redirects
            redirectRef.current = true;
            lastUserRef.current = currentUserId;
            
            // Get current page from pathname
            const pathname = window.location.pathname;
            let page = 'Dashboard';
            if (pathname !== '/' && pathname !== '') {
                const pathParts = pathname.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    page = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
                }
            }
            
            // Add a delay to ensure all data is loaded
            redirectTimeoutRef.current = setTimeout(() => {
                // Double-check that we still need to redirect
                if (isLoggedIn && currentUser?.company?.domain === companyDomain && currentUserId === lastUserRef.current) {
                    const correctUrl = getCompanySubdomainUrl(companyDomain, page);
                    console.log('🔄 Redirecting to company subdomain:', correctUrl);
                    window.location.href = correctUrl;
                } else {
                    redirectRef.current = false;
                }
                redirectTimeoutRef.current = null;
            }, 500); // Reduced delay since we're only checking on user change
            
        } else if (!companyDomain && isOnSubdomainNow && currentUserId !== lastUserRef.current) {
            // If company doesn't have domain but we're on a subdomain, redirect to main domain
            redirectRef.current = true;
            lastUserRef.current = currentUserId;
            
            // Get current page from pathname
            const pathname = window.location.pathname;
            let page = 'Dashboard';
            if (pathname !== '/' && pathname !== '') {
                const pathParts = pathname.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    page = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
                }
            }
            
            redirectTimeoutRef.current = setTimeout(() => {
                if (isLoggedIn && currentUser?.company && !currentUser.company.domain && currentUserId === lastUserRef.current) {
                    // Get base domain from current location
                    const hostname = window.location.hostname;
                    let baseDomain = 'localhost';
                    if (hostname.includes('.')) {
                        const parts = hostname.split('.');
                        if (parts.includes('localhost')) {
                            baseDomain = 'localhost';
                        } else if (parts.length >= 2) {
                            baseDomain = parts.slice(-2).join('.');
                        }
                    }
                    
                    const protocol = window.location.protocol;
                    const port = window.location.port ? `:${window.location.port}` : '';
                    const route = getCompanyRoute(currentUser.company.name, undefined, page);
                    const mainUrl = `${protocol}//${baseDomain}${port}${route}`;
                    console.log('🔄 Company has no domain but on subdomain, redirecting to main domain:', mainUrl);
                    window.location.href = mainUrl;
                } else {
                    redirectRef.current = false;
                }
                redirectTimeoutRef.current = null;
            }, 500);
        } else {
            // Update lastUserRef if user hasn't changed
            lastUserRef.current = currentUserId;
        }
        
        // Cleanup function
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
        };
    }, [isLoggedIn, currentUser?.id]); // Only depend on user ID, not currentPage
    
    // Ensure document direction is set on mount and when language changes
    React.useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);
    
    // Check for auth data in URL (from subdomain redirect)
    // This handles the case when user logs in on main domain and gets redirected to subdomain
    const [authProcessed, setAuthProcessed] = React.useState(() => {
        // Check if auth was already processed in this session
        return sessionStorage.getItem('authProcessed') === 'true';
    });
    
    React.useEffect(() => {
        // Skip if already processed
        if (authProcessed) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const authDataParam = urlParams.get('auth');
        
        if (!authDataParam) {
            setAuthProcessed(true);
            sessionStorage.setItem('authProcessed', 'true');
            return;
        }
        
        // Check if user is already logged in with valid token
        const hasAccessToken = localStorage.getItem('accessToken');
        const hasCurrentUser = localStorage.getItem('currentUser');
        
        // If user is already logged in, just clean the URL
        if (isLoggedIn && hasAccessToken && hasCurrentUser) {
            console.log('🔐 User already logged in, cleaning auth parameter from URL...');
            window.history.replaceState({}, '', window.location.pathname);
            setAuthProcessed(true);
            sessionStorage.setItem('authProcessed', 'true');
            return;
        }
        
        // Process auth data only if user is not logged in
        if (!isLoggedIn || !hasAccessToken) {
            try {
                const decodedData = JSON.parse(atob(decodeURIComponent(authDataParam)));
                if (decodedData.access && decodedData.refresh && decodedData.user) {
                    console.log('🔐 Found auth data in URL, restoring session...');
                    
                    // Save tokens and user data
                    localStorage.setItem('accessToken', decodedData.access);
                    localStorage.setItem('refreshToken', decodedData.refresh);
                    localStorage.setItem('currentUser', JSON.stringify(decodedData.user));
                    localStorage.setItem('isLoggedIn', 'true');
                    
                    // Clean URL
                    window.history.replaceState({}, '', window.location.pathname);
                    
                    // Mark as processed
                    setAuthProcessed(true);
                    sessionStorage.setItem('authProcessed', 'true');
                    
                    // Reload page to apply the new state
                    window.location.reload();
                    return;
                }
            } catch (error) {
                console.error('Failed to parse auth data from URL:', error);
                // Clean URL if parsing fails
                window.history.replaceState({}, '', window.location.pathname);
                setAuthProcessed(true);
                sessionStorage.setItem('authProcessed', 'true');
            }
        } else {
            // User is logged in but URL has auth param, just clean it
            window.history.replaceState({}, '', window.location.pathname);
            setAuthProcessed(true);
            sessionStorage.setItem('authProcessed', 'true');
        }
    }, [isLoggedIn, authProcessed]); // Run when isLoggedIn changes or on mount
    
    // Check for verify-email route first (accessible for both logged-in and logged-out users)
    const pathname = window.location.pathname;
    const urlParamsForRoutes = new URLSearchParams(window.location.search);
    const hasVerificationParams = urlParamsForRoutes.has('token') && urlParamsForRoutes.has('email');
    const hasResetParams = urlParamsForRoutes.has('token') && (urlParamsForRoutes.has('email') || pathname === '/reset-password');
    
    // Prioritize verify-email route: show VerifyEmailPage if pathname matches OR if URL has verification parameters
    // This ensures verification works regardless of currentPage state
    if (pathname === '/verify-email' || (hasVerificationParams && pathname !== '/reset-password') || currentPage === 'VerifyEmail') {
        return <VerifyEmailPage />;
    }
    
    // Show change plan page if on /change-plan route (available for both logged-in and logged-out users)
    if (pathname === '/change-plan' || pathname.startsWith('/change-plan') || currentPage === 'ChangePlan') {
        return <ChangePlanPage />;
    }
    
    // Handle routing for login and register pages
    if (!isLoggedIn) {
        // Show forgot password page if on /forgot-password route
        if (pathname === '/forgot-password' || currentPage === 'ForgotPassword') {
            return <ForgotPasswordPage />;
        }
        
        // Show reset password page if on /reset-password route or has reset params
        if (pathname === '/reset-password' || hasResetParams || currentPage === 'ResetPassword') {
            return <ResetPasswordPage />;
        }
        
        // Show 2FA page if on /2fa route
        if (pathname === '/2fa' || currentPage === 'TwoFactorAuth') {
            return <TwoFactorAuthPage />;
        }
        
        // Show register page if on /register route
        if (pathname === '/register' || currentPage === 'Register') {
            return <RegisterPage />;
        }
        
        // Handle /payment/return/ route - redirect to success page (backend redirects here from PayTabs)
        if (pathname === '/payment/return' || pathname.startsWith('/payment/return')) {
            // Backend already redirected here with subscription_id and status, just show success page
            return <PaymentSuccessPage />;
        }
        
        // Show payment success page if on /payment/success route (backend redirects here after processing)
        if (pathname === '/payment/success' || pathname.startsWith('/payment/success') || currentPage === 'PaymentSuccess') {
            return <PaymentSuccessPage />;
        }
        
        // Show payment page if on /payment route (but not /payment/success or /payment/return)
        if ((pathname === '/payment' || (pathname.startsWith('/payment/') && !pathname.startsWith('/payment/success') && !pathname.startsWith('/payment/return'))) || currentPage === 'Payment') {
            return <PaymentPage />;
        }
        
        // Show login page if on /login route or root
        if (pathname === '/login' || pathname === '/' || pathname === '' || currentPage === 'Login') {
            return <LoginPage />;
        }
        
        // Redirect any other route to login
        window.history.replaceState({}, '', '/login');
        return <LoginPage />;
    }

    // Check if user is logged in on main domain but should be on subdomain
    // Only redirect after data is loaded to avoid race conditions
    // This should only happen once when user first logs in
    React.useEffect(() => {
        // Wait for data to be loaded before redirecting
        // Skip redirect if we're already redirecting or if user doesn't have domain
        // Only redirect if user ID changed (new login)
        const currentUserId = currentUser?.id?.toString() || null;
        if (isLoggedIn && currentUser?.company?.domain && !isOnSubdomain() && !redirectRef.current && currentUserId !== lastUserRef.current) {
            const companyDomain = currentUser.company.domain;
            redirectRef.current = true;
            lastUserRef.current = currentUserId;
            
            // Get current page from pathname
            const pathname = window.location.pathname;
            let page = 'Dashboard';
            if (pathname !== '/' && pathname !== '') {
                const pathParts = pathname.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    page = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
                }
            }
            
            // Wait a bit longer to ensure all state is updated
            const redirectTimeout = setTimeout(() => {
                // Double-check conditions before redirecting
                if (isLoggedIn && currentUser?.company?.domain === companyDomain && !isOnSubdomain()) {
                    const correctUrl = getCompanySubdomainUrl(companyDomain, page);
                    console.log('🔄 User logged in with domain, redirecting to subdomain:', correctUrl);
                    // Use replace to avoid back button issues
                    window.location.replace(correctUrl);
                } else {
                    redirectRef.current = false;
                }
            }, 1000); // 1 second should be enough after login
            
            return () => clearTimeout(redirectTimeout);
        }
    }, [isLoggedIn, currentUser?.id]); // Only depend on user ID, not currentPage
    
    // Check if user is on subdomain but not logged in - redirect to main domain
    // Only check if we're sure user is not logged in (after initial load)
    React.useEffect(() => {
        // Add a small delay to avoid checking too early
        const checkTimeout = setTimeout(() => {
            if (!isLoggedIn && isOnSubdomain()) {
                const hostname = window.location.hostname;
                let baseDomain = 'localhost';
                if (hostname.includes('.')) {
                    const parts = hostname.split('.');
                    if (parts.includes('localhost')) {
                        baseDomain = 'localhost';
                    } else if (parts.length >= 2) {
                        baseDomain = parts.slice(-2).join('.');
                    }
                }
                
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : '';
                const loginUrl = `${protocol}//${baseDomain}${port}/login`;
                console.log('🔄 Not logged in on subdomain, redirecting to main domain:', loginUrl);
                window.location.href = loginUrl;
            }
        }, 1000); // 1 second delay to avoid race conditions
        
        return () => clearTimeout(checkTimeout);
    }, [isLoggedIn]);

    return (
        <div className={`flex h-screen ${language === 'ar' ? 'font-arabic' : 'font-sans'} bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300`}>
            <Sidebar />
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    aria-hidden="true"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <CurrentPageContent />
                </main>
            </div>
            {/* Global Modals & Drawers */}
            <AddLeadModal />
            <EditLeadModal />
            <AddActionModal />
            <AssignLeadModal />
            <FilterDrawer />
            <ActivitiesFilterDrawer />
            <DevelopersFilterDrawer />
            <ProjectsFilterDrawer />
            <UnitsFilterDrawer />
            <OwnersFilterDrawer />
            <ProductsFilterDrawer />
            <ProductCategoriesFilterDrawer />
            <SuppliersFilterDrawer />
            <ServicesFilterDrawer />
            <ServicePackagesFilterDrawer />
            <ServiceProvidersFilterDrawer />
            <CampaignsFilterDrawer />
            <DealsFilterDrawer />
            <TeamsReportFilterDrawer />
            <EmployeesReportFilterDrawer />
            <MarketingReportFilterDrawer />
            <AddDeveloperModal />
            <AddProjectModal />
            <AddUnitModal />
            <AddOwnerModal />
            <EditOwnerModal />
            <EditDeveloperModal />
            <DeleteDeveloperModal />
            {confirmDeleteConfig && (
                <ConfirmDeleteModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={() => {
                        setIsConfirmDeleteModalOpen(false);
                        setConfirmDeleteConfig(null);
                    }}
                    onConfirm={confirmDeleteConfig.onConfirm}
                    title={confirmDeleteConfig.title}
                    message={confirmDeleteConfig.message}
                    itemName={confirmDeleteConfig.itemName}
                />
            )}
            <EditProjectModal />
            <EditUnitModal />
            <AddUserModal />
            <ViewUserModal />
            <EditUserModal />
            <DeleteUserModal />
            <AddCampaignModal />
            <ManageIntegrationAccountModal />
            <ChangePasswordModal />
            <AddTodoModal />
            <AddServiceModal />
            <EditServiceModal />
            <AddServicePackageModal />
            <EditServicePackageModal />
            <AddServiceProviderModal />
            <EditServiceProviderModal />
            <AddProductModal />
            <EditProductModal />
            <AddProductCategoryModal />
            <EditProductCategoryModal />
            <AddSupplierModal />
            <EditSupplierModal />
            <EditDealModal />
            <ViewDealModal />
            <SuccessModal />
        </div>
        );
    };


function App() {
  return (
    // FIX: The AppProvider component requires children.
    <AppProvider>
        <TheApp />
    </AppProvider>
  );
}

export default App;