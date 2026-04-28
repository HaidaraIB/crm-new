import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useUsers } from '../../hooks/useQueries';
import { getUserDisplayName, User } from '../../types';

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
      : (usersResponse?.results || []);
    const options = [...baseUsers];
    if (currentUser && !options.some((u: User) => u.id === currentUser.id)) {
      options.unshift(currentUser);
    }
    return options as User[];
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

  const label = currentValue === 'All'
    ? (t('allEmployees' as any) || 'All employees')
    : currentValue === 'Unassigned'
      ? (t('unassigned' as any) || 'Unassigned')
      : (selectedUser ? getUserDisplayName(selectedUser) : (t('assignedTo' as any) || 'Assigned To'));

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

  return (
    <div className="relative w-full sm:w-[270px]" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
          isActive
            ? 'border-primary/70 text-gray-900 dark:text-white bg-primary/20 dark:bg-primary/35'
            : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800'
        }`}
      >
        <span className="truncate">
          {t('assignedTo' as any) || 'Assigned To'}: {label}
        </span>
        <span className="text-xs opacity-80">▾</span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search' as any) || 'Search'}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => applyFilter('All')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${currentValue === 'All' ? 'font-semibold text-primary' : 'text-gray-800 dark:text-gray-200'}`}
            >
              {currentValue === 'All' ? '✓ ' : ''}{t('allEmployees' as any) || 'All employees'}
            </button>
            <button
              type="button"
              onClick={() => applyFilter('Unassigned')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${currentValue === 'Unassigned' ? 'font-semibold text-primary' : 'text-gray-800 dark:text-gray-200'}`}
            >
              {currentValue === 'Unassigned' ? '✓ ' : ''}{t('unassigned' as any) || 'Unassigned'}
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            {visibleUsers.map((user) => {
              const value = user.id.toString();
              const selected = currentValue === value;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => applyFilter(value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${selected ? 'font-semibold text-primary' : 'text-gray-800 dark:text-gray-200'}`}
                >
                  {selected ? '✓ ' : ''}{getUserDisplayName(user)}
                </button>
              );
            })}
            {visibleUsers.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t('noResultsFound' as any) || 'No results found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
