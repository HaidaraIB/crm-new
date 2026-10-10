import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useAppContext } from '../context/AppContext';
import { resolveInputDir } from '../utils/inputAutoDir';

/** Tailwind classes for a trailing control (password reveal, etc.) inside the same `dir` wrapper as the field. */
export const INPUT_TRAILING_ADORNMENT_PAD = 'pe-10';
export const INPUT_TRAILING_ADORNMENT_BTN =
  'absolute inset-y-0 end-0 z-10 flex items-center pe-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';

export const Input = forwardRef<
  HTMLInputElement,
  {
    id?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    icon?: React.ReactNode;
    defaultValue?: string;
    /** Renders inside the field direction wrapper at inline-end (password reveal, etc.). */
    endAdornment?: React.ReactNode;
    invalid?: boolean;
  } & InputHTMLAttributes<HTMLInputElement>
>(
  (
    {
      id,
      type = 'text',
      placeholder,
      value,
      onChange,
      className = '',
      icon,
      defaultValue,
      dir,
      endAdornment,
      invalid,
      ...rest
    },
    ref,
  ) => {
    const { language } = useAppContext();
    const uiIsRtl = language === 'ar';
    const text = String(value ?? defaultValue ?? '');
    const resolvedDir = dir ?? resolveInputDir(type, text, uiIsRtl);
    const leadingPad = icon ? 'ps-10' : '';
    const trailingPad = endAdornment ? INPUT_TRAILING_ADORNMENT_PAD : '';

    return (
      <div className="relative w-full" dir={resolvedDir}>
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          defaultValue={defaultValue}
          dir={resolvedDir}
          aria-invalid={invalid || rest['aria-invalid'] ? true : undefined}
          className={`h-10 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border ${invalid ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-300 ${leadingPad} ${trailingPad} ${className}`}
          {...rest}
        />
        {icon ? (
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-600 dark:text-gray-400">
            {icon}
          </div>
        ) : null}
        {endAdornment ? (
          <div className="absolute inset-y-0 end-0 flex items-center pe-3">{endAdornment}</div>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export const AutoDirTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ dir, value, defaultValue, ...rest }, ref) => {
  const { language } = useAppContext();
  const text = String(value ?? defaultValue ?? '');
  const resolvedDir = dir ?? resolveInputDir('text', text, language === 'ar');
  return (
    <textarea
      ref={ref}
      dir={resolvedDir}
      value={value}
      defaultValue={defaultValue}
      {...rest}
    />
  );
});
AutoDirTextarea.displayName = 'AutoDirTextarea';

export const AutoDirInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ dir, value, defaultValue, type, className = '', ...rest }, ref) => {
  const { language } = useAppContext();
  const text = String(value ?? defaultValue ?? '');
  const resolvedDir = dir ?? resolveInputDir(type, text, language === 'ar');
  return (
    <div className="relative w-full" dir={resolvedDir}>
      <input
        ref={ref}
        type={type}
        dir={resolvedDir}
        value={value}
        defaultValue={defaultValue}
        className={className}
        {...rest}
      />
    </div>
  );
});
AutoDirInput.displayName = 'AutoDirInput';
