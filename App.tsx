

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar, Header, PageWrapper, AddLeadModal, EditLeadModal, AddActionModal, AssignLeadModal, FilterDrawer, ActivitiesFilterDrawer, DevelopersFilterDrawer, ProjectsFilterDrawer, OwnersFilterDrawer, ProductsFilterDrawer, ProductCategoriesFilterDrawer, SuppliersFilterDrawer, ServicesFilterDrawer, ServicePackagesFilterDrawer, ServiceProvidersFilterDrawer, CampaignsFilterDrawer, TeamsReportFilterDrawer, EmployeesReportFilterDrawer, MarketingReportFilterDrawer, AddDeveloperModal, AddProjectModal, AddUnitModal, UnitsFilterDrawer, AddOwnerModal, EditOwnerModal, DealsFilterDrawer, AddUserModal, ViewUserModal, EditUserModal, DeleteUserModal, AddCampaignModal, ManageIntegrationAccountModal, ChangePasswordModal, EditDeveloperModal, DeleteDeveloperModal, ConfirmDeleteModal, EditProjectModal, EditUnitModal, AddTodoModal, AddServiceModal, EditServiceModal, AddServicePackageModal, EditServicePackageModal, AddServiceProviderModal, EditServiceProviderModal, AddProductModal, EditProductModal, AddProductCategoryModal, EditProductCategoryModal, AddSupplierModal, EditSupplierModal, EditDealModal, ViewDealModal, SuccessModal } from './components/index';
import { ActivitiesPage, CampaignsPage, CreateDealPage, CreateLeadPage, EditLeadPage, DashboardPage, DealsPage, EmployeesReportPage, IntegrationsPage, LeadsPage, LoginPage, RegisterPage, PaymentPage, PaymentSuccessPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage, TwoFactorAuthPage, MarketingReportPage, OwnersPage, ProfilePage, PropertiesPage, SettingsPage, TeamsReportPage, TodosPage, UsersPage, ViewLeadPage, ServicesInventoryPage, ProductsInventoryPage, ServicesPage, ServicePackagesPage, ServiceProvidersPage, ProductsPage, ProductCategoriesPage, SuppliersPage } from './pages';

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
        // ... add other pages here
        default:
            // FIX: The PageWrapper component requires children.
            return <PageWrapper title={currentPage}><div>Content for {currentPage}</div></PageWrapper>;
    }
}

const TheApp = () => {
    const { isLoggedIn, language, isSidebarOpen, setIsSidebarOpen, isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen, confirmDeleteConfig, setConfirmDeleteConfig, currentPage } = useAppContext();
    
    // Ensure document direction is set on mount and when language changes
    React.useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);
    
    // Check for verify-email route first (accessible for both logged-in and logged-out users)
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const hasVerificationParams = urlParams.has('token') && urlParams.has('email');
    const hasResetParams = urlParams.has('token') && (urlParams.has('email') || pathname === '/reset-password');
    
    // Prioritize verify-email route: show VerifyEmailPage if pathname matches OR if URL has verification parameters
    // This ensures verification works regardless of currentPage state
    if (pathname === '/verify-email' || (hasVerificationParams && pathname !== '/reset-password') || currentPage === 'VerifyEmail') {
        return <VerifyEmailPage />;
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