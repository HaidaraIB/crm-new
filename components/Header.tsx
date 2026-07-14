

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import { MoonIcon, SunIcon, MenuIcon, ChevronDownIcon, ChatBubbleIcon, BellIcon } from './icons';
import { Dropdown, DropdownItem } from './Dropdown';
import { navigateToCompanyRoute } from '../utils/routing';
import { getTenantChatConversationsAPI } from '../services/api';
import { useNotificationsUnreadCount } from './NotificationsDialog';
import { useCurrentUser } from '../hooks/useQueries';

type HeaderProps = {
    isInternetOnline: boolean;
};

export const Header = ({ isInternetOnline }: HeaderProps) => {
    const { t, theme, setTheme, language, setLanguage, setIsSidebarOpen, currentUser, setCurrentPage, setIsChangePasswordModalOpen, setIsLoggedIn, canAccessPage, isTeamChatDialogOpen, setIsTeamChatDialogOpen, isNotificationsDialogOpen, setIsNotificationsDialogOpen } = useAppContext();
    const { data: queryUser } = useCurrentUser();
    const effectiveUser = currentUser || queryUser || null;
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    const teamChatEnabled = Boolean(effectiveUser && canAccessPage('Team Chat'));
    const tenantChatUnreadQuery = useQuery({
        queryKey: ['tenant-chat-conversations'],
        queryFn: () => getTenantChatConversationsAPI(),
        enabled: teamChatEnabled,
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

    const notificationsUnreadQuery = useNotificationsUnreadCount(Boolean(effectiveUser));
    const notificationsUnreadTotal = notificationsUnreadQuery.data ?? 0;

    if (!effectiveUser) return null;

    return (
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 p-2 sm:p-4 flex justify-between items-center min-h-16">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button variant="ghost" className="lg:hidden p-1 -ml-2 rtl:-ml-0 rtl:-mr-2 flex-shrink-0" onClick={() => setIsSidebarOpen(true)}>
                    <MenuIcon className="h-6 w-6" />
                </Button>
                <div
                    className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border flex-shrink-0 ${
                        isInternetOnline
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
                    }`}
                    role="status"
                    aria-live="polite"
                >
                    <span
                        className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${isInternetOnline ? 'bg-green-500' : 'bg-red-500'}`}
                        aria-hidden="true"
                    />
                    <span>{isInternetOnline ? t('connectivityOnline') : t('connectivityOffline')}</span>
                </div>
            </div>
            <div className={`flex items-center ${language === 'ar' ? 'gap-4' : 'space-x-4'} flex-shrink-0`}>
                <button
                    onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
                >
                    <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
                </button>
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsTeamChatDialogOpen(false);
                        setIsNotificationsDialogOpen(true);
                    }}
                    className={`relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${
                        isNotificationsDialogOpen ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''
                    }`}
                    aria-label={t('notificationsTitle')}
                    title={t('notificationsTitle')}
                >
                    <BellIcon className="w-5 h-5" />
                    {notificationsUnreadTotal > 0 ? (
                        <span
                            className="absolute -top-0.5 -end-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white dark:bg-primary-500"
                            aria-label={t('notificationsUnreadBadge')}
                        >
                            {notificationsUnreadTotal > 99 ? '99+' : notificationsUnreadTotal}
                        </span>
                    ) : null}
                </button>
                {teamChatEnabled ? (
                    <button
                        type="button"
                        onClick={() => {
                            setIsNotificationsDialogOpen(false);
                            setIsTeamChatDialogOpen(true);
                        }}
                        className={`relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${
                            isTeamChatDialogOpen ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''
                        }`}
                        aria-label={t('teamChat')}
                        title={t('teamChat')}
                    >
                        <ChatBubbleIcon className="w-5 h-5" />
                        {teamChatUnreadTotal > 0 ? (
                            <span
                                className="absolute -top-0.5 -end-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white dark:bg-primary-500"
                                aria-label={t('teamChatUnreadAria')}
                            >
                                {teamChatUnreadTotal > 99 ? '99+' : teamChatUnreadTotal}
                            </span>
                        ) : null}
                    </button>
                ) : null}
                <Dropdown
                    trigger={
                        <button className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} gap-2 cursor-pointer`}>
                            <img src={effectiveUser.avatar} alt={effectiveUser.name} className="h-8 w-8 rounded-full object-cover" />
                            <span className="hidden md:inline text-sm font-medium text-gray-900 dark:text-gray-100">{effectiveUser.name}</span>
                            <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    }
                >
                    <DropdownItem onClick={() => {
                        setCurrentPage('Profile');
                        navigateToCompanyRoute(effectiveUser?.company?.name, effectiveUser?.company?.domain, 'Profile');
                    }}>
                        {t('profile')}
                    </DropdownItem>
                    <DropdownItem onClick={() => setIsChangePasswordModalOpen(true)}>
                        {t('changePassword')}
                    </DropdownItem>
                    <DropdownItem onClick={() => setIsLogoutConfirmOpen(true)}>
                        <span className="text-red-600 dark:text-red-400">{t('logout')}</span>
                    </DropdownItem>
                </Dropdown>
            </div>
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
        </header>
    );
};