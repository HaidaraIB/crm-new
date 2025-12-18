

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { getCompanyRoute, navigateToCompanyRoute } from './utils/routing';
import { Page } from './types';
import { Sidebar, Header, PageWrapper, AddLeadModal, EditLeadModal, AddActionModal, AssignLeadModal, FilterDrawer, ActivitiesFilterDrawer, DevelopersFilterDrawer, ProjectsFilterDrawer, OwnersFilterDrawer, ProductsFilterDrawer, ProductCategoriesFilterDrawer, SuppliersFilterDrawer, ServicesFilterDrawer, ServicePackagesFilterDrawer, ServiceProvidersFilterDrawer, CampaignsFilterDrawer, TeamsReportFilterDrawer, EmployeesReportFilterDrawer, MarketingReportFilterDrawer, AddDeveloperModal, AddProjectModal, AddUnitModal, UnitsFilterDrawer, AddOwnerModal, EditOwnerModal, DealsFilterDrawer, AddUserModal, ViewUserModal, EditUserModal, DeleteUserModal, AddCampaignModal, EditCampaignModal, ManageIntegrationAccountModal, ChangePasswordModal, EditDeveloperModal, DeleteDeveloperModal, ConfirmDeleteModal, EditProjectModal, EditUnitModal, AddTodoModal, AddServiceModal, EditServiceModal, AddServicePackageModal, EditServicePackageModal, AddServiceProviderModal, EditServiceProviderModal, AddProductModal, EditProductModal, AddProductCategoryModal, EditProductCategoryModal, AddSupplierModal, EditSupplierModal, EditDealModal, ViewDealModal, SuccessModal, AddChannelModal, EditChannelModal, AddStageModal, EditStageModal, AddStatusModal, EditStatusModal } from './components/index';
import { ActivitiesPage, CampaignsPage, CreateDealPage, CreateLeadPage, EditLeadPage, DashboardPage, DealsPage, EmployeesReportPage, IntegrationsPage, LeadsPage, LoginPage, RegisterPage, PaymentPage, PaymentSuccessPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage, TwoFactorAuthPage, MarketingReportPage, OwnersPage, ProfilePage, PropertiesPage, SettingsPage, TeamsReportPage, TodosPage, UsersPage, ViewLeadPage, ServicesInventoryPage, ProductsInventoryPage, ServicesPage, ServicePackagesPage, ServiceProvidersPage, ProductsPage, ProductCategoriesPage, SuppliersPage, ChangePlanPage } from './pages';

const TheApp = () => {
    const { isLoggedIn, language, isSidebarOpen, setIsSidebarOpen, isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen, confirmDeleteConfig, setConfirmDeleteConfig, currentPage, currentUser, setIsEmailVerificationModalOpen, setCurrentPage, setCurrentUser, setIsLoggedIn } = useAppContext();
    
    // Track payment success message to prevent email verification message from showing
    const [hasPaymentSuccessMessage, setHasPaymentSuccessMessage] = React.useState(() => {
        const paymentSuccessData = localStorage.getItem('paymentSuccessMessage');
        if (paymentSuccessData) {
            try {
                const data = JSON.parse(paymentSuccessData);
                return Date.now() - data.timestamp < 10000; // Show for 10 seconds
            } catch {
                return false;
            }
        }
        return false;
    });
    
    // Monitor payment success message changes
    React.useEffect(() => {
        const checkPaymentSuccess = () => {
            const paymentSuccessData = localStorage.getItem('paymentSuccessMessage');
            if (paymentSuccessData) {
                try {
                    const data = JSON.parse(paymentSuccessData);
                    const isValid = Date.now() - data.timestamp < 10000;
                    setHasPaymentSuccessMessage(isValid);
                    // Auto-remove after 10 seconds
                    if (!isValid) {
                        localStorage.removeItem('paymentSuccessMessage');
                    }
                } catch {
                    setHasPaymentSuccessMessage(false);
                }
            } else {
                setHasPaymentSuccessMessage(false);
            }
        };
        
        checkPaymentSuccess();
        const interval = setInterval(checkPaymentSuccess, 1000); // Check every second
        
        return () => clearInterval(interval);
    }, []);
    
    // CurrentPageContent component defined inside TheApp to have access to currentPage
    const CurrentPageContent = () => {
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
    };
    
    // Redirect from subdomain to main domain (if on subdomain)
    React.useEffect(() => {
        const hostname = window.location.hostname;
        // Check if we're on a subdomain (e.g., memo.com.localhost or company.example.com)
        const isOnSubdomain = hostname.includes('.localhost') && hostname !== 'localhost' && hostname.split('.').length > 2;
        
        if (isOnSubdomain) {
            // Extract main domain
            const parts = hostname.split('.');
            const localhostIndex = parts.indexOf('localhost');
            if (localhostIndex > 0) {
                // Redirect to main domain with same path
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : '';
                const path = window.location.pathname;
                const mainUrl = `${protocol}//localhost${port}${path}${window.location.search}`;
                window.location.replace(mainUrl);
            }
        }
    }, []);
    
    // Helper function to sanitize company name for URL
    const sanitizeCompanyName = (name: string): string => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    };
    
    
    // Ensure document direction is set on mount and when language changes
    React.useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);
    
    // Check for auth data in URL
    const [authProcessed, setAuthProcessed] = React.useState(() => {
        // Check if auth was already processed in this session
        return sessionStorage.getItem('authProcessed') === 'true';
    });
    
    // Handle pathname-based routing for logged-in users (must be called unconditionally)
    React.useEffect(() => {
        // Only process routing if user is logged in
        if (!isLoggedIn) return;
        
        // Decode URL-encoded pathname (e.g., /all%20leads -> /all leads)
        const pathnameToCheck = decodeURIComponent(window.location.pathname);
        
        // Map pathname to page name
        const pathToPageMap: Record<string, Page> = {
            '/dashboard': 'Dashboard',
            '/leads': 'Leads',
            '/all leads': 'All Leads',
            '/fresh leads': 'Fresh Leads',
            '/cold leads': 'Cold Leads',
            '/my leads': 'My Leads',
            '/rotated leads': 'Rotated Leads',
            '/create-lead': 'CreateLead',
            '/edit-lead': 'EditLead',
            '/view-lead': 'ViewLead', // Base route, will handle /view-lead/:id pattern
            '/activities': 'Activities',
            '/properties': 'Properties',
            '/owners': 'Owners',
            '/services': 'Services',
            '/service packages': 'Service Packages',
            '/service providers': 'Service Providers',
            '/products': 'Products',
            '/product categories': 'Product Categories',
            '/suppliers': 'Suppliers',
            '/deals': 'Deals',
            '/create-deal': 'CreateDeal',
            '/employees': 'Employees',
            '/users': 'Users',
            '/marketing': 'Marketing',
            '/campaigns': 'Campaigns',
            '/todos': 'Todos',
            '/reports': 'Reports',
            '/teams report': 'Teams Report',
            '/employees report': 'Employees Report',
            '/marketing report': 'Marketing Report',
            '/integrations': 'Integrations',
            '/meta': 'Meta',
            '/tiktok': 'TikTok',
            '/whatsapp': 'WhatsApp',
            '/settings': 'Settings',
            '/profile': 'Profile',
        };
        
        // Handle root path - redirect to dashboard
        if (pathnameToCheck === '/' || pathnameToCheck === '') {
            window.history.replaceState({}, '', '/dashboard');
            setCurrentPage('Dashboard');
            return;
        }
        
        // Check if pathname matches a known route
        const normalizedPath = pathnameToCheck.toLowerCase();
        
        // Check for /view-lead/:id pattern
        if (normalizedPath.startsWith('/view-lead/')) {
            const leadIdMatch = pathnameToCheck.match(/\/view-lead\/(\d+)/);
            if (leadIdMatch && currentPage !== 'ViewLead') {
                setCurrentPage('ViewLead');
            } else if (!leadIdMatch) {
                // Invalid /view-lead URL, redirect to leads
                window.history.replaceState({}, '', '/leads');
                setCurrentPage('Leads');
            }
            return;
        }
        
        const matchedPage = pathToPageMap[normalizedPath];
        
        if (matchedPage && currentPage !== matchedPage) {
            setCurrentPage(matchedPage);
        } else if (!matchedPage && pathnameToCheck !== '/' && pathnameToCheck !== '') {
            // If pathname doesn't match any route, redirect to dashboard
            window.history.replaceState({}, '', '/dashboard');
            setCurrentPage('Dashboard');
        }
    }, [isLoggedIn, currentPage, setCurrentPage]);
    
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
                    
                    // Save tokens and user data
                    localStorage.setItem('accessToken', decodedData.access);
                    localStorage.setItem('refreshToken', decodedData.refresh);
                    localStorage.setItem('currentUser', JSON.stringify(decodedData.user));
                    localStorage.setItem('isLoggedIn', 'true');
                    
                    // Mark as processed FIRST to prevent re-processing
                    setAuthProcessed(true);
                    sessionStorage.setItem('authProcessed', 'true');
                    
                    // Update context state immediately
                    setCurrentUser(decodedData.user);
                    setIsLoggedIn(true);
                    
                    // Clean URL and navigate to Dashboard (only once)
                    const cleanPath = window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
                    window.history.replaceState({}, '', cleanPath.replace(/\?.*$/, ''));
                    setCurrentPage('Dashboard');
                    
                    // Reload to ensure all state is applied
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                    return;
                }
            } catch (error) {
                console.error('Failed to parse auth data from URL:', error);
                // Clean URL if parsing fails
                const cleanPath = window.location.pathname.replace(/\?.*$/, '');
                window.history.replaceState({}, '', cleanPath);
                setAuthProcessed(true);
                sessionStorage.setItem('authProcessed', 'true');
            }
        } else {
            // User is logged in but URL has auth param, just clean it
            const cleanPath = window.location.pathname.replace(/\?.*$/, '');
            window.history.replaceState({}, '', cleanPath);
            setAuthProcessed(true);
            sessionStorage.setItem('authProcessed', 'true');
        }
    }, [isLoggedIn, authProcessed]); // Run when isLoggedIn changes or on mount
    
    // Check for verify-email route first (accessible for both logged-in and logged-out users)
    const pathname = decodeURIComponent(window.location.pathname);
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
    
    // Also check pathname on mount and when pathname might have changed
    React.useEffect(() => {
        const checkPathname = () => {
            // Decode URL-encoded pathname (e.g., /all%20leads -> /all leads)
            const currentPath = decodeURIComponent(window.location.pathname);
            const pathToPageMap: Record<string, Page> = {
                '/dashboard': 'Dashboard',
                '/leads': 'Leads',
                '/all leads': 'All Leads',
                '/fresh leads': 'Fresh Leads',
                '/cold leads': 'Cold Leads',
                '/my leads': 'My Leads',
                '/rotated leads': 'Rotated Leads',
                '/create-lead': 'CreateLead',
                '/edit-lead': 'EditLead',
                '/view-lead': 'ViewLead',
                '/activities': 'Activities',
                '/properties': 'Properties',
                '/owners': 'Owners',
                '/services': 'Services',
                '/service packages': 'Service Packages',
                '/service providers': 'Service Providers',
                '/products': 'Products',
                '/product categories': 'Product Categories',
                '/suppliers': 'Suppliers',
                '/deals': 'Deals',
                '/create-deal': 'CreateDeal',
                '/employees': 'Employees',
                '/users': 'Users',
                '/marketing': 'Marketing',
                '/campaigns': 'Campaigns',
                '/todos': 'Todos',
                '/reports': 'Reports',
                '/teams report': 'Teams Report',
                '/employees report': 'Employees Report',
                '/marketing report': 'Marketing Report',
                '/integrations': 'Integrations',
                '/meta': 'Meta',
                '/tiktok': 'TikTok',
                '/whatsapp': 'WhatsApp',
                '/settings': 'Settings',
                '/profile': 'Profile',
            };
            
            const normalizedPath = currentPath.toLowerCase();
            
            // Check for /view-lead/:id pattern
            if (normalizedPath.startsWith('/view-lead/')) {
                const leadIdMatch = currentPath.match(/\/view-lead\/(\d+)/);
                if (leadIdMatch && currentPage !== 'ViewLead') {
                    setCurrentPage('ViewLead');
                } else if (!leadIdMatch) {
                    // Invalid /view-lead URL, redirect to leads
                    window.history.replaceState({}, '', '/leads');
                    setCurrentPage('Leads');
                }
                return;
            }
            
            const matchedPage = pathToPageMap[normalizedPath];
            
            if (matchedPage && currentPage !== matchedPage) {
                setCurrentPage(matchedPage);
            } else if (!matchedPage && currentPath !== '/' && currentPath !== '') {
                // If pathname doesn't match any route, redirect to dashboard
                window.history.replaceState({}, '', '/dashboard');
                setCurrentPage('Dashboard');
            }
        };
        
        // Check immediately
        checkPathname();
        
        // Listen to popstate for browser back/forward
        window.addEventListener('popstate', checkPathname);
        
        // Check after a short delay to catch programmatic URL changes
        const timeout = setTimeout(checkPathname, 50);
        
        return () => {
            window.removeEventListener('popstate', checkPathname);
            clearTimeout(timeout);
        };
    }, [currentPage, setCurrentPage]);

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
                {/* Check if payment success message exists - if so, don't show email verification message */}
                {!hasPaymentSuccessMessage && isLoggedIn && currentUser && currentUser.emailVerified === false && (
                    <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium">
                                {language === 'ar' 
                                    ? 'البريد الإلكتروني غير مؤكد. يرجى تأكيد بريدك الإلكتروني للاستمرار.'
                                    : 'Your email is not verified. Please verify your email to continue.'}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Profile');
                                setCurrentPage('Profile');
                                // Use setTimeout to ensure page navigation happens before opening modal
                                setTimeout(() => {
                                    setIsEmailVerificationModalOpen(true);
                                }, 100);
                            }}
                            className="bg-white text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                            {language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify Email'}
                        </button>
                    </div>
                )}
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
            <EditCampaignModal />
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
            <AddChannelModal />
            <EditChannelModal />
            <AddStageModal />
            <EditStageModal />
            <AddStatusModal />
            <EditStatusModal />
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