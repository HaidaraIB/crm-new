import React, { useMemo, useState } from 'react';
import { Lead, TimelineEntry as TimelineEntryType, TimelineTagRef } from '../types';
import { getStatusSurfaceStyles } from './LeadStatusDropdown';
import { ClockIcon, PhoneIcon, MapPinIcon, WhatsappIcon, SmsIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { translations } from '../constants';
import {
    clientLocationMapsUrl,
    formatClientLocationPair,
} from '../utils/leadLocation';
import { ChatVoicePlayer } from './chat/ChatVoicePlayer';
import { useAuthBlobUrl } from '../hooks/useAuthBlobUrl';
import { PhoneText } from './PhoneText';

const TimelineRecordingPlayer: React.FC<{ url: string; t: (key: string) => string }> = ({
    url,
    t,
}) => {
    const blobUrl = useAuthBlobUrl(url);
    if (!blobUrl) {
        return <p className="mt-2 text-xs text-gray-400">{t('loading')}…</p>;
    }
    return (
        <div className="mt-2" dir="ltr">
            <ChatVoicePlayer blobUrl={blobUrl} mine={false} t={t} />
        </div>
    );
};

const TIMELINE_SORT_KEY = 'leadTimelineSortOrder';

type TimelineSortOrder = 'desc' | 'asc';

type TimelineProps = {
    history: TimelineEntryType[];
    /** When set, WhatsApp thread cards can open this lead in Chats. */
    chatLead?: Lead | null;
};

function readSortOrder(): TimelineSortOrder {
    if (typeof window === 'undefined') return 'desc';
    const stored = localStorage.getItem(TIMELINE_SORT_KEY);
    return stored === 'asc' ? 'asc' : 'desc';
}

function getTypeChipLabel(
    entry: TimelineEntryType,
    t: (key: keyof typeof translations.en) => string
): string {
    switch (entry.type) {
        case 'whatsapp':
        case 'whatsapp_thread':
            return t('whatsapp');
        case 'sms':
            return t('smsSent');
        case 'call':
            return t('call');
        case 'visit':
            return t('visit');
        case 'field_visit':
            return t('fieldVisit');
        case 'action':
            return t('stageUpdated');
        case 'location_update':
            return entry.action || t('timeline');
        case 'event':
            if (entry.fieldLabel) return t('leadEdited');
            return entry.action || t('timeline');
        default:
            return entry.action || t('timeline');
    }
}

function showActionSubtitle(entry: TimelineEntryType, chipLabel: string): boolean {
    if (!entry.action?.trim()) return false;
    if (entry.type === 'whatsapp') return true;
    if (entry.type === 'whatsapp_thread') return false;
    if (entry.type === 'action') return false;
    if (entry.type === 'event' && (entry.oldValue || entry.newValue)) return false;
    if (entry.type === 'location_update') return false;
    return entry.action !== chipLabel;
}

function TypeIcon({ type, className }: { type?: TimelineEntryType['type']; className?: string }) {
    const cn = className || 'w-4 h-4';
    switch (type) {
        case 'whatsapp':
        case 'whatsapp_thread':
            return <WhatsappIcon className={cn} />;
        case 'sms':
            return <SmsIcon className={cn} />;
        case 'call':
            return <PhoneIcon className={cn} />;
        case 'visit':
        case 'field_visit':
        case 'location_update':
            return <MapPinIcon className={cn} />;
        default:
            return <ClockIcon className={cn} />;
    }
}

function WhatsAppThreadBody({
    entry,
    t,
    onOpenChats,
}: {
    entry: TimelineEntryType;
    t: (key: keyof typeof translations.en) => string;
    onOpenChats?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const messages = entry.messages || [];
    const countLabel = t('whatsappTimelineMessagesCount').replace(
        '{count}',
        String(messages.length || 1)
    );
    const latestDirection = messages.length
        ? messages[messages.length - 1].direction
        : entry.direction;
    const previewCue = latestDirection === 'inbound' ? '←' : '→';

    return (
        <div className="mt-2 space-y-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t('whatsappTimelineConversation')}
                <span className="ms-2 text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                    {countLabel}
                </span>
            </p>
            {entry.details && !expanded && (
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    <span className="text-gray-400 dark:text-gray-500 me-1.5" aria-hidden="true">
                        {previewCue}
                    </span>
                    {entry.details}
                </p>
            )}
            {expanded && messages.length > 0 && (
                <ul className="space-y-1.5 rounded-lg border border-green-200/70 dark:border-green-800/50 bg-white/60 dark:bg-gray-900/40 px-2.5 py-2 max-h-64 overflow-y-auto">
                    {messages.map((msg) => (
                        <li
                            key={msg.id}
                            className="flex gap-2 text-sm text-gray-700 dark:text-gray-200 min-w-0"
                        >
                            <span
                                className="shrink-0 text-gray-400 dark:text-gray-500 w-4 text-center"
                                aria-hidden="true"
                            >
                                {msg.direction === 'inbound' ? '←' : '→'}
                            </span>
                            <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                                {msg.body}
                            </span>
                            <time
                                className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap self-start"
                                dateTime={new Date(msg.timestamp).toISOString()}
                            >
                                {msg.date}
                            </time>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="text-xs font-medium text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                    >
                        {expanded ? t('whatsappTimelineCollapse') : t('whatsappTimelineExpand')}
                    </button>
                )}
                {onOpenChats && (
                    <button
                        type="button"
                        onClick={onOpenChats}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                        {t('whatsappTimelineOpenChat')}
                    </button>
                )}
            </div>
        </div>
    );
}

function TimelineValueChange({
    oldValue,
    newValue,
    t,
    valueDir,
}: {
    oldValue?: string;
    newValue?: string;
    t: (key: keyof typeof translations.en) => string;
    valueDir?: 'ltr';
}) {
    if (!oldValue && !newValue) return null;

    return (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {oldValue && (
                <span className="inline-flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('from')}</span>
                    <span
                        className="text-gray-500 line-through decoration-gray-400"
                        dir={valueDir}
                    >
                        {oldValue}
                    </span>
                </span>
            )}
            {newValue && (
                <span className="inline-flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('to')}</span>
                    <span
                        className={`font-medium ${oldValue ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-100'}`}
                        dir={valueDir}
                    >
                        {newValue}
                    </span>
                </span>
            )}
        </div>
    );
}

function TimelineFromToDates({
    fromLabel,
    toLabel,
    t,
    fromClassName,
    toClassName,
    fromIcon,
    toIcon,
}: {
    fromLabel?: string;
    toLabel?: string;
    t: (key: keyof typeof translations.en) => string;
    fromClassName: string;
    toClassName: string;
    fromIcon?: React.ReactNode;
    toIcon?: React.ReactNode;
}) {
    if (!fromLabel && !toLabel) return null;

    const showFromToWords = Boolean(fromLabel && toLabel);

    return (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            {fromLabel && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${fromClassName}`}>
                    {showFromToWords && (
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('from')}</span>
                    )}
                    {fromIcon}
                    <span className="text-xs font-medium">{fromLabel}</span>
                </span>
            )}
            {toLabel && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${toClassName}`}>
                    {showFromToWords && (
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('to')}</span>
                    )}
                    {toIcon}
                    <span className="text-xs font-medium">{toLabel}</span>
                </span>
            )}
        </div>
    );
}

const DEFAULT_TAG_COLOR = '#94a3b8';

/** Added/removed tag chips, colored from the tag's own hex like everywhere else. */
function TimelineTagChanges({
    tagChanges,
    t,
}: {
    tagChanges: NonNullable<TimelineEntryType['tagChanges']>;
    t: (key: keyof typeof translations.en) => string;
}) {
    const { theme } = useAppContext();
    const { added, removed } = tagChanges;
    if (added.length === 0 && removed.length === 0) return null;

    const row = (label: string, tags: TimelineTagRef[], struck: boolean) => (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                {label}
            </span>
            {tags.map((tag) => {
                const color = tag.color || DEFAULT_TAG_COLOR;
                return (
                    <span
                        key={`${label}-${tag.name}`}
                        className={`inline-flex max-w-[12rem] items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            struck ? 'opacity-70' : ''
                        }`}
                        style={getStatusSurfaceStyles(color, theme)}
                    >
                        <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden
                        />
                        <span className={`truncate ${struck ? 'line-through' : ''}`}>
                            {tag.name}
                        </span>
                    </span>
                );
            })}
        </div>
    );

    return (
        <div className="mt-2 space-y-1.5">
            {added.length > 0 && row(t('timelineTagsAdded'), added, false)}
            {removed.length > 0 && row(t('timelineTagsRemoved'), removed, true)}
        </div>
    );
}

function chipColorClass(type?: TimelineEntryType['type']): string {
    switch (type) {
        case 'whatsapp':
        case 'whatsapp_thread':
            return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
        case 'sms':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
        case 'call':
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200';
        case 'visit':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
        case 'field_visit':
        case 'location_update':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
        case 'action':
            return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
        case 'event':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
}

export const Timeline = ({ history, chatLead }: TimelineProps) => {
    const { t, language, goToPage, openLeadInChats: openLeadInChatsPage } = useAppContext();
    const [sortOrder, setSortOrder] = useState<TimelineSortOrder>(readSortOrder);

    const openLeadInChats = () => {
        if (!chatLead) {
            goToPage('Chats');
            return;
        }
        openLeadInChatsPage(chatLead);
    };

    const sortedHistory = useMemo(() => {
        const copy = [...history];
        copy.sort((a, b) =>
            sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
        );
        return copy;
    }, [history, sortOrder]);

    const setSort = (order: TimelineSortOrder) => {
        setSortOrder(order);
        if (typeof window !== 'undefined') {
            localStorage.setItem(TIMELINE_SORT_KEY, order);
        }
    };

    const countLabel = t('timelineEventsCount').replace('{{count}}', String(sortedHistory.length));
    const isRtl = language === 'ar';

    return (
        <section
            dir={isRtl ? 'rtl' : 'ltr'}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card overflow-hidden"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('timeline')}</h2>
                    {sortedHistory.length > 0 && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                            {countLabel}
                        </span>
                    )}
                </div>
                <div
                    className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800"
                    role="group"
                    aria-label={t('timeline')}
                >
                    <button
                        type="button"
                        onClick={() => setSort('desc')}
                        aria-pressed={sortOrder === 'desc'}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sortOrder === 'desc'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        {t('timelineNewestFirst')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSort('asc')}
                        aria-pressed={sortOrder === 'asc'}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sortOrder === 'asc'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        {t('timelineOldestFirst')}
                    </button>
                </div>
            </div>

            {sortedHistory.length === 0 ? (
                <div className="px-4 py-12 sm:px-5 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('timelineEmpty')}</p>
                </div>
            ) : (
                <ol className="relative list-none m-0 px-4 py-5 sm:px-5 sm:py-6 space-y-0">
                    {sortedHistory.map((entry, index) => {
                        const isLast = index === sortedHistory.length - 1;
                        const chipLabel = getTypeChipLabel(entry, t);
                        const subtitle = showActionSubtitle(entry, chipLabel);

                        const displayNumber = index + 1;

                        return (
                            <li
                                key={entry.id}
                                className="grid grid-cols-[2.25rem_1fr] sm:grid-cols-[2.5rem_1fr] gap-x-3 sm:gap-x-4 pb-8 last:pb-0"
                            >
                                <div className="relative flex h-full min-h-0 justify-center">
                                    <div
                                        className="relative z-10 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 bg-primary text-white text-sm font-bold shadow-sm tabular-nums"
                                        aria-hidden="true"
                                    >
                                        {displayNumber}
                                    </div>
                                    {!isLast && (
                                        <div
                                            className="absolute top-10 sm:top-11 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-gray-600"
                                            aria-hidden="true"
                                        />
                                    )}
                                </div>

                                <article className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 px-3 py-3 sm:px-4 sm:py-3.5 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${chipColorClass(entry.type)}`}
                                            >
                                                <TypeIcon type={entry.type} className="w-3.5 h-3.5 shrink-0" />
                                                {chipLabel}
                                            </span>
                                            {entry.stage && (
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium max-w-full truncate ${!entry.color ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : ''}`}
                                                    style={
                                                        entry.color
                                                            ? {
                                                                  backgroundColor: `${entry.color}20`,
                                                                  color: entry.color,
                                                                  border: `1px solid ${entry.color}40`,
                                                              }
                                                            : undefined
                                                    }
                                                >
                                                    {entry.type === 'sms' ||
                                                    entry.type === 'whatsapp' ||
                                                    entry.type === 'whatsapp_thread' ? (
                                                        <PhoneText>{entry.stage}</PhoneText>
                                                    ) : (
                                                        entry.stage
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <time
                                            className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0 flex items-center gap-1"
                                            dateTime={new Date(entry.timestamp).toISOString()}
                                        >
                                            <ClockIcon className="w-3 h-3 shrink-0 opacity-70" />
                                            {entry.date}
                                        </time>
                                    </div>

                                    {entry.type !== 'whatsapp_thread' && (
                                        <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                            {entry.user}
                                        </p>
                                    )}

                                    {entry.fieldLabel && (
                                        <p className="mt-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            {entry.fieldLabel}
                                        </p>
                                    )}

                                    {subtitle && (
                                        <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {entry.action}
                                        </p>
                                    )}

                                    {entry.type === 'whatsapp_thread' && (
                                        <WhatsAppThreadBody
                                            entry={entry}
                                            t={t}
                                            onOpenChats={openLeadInChats}
                                        />
                                    )}

                                    {entry.type === 'event' && (entry.oldValue || entry.newValue) && (
                                        <TimelineValueChange
                                            oldValue={entry.oldValue}
                                            newValue={entry.newValue}
                                            t={t}
                                        />
                                    )}

                                    {entry.type === 'location_update' && (
                                        <div className="mt-2 inline-flex flex-col gap-2 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 text-sm max-w-full">
                                            {(entry.oldValue || entry.newValue) && (
                                                <TimelineValueChange
                                                    oldValue={
                                                        entry.oldValue
                                                            ? formatClientLocationPair(entry.oldValue)
                                                            : undefined
                                                    }
                                                    newValue={
                                                        entry.newValue
                                                            ? formatClientLocationPair(entry.newValue)
                                                            : undefined
                                                    }
                                                    t={t}
                                                    valueDir="ltr"
                                                />
                                            )}
                                            {entry.newValue ? (
                                                <>
                                                    <a
                                                        href={clientLocationMapsUrl(entry.newValue) || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                                                    >
                                                        <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                                        {t('openInMaps')}
                                                    </a>
                                                </>
                                            ) : entry.oldValue ? (
                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{t('previous')}:</span>
                                                    <span className="font-mono" dir="ltr">
                                                        {formatClientLocationPair(entry.oldValue)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {entry.tagChanges && (
                                        <TimelineTagChanges tagChanges={entry.tagChanges} t={t} />
                                    )}

                                    {entry.details &&
                                        !entry.tagChanges &&
                                        entry.type !== 'location_update' &&
                                        entry.type !== 'whatsapp_thread' && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap break-words">
                                            {entry.details}
                                        </p>
                                    )}

                                    {entry.recordingStatus === 'ready' && entry.recordingUrl ? (
                                        <TimelineRecordingPlayer url={entry.recordingUrl} t={t} />
                                    ) : entry.recordingStatus === 'pending' || entry.recordingStatus === 'processing' ? (
                                        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                            {t('recordingProcessing')}
                                        </p>
                                    ) : entry.recordingStatus === 'failed' ? (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {t('recordingUnavailable')}
                                        </p>
                                    ) : entry.recordingStatus === 'skipped' ? (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {t('recordingSkipped')}
                                        </p>
                                    ) : null}

                                    {entry.type === 'field_visit' && entry.locationPhotoUrl && (
                                        <a
                                            href={entry.locationPhotoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 block max-w-xs sm:max-w-sm"
                                        >
                                            <span className="flex h-48 max-h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                                                <img
                                                    src={entry.locationPhotoUrl}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="max-h-full max-w-full object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.closest('a')?.remove();
                                                    }}
                                                />
                                            </span>
                                        </a>
                                    )}

                                    {(entry.type === 'call' ||
                                        entry.type === 'visit' ||
                                        entry.type === 'field_visit') &&
                                        (entry.callDatetime || entry.followUpDate) && (
                                            <TimelineFromToDates
                                                t={t}
                                                fromLabel={entry.callDatetime}
                                                toLabel={entry.followUpDate}
                                                fromClassName={
                                                    entry.type === 'visit'
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                                        : entry.type === 'field_visit'
                                                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                }
                                                toClassName="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                                                fromIcon={
                                                    entry.type === 'visit' || entry.type === 'field_visit' ? (
                                                        <MapPinIcon
                                                            className={`w-3.5 h-3.5 shrink-0 ${
                                                                entry.type === 'field_visit'
                                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                                    : 'text-amber-700 dark:text-amber-300'
                                                            }`}
                                                        />
                                                    ) : (
                                                        <PhoneIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                    )
                                                }
                                                toIcon={
                                                    <ClockIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                                }
                                            />
                                        )}
                                </article>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};
