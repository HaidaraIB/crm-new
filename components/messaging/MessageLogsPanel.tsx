import React, { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppContext } from '../../context/AppContext';
import { getMessageLogsAPI, type MessageLogEntry, type MessageLogFilters } from '../../services/api';
import { IntegrationPlatformIcon } from '../integrations/IntegrationPlatformIcon';
import { Button, Card, Loader, SectionLoadingState } from '../index';
import { SearchIcon, ClockIcon } from '../icons';
import { getCompanyViewLeadRoute } from '../../utils/routing';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import type { Lead } from '../../types';

const PAGE_SIZE = 30;

type StatusKey = MessageLogEntry['status'];

function statusBadgeClass(status: StatusKey): string {
    if (status === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    if (status === 'delivered') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    if (status === 'sent') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    if (status === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
}

function timelineDotClass(status: StatusKey): string {
    if (status === 'failed') return 'bg-red-500 ring-red-500/30';
    if (status === 'delivered') return 'bg-green-500 ring-green-500/30';
    if (status === 'sent') return 'bg-gray-500 ring-gray-500/30';
    if (status === 'pending') return 'bg-amber-500 ring-amber-500/30';
    return 'bg-primary ring-primary/30';
}

function formatLogDate(iso: string, language: string, t: (key: string) => string): string {
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
    if (day.getTime() === today.getTime()) return t('today');
    if (day.getTime() === yesterday.getTime()) return t('yesterday');
    return d.toLocaleDateString(locale, withLatinDigits({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
}

function formatLogTime(iso: string, language: string): string {
    return new Date(iso).toLocaleTimeString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({
        hour: '2-digit',
        minute: '2-digit',
    }));
}

function groupByDate(entries: MessageLogEntry[], language: string, t: (key: string) => string): { label: string; items: MessageLogEntry[] }[] {
    const map = new Map<string, MessageLogEntry[]>();
    for (const entry of entries) {
        const label = formatLogDate(entry.created_at, language, t);
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(entry);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2 min-w-[5.5rem]">
            <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        </div>
    );
}

function MessageLogTimelineItem({
    entry,
    t,
    language,
    expanded,
    onToggle,
    onViewLead,
}: {
    entry: MessageLogEntry;
    t: (key: string) => string;
    language: string;
    expanded: boolean;
    onToggle: () => void;
    onViewLead: () => void;
}) {
    const statusLabelKey = `messageLogStatus_${entry.status}` as const;
    const statusLabel = t(statusLabelKey as any) || entry.status;

    return (
        <div className="relative flex gap-3 pb-6 last:pb-0">
            <div className="flex flex-col items-center shrink-0 w-4">
                <span
                    className={`w-3 h-3 rounded-full ring-4 shrink-0 mt-1.5 ${timelineDotClass(entry.status)}`}
                    aria-hidden
                />
                <span className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-1" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <IntegrationPlatformIcon
                            platform={entry.channel === 'whatsapp' ? 'whatsapp' : 'sms'}
                            size="sm"
                            variant="inline"
                        />
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(entry.status)}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <time className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums" dateTime={entry.created_at}>
                        {formatLogTime(entry.created_at, language)}
                    </time>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-2">
                    {entry.client_name ? (
                        <button
                            type="button"
                            onClick={onViewLead}
                            className="font-medium text-primary-600 dark:text-primary-300 hover:underline truncate max-w-full text-start"
                        >
                            {entry.client_name}
                        </button>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">{t('messageLogUnknownLead')}</span>
                    )}
                    {entry.phone_number && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs" dir="ltr">
                            {entry.phone_number}
                        </span>
                    )}
                </div>

                {entry.body ? (
                    <>
                        <button
                            type="button"
                            onClick={onToggle}
                            className="w-full text-start text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words hover:text-gray-900 dark:hover:text-white"
                        >
                            {expanded ? entry.body : entry.body_preview || entry.body}
                        </button>
                        {(entry.body?.length ?? 0) > (entry.body_preview?.length ?? 0) && (
                            <button type="button" onClick={onToggle} className="text-xs text-primary-600 dark:text-primary-300 mt-1 hover:underline">
                                {expanded ? t('messageLogShowLess') : t('messageLogShowMore')}
                            </button>
                        )}
                    </>
                ) : entry.status === 'failed' ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('messageLogNoBody')}</p>
                ) : null}

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
                    {entry.created_by_username && (
                        <span>
                            {t('messageLogSentBy')}: {entry.created_by_username}
                        </span>
                    )}
                    {entry.provider && (
                        <span>
                            {t('messageLogProvider')}: {entry.provider}
                        </span>
                    )}
                    {entry.external_id && (
                        <span className="truncate max-w-[12rem]" dir="ltr" title={entry.external_id}>
                            {t('messageLogExternalId')}: {entry.external_id}
                        </span>
                    )}
                </div>

                {entry.status === 'failed' && entry.error && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md px-2 py-1.5">
                        {entry.error}
                    </p>
                )}
            </div>
        </div>
    );
}

export function MessageLogsPanel() {
    const { t, language, currentUser, setCurrentPage, setSelectedLead } = useAppContext();
    const [searchDraft, setSearchDraft] = useState('');
    const [searchApplied, setSearchApplied] = useState('');
    const [channel, setChannel] = useState<MessageLogFilters['channel']>('all');
    const [status, setStatus] = useState<MessageLogFilters['status']>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filters: MessageLogFilters = useMemo(
        () => ({
            search: searchApplied.trim() || undefined,
            channel,
            status,
            page_size: PAGE_SIZE,
        }),
        [searchApplied, channel, status],
    );

    const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
        queryKey: ['messageLogs', filters],
        queryFn: ({ pageParam = 1 }) => getMessageLogsAPI({ ...filters, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const loaded = lastPage.page * lastPage.page_size;
            if (loaded >= lastPage.count) return undefined;
            return lastPage.page + 1;
        },
    });

    const entries = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data]);
    const summary = data?.pages[0]?.summary;
    const totalCount = data?.pages[0]?.count ?? 0;
    const grouped = useMemo(() => groupByDate(entries, language, t), [entries, language, t]);

    const handleViewLead = (entry: MessageLogEntry) => {
        if (!entry.client_id) return;
        const lead = { id: entry.client_id, name: entry.client_name || `#${entry.client_id}` } as Lead;
        setSelectedLead(lead);
        const path = currentUser?.company
            ? getCompanyViewLeadRoute(currentUser.company.name, currentUser.company.domain, entry.client_id)
            : `/view-lead/${entry.client_id}`;
        window.history.pushState({}, '', path);
        setCurrentPage('ViewLead');
    };

    const filterSelectClass =
        'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary';

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 shrink-0 text-primary" />
                    {t('messageLogs')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('messageLogsDesc')}</p>
            </div>

            {summary && (
                <div className="flex flex-wrap gap-2">
                    <StatCard label={t('messageLogStatTotal')} value={summary.total} />
                    <StatCard label={t('messageLogStatus_pending')} value={summary.pending} />
                    <StatCard label={t('messageLogStatus_sent')} value={summary.sent} />
                    <StatCard label={t('messageLogStatDelivered')} value={summary.delivered} />
                    <StatCard label={t('messageLogStatFailed')} value={summary.failed} />
                    <StatCard label={t('campaignViaWhatsApp')} value={summary.whatsapp} />
                    <StatCard label={t('campaignViaSms')} value={summary.sms} />
                </div>
            )}

            <Card className="p-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[12rem]">
                        <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchDraft}
                            onChange={(e) => setSearchDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearchApplied(searchDraft.trim())}
                            placeholder={t('messageLogSearchPlaceholder')}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ps-9 pe-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setSearchApplied(searchDraft.trim())}>
                        {t('search')}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                        {t('refresh')}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value as MessageLogFilters['channel'])}
                        className={filterSelectClass}
                        aria-label={t('messageLogFilterChannel')}
                    >
                        <option value="all">{t('messageLogChannelAll')}</option>
                        <option value="whatsapp">{t('campaignViaWhatsApp')}</option>
                        <option value="sms">{t('campaignViaSms')}</option>
                    </select>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as MessageLogFilters['status'])}
                        className={filterSelectClass}
                        aria-label={t('messageLogFilterStatus')}
                    >
                        <option value="all">{t('messageLogStatusAll')}</option>
                        <option value="pending">{t('messageLogStatus_pending')}</option>
                        <option value="sent">{t('messageLogStatus_sent')}</option>
                        <option value="delivered">{t('messageLogStatus_delivered')}</option>
                        <option value="failed">{t('messageLogStatus_failed')}</option>
                    </select>
                </div>
            </Card>

            {isLoading ? (
                <SectionLoadingState />
            ) : entries.length === 0 ? (
                <Card className="p-8 text-center">
                    <ClockIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('messageLogsEmpty')}</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {grouped.map((group) => (
                        <section key={group.label}>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 py-1 z-10">
                                {group.label}
                            </h3>
                            <div className="ps-1">
                                {group.items.map((entry) => (
                                    <MessageLogTimelineItem
                                        key={entry.id}
                                        entry={entry}
                                        t={t}
                                        language={language}
                                        expanded={expandedId === entry.id}
                                        onToggle={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
                                        onViewLead={() => handleViewLead(entry)}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}

                    <div className="flex flex-col items-center gap-2 pt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('messageLogShowingCount')
                                .replace('{shown}', String(entries.length))
                                .replace('{total}', String(totalCount))}
                        </p>
                        {hasNextPage && (
                            <Button type="button" variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage ? (
                                    <>
                                        <Loader variant="primary" className="w-4 h-4 me-2" />
                                        {t('loading')}
                                    </>
                                ) : (
                                    t('messageLogLoadMore')
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
