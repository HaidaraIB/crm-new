


import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { navigateToCompanyRoute, getCompanyRoute } from '../utils/routing';
// FIX: Import translations to be used for type casting.
import { SIDEBAR_ITEMS, SETTINGS_ITEM, translations } from '../constants';
import { Page as PageType } from '../types';
import { ChevronDownIcon, CodeBracketsIcon, XIcon } from './icons';
import { getIntegrationPolicyAPI } from '../services/api';
import { normalizeRole } from '../utils/roles';
import { resolveIntegrationPolicyMessage } from '../utils/integrationPolicyMessage';
import { useNewsUnreadCount, useWhatsAppUnreadCount } from '../hooks/useQueries';

type IntegrationLogoConfig = {
    /** Brand image under /public. Mutually exclusive with `Icon`. */
    src?: string;
    /** Stroke SVG for non-brand items (e.g. Custom Lead API). */
    Icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    /** Black monochrome marks — invert in dark mode so they stay visible. */
    mono?: boolean;
    /** Optical zoom for assets with excess inner padding (TikTok, Mujeb). */
    scale?: string;
};

/** Brand image logos / icons for Integrations sidebar sub-items. */
const INTEGRATION_SUB_LOGOS: Partial<Record<PageType, IntegrationLogoConfig>> = {
    Meta: { src: '/meta_logo_icon.png' },
    TikTok: { src: '/tiktok_logo_icon.webp', scale: 'scale-150' },
    WhatsApp: { src: '/whatsapp_logo_icon.webp' },
    Twilio: { src: '/sms_logo_icon.png', mono: true },
    AI: { src: '/chatgpt_logo_icon.png', mono: true },
    'Lead API': { Icon: CodeBracketsIcon },
    Mujeb: { src: '/mujeb_logo_icon.png', scale: 'scale-150' },
    PBX: { src: '/zycoo_logo_icon.webp' },
};

const IntegrationSubItemIcon = ({
    page,
    iconMargin,
}: {
    page: PageType;
    iconMargin: string;
}) => {
    const logo = INTEGRATION_SUB_LOGOS[page];
    if (!logo) {
        // Reserve space so labels without logos stay aligned with icon rows.
        return <span className={`inline-block w-5 h-5 shrink-0 ${iconMargin}`} aria-hidden />;
    }
    const slotClass = `inline-flex items-center justify-center shrink-0 w-5 h-5 overflow-hidden ${iconMargin}`;
    if (logo.Icon) {
        const SvgIcon = logo.Icon;
        return (
            <span className={slotClass} aria-hidden>
                <SvgIcon className="w-5 h-5" />
            </span>
        );
    }
    if (!logo.src) {
        return <span className={`inline-block w-5 h-5 shrink-0 ${iconMargin}`} aria-hidden />;
    }
    return (
        <span className={slotClass} aria-hidden>
            <img
                src={logo.src}
                alt=""
                className={`max-w-full max-h-full object-contain ${logo.scale ?? ''} ${
                    logo.mono ? 'dark:invert' : ''
                }`}
            />
        </span>
    );
};

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
    const isReceptionUser = normalizedCurrentRole === 'Reception';
    const chatsNavVisible =
        !isDataEntryUser &&
        !isReceptionUser &&
        (normalizedCurrentRole !== 'Supervisor' || canAccessPage('Chats'));
    const { data: whatsappUnreadCount = 0 } = useWhatsAppUnreadCount({
        enabled: Boolean(currentUser?.company?.id) && chatsNavVisible,
        refetchInterval: 15_000,
    });
    const newsNavVisible =
        normalizedCurrentRole !== 'Supervisor' || canAccessPage('News');
    const { data: newsUnreadCount = 0 } = useNewsUnreadCount({
        enabled: Boolean(currentUser?.company?.id) && newsNavVisible && !isDataEntryUser && !isReceptionUser,
        refetchInterval: 60_000,
    });

    // Get logo path based on theme
    const logoPath = theme === 'dark' ? '/logo_dark.png' : '/logo.png';

    const handleToggleSubMenu = (name: string) => {
        setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };
    
    const integrationPlatformByPage: Partial<Record<PageType, 'meta' | 'tiktok' | 'whatsapp' | 'twilio' | 'otpiq' | 'openai' | 'api' | 'mujeb' | 'pbx'>> = {
        Integrations: 'meta',
        Meta: 'meta',
        TikTok: 'tiktok',
        WhatsApp: 'whatsapp',
        Chats: 'whatsapp',
        'Messaging Center': 'whatsapp',
        Twilio: 'twilio',
        AI: 'openai',
        'Lead API': 'api',
        Mujeb: 'mujeb',
        PBX: 'pbx',
    };

    /** Sidebar labels for integration sub-pages (toCamelCase('AI') would wrongly yield aI). */
    const subItemTranslationKey = (sub: PageType): keyof typeof translations.en => {
        const special: Partial<Record<PageType, keyof typeof translations.en>> = {
            AI: 'ai',
            Twilio: 'twilio',
            'Lead API': 'leadApi',
            'Mujeb': 'mujeb',
            PBX: 'pbxIntegration',
            'Call Reports': 'callReports',
        };
        return special[sub] ?? (toCamelCase(sub) as keyof typeof translations.en);
    };

    const handleNavigation = async (page: PageType) => {
        const platform = integrationPlatformByPage[page];
        if (platform && currentUser?.company?.id) {
            try {
                const policies = await getIntegrationPolicyAPI();
                if (page === 'Twilio') {
                    const twilioOk = policies?.twilio?.enabled !== false;
                    const otpiqOk = policies?.otpiq?.enabled !== false;
                    if (!twilioOk && !otpiqOk) {
                        const policy = policies?.otpiq?.enabled === false ? policies.otpiq : policies?.twilio;
                        setAlertMessage(
                            resolveIntegrationPolicyMessage(policy?.message, policy?.scope, t),
                        );
                        setAlertVariant('warning');
                        setIsAlertModalOpen(true);
                        return;
                    }
                } else {
                    const policy = policies?.[platform];
                    if (policy && policy.enabled === false) {
                        setAlertMessage(
                            resolveIntegrationPolicyMessage(policy.message, policy.scope, t),
                        );
                        setAlertVariant('warning');
                        setIsAlertModalOpen(true);
                        return;
                    }
                }
            } catch {
                // Ignore policy fetch failures to avoid blocking navigation.
            }
        }
        setCurrentPage(page);
        
        // For Billing pages, we need to add subscription_id to URL
        const billingPages = ['Payment', 'Change Plan', 'Subscription'];
        if (billingPages.includes(page)) {
            const subscriptionId = currentUser?.company?.subscription?.id;
            if (subscriptionId) {
                const route = getCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, page);
                const url = `${route}?subscription_id=${subscriptionId}`;
                window.history.replaceState({}, '', url);
            } else {
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
            case 'medical':
                // Same pages as services; labels come from medical inventory terminology overrides.
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
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {SIDEBAR_ITEMS.filter((item) => {
                    if (isDataEntryUser) {
                        return item.name === 'Leads';
                    }
                    if (isReceptionUser) {
                        return item.name === 'Leads' || item.name === 'Activities';
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
                    // Library management is owner-only
                    if (item.name === 'Library' && normalizedCurrentRole !== 'Owner') {
                        return false;
                    }
                    // Hide Employees item for employee role
                    if (item.name === 'Employees' && (normalizedCurrentRole === 'Employee' || normalizedCurrentRole === 'Doctor')) {
                        return false;
                    }
                    // Staff use Chats (not Integrations settings) for WhatsApp messaging
                    if (item.name === 'Integrations' && (normalizedCurrentRole === 'Employee' || normalizedCurrentRole === 'Doctor')) {
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
                    if (isReceptionUser && item.name === 'Leads') {
                        subItems = ['All Leads', 'CreateLead'];
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
                                badgeCount={
                                    item.name === 'Chats'
                                        ? whatsappUnreadCount
                                        : item.name === 'News'
                                          ? newsUnreadCount
                                          : undefined
                                }
                                badgeAriaLabel={
                                    item.name === 'Chats' && whatsappUnreadCount > 0
                                        ? `${whatsappUnreadCount} unread`
                                        : item.name === 'News' && newsUnreadCount > 0
                                          ? `${newsUnreadCount} unread`
                                          : undefined
                                }
                            />
                            {subItems && subItems.length > 0 && isOpen && (
                                <div className="pt-2 pb-1 space-y-1" style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '1rem' }}>
                                    {subItems.map(sub => {
                                        const subItemNameKey = subItemTranslationKey(sub);
                                        const isIntegrationsSub = item.name === 'Integrations';
                                        const subIconMargin = language === 'ar' ? 'ml-2.5' : 'mr-2.5';
                                        return (
                                            <a
                                                key={sub}
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    void handleNavigation(sub);
                                                }}
                                                className={`flex items-center min-w-0 px-3 py-2 font-medium rounded-md transition-colors duration-150 ${
                                                    currentPage === sub
                                                        ? 'bg-gray-100 text-gray-900 dark:bg-primary-600 dark:text-white'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                {isIntegrationsSub ? (
                                                    <IntegrationSubItemIcon page={sub} iconMargin={subIconMargin} />
                                                ) : null}
                                                <span className="min-w-0 flex-1 whitespace-nowrap">{t(subItemNameKey)}</span>
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
                {normalizedCurrentRole !== 'Employee' && normalizedCurrentRole !== 'DataEntry' && normalizedCurrentRole !== 'Doctor' && normalizedCurrentRole !== 'Reception' && (
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