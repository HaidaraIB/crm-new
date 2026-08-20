import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { usePendingLeadArrivals, useAcknowledgeLeadArrival, useSyncDigest } from '../../hooks/useQueries';
import { Button } from '../Button';
import { BellIcon } from '../icons';
import { PhoneText } from '../PhoneText';

const MAX_VISIBLE_CARDS = 3;

/**
 * Global in-app "customer arrived" cards for whoever the arrival was routed to.
 * Mirrors PbxScreenPopListener's mounting pattern (one global listener in TheApp),
 * but is driven by /lead-arrivals/pending/ instead of the notification inbox.
 * Stacks multiple simultaneous arrivals vertically instead of one card silently
 * replacing another (a second walk-in must never hide the first).
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

  const visible = arrivals.filter((a) => !dismissedIds.has(a.id)).slice(0, MAX_VISIBLE_CARDS);

  if (visible.length === 0) return null;

  const acknowledge = (arrivalId: number) => {
    setDismissedIds((prev) => new Set(prev).add(arrivalId));
    acknowledgeMutation.mutate(arrivalId);
  };

  return (
    <div
      className="pointer-events-none fixed bottom-0 end-0 z-[90] flex flex-col-reverse gap-3 p-4 sm:p-6"
      aria-live="polite"
    >
      {visible.map((arrival) => (
        <div
          key={arrival.id}
          role="status"
          className="pointer-events-auto w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-primary-300/80 bg-white/95 shadow-xl backdrop-blur-sm dark:border-primary-700/60 dark:bg-gray-900/95"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <BellIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('customerArrived') || 'Customer arrived'}
              </p>
              <p dir="auto" className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                {arrival.client_name}
              </p>
              {arrival.client_phone ? (
                <PhoneText as="p" className="mt-1 font-mono text-base text-gray-900 dark:text-gray-100">
                  {arrival.client_phone}
                </PhoneText>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-8 px-3 text-xs"
                  onClick={() => acknowledge(arrival.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  {t('understood') || 'Understood'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
