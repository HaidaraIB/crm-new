

import React, { ReactNode, InputHTMLAttributes, forwardRef } from 'react';
import { useAppContext } from '../context/AppContext';

// FIX: Added `defaultValue` prop to support uncontrolled inputs.
// FIX: Allow any native input attributes.
// FIX: Added forwardRef to support ref forwarding
export const Input = forwardRef<HTMLInputElement, {
    id?: string; 
    type?: string; 
    placeholder?: string; 
    value?: string; 
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    className?: string; 
    icon?: ReactNode; 
    defaultValue?: string;
} & InputHTMLAttributes<HTMLInputElement>>(({ id, type = 'text', placeholder, value, onChange, className = '', icon, defaultValue, ...rest }, ref) => {
    const { language } = useAppContext();
    const paddingClass = icon ? (language === 'ar' ? 'pe-10' : 'ps-10') : '';
    const iconPosition = language === 'ar' ? 'end-0 pe-3' : 'start-0 ps-3';
    
    return (
        <div className="relative">
            <input
                ref={ref}
                id={id}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                defaultValue={defaultValue}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${paddingClass} ${className}`}
                {...rest}
            />
            {icon && <div className={`absolute inset-y-0 ${iconPosition} flex items-center text-gray-600 dark:text-gray-400`}>{icon}</div>}
        </div>
    );
});
Input.displayName = 'Input';