import React from 'react';
import { FacebookIcon, TikTokIcon, WhatsappIcon, SmsIcon } from '../icons';

export type IntegrationPlatform = 'meta' | 'tiktok' | 'whatsapp' | 'sms';

const PLATFORM_ICONS: Record<IntegrationPlatform, React.FC<React.SVGProps<SVGSVGElement>>> = {
    meta: FacebookIcon,
    tiktok: TikTokIcon,
    whatsapp: WhatsappIcon,
    sms: SmsIcon,
};

/** Icon foreground — readable on dark UI backgrounds. */
const ICON_FG: Record<IntegrationPlatform, string> = {
    meta: 'text-[#1877F2] dark:text-[#6BA8FF]',
    tiktok: 'text-gray-900 dark:text-white',
    whatsapp: 'text-[#128C7E] dark:text-[#5FE07A]',
    sms: 'text-primary-700 dark:text-primary-200',
};

const BADGE_SHELL: Record<IntegrationPlatform, string> = {
    meta: 'bg-[#1877F2]/12 dark:bg-[#1877F2]/22 ring-[#1877F2]/30 dark:ring-[#1877F2]/45',
    tiktok: 'bg-gray-200/90 dark:bg-white/12 ring-gray-300/60 dark:ring-white/25',
    whatsapp: 'bg-[#25D366]/12 dark:bg-[#25D366]/22 ring-[#25D366]/30 dark:ring-[#25D366]/45',
    sms: 'bg-primary/12 dark:bg-primary/25 ring-primary/25 dark:ring-primary/40',
};

const SIZE_CLASSES = {
    sm: { shell: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
    md: { shell: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6' },
    lg: { shell: 'w-14 h-14 rounded-xl', icon: 'w-10 h-10' },
    xl: { shell: 'w-20 h-20 rounded-2xl', icon: 'w-10 h-10' },
} as const;

export const integrationPlatformFromDataKey = (
    dataKey: 'facebook' | 'tiktok' | 'whatsapp' | null | undefined,
): IntegrationPlatform | null => {
    if (dataKey === 'facebook') return 'meta';
    if (dataKey === 'tiktok') return 'tiktok';
    if (dataKey === 'whatsapp') return 'whatsapp';
    return null;
};

type IntegrationPlatformIconProps = {
    platform: IntegrationPlatform;
    size?: keyof typeof SIZE_CLASSES;
    /** Badge = icon in tinted container; inline = icon only; muted = softer badge for empty states */
    variant?: 'badge' | 'inline' | 'muted';
    className?: string;
};

export const IntegrationPlatformIcon = ({
    platform,
    size = 'md',
    variant = 'badge',
    className = '',
}: IntegrationPlatformIconProps) => {
    const Icon = PLATFORM_ICONS[platform];
    const { shell, icon } = SIZE_CLASSES[size];
    const fg = ICON_FG[platform];

    if (variant === 'inline') {
        return <Icon className={`${icon} ${fg} ${className}`.trim()} aria-hidden />;
    }

    const shellTone =
        variant === 'muted'
            ? 'bg-gray-100 dark:bg-gray-700/60 ring-gray-200/80 dark:ring-gray-600/80'
            : BADGE_SHELL[platform];

    return (
        <span
            className={`flex-shrink-0 flex items-center justify-center ring-1 ${shell} ${shellTone} ${className}`.trim()}
            aria-hidden
        >
            <Icon className={`${icon} ${fg}`} />
        </span>
    );
};

/** Class for integration icons inside tabs/buttons when accent color is `text-primary`. */
export const integrationIconInAccentButtonClass = 'text-primary-700 dark:text-primary-200';

/** Megaphone / marketing header and tab icons on dark backgrounds. */
export const marketingAccentIconClass = integrationIconInAccentButtonClass;
