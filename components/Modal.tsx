

import React, { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';

// FIX: Made children optional to fix missing children prop error.
type ModalProps = { isOpen: boolean, onClose: () => void, title: string | ReactNode, children?: ReactNode, maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' };
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) => {
  const { language } = useAppContext();
  if (!isOpen) return null;
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className={`bg-card dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidthClass} m-auto max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="p-3 sm:p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0 bg-card dark:bg-gray-800">
          <h3 className={`text-lg sm:text-xl font-semibold text-primary ${language === 'ar' ? 'pr-2' : 'pl-2'}`}>{title}</h3>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary text-2xl sm:text-3xl leading-none flex-shrink-0">&times;</button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};