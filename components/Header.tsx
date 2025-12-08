

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import { Input } from './Input';
import { MoonIcon, SunIcon, MenuIcon, ChevronDownIcon } from './icons';
import { Dropdown, DropdownItem } from './Dropdown';
import { navigateToCompanyRoute } from '../utils/routing';

export const Header = () => {
    const { t, theme, setTheme, language, setLanguage, setIsSidebarOpen, currentUser, setCurrentPage, setIsChangePasswordModalOpen } = useAppContext();

    if (!currentUser) return null;

    return (
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 p-2 sm:p-4 flex justify-between items-center min-h-16">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button variant="ghost" className="lg:hidden p-1 -ml-2 rtl:-ml-0 rtl:-mr-2 flex-shrink-0" onClick={() => setIsSidebarOpen(true)}>
                    <MenuIcon className="h-6 w-6" />
                </Button>
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
                <Dropdown
                    trigger={
                        <button className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} gap-2 cursor-pointer`}>
                            <img src={currentUser.avatar} alt={currentUser.name} className="h-8 w-8 rounded-full object-cover" />
                            <span className="hidden md:inline text-sm font-medium text-gray-900 dark:text-gray-100">{currentUser.name}</span>
                            <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                    }
                >
                    <DropdownItem onClick={() => {
                        setCurrentPage('Profile');
                        navigateToCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'Profile');
                    }}>
                        {t('profile')}
                    </DropdownItem>
                    <DropdownItem onClick={() => setIsChangePasswordModalOpen(true)}>
                        {t('changePassword')}
                    </DropdownItem>
                </Dropdown>
            </div>
        </header>
    );
};