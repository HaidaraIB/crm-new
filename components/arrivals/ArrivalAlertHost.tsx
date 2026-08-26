import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { usePendingLeadArrivals, useAcknowledgeLeadArrival, useSyncDigest } from '../../hooks/useQueries';
import { Button } from '../Button';
import { BellIcon } from '../icons';
import { PhoneText } from '../PhoneText';
import {
  preloadArrivalRingtone,
  startArrivalRingtone,
  stopArrivalRingtone,
} from '../../utils/arrivalRingtone';

/**
 * Global "customer arrived" alert for whoever the arrival was routed to.
 * Mirrors PbxScreenPopListener's mounting pattern (one global listener in TheApp),
 * but is driven by /lead-arrivals/pending/ instead of the notification inbox.
 *
 * Presented as a centered, ringing call-style dialog (same shape as an incoming
 * WhatsApp call): a customer standing at the desk has to interrupt whatever the
 * recipient is doing, which a corner toast did not. Simultaneous arrivals queue
 * one behind the other — a second walk-in must never silently hide the first.
 */
export const ArrivalAlertHost = () => {
  const { t, currentUser } = useAppContext();
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const acknowledgeMutation = useAcknowledgeLeadArrival();

  // The digest already reports whether anything is pending, so the detail query only
  // runs when there is something to fetch — the same gate WhatsAppCallListener uses
  // for ringing calls. Polling /lead-arrivals/pending/ unconditionally every 20s meant
  // every logged-in tab paid for it all day to render nothing.
  const { data: digest } = useSyncDigest({
    enabled: Boolean(currentUser),
    refetchInterval: false,
  });
  const hasPending = (digest?.arrivals_pending ?? 0) > 0;

  const { data: pending } = usePendingLeadArrivals({
    enabled: Boolean(currentUser?.company?.id) && hasPending,
  });

  // Disabling a query stops it refetching but does NOT clear what it already
  // fetched, so `pending` still holds the last arrival after it stops being
  // pending — acknowledged by a colleague, or aged past the 2h window. The digest
  // count is the authority on whether anything is outstanding; without this the
  // card would sit on screen until the tab was reloaded.
  const arrivals = hasPending ? pending || [] : [];

  const queue = arrivals.filter((a) => !dismissedIds.has(a.id));
  const current = queue[0] ?? null;
  const waitingBehind = Math.max(queue.length - 1, 0);

  useEffect(() => {
    if (!currentUser) return;
    preloadArrivalRingtone();
  }, [currentUser]);

  useEffect(() => {
    if (!current) {
      stopArrivalRingtone();
      return;
    }
    startArrivalRingtone();
    return () => stopArrivalRingtone();
  }, [current?.id]);

  if (!current) return null;

  const acknowledge = (arrivalId: number) => {
    stopArrivalRingtone();
    setDismissedIds((prev) => new Set(prev).add(arrivalId));
    acknowledgeMutation.mutate(arrivalId);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={t('customerReception')}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-primary-300/80 bg-white text-center shadow-2xl dark:border-primary-700/60 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary-400/40" />
            <BellIcon className="relative h-7 w-7" />
          </span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {t('customerReception')}
          </p>
          <p dir="auto" className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {current.client_name}
          </p>
          {current.client_phone ? (
            <PhoneText as="p" className="font-mono text-base text-gray-600 dark:text-gray-300">
              {current.client_phone}
            </PhoneText>
          ) : null}
          {waitingBehind > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('moreArrivalsWaiting').replace('{count}', String(waitingBehind))}
            </p>
          ) : null}
        </div>
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <Button
            className="w-full"
            onClick={() => acknowledge(current.id)}
            disabled={acknowledgeMutation.isPending}
          >
            {t('understood')}
          </Button>
        </div>
      </div>
    </div>
  );
};
