

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';

// FIX: Made children optional to fix missing children prop error.
type DropdownProps = {
    trigger: ReactNode;
    children?: ReactNode;
};

export const Dropdown = ({ trigger, children }: DropdownProps) => {
    const { language } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={toggleDropdown}>
                {trigger}
            </div>
            {isOpen && (
                <div 
                    className={`origin-top-right rtl:origin-top-left absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-20`}
                    onClick={() => setIsOpen(false)}
                >
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {children}
                    </div>
                </div>
            )}
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