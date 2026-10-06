import React from 'react';
import { Button } from '../../Button';
import { useAppContext } from '../../../context/AppContext';

/** Read-only value with a copy button. Confirmation is a toast, not a modal. */
export const CopyField: React.FC<{
  label: string;
  hint?: string;
  value: string;
  disabled?: boolean;
}> = ({ label, hint, value, disabled }) => {
  const { t, showToast } = useAppContext();
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {hint ? <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          dir="ltr"
          className="flex-1 min-w-0 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono"
        />
        <Button
          variant="secondary"
          disabled={disabled || !value}
          onClick={() => {
            if (!value) return;
            void navigator.clipboard.writeText(value);
            showToast(t('copied'), { variant: 'success' });
          }}
        >
          {t('copy')}
        </Button>
      </div>
    </div>
  );
};
