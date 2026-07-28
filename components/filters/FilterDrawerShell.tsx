import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { Button } from '../Button';

export type FilterDrawerShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onReset: () => void;
  onApply: () => void;
  children: React.ReactNode;
  /** Called when the drawer opens (e.g. sync draft from committed filters). */
  onOpen?: () => void;
};

/**
 * Shared slide-over shell for entity filter drawers.
 * Close without Apply discards drafts (caller resets local state via onClose/onOpen sync).
 */
export const FilterDrawerShell = ({
  isOpen,
  onClose,
  title,
  onReset,
  onApply,
  children,
  onOpen,
}: FilterDrawerShellProps) => {
  const { t } = useAppContext();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      onOpen?.();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, onOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-xs flex-col bg-card dark:bg-dark-card border-s dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 h-16">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" className="p-1" onClick={onClose} aria-label={t('close')}>
            <XIcon className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          {children}
        </div>
        <div className="p-4 border-t dark:border-gray-800 flex gap-2">
          <Button variant="secondary" className="w-full" onClick={onReset}>
            {t('reset')}
          </Button>
          <Button className="w-full" onClick={onApply}>
            {t('applyFilters')}
          </Button>
        </div>
      </aside>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
    </>
  );
};
