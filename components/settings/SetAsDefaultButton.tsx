import React, { ReactNode } from 'react';

type SetAsDefaultButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
};

/** Text button for "Set as default" — high contrast in light and dark themes. */
export const SetAsDefaultButton = ({ onClick, disabled, children }: SetAsDefaultButtonProps) => (
    <button
        type="button"
        className="text-xs font-semibold text-primary-700 dark:text-primary-200 hover:text-primary-800 dark:hover:text-white hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onClick}
        disabled={disabled}
    >
        {children}
    </button>
);
