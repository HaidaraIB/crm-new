import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useUsers } from '../../hooks/useQueries';
import { getUserDisplayName, User } from '../../types';
import { usersForOperationalEmployeeLists } from '../../utils/roles';

export const AssigneeFilter = () => {
  const { t, leadFilters, setLeadFilters, currentUser, language } = useAppContext();
  const { data: usersResponse } = useUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const usersArray = useMemo(() => {
    const baseUsers = Array.isArray(usersResponse)
      ? usersResponse
      : usersResponse?.results || [];
    return usersForOperationalEmployeeLists(baseUsers as User[], currentUser ?? null);
  }, [usersResponse, currentUser]);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return usersArray;
    return usersArray.filter((user) => {
      const label = getUserDisplayName(user).toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return label.includes(q) || username.includes(q) || email.includes(q);
    });
  }, [usersArray, query]);

  const currentValue = leadFilters.assignedTo || 'All';
  const selectedUser =
    currentValue !== 'All' && currentValue !== 'Unassigned'
      ? usersArray.find((u) => u.id === Number(currentValue))
      : undefined;

  const label =
    currentValue === 'All'
      ? t('allEmployees')
      : currentValue === 'Unassigned'
        ? t('unassigned')
        : selectedUser
          ? getUserDisplayName(selectedUser)
          : t('assignedTo');

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const applyFilter = (value: string) => {
    setLeadFilters((prev) => ({ ...prev, assignedTo: value }));
    setIsOpen(false);
  };

  const isActive = currentValue !== 'All';

  const optionClass = (selected: boolean) =>
    `w-full text-start px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
      selected
        ? 'font-semibold bg-primary/10 text-primary-700 dark:bg-primary/25 dark:text-primary-200'
        : 'text-gray-800 dark:text-gray-200'
    }`;

  return (
    <div className="relative w-full sm:w-[270px]" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
          isActive
            ? 'border-primary/70 text-gray-900 dark:text-white bg-primary/20 dark:bg-primary/35'
            : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800'
        }`}
      >
        <span className="truncate">
          {t('assignedTo')}: {label}
        </span>
        <span className="text-xs opacity-80" aria-hidden>
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-30 mt-2 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
          role="listbox"
          aria-label={t('assignedTo')}
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
            <button
              type="button"
              role="option"
              aria-selected={currentValue === 'All'}
              onClick={() => applyFilter('All')}
              className={optionClass(currentValue === 'All')}
            >
              {t('allEmployees')}
            </button>
            <button
              type="button"
              role="option"
              aria-selected={currentValue === 'Unassigned'}
              onClick={() => applyFilter('Unassigned')}
              className={optionClass(currentValue === 'Unassigned')}
            >
              {t('unassigned')}
            </button>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            {visibleUsers.map((user) => {
              const value = user.id.toString();
              const selected = currentValue === value;
              return (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => applyFilter(value)}
                  className={optionClass(selected)}
                >
                  {getUserDisplayName(user)}
                </button>
              );
            })}
            {visibleUsers.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t('noResultsFound')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
