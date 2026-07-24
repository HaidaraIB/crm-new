import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { Button } from './Button';
import {
  deleteNotificationAPI,
  getNotificationsAPI,
  getNotificationsUnreadCountAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
  type AppNotification,
} from '../services/api';
import { formatDateTimeToLocal } from '../utils/dateUtils';
import { getCompanyViewLeadRoute, navigateToCompanyRoute } from '../utils/routing';

const NOTIFICATIONS_QK = ['notifications', 'list'] as const;
const NOTIFICATIONS_UNREAD_QK = ['notifications', 'unread-count'] as const;

function isTenantChatEcho(n: AppNotification): boolean {
  const k = n.data?.kind;
  return k === 'tenant_chat';
}

function payloadId(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type NotificationsDialogProps = {
  onClose: () => void;
};

export const NotificationsDialog = ({ onClose }: NotificationsDialogProps) => {
  const { t, setCurrentPage, setSelectedLead, currentUser } = useAppContext();
  const queryClient = useQueryClient();
  const companyName = currentUser?.company?.name;
  const companyDomain = currentUser?.company?.domain;

  const listQuery = useQuery({
    queryKey: NOTIFICATIONS_QK,
    queryFn: () => getNotificationsAPI({ page: 1, page_size: 100 }),
  });

  const invalidateInbox = () => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QK });
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_QK });
  };

  const markOne = useMutation({
    mutationFn: (id: number) => markNotificationReadAPI(id),
    onSuccess: invalidateInbox,
  });

  const deleteOne = useMutation({
    mutationFn: (id: number) => deleteNotificationAPI(id),
    onSuccess: invalidateInbox,
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsReadAPI(),
    onSuccess: invalidateInbox,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (markAll.isPending || markOne.isPending || deleteOne.isPending) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, markAll.isPending, markOne.isPending, deleteOne.isPending]);

  const openLead = (leadId: number) => {
    setSelectedLead({ id: leadId } as any);
    window.history.pushState(
      {},
      '',
      getCompanyViewLeadRoute(companyName, companyDomain, leadId),
    );
    setCurrentPage('ViewLead');
    onClose();
  };

  const openPage = (page: Parameters<typeof setCurrentPage>[0]) => {
    navigateToCompanyRoute(companyName, companyDomain, page);
    setCurrentPage(page);
    onClose();
  };

  const navigateFromNotification = (n: AppNotification) => {
    const leadId = payloadId(n.data?.lead_id ?? n.data?.client_id);
    const type = n.type;

    if ((type === 'pbx_incoming_call' || type === 'pbx_call_missed') && leadId) {
      openLead(leadId);
      return;
    }
    if (
      (type === 'whatsapp_message_received' ||
        type === 'whatsapp_template_sent' ||
        type === 'whatsapp_send_failed' ||
        type === 'whatsapp_waiting_response') &&
      leadId
    ) {
      if (leadId) setSelectedLead({ id: leadId } as any);
      openPage('WhatsApp');
      return;
    }
    if (
      type === 'lead_assigned' ||
      type === 'lead_status_changed' ||
      type === 'lead_transferred' ||
      type === 'lead_updated' ||
      type === 'new_lead' ||
      type === 'team_activity' ||
      type === 'lead_reminder' ||
      type === 'lead_no_follow_up' ||
      type === 'lead_reengaged' ||
      type === 'lead_contact_failed'
    ) {
      if (leadId) {
        openLead(leadId);
        return;
      }
      openPage('All Leads');
      return;
    }
    if (
      type === 'deal_created' ||
      type === 'deal_updated' ||
      type === 'deal_closed' ||
      type === 'deal_reminder'
    ) {
      openPage('Deals');
      return;
    }
    if (
      type === 'task_created' ||
      type === 'task_reminder' ||
      type === 'task_completed' ||
      type === 'call_reminder' ||
      type === 'visit_reminder' ||
      type === 'field_visit_reminder' ||
      type === 'reception_visit_reminder' ||
      type === 'reception_field_visit_reminder'
    ) {
      if (leadId) {
        openLead(leadId);
        return;
      }
      openPage('Activities');
      return;
    }
    if (
      type === 'campaign_performance' ||
      type === 'campaign_low_performance' ||
      type === 'campaign_stopped' ||
      type === 'campaign_budget_alert'
    ) {
      openPage('Campaigns');
      return;
    }
    if (type === 'daily_report' || type === 'weekly_report' || type === 'top_employee') {
      openPage('Reports');
    }
  };

  const rawItems: AppNotification[] = listQuery.data?.results ?? [];
  const items = rawItems.filter((n) => !isTenantChatEcho(n));
  const unreadInList = items.filter((n) => !n.read).length;
  const actionsBusy = markOne.isPending || deleteOne.isPending || markAll.isPending;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-dialog-title"
        className="flex max-h-[90vh] w-full max-w-[min(36rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="min-w-0">
            <h2 id="notifications-dialog-title" className="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {t('notificationsTitle')}
            </h2>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t('notificationsSubtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {unreadInList > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="whitespace-nowrap px-3 py-1.5 text-xs"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                {t('notificationsMarkAllRead')}
              </Button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-2xl leading-none text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label={t('close')}
            >
              ×
            </button>
          </div>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {t('searchEllipsis')}
            </div>
          ) : listQuery.isError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-200"
            >
              {t('notificationsCouldNotLoad')}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                <span className="text-2xl" aria-hidden>
                  ✓
                </span>
              </div>
              <p className="max-w-xs text-sm text-gray-600 dark:text-gray-400">{t('notificationsEmpty')}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li key={n.id}>
                  <div
                    className={`rounded-xl border px-3 py-3 text-start transition-colors ${
                      n.read
                        ? 'border-gray-200/80 bg-white/80 dark:border-gray-600 dark:bg-gray-800/80'
                        : 'border-primary/25 bg-white shadow-sm ring-1 ring-primary/15 dark:border-primary/30 dark:bg-gray-800/90 dark:ring-primary/20'
                    } hover:border-primary/40 dark:hover:border-primary/35`}
                  >
                    <button
                      type="button"
                      disabled={actionsBusy}
                      onClick={() => {
                        if (!n.read) markOne.mutate(n.id);
                        navigateFromNotification(n);
                      }}
                      className="w-full text-start disabled:opacity-60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {n.title}
                          </span>
                          {n.type === 'pbx_incoming_call' ? (
                            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {t('incomingCall')}
                            </span>
                          ) : n.type === 'pbx_call_missed' ? (
                            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {t('pbxMissedCall')}
                            </span>
                          ) : n.type_display ? (
                            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {n.type_display}
                            </span>
                          ) : null}
                        </span>
                        {!n.read ? (
                          <span
                            className="mt-0.5 size-2 shrink-0 rounded-full bg-primary"
                            aria-label={t('notificationsUnreadBadge')}
                          />
                        ) : null}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {n.body}
                      </p>
                      <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500" dir="ltr">
                        {n.created_at || n.sent_at
                          ? formatDateTimeToLocal(n.created_at ?? n.sent_at)
                          : '—'}
                      </p>
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700/80">
                      {!n.read ? (
                        <button
                          type="button"
                          disabled={actionsBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            markOne.mutate(n.id);
                          }}
                          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                        >
                          {t('notificationsMarkRead')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={actionsBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOne.mutate(n.id);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {t('notificationsDelete')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export function useNotificationsUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_QK,
    queryFn: () => getNotificationsUnreadCountAPI(),
    enabled,
    select: (d) => d.unread_count ?? 0,
    refetchInterval: 30_000,
  });
}
