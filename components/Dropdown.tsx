import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../context/AppContext';

// FIX: Made children optional to fix missing children prop error.
type DropdownProps = {
    trigger: ReactNode;
    children?: ReactNode;
    /** Panel min width (e.g. w-56) for longer menu labels */
    panelClassName?: string;
    /**
     * Render the menu into document.body with fixed positioning so it is not clipped
     * beneath sibling cards (stacking contexts from backdrop-blur etc.).
     */
    usePortal?: boolean;
};

const VIEWPORT_MARGIN = 8;

export const Dropdown = ({ trigger, children, panelClassName, usePortal = false }: DropdownProps) => {
    const { language } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [portalPos, setPortalPos] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const portalPanelRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const updatePortalPosition = useCallback(() => {
        const el = dropdownRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const inferredWidth = portalPanelRef.current?.offsetWidth ?? 192;
        const width = Math.max(inferredWidth, 192);
        const rtl = language === 'ar';

        let left = rtl ? rect.left : rect.right - width;
        left = Math.min(left, window.innerWidth - VIEWPORT_MARGIN - width);
        left = Math.max(VIEWPORT_MARGIN, left);

        const top = rect.bottom + 8;

        setPortalPos({ top, left });
    }, [language]);

    useLayoutEffect(() => {
        if (!isOpen || !usePortal) return;
        updatePortalPosition();
        const id = window.requestAnimationFrame(() => updatePortalPosition());
        return () => window.cancelAnimationFrame(id);
    }, [isOpen, usePortal, updatePortalPosition]);

    useEffect(() => {
        if (!isOpen || !usePortal) return;
        const onUpdate = () => updatePortalPosition();
        window.addEventListener('scroll', onUpdate, true);
        window.addEventListener('resize', onUpdate);
        return () => {
            window.removeEventListener('scroll', onUpdate, true);
            window.removeEventListener('resize', onUpdate);
        };
    }, [isOpen, usePortal, updatePortalPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const t = event.target as Node;
            if (dropdownRef.current?.contains(t)) return;
            if (usePortal && portalPanelRef.current?.contains(t)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [usePortal]);

    const panelInner = (
        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {children}
        </div>
    );

    const sharedSurface = 'rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5';

    let menuPanel: ReactNode;
    if (usePortal) {
        menuPanel = (
            <div
                ref={portalPanelRef}
                className={`fixed ${sharedSurface} z-[10000] min-w-[12rem] focus:outline-none ${panelClassName ?? 'w-48'}`}
                style={{ top: portalPos.top, left: portalPos.left }}
                onClick={() => setIsOpen(false)}
            >
                {panelInner}
            </div>
        );
    } else {
        menuPanel = (
            <div
                className={`origin-top-right rtl:origin-top-left absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 min-w-[12rem] ${sharedSurface} focus:outline-none z-20 ${panelClassName ?? 'w-48'}`}
                onClick={() => setIsOpen(false)}
            >
                {panelInner}
            </div>
        );
    }

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={toggleDropdown}>
                {trigger}
            </div>
            {isOpen &&
                (usePortal && typeof document !== 'undefined'
                    ? createPortal(menuPanel, document.body)
                    : !usePortal && menuPanel)}
        </div>
    );
};

// FIX: Made children optional to fix missing children prop error.
type DropdownItemProps = {
    children?: ReactNode;
    onClick: () => void;
};

export const DropdownItem = ({ children, onClick }: DropdownItemProps) => {
    const { language } = useAppContext();
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className={`block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left rtl:text-right`}
            role="menuitem"
        >
            {children}
        </a>
    );
};