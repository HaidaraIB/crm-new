import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Button, PageLoadingState, RefreshButton, FilterButton } from '../components/index';
import { hasActiveFilters } from '../components/filters';
import { PhoneText } from '../components/PhoneText';
import { useLeadArrivals, useAcknowledgeLeadArrival } from '../hooks/useQueries';
import { getTextDirection } from '../utils/textDirection';
import {
  DEFAULT_ARRIVAL_DRAWER_FILTERS,
  arrivalFiltersToApiParams,
  matchesArrivalSearch,
} from '../utils/arrivalFilters';
import type { LeadArrival, LeadArrivalStatus } from '../types';

const STATUS_BADGE: Record<LeadArrivalStatus, { key: 'arrivalWaiting' | 'arrivalAcknowledged' | 'arrivalEscalated'; className: string }> = {
  waiting: { key: 'arrivalWaiting', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  acknowledged: { key: 'arrivalAcknowledged', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  escalated: { key: 'arrivalEscalated', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

/**
 * Today's walk-in arrivals board. Groups consecutive announcements for the same
 * lead into one row (announcement_count) so a stubborn re-announce inside the
 * cooldown window doesn't clutter the board with duplicate entries.
 */
export const ArrivalsPage = () => {
  const { t, arrivalFilters, setArrivalFilters, setIsArrivalsFilterDrawerOpen } = useAppContext();
  const statusFilter = arrivalFilters.status;

  const { data, isLoading, isFetching, refetch } = useLeadArrivals(
    arrivalFiltersToApiParams(arrivalFilters),
  );
  const acknowledgeMutation = useAcknowledgeLeadArrival();

  const results: LeadArrival[] = data?.results || [];
  const search = arrivalFilters.search;
  // Draft term: committed on submit only, never while typing — the board must not
  // reshuffle under the front desk mid-word.
  const [searchDraft, setSearchDraft] = useState(search);

  const grouped = useMemo(() => {
    const byClient = new Map<number, LeadArrival[]>();
    for (const arrival of results) {
      // Client-side: the arrivals endpoint has no search param.
      if (!matchesArrivalSearch(arrival, search)) continue;
      const list = byClient.get(arrival.client) || [];
      list.push(arrival);
      byClient.set(arrival.client, list);
    }
    return Array.from(byClient.values())
      .map((arrivals) => {
        const sorted = [...arrivals].sort(
          (a, b) => new Date(b.announced_at).getTime() - new Date(a.announced_at).getTime(),
        );
        return { latest: sorted[0], count: sorted.length };
      })
      .sort((a, b) => new Date(b.latest.announced_at).getTime() - new Date(a.latest.announced_at).getTime());
  }, [results, search]);

  // Drawer-owned axes only: the search bar and status chips speak for themselves.
  const isFiltered = hasActiveFilters(
    { date: arrivalFilters.date, mine: arrivalFilters.mine },
    DEFAULT_ARRIVAL_DRAWER_FILTERS,
  );
  /** Anything narrowing the board — decides which empty state to show. */
  const isNarrowed = isFiltered || search.trim().length > 0;

  return (
    <PageWrapper
      title={t('arrivals') || 'Arrivals'}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            scope="handler"
            onClick={() => refetch()}
            loading={isFetching && !isLoading}
          />
          <FilterButton
            onClick={() => setIsArrivalsFilterDrawerOpen(true)}
            hasActiveFilters={isFiltered}
          />
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setArrivalFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
          }}
        >
          <div className="relative flex-1">
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder={t('searchLeadByNameOrPhone')}
              className="w-full h-9 ps-3 pe-8 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-gray-100"
            />
            {searchDraft && (
              <button
                type="button"
                aria-label={t('clearFilters')}
                className="absolute inset-y-0 end-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onClick={() => {
                  setSearchDraft('');
                  setArrivalFilters((prev) => ({ ...prev, search: '' }));
                }}
              >
                ×
              </button>
            )}
          </div>
          <Button type="submit" disabled={searchDraft.trim() === search}>
            {t('search')}
          </Button>
        </form>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'waiting', 'acknowledged', 'escalated'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setArrivalFilters((prev) => ({ ...prev, status: s }))}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                statusFilter === s
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              {s === 'all' ? t('all') || 'All' : t(STATUS_BADGE[s].key)}
            </button>
          ))}
        </div>

        {/* The board defaults to today, so a non-default day/scope has to stay visible
            on the page — an empty board is otherwise read as "nobody arrived today". */}
        {isFiltered && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            {arrivalFilters.date && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                {t('date')}: {arrivalFilters.date}
              </span>
            )}
            {arrivalFilters.mine && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                {t('arrivalScopeMine')}
              </span>
            )}
            <button
              type="button"
              className="font-semibold text-primary-600 underline dark:text-primary-300"
              onClick={() =>
                setArrivalFilters((prev) => ({ ...prev, ...DEFAULT_ARRIVAL_DRAWER_FILTERS }))
              }
            >
              {t('clearFilters')}
            </button>
          </div>
        )}

        {isLoading ? (
          <PageLoadingState />
        ) : grouped.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            {isNarrowed
              ? t('noArrivalsMatchFilters')
              : t('noArrivalsToday') || 'No arrivals today.'}
          </p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {grouped.map(({ latest, count }) => {
              const badge = STATUS_BADGE[latest.status];
              // Set on the ROW, not a child — see CallCenterPage.tsx for why: item
              // order in a flex row follows the container's own direction, not each
              // item's, so the Understood button needs the row itself driven by the
              // lead name's script to always land on the opposite side of the name.
              const rowDir = getTextDirection(latest.client_name);
              return (
                <div key={latest.id} dir={rowDir} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {latest.client_name}
                      </p>
                      {count > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({count}{'×'})
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {t(badge.key)}
                      </span>
                      {latest.routing === 'owner_assignee_off_shift' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                          {t('arrivalAssigneeOffShift')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <PhoneText>{latest.client_phone}</PhoneText>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t('arrivalAnnouncedBy')}: {latest.announced_by_name || '—'} ·{' '}
                      {t('arrivalNotifiedTo')}: {latest.notified_user_names.join(', ') || '—'}
                    </p>
                  </div>
                  {latest.status !== 'acknowledged' && (
                    <Button
                      onClick={() => acknowledgeMutation.mutate(latest.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {t('understood') || 'Understood'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
