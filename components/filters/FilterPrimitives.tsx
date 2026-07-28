import React from 'react';
import { useAppContext } from '../../context/AppContext';

export const FilterSection = ({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) => (
  <details className="group" open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium text-gray-900 dark:text-white">
      {title}
      <span className="transition group-open:rotate-180">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </span>
    </summary>
    <div className="py-2 text-gray-500 dark:text-gray-400">{children}</div>
  </details>
);

export const FilterLabel = ({
  children,
  htmlFor,
}: {
  children?: React.ReactNode;
  htmlFor: string;
}) => (
  <label
    htmlFor={htmlFor}
    className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
  >
    {children}
  </label>
);

const fieldClassName =
  'w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100';

export const FilterSelect = ({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: React.ReactNode;
}) => {
  const { language } = useAppContext();
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={fieldClassName}
    >
      {children}
    </select>
  );
};

export const FilterInput = ({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { language } = useAppContext();
  return (
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={fieldClassName}
    />
  );
};
