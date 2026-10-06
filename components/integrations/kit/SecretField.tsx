import React, { useState } from 'react';
import { Input } from '../../Input';
import { EyeIcon, EyeOffIcon } from '../../icons';
import { useAppContext } from '../../../context/AppContext';

/** Password field with a reveal toggle. `masked` is the stored value hint (never the secret). */
export const SecretField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  masked?: string | null;
  autoComplete?: string;
}> = ({ id, label, value, onChange, placeholder, error, hint, masked, autoComplete = 'new-password' }) => {
  const { t } = useAppContext();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {masked ? <span className="text-xs text-gray-500 ms-2">({masked})</span> : null}
      </label>
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-form-type="other"
        data-lpignore="true"
        className={error ? 'border-red-500 dark:border-red-500' : ''}
        endAdornment={
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setVisible((v) => !v)}
            title={visible ? t('hide') : t('show')}
            aria-label={visible ? t('hide') : t('show')}
          >
            {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        }
      />
      {error ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
};
