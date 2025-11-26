
import React, { useEffect } from 'react';

interface CheckboxProps {
    id?: string;
    name?: string;
    checked?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
    labelClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    id,
    name,
    checked,
    onChange,
    disabled,
    label,
    className = '',
    labelClassName = '',
}) => {
    // Inject CSS to style checkboxes with purple theme
    useEffect(() => {
        const styleId = 'checkbox-purple-theme';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                input[type="checkbox"].purple-checkbox {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid #9ca3af;
                    border-radius: 0.25rem;
                    background-color: white;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s;
                }
                input[type="checkbox"].purple-checkbox:checked {
                    background-color: #9333ea;
                    border-color: #9333ea;
                }
                input[type="checkbox"].purple-checkbox:checked::after {
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%) rotate(45deg);
                    width: 4px;
                    height: 8px;
                    border: solid white;
                    border-width: 0 2px 2px 0;
                }
                input[type="checkbox"].purple-checkbox:focus {
                    outline: 2px solid #9333ea;
                    outline-offset: 2px;
                }
                input[type="checkbox"].purple-checkbox:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .dark input[type="checkbox"].purple-checkbox {
                    background-color: #374151;
                    border-color: #4b5563;
                }
                .dark input[type="checkbox"].purple-checkbox:checked {
                    background-color: #9333ea;
                    border-color: #9333ea;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <input
                id={id}
                name={name}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="purple-checkbox"
            />
            {label && (
                <label
                    htmlFor={id}
                    className={`text-sm text-gray-700 dark:text-gray-300 cursor-pointer ${labelClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {label}
                </label>
            )}
        </div>
    );
};

