import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useLead, useLeads } from '../../hooks/useQueries';
import { ChevronDownIcon, CheckIcon, SearchIcon } from '../icons';
import { Loader } from '../Loader';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 30;

type LeadSearchSelectProps = {
    id?: string;
    /** Selected lead id, or 0/undefined when nothing is selected */
    value: number;
    onChange: (leadId: number) => void;
    disabled?: boolean;
    placeholder?: string;
    hasError?: boolean;
};

/**
 * Searchable single-select for picking a lead/client (e.g. on the deal form).
 * Replaces a plain <select> â€” which only ever showed the first page of leads
 * and had no way to search â€” with a combobox that searches leads server-side
 * as the user types, mirroring TagMultiSelect's interaction pattern.
 */
export const LeadSearchSelect = ({
    id,
    value,
    onChange,
    disabled = false,
    placeholder,
    hasError = false,
}: LeadSearchSelectProps) => {
    const { t, language } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setDebouncedQuery('');
            return;
        }
        searchRef.current?.focus();
        const onMouseDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onEscape);
        };
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: leadsResponse, isFetching } = useLeads(
        { search: debouncedQuery || undefined },
        1,
        { enabled: isOpen },
        SEARCH_PAGE_SIZE,
    );
    const options = leadsResponse?.results || [];

    // Resolve the selected lead's name independently of the search results,
    // since the currently selected lead may not appear on the first search page.
    const { data: selectedLead } = useLead(value > 0 ? value : null);
    const selectedName = selectedLead?.name || options.find((l: any) => l.id === value)?.name || '';

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen((open) => !open);
    };

    const select = (leadId: number) => {
        onChange(leadId);
        setIsOpen(false);
    };

    const borderClass = hasError
        ? 'border-red-500 dark:border-red-500'
        : isOpen
          ? 'border-primary/60 ring-2 ring-primary/20'
          : 'border-gray-300 dark:border-gray-600';

    return (
        <div className="relative" ref={rootRef}>
            <button
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={toggleOpen}
                className={`flex w-full items-center justify-between gap-2 rounded-md border bg-gray-50 dark:bg-gray-700 px-3 py-2 text-start text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
            >
                <span className={`truncate ${selectedName ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {selectedName || placeholder || t('selectLead')}
                </span>
                <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                />
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 dark:ring-white/10"
                >
                    <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute inset-y-0 start-2 my-auto h-3.5 w-3.5 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('search') as string}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pe-2 ps-7 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                    <div className="custom-scrollbar max-h-56 overflow-y-auto p-1">
                        {isFetching ? (
                            <div className="flex justify-center py-4">
                                <Loader size="md" variant="primary" />
                            </div>
                        ) : options.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                {t('noLeadsFound')}
                            </p>
                        ) : (
                            options.map((lead: any) => {
                                const checked = lead.id === value;
                                return (
                                    <button
                                        key={lead.id}
                                        type="button"
                                        role="option"
                                        aria-selected={checked}
                                        onClick={() => select(lead.id)}
                                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
                                            checked
                                                ? 'bg-primary/10 font-medium text-gray-900 dark:bg-primary/20 dark:text-gray-50'
                                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60'
                                        }`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">{lead.name}</span>
                                        {checked && <CheckIcon className="h-4 w-4 shrink-0 text-primary" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadSearchSelect;
