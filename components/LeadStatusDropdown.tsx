import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { seedLabel } from '../utils/seedLabels';

export type LeadStatusOption = {
    id: number;
    name: string;
    color?: string;
};

const DEFAULT_STATUS_COLOR = '#94a3b8';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

/** Translucent surface derived from a settings-entity hex color; shared with tag chips. */
export const getStatusSurfaceStyles = (color: string, theme: 'light' | 'dark'): React.CSSProperties => {
    const rgb = hexToRgb(color);
    if (!rgb) {
        return {};
    }
    const bgAlpha = theme === 'light' ? 0.2 : 0.28;
    const borderAlpha = theme === 'light' ? 0.4 : 0.48;
    return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgAlpha})`,
        borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderAlpha})`,
        color: theme === 'light' ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '#ffffff',
    };
};

const sizeClasses = {
    sm: {
        trigger: 'gap-2 px-2.5 py-1.5 text-xs min-w-[7.5rem]',
        dot: 'h-2 w-2',
        chevron: 'w-3.5 h-3.5',
        menuItem: 'px-2.5 py-2 text-xs gap-2',
        menuDot: 'h-2 w-2',
        check: 'w-3.5 h-3.5',
    },
    md: {
        trigger: 'gap-2.5 px-3 py-2 text-sm min-w-[9rem]',
        dot: 'h-2.5 w-2.5',
        chevron: 'w-4 h-4',
        menuItem: 'px-3 py-2.5 text-sm gap-2.5',
        menuDot: 'h-2.5 w-2.5',
        check: 'w-4 h-4',
    },
} as const;

type LeadStatusBadgeProps = {
    name: string;
    color?: string;
    size?: keyof typeof sizeClasses;
    className?: string;
};

/** Read-only status label matching the dropdown trigger style */
export const LeadStatusBadge = ({ name, color, size = 'md', className = '' }: LeadStatusBadgeProps) => {
    const { theme, language } = useAppContext();
    const label = seedLabel(name, language);
    const s = sizeClasses[size];
    const statusColor = color || DEFAULT_STATUS_COLOR;
    const surface = getStatusSurfaceStyles(statusColor, theme);

    return (
        <span
            className={`inline-flex items-center rounded-lg border font-medium shadow-sm ${s.trigger} ${className}`}
            style={surface}
        >
            <span
                className={`${s.dot} shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/20`}
                style={{ backgroundColor: statusColor }}
                aria-hidden
            />
            <span className="truncate">{label}</span>
        </span>
    );
};

type LeadStatusDropdownProps = {
    leadId: number;
    currentStatus: LeadStatusOption | null;
    availableStatuses: LeadStatusOption[];
    onStatusChange: (leadId: number, statusId: number) => void;
    isUpdating?: boolean;
    size?: keyof typeof sizeClasses;
};

export const LeadStatusDropdown = ({
    leadId,
    currentStatus,
    availableStatuses,
    onStatusChange,
    isUpdating = false,
    size = 'md',
}: LeadStatusDropdownProps) => {
    const { theme, t, language } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const s = sizeClasses[size];
    const statusName = currentStatus?.name
        ? seedLabel(currentStatus.name, language)
        : (t('selectStatus') as string) || 'Select status';
    const statusColor = currentStatus?.color || DEFAULT_STATUS_COLOR;
    const surface = currentStatus
        ? getStatusSurfaceStyles(statusColor, theme)
        : theme === 'light'
          ? { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }
          : { backgroundColor: 'rgba(30,41,59,0.6)', borderColor: '#475569', color: '#94a3b8' };

    const placeMenu = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const buttonRect = trigger.getBoundingClientRect();
        const gap = 6;
        const margin = 8;
        const menu = menuRef.current;
        const menuHeight = menu?.offsetHeight || availableStatuses.length * (size === 'sm' ? 36 : 40) + 12;
        const menuWidth = menu?.offsetWidth || Math.max(buttonRect.width, size === 'sm' ? 120 : 144);
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        let top: number;
        if (spaceBelow < menuHeight + gap && spaceAbove > spaceBelow) {
            top = buttonRect.top - menuHeight - gap;
        } else {
            top = buttonRect.bottom + gap;
        }
        top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

        let left = buttonRect.left;
        if (left + menuWidth > window.innerWidth - margin) {
            left = window.innerWidth - menuWidth - margin;
        }
        left = Math.max(margin, left);

        setMenuPosition((prev) => {
            if (prev && prev.top === top && prev.left === left && prev.minWidth === buttonRect.width) {
                return prev;
            }
            return { top, left, minWidth: buttonRect.width };
        });
    }, [availableStatuses.length, size]);

    useLayoutEffect(() => {
        if (!isOpen) {
            setMenuPosition(null);
            return;
        }
        placeMenu();
    }, [isOpen, placeMenu]);

    useEffect(() => {
        if (!isOpen) return;
        const onUpdate = () => placeMenu();
        window.addEventListener('scroll', onUpdate, true);
        window.addEventListener('resize', onUpdate);
        return () => {
            window.removeEventListener('scroll', onUpdate, true);
            window.removeEventListener('resize', onUpdate);
        };
    }, [isOpen, placeMenu]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setIsOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    if (availableStatuses.length === 0) {
        return (
            <LeadStatusBadge
                name={currentStatus?.name || '—'}
                color={currentStatus?.color}
                size={size}
            />
        );
    }

    return (
        <div className="relative inline-flex" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={isUpdating}
                onClick={() => !isUpdating && setIsOpen((open) => !open)}
                className={`group inline-flex w-full items-center justify-between rounded-lg border font-medium shadow-sm outline-none transition-all ${s.trigger} ${
                    isUpdating
                        ? 'cursor-wait opacity-60'
                        : 'cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110'
                } focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
                    isOpen ? 'ring-2 ring-primary/25' : ''
                }`}
                style={surface}
            >
                <span className={`flex min-w-0 flex-1 items-center ${size === 'sm' ? 'gap-2' : 'gap-2.5'}`}>
                    <span
                        className={`${s.dot} shrink-0 rounded-full ring-2 ring-white dark:ring-gray-800`}
                        style={{ backgroundColor: statusColor }}
                        aria-hidden
                    />
                    <span className="truncate text-start">{statusName}</span>
                </span>
                <ChevronDownIcon
                    className={`${s.chevron} shrink-0 opacity-70 transition-transform duration-200 group-hover:opacity-100 ${
                        isOpen ? 'rotate-180 opacity-100' : ''
                    }`}
                    aria-hidden
                />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    role="listbox"
                    aria-label={statusName}
                    className="fixed z-[9999] overflow-hidden rounded-xl border border-gray-200/90 bg-white py-1.5 shadow-xl ring-1 ring-black/5 dark:border-gray-600/80 dark:bg-gray-800 dark:ring-white/10"
                    style={{
                        top: menuPosition ? `${menuPosition.top}px` : 0,
                        left: menuPosition ? `${menuPosition.left}px` : 0,
                        visibility: menuPosition ? 'visible' : 'hidden',
                        minWidth: `${Math.max(menuPosition?.minWidth ?? triggerRef.current?.offsetWidth ?? 0, size === 'sm' ? 120 : 144)}px`,
                        width: 'max-content',
                        maxWidth: 'min(100vw - 16px, 320px)',
                    }}
                >
                    {availableStatuses.map((status) => {
                        const isSelected = status.id === currentStatus.id;
                        const optionColor = status.color || DEFAULT_STATUS_COLOR;

                        return (
                            <button
                                key={status.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    if (!isSelected) {
                                        onStatusChange(leadId, status.id);
                                    }
                                    setIsOpen(false);
                                }}
                                className={`relative flex w-full items-center justify-between font-medium transition-colors ${s.menuItem} ${
                                    isSelected
                                        ? ''
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50'
                                }`}
                                style={
                                    isSelected
                                        ? getStatusSurfaceStyles(optionColor, theme)
                                        : undefined
                                }
                            >
                                <span className={`flex min-w-0 flex-1 items-center ${size === 'sm' ? 'gap-2' : 'gap-2.5'}`}>
                                    <span
                                        className={`${s.menuDot} shrink-0 rounded-full ring-2 ring-white dark:ring-gray-800`}
                                        style={{ backgroundColor: optionColor }}
                                        aria-hidden
                                    />
                                    <span className="truncate">{seedLabel(status.name, language)}</span>
                                </span>
                                {isSelected && (
                                    <CheckIcon
                                        className={`${s.check} shrink-0 opacity-90`}
                                        aria-hidden
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
};
