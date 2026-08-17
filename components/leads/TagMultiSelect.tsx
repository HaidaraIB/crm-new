import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getStatusSurfaceStyles } from '../LeadStatusDropdown';
import { ChevronDownIcon, PlusIcon, CheckIcon, XIcon, SearchIcon } from '../icons';
import type { Tag } from '../../types';

const DEFAULT_TAG_COLOR = '#94a3b8';
const SEARCH_THRESHOLD = 6;

type TagMultiSelectProps = {
    id?: string;
    tags: Tag[];
    /** Selected tag ids */
    value: number[];
    onChange: (next: number[]) => void;
    disabled?: boolean;
    placeholder?: string;
};

/**
 * Tag picker built as a chip field rather than a select box: selected tags read
 * as removable chips, and an "add" pill opens the list. Used by the lead
 * create/edit forms, the inline editor on the lead page, and the leads filter
 * drawer (where selection is OR / match-any).
 */
export const TagMultiSelect = ({
    id,
    tags,
    value,
    onChange,
    disabled = false,
    placeholder,
}: TagMultiSelectProps) => {
    const { t, theme, language } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
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

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return tags;
        return tags.filter((tag) => tag.name.toLowerCase().includes(q));
    }, [tags, query]);

    const selectedTags = useMemo(
        () => tags.filter((tag) => value.includes(tag.id)),
        [tags, value],
    );

    const toggle = (tagId: number) => {
        onChange(value.includes(tagId) ? value.filter((v) => v !== tagId) : [...value, tagId]);
    };

    const remove = (tagId: number) => onChange(value.filter((v) => v !== tagId));

    const showSearch = tags.length > SEARCH_THRESHOLD;
    const allSelected = selectedTags.length === tags.length && tags.length > 0;

    return (
        <div className="relative" ref={rootRef}>
            <div
                className={`flex min-h-[2.75rem] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 transition-colors dark:bg-gray-800/60 ${
                    disabled
                        ? 'cursor-not-allowed border-gray-200 opacity-60 dark:border-gray-700'
                        : isOpen
                          ? 'border-primary/60 ring-2 ring-primary/20'
                          : 'border-gray-300 hover:border-primary/40 dark:border-gray-600 dark:hover:border-primary/40'
                }`}
            >
                {selectedTags.map((tag) => {
                    const color = tag.color || DEFAULT_TAG_COLOR;
                    return (
                        <span
                            key={tag.id}
                            className="group inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border py-1 ps-2 pe-1 text-xs font-medium"
                            style={getStatusSurfaceStyles(color, theme)}
                        >
                            <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                                aria-hidden
                            />
                            <span className="truncate">{tag.name}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => remove(tag.id)}
                                    aria-label={`${t('delete')} ${tag.name}`}
                                    className="shrink-0 rounded-full p-0.5 opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/15"
                                >
                                    <XIcon className="h-3 w-3" />
                                </button>
                            )}
                        </span>
                    );
                })}

                {!allSelected && (
                    <button
                        id={id}
                        type="button"
                        disabled={disabled}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        onClick={() => !disabled && setIsOpen((open) => !open)}
                        className={`inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium transition-colors ${
                            disabled
                                ? 'cursor-not-allowed border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500'
                                : 'border-gray-300 text-gray-500 hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-gray-500 dark:text-gray-400 dark:hover:text-primary-300'
                        }`}
                    >
                        <PlusIcon className="h-3 w-3 shrink-0" />
                        {selectedTags.length === 0
                            ? placeholder || (t('addTags') as string)
                            : t('add')}
                        <ChevronDownIcon
                            className={`h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden
                        />
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    role="listbox"
                    aria-multiselectable
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 dark:ring-white/10"
                >
                    {showSearch && (
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
                    )}
                    <div className="custom-scrollbar max-h-56 overflow-y-auto p-1">
                        {visible.map((tag) => {
                            const color = tag.color || DEFAULT_TAG_COLOR;
                            const checked = value.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    role="option"
                                    aria-selected={checked}
                                    onClick={() => toggle(tag.id)}
                                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
                                        checked
                                            ? 'bg-primary/10 font-medium text-gray-900 dark:bg-primary/20 dark:text-gray-50'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60'
                                    }`}
                                >
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-800"
                                        style={{ backgroundColor: color }}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                                    {checked && (
                                        <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                                    )}
                                </button>
                            );
                        })}
                        {visible.length === 0 && (
                            <p className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                                {t('noTagsFound')}
                            </p>
                        )}
                    </div>
                    {selectedTags.length > 0 && (
                        <div className="border-t border-gray-100 px-2 py-1.5 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="w-full rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
                            >
                                {t('clearAll')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagMultiSelect;
