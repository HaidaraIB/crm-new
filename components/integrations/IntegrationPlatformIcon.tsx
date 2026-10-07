import React from 'react';
import { CodeBracketsIcon, InstagramIcon } from '../icons';
import type { Page } from '../../types';

// `meta_inbox` is a separate platform from `meta`, not a variant of it: different
// Meta app, different credentials, its own account row. Instagram is the icon
// because it is the channel that distinguishes it from Lead Ads at a glance.
export type IntegrationPlatform =
    | 'meta'
    | 'meta_inbox'
    | 'tiktok'
    | 'whatsapp'
    | 'sms'
    | 'ai'
    | 'mujeb'
    | 'lead_api';

type BrandLogo = {
    src: string;
    /** Optical zoom for assets with excess inner padding. */
    scale?: string;
    /** Black monochrome marks — invert in dark mode so they stay visible. */
    mono?: boolean;
};

/** Brand image under /public — preferred over stroke SVG when present. */
const PLATFORM_LOGOS: Partial<Record<IntegrationPlatform, BrandLogo>> = {
    meta: { src: '/meta_logo_icon.png' },
    tiktok: { src: '/tiktok_logo_icon.webp', scale: 'scale-150' },
    whatsapp: { src: '/whatsapp_logo_icon.webp' },
    sms: { src: '/sms_logo_icon.png', mono: true },
    ai: { src: '/chatgpt_logo_icon.png', mono: true },
    mujeb: { src: '/mujeb_logo_icon.png', scale: 'scale-150' },
};

const PLATFORM_ICONS: Partial<Record<IntegrationPlatform, React.FC<React.SVGProps<SVGSVGElement>>>> = {
    meta_inbox: InstagramIcon,
    lead_api: CodeBracketsIcon,
};

/** Icon foreground — readable on dark UI backgrounds (SVG platforms only). */
const ICON_FG: Partial<Record<IntegrationPlatform, string>> = {
    meta_inbox: 'text-[#C13584] dark:text-[#F09AD3]',
    lead_api: 'text-primary-700 dark:text-primary-200',
};

const BADGE_SHELL: Partial<Record<IntegrationPlatform, string>> = {
    meta_inbox: 'bg-[#C13584]/12 dark:bg-[#C13584]/22 ring-[#C13584]/30 dark:ring-[#C13584]/45',
    lead_api: 'bg-primary/12 dark:bg-primary/25 ring-primary/25 dark:ring-primary/40',
};

const SIZE_CLASSES = {
    xs: { shell: 'w-5 h-5 rounded-md', icon: 'w-5 h-5' },
    sm: { shell: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
    md: { shell: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6' },
    lg: { shell: 'w-14 h-14 rounded-xl', icon: 'w-10 h-10' },
    xl: { shell: 'w-20 h-20 rounded-2xl', icon: 'w-10 h-10' },
} as const;

const PAGE_TO_PLATFORM: Partial<Record<Page, IntegrationPlatform>> = {
    Meta: 'meta',
    TikTok: 'tiktok',
    WhatsApp: 'whatsapp',
    Twilio: 'sms',
    AI: 'ai',
    'Lead API': 'lead_api',
    Mujeb: 'mujeb',
};

export const integrationPlatformFromPage = (page: Page): IntegrationPlatform | null =>
    PAGE_TO_PLATFORM[page] ?? null;

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
    const logo = PLATFORM_LOGOS[platform];
    const { shell, icon } = SIZE_CLASSES[size];

    if (logo) {
        const imgClass = `object-contain ${logo.scale ?? ''} ${logo.mono ? 'dark:invert' : ''}`.trim();
        if (variant === 'inline') {
            return (
                <span
                    className={`inline-flex items-center justify-center overflow-hidden ${icon} ${className}`.trim()}
                    aria-hidden
                >
                    <img src={logo.src} alt="" className={`w-full h-full ${imgClass}`} />
                </span>
            );
        }
        // Brand mark already includes its own plate — skip tinted SVG badge shell.
        return (
            <span
                className={`flex-shrink-0 flex items-center justify-center overflow-hidden ${shell} ${className}`.trim()}
                aria-hidden
            >
                <img src={logo.src} alt="" className={`w-full h-full ${imgClass}`} />
            </span>
        );
    }

    const Icon = PLATFORM_ICONS[platform];
    if (!Icon) return null;

    const fg = ICON_FG[platform] ?? '';

    if (variant === 'inline') {
        return <Icon className={`${icon} ${fg} ${className}`.trim()} aria-hidden />;
    }

    const shellTone =
        variant === 'muted'
            ? 'bg-gray-100 dark:bg-gray-700/60 ring-gray-200/80 dark:ring-gray-600/80'
            : BADGE_SHELL[platform] ?? '';

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
