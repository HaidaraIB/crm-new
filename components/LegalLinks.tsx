import React from 'react';
import { useAppContext } from '../context/AppContext';

interface LegalLinksProps {
    className?: string;
    variant?: 'horizontal' | 'vertical';
    size?: 'sm' | 'md';
}

export const LegalLinks: React.FC<LegalLinksProps> = ({ 
    className = '', 
    variant = 'horizontal',
    size = 'sm'
}) => {
    const { language } = useAppContext();

    const linkClass = size === 'sm' 
        ? 'text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors'
        : 'text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors';

    const containerClass = variant === 'horizontal'
        ? `flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`
        : `flex flex-col gap-2 ${className}`;

    const links = [
        {
            href: '/terms-of-service',
            label: language === 'ar' ? 'شروط الخدمة' : 'Terms of Service',
        },
        {
            href: '/privacy-policy',
            label: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
        },
        {
            href: '/data-deletion-policy',
            label: language === 'ar' ? 'سياسة حذف البيانات' : 'Data Deletion Policy',
        },
    ];

    return (
        <nav className={containerClass} aria-label={language === 'ar' ? 'روابط قانونية' : 'Legal Links'}>
            {links.map((link, index) => (
                <a
                    key={link.href}
                    href={link.href}
                    className={linkClass}
                    onClick={(e) => {
                        e.preventDefault();
                        window.location.href = link.href;
                    }}
                >
                    {link.label}
                </a>
            ))}
        </nav>
    );
};

