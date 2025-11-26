import React from 'react';
import { useAppContext } from '../context/AppContext';

interface NumberInputProps {
    id?: string;
    name?: string;
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    required?: boolean;
    disabled?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
    id,
    name,
    value,
    onChange,
    placeholder,
    min,
    max,
    step = 1,
    className = '',
    required,
    disabled,
}) => {
    const { language } = useAppContext();
    const isRTL = language === 'ar';

    const roundToStep = (num: number, step: number): number => {
        const stepDecimals = step.toString().split('.')[1]?.length || 0;
        return (
            Math.round((num / step) * Math.pow(10, stepDecimals)) /
            Math.pow(10, stepDecimals) *
            step
        );
    };

    const handleIncrement = () => {
        if (disabled) return;
        const currentValue = Number(value) || 0;
        let newValue = currentValue + step;

        newValue = roundToStep(newValue, step);
        if (max !== undefined) newValue = Math.min(newValue, max);
        newValue = roundToStep(newValue, step);

        if (onChange) {
            const stepDecimals = step.toString().split('.')[1]?.length || 0;
            const formattedValue = newValue.toFixed(stepDecimals);
            const syntheticEvent = {
                target: {
                    value: formattedValue,
                    id: id || '',
                    name: name || '',
                    type: 'number',
                } as HTMLInputElement,
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
    };

    const handleDecrement = () => {
        if (disabled) return;
        const currentValue = Number(value) || 0;
        let newValue = currentValue - step;

        newValue = roundToStep(newValue, step);
        if (min !== undefined) newValue = Math.max(newValue, min);
        newValue = roundToStep(newValue, step);

        if (onChange) {
            const stepDecimals = step.toString().split('.')[1]?.length || 0;
            const formattedValue = newValue.toFixed(stepDecimals);
            const syntheticEvent = {
                target: {
                    value: formattedValue,
                    id: id || '',
                    name: name || '',
                    type: 'number',
                } as HTMLInputElement,
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        // السماح فقط بالأرقام والنقطة والعلامة السالبة
        if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
            if (onChange) {
                onChange(e);
            }
        }
    };

    return (
        <div className={`relative flex items-center ${className}`}>
            <input
                id={id}
                name={name}
                type="text"
                inputMode="numeric"
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={`
                    w-full px-3 py-2
                    ${isRTL ? 'pl-14' : 'pr-14'}
                    bg-gray-50 dark:bg-gray-800
                    border border-gray-300 dark:border-gray-700
                    rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500
                    text-gray-900 dark:text-gray-100 
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
                `}
                onWheel={(e) => e.currentTarget.blur()}
            />

            <div
                className={`
                    absolute inset-y-0
                    ${isRTL ? 'left-0' : 'right-0'}
                    flex flex-col 
                    ${isRTL ? 'rounded-l-md' : 'rounded-r-md'}
                    overflow-hidden
                    z-10
                `}
            >
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || (max !== undefined && Number(value) >= max)}
                    className={`
                        flex-1 w-10 bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                        disabled:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors flex items-center justify-center
                        ${isRTL ? 'rounded-tl-md' : 'rounded-tr-md'}
                    `}
                    aria-label="Increment"
                >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                    </svg>
                </button>

                <div className="h-px bg-white/20"></div>

                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || (min !== undefined && Number(value) <= min)}
                    className={`
                        flex-1 w-10 bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                        disabled:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors flex items-center justify-center
                        ${isRTL ? 'rounded-bl-md' : 'rounded-br-md'}
                    `}
                    aria-label="Decrement"
                >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
