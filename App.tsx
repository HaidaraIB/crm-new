

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar, Header, PageWrapper, AddLeadModal, EditLeadModal, AddActionModal, AssignLeadModal, FilterDrawer, ActivitiesFilterDrawer, DevelopersFilterDrawer, ProjectsFilterDrawer, OwnersFilterDrawer, ProductsFilterDrawer, ProductCategoriesFilterDrawer, SuppliersFilterDrawer, ServicesFilterDrawer, ServicePackagesFilterDrawer, ServiceProvidersFilterDrawer, CampaignsFilterDrawer, TeamsReportFilterDrawer, EmployeesReportFilterDrawer, MarketingReportFilterDrawer, AddDeveloperModal, AddProjectModal, AddUnitModal, UnitsFilterDrawer, AddOwnerModal, EditOwnerModal, DealsFilterDrawer, AddUserModal, ViewUserModal, EditUserModal, DeleteUserModal, AddCampaignModal, ManageIntegrationAccountModal, ChangePasswordModal, EditDeveloperModal, DeleteDeveloperModal, ConfirmDeleteModal, EditProjectModal, EditUnitModal, AddTodoModal, AddServiceModal, EditServiceModal, AddServicePackageModal, EditServicePackageModal, AddServiceProviderModal, EditServiceProviderModal, AddProductModal, EditProductModal, AddProductCategoryModal, EditProductCategoryModal, AddSupplierModal, EditSupplierModal } from './components/index';
import { ActivitiesPage, CampaignsPage, CreateDealPage, DashboardPage, DealsPage, EmployeesReportPage, IntegrationsPage, LeadsPage, LoginPage, RegisterPage, VerifyEmailPage, MarketingReportPage, OwnersPage, ProfilePage, PropertiesPage, SettingsPage, TeamsReportPage, TodosPage, UsersPage, ViewLeadPage, ServicesInventoryPage, ProductsInventoryPage, ServicesPage, ServicePackagesPage, ServiceProvidersPage, ProductsPage, ProductCategoriesPage, SuppliersPage } from './pages';

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
    
    // Prioritize verify-email route: show VerifyEmailPage if pathname matches OR if URL has verification parameters
    // This ensures verification works regardless of currentPage state
    if (pathname === '/verify-email' || hasVerificationParams || currentPage === 'VerifyEmail') {
        return <VerifyEmailPage />;
    }
    
    // Handle routing for login and register pages
    if (!isLoggedIn) {
        // Show register page if on /register route
        if (pathname === '/register' || currentPage === 'Register') {
            return <RegisterPage />;
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