


import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { navigateToCompanyRoute, getCompanyRoute } from '../utils/routing';
// FIX: Import translations to be used for type casting.
import { SIDEBAR_ITEMS, SETTINGS_ITEM, translations } from '../constants';
import { Page as PageType } from '../types';
import { ChevronDownIcon, XIcon } from './icons';
import { getIntegrationPolicyAPI, getTenantChatConversationsAPI } from '../services/api';
import { normalizeRole } from '../utils/roles';

type SidebarItemProps = { 
    name: string; 
    icon?: React.FC<React.SVGProps<SVGSVGElement>>; 
    isActive: boolean; 
    hasSubItems?: boolean; 
    isSubItem?: boolean; 
    isOpen?: boolean; 
    onClick: () => void;
    /** Unread count badge (e.g. team chat). Hidden when 0 or undefined. */
    badgeCount?: number;
    badgeAriaLabel?: string;
};

// Helper function to convert "Page Name" to "pageName"
const toCamelCase = (str: string) => {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
};

const SidebarItem = ({
    name,
    icon: Icon,
    isActive,
    hasSubItems,
    isSubItem,
    isOpen,
    onClick,
    badgeCount,
    badgeAriaLabel,
}: SidebarItemProps) => {
    const { language } = useAppContext();
    const activeClass = isActive
        ? isSubItem
            ? 'bg-active-sub text-white dark:bg-primary-600 dark:text-white'
            : 'bg-primary text-white dark:bg-primary-600 dark:text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800';
    
    const iconMargin = language === 'ar' ? 'ml-3' : 'mr-3';
    const showBadge = badgeCount != null && badgeCount > 0;
    
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`flex items-center px-4 py-2 font-medium rounded-md transition-colors duration-150 ${activeClass}`}
        >
            {Icon && <Icon className={`w-5 h-5 shrink-0 ${iconMargin} ${isActive ? 'text-white' : ''}`} />}
            <span className="min-w-0 flex-1 whitespace-nowrap">{name}</span>
            {showBadge ? (
                <span
                    className={`ms-2 inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                        isActive
                            ? 'bg-white text-primary'
                            : 'bg-primary text-white dark:bg-primary-500'
                    }`}
                    aria-label={badgeAriaLabel}
                >
                    {badgeCount! > 99 ? '99+' : badgeCount}
                </span>
            ) : null}
            {hasSubItems && <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${language === 'ar' ? 'mr-1' : 'ml-1'}`} />}
        </a>
    );
};


export const Sidebar = () => {
    const { currentPage, setCurrentPage, isSidebarOpen, setIsSidebarOpen, t, currentUser, language, theme, canAccessPage, setAlertMessage, setAlertVariant, setIsAlertModalOpen } = useAppContext();
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
    const normalizedCurrentRole = normalizeRole(currentUser?.role);
    const isDataEntryUser = normalizedCurrentRole === 'DataEntry';

    const tenantChatUnreadQuery = useQuery({
        queryKey: ['tenant-chat-conversations'],
        queryFn: () => getTenantChatConversationsAPI(),
        enabled: !!currentUser && canAccessPage('Team Chat'),
        refetchInterval: 8000,
    });
    const teamChatUnreadTotal = useMemo(
        () =>
            (tenantChatUnreadQuery.data?.results ?? []).reduce(
                (sum, c) => sum + (c.unread_count ?? 0),
                0
            ),
        [tenantChatUnreadQuery.data]
    );
    
    // Get logo path based on theme
    const logoPath = theme === 'dark' ? '/logo_dark.png' : '/logo.png';

    const handleToggleSubMenu = (name: string) => {
        setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };
    
    const integrationPlatformByPage: Partial<Record<PageType, 'meta' | 'tiktok' | 'whatsapp' | 'twilio'>> = {
        Integrations: 'meta',
        Meta: 'meta',
        TikTok: 'tiktok',
        WhatsApp: 'whatsapp',
        'Messaging Center': 'whatsapp',
        Twilio: 'twilio',
    };

    const handleNavigation = async (page: PageType) => {
        const platform = integrationPlatformByPage[page];
        if (platform && currentUser?.company?.id) {
            try {
                const policies = await getIntegrationPolicyAPI();
                const policy = policies?.[platform];
                if (policy && policy.enabled === false) {
                    setAlertMessage(policy.message || 'This integration is currently disabled.');
                    setAlertVariant('warning');
                    setIsAlertModalOpen(true);
                    return;
                }
            } catch {
                // Ignore policy fetch failures to avoid blocking navigation.
            }
        }
        console.log('[Sidebar] handleNavigation called with page:', page);
        console.log('[Sidebar] currentUser:', currentUser);
        console.log('[Sidebar] subscription_id:', currentUser?.company?.subscription?.id);
        
        setCurrentPage(page);
        
        // For Billing pages, we need to add subscription_id to URL
        const billingPages = ['Payment', 'Change Plan', 'Subscription'];
        if (billingPages.includes(page)) {
            const subscriptionId = currentUser?.company?.subscription?.id;
            console.log('[Sidebar] Billing page detected, subscriptionId:', subscriptionId);
            if (subscriptionId) {
                const route = getCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, page);
                const url = `${route}?subscription_id=${subscriptionId}`;
                console.log('[Sidebar] Navigating to URL:', url);
                window.history.replaceState({}, '', url);
            } else {
                console.warn('[Sidebar] No subscription_id found, navigating without it');
                // If no subscription_id, still navigate but page will handle the error
                navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, page);
            }
        } else {
            // Update URL to company route for other pages
            navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, page);
        }
        
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
                        src={logoPath} 
                        alt="LOOP CRM Logo" 
                        className="h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => void handleNavigation('Dashboard')}
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
                    if (isDataEntryUser) {
                        return item.name === 'Leads' || item.name === 'Team Chat';
                    }
                    // Hide Billing from main menu (it's shown in bottom section)
                    if (item.name === 'Billing') {
                        return false;
                    }
                    // Supervisor: hide pages they don't have permission for
                    if (normalizedCurrentRole === 'Supervisor') {
                        if (!canAccessPage(item.name)) return false;
                        return true;
                    }
                    // Hide Users item for non-admin users
                    if (item.name === 'Users' && normalizedCurrentRole !== 'Owner') {
                        return false;
                    }
                    // Hide Reports item for non-admin users
                    if (item.name === 'Reports' && normalizedCurrentRole !== 'Owner') {
                        return false;
                    }
                    // Hide Employees item for employee role
                    if (item.name === 'Employees' && normalizedCurrentRole === 'Employee') {
                        return false;
                    }
                    return true;
                }).map((item) => {
                    const isOpen = openSubMenus[item.name] ?? false;
                    const itemNameKey = toCamelCase(item.name) as keyof typeof translations.en;
                    // Override subItems for Inventory based on company specialization
                    let subItems = item.name === 'Inventory' ? getInventorySubItems() : item.subItems;
                    if (isDataEntryUser && item.name === 'Leads') {
                        subItems = ['All Leads'];
                    }
                    // Employees only see WhatsApp under Integrations (Chats + Template Management)
                    if (item.name === 'Integrations' && normalizedCurrentRole === 'Employee') {
                        subItems = ['WhatsApp'];
                    }
                    // Supervisor: filter sub-items by permission
                    if (normalizedCurrentRole === 'Supervisor' && subItems) {
                        subItems = subItems.filter((sub) => canAccessPage(sub));
                    }
                    return (
                        <div key={item.name}>
                            <SidebarItem
                                name={t(itemNameKey)}
                                icon={item.icon}
                                isActive={currentPage === item.name || (!!subItems && subItems.some(sub => sub === currentPage))}
                                hasSubItems={!!subItems && subItems.length > 0}
                                isOpen={isOpen}
                                onClick={() => subItems && subItems.length ? handleToggleSubMenu(item.name) : void handleNavigation(item.name)}
                                badgeCount={item.name === 'Team Chat' ? teamChatUnreadTotal : undefined}
                                badgeAriaLabel={item.name === 'Team Chat' ? t('teamChatUnreadAria') : undefined}
                            />
                            {subItems && subItems.length > 0 && isOpen && (
                                <div className="pt-2 pb-1 space-y-1" style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '1.5rem' }}>
                                    {subItems.map(sub => {
                                        const subItemNameKey = toCamelCase(sub) as keyof typeof translations.en;
                                        return (
                                            <a
                                                key={sub}
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    void handleNavigation(sub);
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
                {normalizedCurrentRole !== 'Employee' && normalizedCurrentRole !== 'DataEntry' && (
                    <>
                        {normalizedCurrentRole !== 'Supervisor' && (
                            <SidebarItem
                                name={t('billing')}
                                icon={SIDEBAR_ITEMS.find(item => item.name === 'Billing')?.icon}
                                isActive={currentPage === 'Billing'}
                                onClick={() => void handleNavigation('Billing')}
                            />
                        )}
                        {canAccessPage('Settings') && (
                            <SidebarItem
                                name={t('settings')}
                                icon={SETTINGS_ITEM.icon}
                                isActive={currentPage === 'Settings'}
                                onClick={() => void handleNavigation('Settings')}
                            />
                        )}
                    </>
                )}
            </div>
        </aside>
        </>
    );
};