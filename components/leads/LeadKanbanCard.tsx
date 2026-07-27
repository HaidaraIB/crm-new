import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { MarqueeText } from '../MarqueeText';
import { FacebookIcon, PhoneIcon, SmsIcon, TikTokIcon, WhatsappIcon } from '../icons';
import type { Lead } from '../../types';
import { resolvePrimaryPhone } from '../../utils/resolvePrimaryPhone';

export type LeadKanbanCardModel = Lead & {
    statusId?: number | null;
    statusName?: string;
    assigned_to_username?: string | null;
    leadCompanyName?: string | null;
    profession?: string | null;
};

type LeadKanbanCardProps = {
    lead: LeadKanbanCardModel;
    assigneeName?: string | null;
    onOpen?: (lead: LeadKanbanCardModel) => void;
    /** When set, shows SMS / WhatsApp / Call next to the phone number. */
    showPhoneActions?: boolean;
    onSms?: (phone: string) => void;
    onWhatsApp?: (phone: string) => void;
};

const ICON_BTN =
    'inline-flex shrink-0 items-center justify-center h-6 w-6 rounded transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

const SOURCE_BADGE =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap';

const sanitizeTel = (phone: string) => phone.replace(/[^0-9+]/g, '');

const priorityClass = (priority?: string) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
    if (p === 'low') return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
};

const LeadSourceBadge = ({
    source,
    t,
}: {
    source?: string | null;
    t: (key: any) => string;
}) => {
    const value = (source || 'manual').toLowerCase();

    if (value === 'meta_lead_form') {
        return (
            <span className={`${SOURCE_BADGE} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
                <FacebookIcon className="w-3 h-3" />
                {t('metaLeadForm') || 'Meta'}
            </span>
        );
    }
    if (value === 'whatsapp') {
        return (
            <span className={`${SOURCE_BADGE} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>
                <WhatsappIcon className="w-3 h-3" />
                {t('whatsappSource') || 'WhatsApp'}
            </span>
        );
    }
    if (value === 'tiktok') {
        return (
            <span className={`${SOURCE_BADGE} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
                <TikTokIcon className="w-3 h-3 text-gray-900 dark:text-white" />
                {t('tiktokSource') || 'TikTok'}
            </span>
        );
    }
    if (value === 'api') {
        return (
            <span className={`${SOURCE_BADGE} bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200`}>
                {t('leadApiSource') || 'Custom API'}
            </span>
        );
    }
    if (value === 'mujeb') {
        return (
            <span className={`${SOURCE_BADGE} bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200`}>
                {t('mujebSource') || 'Mujeb'}
            </span>
        );
    }
    return (
        <span className={`${SOURCE_BADGE} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
            {t('manualSource') || 'Manual'}
        </span>
    );
};

export const LeadKanbanCard = ({
    lead,
    assigneeName,
    onOpen,
    showPhoneActions = false,
    onSms,
    onWhatsApp,
}: LeadKanbanCardProps) => {
    const { t } = useAppContext();
    const phone = resolvePrimaryPhone(lead);
    const subtitle =
        (lead.leadCompanyName && String(lead.leadCompanyName).trim()) ||
        (lead.profession && String(lead.profession).trim()) ||
        '';

    const stopCardGesture = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-dark-card p-3 text-start shadow-sm hover:border-primary/40 hover:shadow transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={
                onOpen
                    ? (e) => {
                          e.stopPropagation();
                          onOpen(lead);
                      }
                    : undefined
            }
            onKeyDown={
                onOpen
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpen(lead);
                          }
                      }
                    : undefined
            }
        >
            <div className="min-w-0">
                <MarqueeText
                    text={lead.name}
                    className="w-full"
                    contentClassName="text-sm font-semibold text-gray-900 dark:text-gray-100"
                />
                {subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            {phone ? (
                <div
                    className="mt-2 flex items-center gap-1.5 min-w-0"
                    dir="ltr"
                    onClick={stopCardGesture}
                    onPointerDown={stopCardGesture}
                    onKeyDown={stopCardGesture}
                >
                    <p className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300 tabular-nums">
                        {phone}
                    </p>
                    {showPhoneActions ? (
                        <div
                            className="inline-flex shrink-0 items-center gap-0.5"
                            role="group"
                            aria-label={t('phoneNumbers') || 'Phone actions'}
                        >
                            {onSms ? (
                                <button
                                    type="button"
                                    className={`${ICON_BTN} text-sky-600 dark:text-sky-400`}
                                    title={t('sendSms')}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        stopCardGesture(e);
                                        onSms(phone);
                                    }}
                                >
                                    <SmsIcon className="h-4 w-4" />
                                    <span className="sr-only">{t('sendSms')}</span>
                                </button>
                            ) : null}
                            {onWhatsApp ? (
                                <button
                                    type="button"
                                    className={`${ICON_BTN} text-green-600 dark:text-green-400`}
                                    title={t('whatsApp')}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        stopCardGesture(e);
                                        onWhatsApp(phone);
                                    }}
                                >
                                    <WhatsappIcon className="h-4 w-4" />
                                    <span className="sr-only">{t('whatsApp')}</span>
                                </button>
                            ) : null}
                            <a
                                href={`tel:${sanitizeTel(phone)}`}
                                className={`${ICON_BTN} text-violet-600 dark:text-violet-400`}
                                title={t('call')}
                                onClick={stopCardGesture}
                                onPointerDown={stopCardGesture}
                            >
                                <PhoneIcon className="h-4 w-4" />
                                <span className="sr-only">{t('call')}</span>
                            </a>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <LeadSourceBadge source={lead.source} t={t} />
                {lead.type ? (
                    <span className="inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:text-primary-200">
                        {t(String(lead.type).toLowerCase() as any) || lead.type}
                    </span>
                ) : null}
                {lead.priority ? (
                    <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${priorityClass(lead.priority)}`}
                    >
                        {t(String(lead.priority).toLowerCase() as any) || lead.priority}
                    </span>
                ) : null}
            </div>

            {assigneeName ? (
                <p className="mt-2 truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {assigneeName}
                </p>
            ) : (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                    {t('unassigned') || 'Unassigned'}
                </p>
            )}
        </div>
    );
};
