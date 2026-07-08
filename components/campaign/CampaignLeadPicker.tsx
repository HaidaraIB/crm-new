import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { useChannels, useStatuses, useUsers } from '../../hooks/useQueries';
import { getLeadsAPI } from '../../services/api';
import type { LeadApiFilters } from '../../types';
import { getUserDisplayName, User } from '../../types';
import { usersForOperationalEmployeeLists } from '../../utils/roles';
import { leadHasPhone, resolveLeadPhoneRaw } from '../../utils/smsSendHelpers';
import { Button, Loader } from '../index';
import { SearchIcon } from '../icons';

const LEAD_TYPES = ['fresh', 'hot', 'cold'] as const;
const PRIORITIES = ['high', 'medium', 'low'] as const;
type DatePreset = 'today' | 'last7' | 'last30' | 'thisMonth';

export interface CampaignLeadFilters {
    statuses: string[];
    types: string[];
    priorities: string[];
    assignees: string[];
    channels: string[];
    assignedToMe: boolean;
    createdAtFrom: string;
    createdAtTo: string;
    withPhoneOnly: boolean;
}

const EMPTY_FILTERS: CampaignLeadFilters = {
    statuses: [],
    types: [],
    priorities: [],
    assignees: [],
    channels: [],
    assignedToMe: false,
    createdAtFrom: '',
    createdAtTo: '',
    withPhoneOnly: true,
};

type FilterOption = { value: string; label: string; colorDot?: string };

function getStatusTranslationKey(status: string): string {
    const statusMap: Record<string, string> = {
        Untouched: 'untouched',
        Touched: 'touched',
        Following: 'following',
        Meeting: 'meeting',
        'No Answer': 'noAnswer',
        'Out Of Service': 'outOfService',
    };
    return statusMap[status] || status.replace(/\s+/g, '').replace(/^./, (c) => c.toLowerCase());
}

function formatLeadType(type: string, t: (key: string) => string): string {
    const value = type.toLowerCase();
    if (value === 'fresh') return t('fresh');
    if (value === 'hot') return t('hot');
    if (value === 'cold') return t('cold');
    return type;
}

function formatLeadPriority(priority: string, t: (key: string) => string): string {
    const value = priority.toLowerCase();
    if (value === 'high') return t('high');
    if (value === 'medium') return t('medium');
    if (value === 'low') return t('low');
    return priority;
}

function formatLeadStatus(status: string, t: (key: string) => string): string {
    return t(getStatusTranslationKey(status) as any) || status;
}

function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function datePresetRange(preset: DatePreset): { from: string; to: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = toIsoDate(today);
    if (preset === 'today') return { from: to, to };
    if (preset === 'last7') {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return { from: toIsoDate(from), to };
    }
    if (preset === 'last30') {
        const from = new Date(today);
        from.setDate(from.getDate() - 29);
        return { from: toIsoDate(from), to };
    }
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIsoDate(from), to };
}

function formatShortDate(iso: string, language: string): string {
    if (!iso) return '';
    try {
        return new Date(iso + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return iso;
    }
}

function filtersToApi(filters: CampaignLeadFilters): LeadApiFilters {
    return {
        search: undefined,
        status: filters.statuses.length ? filters.statuses : undefined,
        type: filters.types.length ? filters.types : undefined,
        priority: filters.priorities.length ? filters.priorities : undefined,
        assignedToMe: filters.assignedToMe || undefined,
        assignedTo: !filters.assignedToMe && filters.assignees.length ? filters.assignees : undefined,
        communicationWay: filters.channels.length ? filters.channels : undefined,
        createdAtFrom: filters.createdAtFrom || undefined,
        createdAtTo: filters.createdAtTo || undefined,
    };
}

function hasActiveFilters(filters: CampaignLeadFilters, searchApplied: string): boolean {
    return (
        searchApplied.trim().length > 0 ||
        filters.statuses.length > 0 ||
        filters.types.length > 0 ||
        filters.priorities.length > 0 ||
        filters.assignees.length > 0 ||
        filters.channels.length > 0 ||
        filters.assignedToMe ||
        !!filters.createdAtFrom ||
        !!filters.createdAtTo ||
        !filters.withPhoneOnly
    );
}

const dropdownBtnBase =
    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function dropdownBtnClass(active: boolean, open: boolean): string {
    if (open || active) {
        return `${dropdownBtnBase} border-primary/70 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-100`;
    }
    return `${dropdownBtnBase} border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-gray-700/50`;
}

const selectedChipClass =
    'inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary-100';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onMouseDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onEscape);
        };
    }, [ref, onClose, enabled]);
}

function MultiSelectDropdown({
    label,
    options,
    selected,
    onChange,
    open,
    onOpenChange,
    language,
    searchable,
    searchPlaceholder,
}: {
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    language: string;
    searchable?: boolean;
    searchPlaceholder?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState('');
    useClickOutside(ref, () => onOpenChange(false), open);

    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    const active = selected.length > 0;

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => onOpenChange(!open)} className={dropdownBtnClass(active, open)}>
                <span>{label}</span>
                {active && <span className="opacity-80">({selected.length})</span>}
                <span className="text-[10px] opacity-70">▾</span>
            </button>
            {open && (
                <div
                    className="absolute z-40 mt-1 min-w-[180px] max-w-[260px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    )}
                    <div className="max-h-52 overflow-y-auto py-1">
                        {visible.map((opt) => {
                            const checked = selected.includes(opt.value);
                            return (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onChange(toggleInList(selected, opt.value))}
                                        className="rounded border-gray-300 dark:border-gray-600 text-primary shrink-0"
                                    />
                                    {opt.colorDot && (
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.colorDot }} />
                                    )}
                                    <span className="truncate">{opt.label}</span>
                                </label>
                            );
                        })}
                        {visible.length === 0 && (
                            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{searchPlaceholder || '—'}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SelectedChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
    return (
        <span className={selectedChipClass}>
            {label}
            <button
                type="button"
                onClick={onRemove}
                className="opacity-70 hover:opacity-100 leading-none"
                aria-label={removeLabel}
            >
                ×
            </button>
        </span>
    );
}

type ChipItem = { key: string; label: string; onRemove: () => void };
type ChipGroup = { id: string; label: string; chips: ChipItem[] };

function FilterChipGroupRow({
    label,
    chips,
    trailing,
    removeLabel,
}: {
    label: string;
    chips: ChipItem[];
    trailing?: React.ReactNode;
    removeLabel: string;
}) {
    if (chips.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {chips.map((chip) => (
                    <SelectedChip key={chip.key} label={chip.label} onRemove={chip.onRemove} removeLabel={removeLabel} />
                ))}
            </div>
            {trailing}
        </div>
    );
}

interface CampaignLeadPickerProps {
    enabled: boolean;
    selectedIds: Set<number>;
    onSelectedIdsChange: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export function CampaignLeadPicker({ enabled, selectedIds, onSelectedIdsChange }: CampaignLeadPickerProps) {
    const { t, language, currentUser } = useAppContext();
    const [searchDraft, setSearchDraft] = useState('');
    const [searchApplied, setSearchApplied] = useState('');
    const [filters, setFilters] = useState<CampaignLeadFilters>(EMPTY_FILTERS);
    const [activeDatePreset, setActiveDatePreset] = useState<DatePreset | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const { data: statusesResponse } = useStatuses({ enabled });
    const { data: usersResponse } = useUsers({ enabled });
    const { data: channelsResponse } = useChannels({ enabled });

    const statuses = Array.isArray(statusesResponse) ? statusesResponse : (statusesResponse?.results || []);
    const usersArray = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.results || []);
    const userOptions = useMemo(
        () => usersForOperationalEmployeeLists(usersArray as User[], currentUser ?? null),
        [usersArray, currentUser],
    );
    const channels = Array.isArray(channelsResponse) ? channelsResponse : (channelsResponse?.results || []);

    const statusOptions = useMemo(
        () => statuses.filter((s: { isHidden?: boolean }) => !s.isHidden),
        [statuses],
    );

    const priorityOptions = useMemo(
        () => PRIORITIES.map((p) => ({ value: p, label: formatLeadPriority(p, t) })),
        [t],
    );
    const typeOptions = useMemo(
        () => LEAD_TYPES.map((type) => ({ value: type, label: formatLeadType(type, t) })),
        [t],
    );
    const statusFilterOptions = useMemo(
        () =>
            statusOptions.map((s: { name: string; color?: string }) => ({
                value: s.name,
                label: formatLeadStatus(s.name, t),
                colorDot: s.color,
            })),
        [statusOptions, t],
    );
    const channelOptions = useMemo(
        () => channels.map((c: { id: number; name: string }) => ({ value: String(c.id), label: c.name })),
        [channels],
    );
    const assigneeOptions = useMemo(() => {
        const opts: FilterOption[] = [{ value: 'unassigned', label: t('unassigned') }];
        for (const user of userOptions) {
            opts.push({ value: user.id.toString(), label: getUserDisplayName(user) });
        }
        return opts;
    }, [userOptions, t]);

    const assigneeLabel = (value: string) => assigneeOptions.find((o) => o.value === value)?.label ?? value;

    const apiFilters = useMemo(() => filtersToApi(filters), [filters]);

    const { data: campaignLeadsData, isLoading: campaignLeadsLoading } = useQuery({
        queryKey: ['campaignLeads', searchApplied, apiFilters],
        queryFn: () =>
            getLeadsAPI({
                ...apiFilters,
                search: searchApplied.trim() || undefined,
            }),
        enabled,
    });

    const campaignLeads = useMemo(() => {
        let list = campaignLeadsData?.results ?? (Array.isArray(campaignLeadsData) ? campaignLeadsData : []);
        list = list as any[];
        if (filters.withPhoneOnly) {
            list = list.filter((lead) => leadHasPhone(lead));
        }
        return list;
    }, [campaignLeadsData, filters.withPhoneOnly]);

    const applySearch = () => setSearchApplied(searchDraft.trim());

    const clearFilters = () => {
        setSearchDraft('');
        setSearchApplied('');
        setFilters(EMPTY_FILTERS);
        setActiveDatePreset(null);
        setOpenDropdown(null);
    };

    const setFilter = <K extends keyof CampaignLeadFilters>(key: K, value: CampaignLeadFilters[K]) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const toggleDropdown = (id: string) => setOpenDropdown((prev) => (prev === id ? null : id));

    const applyDatePreset = (preset: DatePreset) => {
        if (activeDatePreset === preset) {
            setActiveDatePreset(null);
            setFilters((prev) => ({ ...prev, createdAtFrom: '', createdAtTo: '' }));
            return;
        }
        const range = datePresetRange(preset);
        setActiveDatePreset(preset);
        setFilters((prev) => ({ ...prev, createdAtFrom: range.from, createdAtTo: range.to }));
    };

    const dateActive = !!(filters.createdAtFrom || filters.createdAtTo);
    const dateLabel = useMemo(() => {
        if (activeDatePreset === 'today') return t('campaignDateToday');
        if (activeDatePreset === 'last7') return t('last7Days');
        if (activeDatePreset === 'last30') return t('campaignDateLast30');
        if (activeDatePreset === 'thisMonth') return t('campaignDateThisMonth');
        if (filters.createdAtFrom && filters.createdAtTo) {
            return `${formatShortDate(filters.createdAtFrom, language)} – ${formatShortDate(filters.createdAtTo, language)}`;
        }
        if (filters.createdAtFrom) return `${t('fromDate')}: ${formatShortDate(filters.createdAtFrom, language)}`;
        if (filters.createdAtTo) return `${t('toDate')}: ${formatShortDate(filters.createdAtTo, language)}`;
        return t('dates');
    }, [activeDatePreset, filters.createdAtFrom, filters.createdAtTo, language, t]);

    const selectedChipGroups = useMemo((): ChipGroup[] => {
        const groups: ChipGroup[] = [];

        if (filters.priorities.length > 0) {
            groups.push({
                id: 'priority',
                label: t('priority'),
                chips: filters.priorities.map((p) => ({
                    key: `p-${p}`,
                    label: formatLeadPriority(p, t),
                    onRemove: () => setFilter('priorities', filters.priorities.filter((v) => v !== p)),
                })),
            });
        }

        if (filters.types.length > 0) {
            groups.push({
                id: 'type',
                label: t('type'),
                chips: filters.types.map((type) => ({
                    key: `t-${type}`,
                    label: formatLeadType(type, t),
                    onRemove: () => setFilter('types', filters.types.filter((v) => v !== type)),
                })),
            });
        }

        if (filters.statuses.length > 0) {
            groups.push({
                id: 'status',
                label: t('status'),
                chips: filters.statuses.map((status) => ({
                    key: `s-${status}`,
                    label: formatLeadStatus(status, t),
                    onRemove: () => setFilter('statuses', filters.statuses.filter((v) => v !== status)),
                })),
            });
        }

        if (filters.channels.length > 0) {
            groups.push({
                id: 'channel',
                label: t('communicationWay'),
                chips: filters.channels.map((ch) => ({
                    key: `c-${ch}`,
                    label: channelOptions.find((o) => o.value === ch)?.label ?? ch,
                    onRemove: () => setFilter('channels', filters.channels.filter((v) => v !== ch)),
                })),
            });
        }

        const assigneeChips: ChipItem[] = [];
        if (filters.assignedToMe) {
            assigneeChips.push({
                key: 'me',
                label: t('campaignAssignedToMe'),
                onRemove: () => setFilter('assignedToMe', false),
            });
        }
        for (const a of filters.assignees) {
            assigneeChips.push({
                key: `a-${a}`,
                label: assigneeLabel(a),
                onRemove: () => setFilter('assignees', filters.assignees.filter((v) => v !== a)),
            });
        }
        if (assigneeChips.length > 0) {
            groups.push({ id: 'assignee', label: t('assignedTo'), chips: assigneeChips });
        }

        if (dateActive) {
            groups.push({
                id: 'date',
                label: t('dates'),
                chips: [
                    {
                        key: 'date',
                        label: dateLabel,
                        onRemove: () => {
                            setActiveDatePreset(null);
                            setFilters((prev) => ({ ...prev, createdAtFrom: '', createdAtTo: '' }));
                        },
                    },
                ],
            });
        }

        if (!filters.withPhoneOnly) {
            groups.push({
                id: 'more',
                label: t('campaignMoreFilters'),
                chips: [
                    {
                        key: 'phone',
                        label: t('campaignIncludeNoPhone'),
                        onRemove: () => setFilter('withPhoneOnly', true),
                    },
                ],
            });
        }

        return groups;
    }, [filters, t, channelOptions, assigneeLabel, dateActive, dateLabel]);

    const filtersActive = hasActiveFilters(filters, searchApplied);
    const clearFiltersButton = filtersActive ? (
        <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:underline underline-offset-2 shrink-0"
        >
            {t('campaignClearFilters')}
        </button>
    ) : null;

    const dateRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLDivElement>(null);
    useClickOutside(dateRef, () => setOpenDropdown(null), openDropdown === 'date');
    useClickOutside(moreRef, () => setOpenDropdown(null), openDropdown === 'more');

    const dateInputClass =
        'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary';

    return (
        <div className="lg:col-span-2 flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('selectLeadsToSend')}</label>
            <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder={t('campaignSearchPlaceholder')}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ps-9 pe-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <Button type="button" variant="secondary" onClick={applySearch}>
                        {t('search')}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('campaignSearchHint')}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                    <MultiSelectDropdown
                        label={t('priority')}
                        options={priorityOptions}
                        selected={filters.priorities}
                        onChange={(priorities) => setFilter('priorities', priorities)}
                        open={openDropdown === 'priority'}
                        onOpenChange={(open) => setOpenDropdown(open ? 'priority' : null)}
                        language={language}
                    />
                    <MultiSelectDropdown
                        label={t('type')}
                        options={typeOptions}
                        selected={filters.types}
                        onChange={(types) => setFilter('types', types)}
                        open={openDropdown === 'type'}
                        onOpenChange={(open) => setOpenDropdown(open ? 'type' : null)}
                        language={language}
                    />
                    {statusFilterOptions.length > 0 && (
                        <MultiSelectDropdown
                            label={t('status')}
                            options={statusFilterOptions}
                            selected={filters.statuses}
                            onChange={(statuses) => setFilter('statuses', statuses)}
                            open={openDropdown === 'status'}
                            onOpenChange={(open) => setOpenDropdown(open ? 'status' : null)}
                            language={language}
                        />
                    )}
                    {channelOptions.length > 0 && (
                        <MultiSelectDropdown
                            label={t('communicationWay')}
                            options={channelOptions}
                            selected={filters.channels}
                            onChange={(channels) => setFilter('channels', channels)}
                            open={openDropdown === 'channel'}
                            onOpenChange={(open) => setOpenDropdown(open ? 'channel' : null)}
                            language={language}
                        />
                    )}
                    <MultiSelectDropdown
                        label={t('assignedTo')}
                        options={assigneeOptions}
                        selected={filters.assignedToMe ? [] : filters.assignees}
                        onChange={(assignees) =>
                            setFilters((prev) => ({ ...prev, assignees, assignedToMe: false }))
                        }
                        open={openDropdown === 'assignee'}
                        onOpenChange={(open) => setOpenDropdown(open ? 'assignee' : null)}
                        language={language}
                        searchable
                        searchPlaceholder={t('search')}
                    />

                    <div className="relative" ref={dateRef}>
                        <button
                            type="button"
                            onClick={() => toggleDropdown('date')}
                            className={dropdownBtnClass(dateActive, openDropdown === 'date')}
                        >
                            <span>{dateActive ? dateLabel : t('dates')}</span>
                            <span className="text-[10px] opacity-70">▾</span>
                        </button>
                        {openDropdown === 'date' && (
                            <div
                                className="absolute z-40 mt-1 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-2 space-y-2"
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                            >
                                <div className="flex flex-wrap gap-1">
                                    {(
                                        [
                                            ['today', 'campaignDateToday'],
                                            ['last7', 'last7Days'],
                                            ['last30', 'campaignDateLast30'],
                                            ['thisMonth', 'campaignDateThisMonth'],
                                        ] as const
                                    ).map(([preset, key]) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => applyDatePreset(preset)}
                                            className={`rounded-full border px-2 py-0.5 text-xs ${
                                                activeDatePreset === preset
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                            }`}
                                        >
                                            {t(key)}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('fromDate')}
                                        <input
                                            type="date"
                                            value={filters.createdAtFrom}
                                            onChange={(e) => {
                                                setActiveDatePreset(null);
                                                setFilter('createdAtFrom', e.target.value);
                                            }}
                                            className={`${dateInputClass} mt-0.5`}
                                        />
                                    </label>
                                    <label className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('toDate')}
                                        <input
                                            type="date"
                                            value={filters.createdAtTo}
                                            onChange={(e) => {
                                                setActiveDatePreset(null);
                                                setFilter('createdAtTo', e.target.value);
                                            }}
                                            className={`${dateInputClass} mt-0.5`}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={moreRef}>
                        <button
                            type="button"
                            onClick={() => toggleDropdown('more')}
                            className={dropdownBtnClass(!filters.withPhoneOnly || filters.assignedToMe, openDropdown === 'more')}
                        >
                            {t('campaignMoreFilters')}
                            <span className="text-[10px] opacity-70">▾</span>
                        </button>
                        {openDropdown === 'more' && (
                            <div
                                className="absolute z-40 mt-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
                                dir={language === 'ar' ? 'rtl' : 'ltr'}
                            >
                                <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={filters.assignedToMe}
                                        onChange={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                assignedToMe: !prev.assignedToMe,
                                                assignees: !prev.assignedToMe ? [] : prev.assignees,
                                            }))
                                        }
                                        className="rounded border-gray-300 dark:border-gray-600 text-primary"
                                    />
                                    {t('campaignAssignedToMe')}
                                </label>
                                <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={filters.withPhoneOnly}
                                        onChange={() => setFilter('withPhoneOnly', !filters.withPhoneOnly)}
                                        className="rounded border-gray-300 dark:border-gray-600 text-primary"
                                    />
                                    {t('campaignWithPhoneOnly')}
                                </label>
                            </div>
                        )}
                    </div>

                    {filtersActive && selectedChipGroups.length === 0 && clearFiltersButton}
                </div>

                {selectedChipGroups.length > 0 && (
                    <div className="space-y-1.5">
                        {selectedChipGroups.map((group, index) => (
                            <FilterChipGroupRow
                                key={group.id}
                                label={group.label}
                                chips={group.chips}
                                removeLabel={t('remove')}
                                trailing={index === 0 ? clearFiltersButton : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 mb-2">
                <button
                    type="button"
                    onClick={() => {
                        const allIds = new Set(campaignLeads.map((l: { id: number }) => l.id));
                        onSelectedIdsChange(allIds);
                    }}
                    className="text-sm font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 hover:underline underline-offset-2"
                >
                    {t('selectAll')}
                </button>
                <button
                    type="button"
                    onClick={() => onSelectedIdsChange(new Set())}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:underline underline-offset-2"
                >
                    {t('deselectAll')}
                </button>
                {!campaignLeadsLoading && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ms-auto">
                        {t('campaignMatchingCount').replace('{count}', String(campaignLeads.length))}
                    </span>
                )}
            </div>

            <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-y-auto flex-1 min-h-[200px] max-h-[320px] bg-white dark:bg-gray-800/50">
                {campaignLeadsLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader variant="primary" className="h-8" />
                    </div>
                ) : campaignLeads.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">{t('noLeadsFound')}</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {campaignLeads.map((lead: any) => {
                            const hasPhone = leadHasPhone(lead);
                            const checked = selectedIds.has(lead.id);
                            const displayTitle = (lead.name ?? '') || (lead.company_name ?? '') || `#${lead.id}`;
                            const statusName = lead.status_name ?? lead.status?.name ?? '';
                            const typeVal = lead.type ?? '';
                            const priorityVal = lead.priority ?? '';
                            const assignedTo = lead.assigned_to_username ?? lead.assigned_to?.username ?? '';
                            return (
                                <li key={lead.id}>
                                    <label
                                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg ${!hasPhone ? 'opacity-60' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={!hasPhone}
                                            onChange={() => {
                                                onSelectedIdsChange((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(lead.id)) next.delete(lead.id);
                                                    else next.add(lead.id);
                                                    return next;
                                                });
                                            }}
                                            className="rounded border-gray-300 dark:border-gray-600 text-primary shrink-0"
                                        />
                                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                                            {displayTitle.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{displayTitle}</p>
                                            {resolveLeadPhoneRaw(lead) && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" dir="ltr">
                                                    {resolveLeadPhoneRaw(lead)}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {statusName && (
                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {formatLeadStatus(statusName, t)}
                                                    </span>
                                                )}
                                                {typeVal && (
                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {formatLeadType(typeVal, t)}
                                                    </span>
                                                )}
                                                {priorityVal && (
                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {formatLeadPriority(priorityVal, t)}
                                                    </span>
                                                )}
                                            </div>
                                            {assignedTo && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    {t('assignedTo')}: {assignedTo}
                                                </p>
                                            )}
                                            {!hasPhone && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                                    {t('sms_error_invalid_to_number')}
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
