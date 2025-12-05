import React from 'react';

type ToggleSwitchProps = {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
};

export const ToggleSwitch = ({ enabled, setEnabled }: ToggleSwitchProps) => {
    return (
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`${
                enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                aria-hidden="true"
                className={`${
                    enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};
