


import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { navigateToCompanyRoute } from '../utils/routing';
// FIX: Import translations to be used for type casting.
import { SIDEBAR_ITEMS, SETTINGS_ITEM, translations } from '../constants';
import { Page as PageType } from '../types';
import { Button } from './Button';
import { ChevronDownIcon, XIcon, LogOutIcon } from './icons';

type SidebarItemProps = { 
    name: string; 
    icon?: React.FC<React.SVGProps<SVGSVGElement>>; 
    isActive: boolean; 
    hasSubItems?: boolean; 
    isSubItem?: boolean; 
    isOpen?: boolean; 
    onClick: () => void;
};

// Helper function to convert "Page Name" to "pageName"
const toCamelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};

const SidebarItem = ({ name, icon: Icon, isActive, hasSubItems, isSubItem, isOpen, onClick }: SidebarItemProps) => {
    const { language } = useAppContext();
    const activeClass = isActive
        ? isSubItem
            ? 'bg-active-sub text-white dark:bg-primary-600 dark:text-white'
            : 'bg-primary text-white dark:bg-primary-600 dark:text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
    
    const iconMargin = language === 'ar' ? 'ml-3' : 'mr-3';
    
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`flex items-center px-4 py-2 font-medium rounded-md transition-colors duration-150 ${activeClass}`}
        >
            {Icon && <Icon className={`w-5 h-5 ${iconMargin} ${isActive ? 'text-white' : ''}`} />}
            <span className="flex-1 whitespace-nowrap">{name}</span>
            {hasSubItems && <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
        </a>
    );
};


export const Sidebar = () => {
    const { currentPage, setCurrentPage, setIsLoggedIn, isSidebarOpen, setIsSidebarOpen, t, currentUser, language } = useAppContext();
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    const handleToggleSubMenu = (name: string) => {
        setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };
    
    const handleNavigation = (page: PageType) => {
        setCurrentPage(page);
        // Update URL to company route
        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, page);
        if (window.innerWidth < 1024) { // lg breakpoint
            setIsSidebarOpen(false);
        }
    };

    // Get inventory sub-items based on company specialization
    const getInventorySubItems = (): PageType[] => {
        const specialization = currentUser?.company?.specialization;
        switch (specialization) {
            case 'real_estate':
                return ['Properties', 'Owners'];
            case 'services':
                return ['Services', 'Service Packages', 'Service Providers'];
            case 'products':
                return ['Products', 'Product Categories', 'Suppliers'];
            default:
                return ['Properties', 'Owners']; // Default to real estate
        }
    };

    const sidebarBaseClasses = "flex-shrink-0 w-64 bg-white dark:bg-gray-900 flex flex-col fixed md:relative inset-y-0 z-40 transform transition-transform duration-300 ease-in-out";
    const languageSpecificClasses = language === 'ar' 
        ? 'border-l border-gray-200 dark:border-gray-800 right-0' 
        : 'border-r border-gray-200 dark:border-gray-800 left-0';
    
    const mobileTransformClass = language === 'ar'
        ? (isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0')
        : (isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0');
    
    return (
        <>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            <aside className={`${sidebarBaseClasses} ${languageSpecificClasses} ${mobileTransformClass}`}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <img 
                        src="/logo.png" 
                        alt="LOOP CRM Logo" 
                        className="h-10 w-auto object-contain" 
                    />
                </div>
                <button
                    className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-label="Close sidebar"
                >
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {SIDEBAR_ITEMS.filter((item) => {
                    // Hide Users item for non-admin users
                    if (item.name === 'Users' && currentUser?.role !== 'Owner') {
                        return false;
                    }
                    // Hide Reports item for non-admin users
                    if (item.name === 'Reports' && currentUser?.role !== 'Owner') {
                        return false;
                    }
                    // Hide Integrations item for non-admin users
                    if (item.name === 'Integrations' && currentUser?.role !== 'Owner') {
                        return false;
                    }
                    return true;
                }).map((item) => {
                    const isOpen = openSubMenus[item.name] ?? false;
                    const itemNameKey = toCamelCase(item.name) as keyof typeof translations.en;
                    // Override subItems for Inventory based on company specialization
                    const subItems = item.name === 'Inventory' ? getInventorySubItems() : item.subItems;
                    return (
                        <div key={item.name}>
                            <SidebarItem
                                name={t(itemNameKey)}
                                icon={item.icon}
                                isActive={currentPage === item.name || (!!subItems && subItems.some(sub => sub === currentPage))}
                                hasSubItems={!!subItems}
                                isOpen={isOpen}
                                onClick={() => subItems ? handleToggleSubMenu(item.name) : handleNavigation(item.name)}
                            />
                            {subItems && isOpen && (
                                <div className="pt-2 pb-1 space-y-1" style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '1.5rem' }}>
                                    {subItems.map(sub => {
                                        const subItemNameKey = toCamelCase(sub) as keyof typeof translations.en;
                                        return (
                                            <a
                                                key={sub}
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleNavigation(sub);
                                                }}
                                                className={`block px-4 py-2 font-medium rounded-md transition-colors duration-150 ${
                                                    currentPage === sub
                                                        ? 'bg-gray-100 text-gray-900 dark:bg-primary-600 dark:text-white'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                {t(subItemNameKey)}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
            <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700">
                <SidebarItem
                    name={t('settings')}
                    icon={SETTINGS_ITEM.icon}
                    isActive={currentPage === 'Settings'}
                    onClick={() => handleNavigation('Settings')}
                />
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setIsLogoutConfirmOpen(true);
                    }}
                    className="flex items-center px-4 py-2 mt-2 font-medium rounded-md transition-colors duration-150 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <LogOutIcon className={`w-5 h-5 ${language === 'ar' ? 'ml-3' : 'mr-3'}`} />
                    {t('logout')}
                </a>
            </div>
        </aside>
        {/* Logout Confirmation Dialog */}
        {isLogoutConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setIsLogoutConfirmOpen(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {t('logoutConfirmTitle')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {t('logoutConfirmMessage')}
                        </p>
                        <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                            <button
                                onClick={() => setIsLogoutConfirmOpen(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    // Clear all data first
                                    localStorage.removeItem('accessToken');
                                    localStorage.removeItem('refreshToken');
                                    localStorage.removeItem('isLoggedIn');
                                    localStorage.removeItem('currentUser');
                                    
                                    // Then set logged in to false (this will handle redirect)
                                    setIsLoggedIn(false);
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
                            >
                                {t('logout')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};