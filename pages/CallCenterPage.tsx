import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Input, Button, PageLoadingState } from '../components/index';
import { PhoneText } from '../components/PhoneText';
import { useLeads, useAnnounceLeadArrival } from '../hooks/useQueries';
import { getCompanyRoute } from '../utils/routing';
import { getTextDirection } from '../utils/textDirection';
import { resolvePrimaryPhone } from '../utils/resolvePrimaryPhone';

const SEARCH_STORAGE_KEY = 'callCenterSearch';

function loadPersistedSearch(): string {
  try {
    return sessionStorage.getItem(SEARCH_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Front-desk lead search: CALL_CENTER can look up a walk-in by name/phone, announce
 * their arrival, or jump to CreateLead when nobody is found. Search term persists
 * across navigating away and back (e.g. after announcing an arrival) via sessionStorage.
 */
export const CallCenterPage = () => {
  const { t, currentUser } = useAppContext();
  const [searchInput, setSearchInput] = useState(loadPersistedSearch);
  const [search, setSearch] = useState(loadPersistedSearch);
  const [announcedIds, setAnnouncedIds] = useState<Record<number, string>>({});

  const { data, isLoading, isFetching } = useLeads(
    search ? { search } : undefined,
    1,
    { enabled: Boolean(search) },
    20,
  );
  const results = data?.results || [];
  const announceMutation = useAnnounceLeadArrival();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearch(trimmed);
    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, trimmed);
    } catch {
      // ignore quota / private mode
    }
  };

  const goToCreateLead = () => {
    const route = getCompanyRoute(currentUser?.company?.name, currentUser?.company?.domain, 'CreateLead');
    window.location.assign(route);
  };

  const handleAnnounce = (leadId: number) => {
    announceMutation.mutate(
      { clientId: leadId },
      {
        onSuccess: (arrival) => {
          setAnnouncedIds((prev) => ({ ...prev, [leadId]: arrival.status }));
        },
        onError: (err: any) => {
          // Cooldown 409: the desk double-tapped or another agent just announced
          // this same lead — treat it as already-announced, not a hard failure.
          if (err?.code === 'arrival_cooldown_active') {
            setAnnouncedIds((prev) => ({ ...prev, [leadId]: 'waiting' }));
          }
        },
      },
    );
  };

  return (
    <PageWrapper title={t('callCenter') || 'Call Center'}>
      <div className="max-w-3xl mx-auto space-y-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="call-center-search"
              placeholder={t('searchLeadByNameOrPhone') || 'Search by name or phone'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={!searchInput.trim()}>
            {t('search') || 'Search'}
          </Button>
        </form>

        {isLoading || isFetching ? (
          <PageLoadingState />
        ) : search && results.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('leadNotFoundCreateOne') || 'No matching lead found.'}
            </p>
            <Button onClick={goToCreateLead}>{t('createLead') || 'Create Lead'}</Button>
          </div>
        ) : results.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((lead: any) => {
              const announced = announcedIds[lead.id];
              // Set on the ROW (flex container), not a child: item order in a flex
              // row is decided by the container's own direction, not each item's.
              // `dir="auto"` on a nested item only flips that item's text alignment
              // and leaves it pinned to the page's ambient side — which glues the
              // action button next to the name instead of opposite it whenever the
              // name's script differs from the page language. Driving the row's
              // direction from the name itself keeps both "name near start, button
              // at the opposite end" and "name alignment matches its own script"
              // true together, for either script.
              const rowDir = getTextDirection(lead.name);
              // `normalizeLead` (used by `useLeads`) only spreads raw API fields through —
              // it does not resolve a display `phone`, unlike `mapApiLeadToDisplayLead`
              // (used by lead detail/edit pages). Resolve it here the same way, from the
              // raw `phone_number` / `phone_numbers` fields the search API actually sends.
              const phone = resolvePrimaryPhone({
                phone: lead.phone_number || lead.phone || '',
                phoneNumbers: lead.phone_numbers || lead.phoneNumbers || [],
              });
              return (
                <div key={lead.id} dir={rowDir} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {lead.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {phone ? <PhoneText>{phone}</PhoneText> : <span>—</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {lead.assigned_to_username || lead.assignedToName ? (
                        <span>{lead.assigned_to_username || lead.assignedToName}</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          {t('unassigned') || 'Unassigned'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {announced ? (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                        {t('arrivalAnnouncedToast') || 'Arrival announced'}
                      </span>
                    ) : (
                      <Button
                        className="whitespace-nowrap"
                        onClick={() => handleAnnounce(lead.id)}
                        disabled={announceMutation.isPending}
                      >
                        {t('announceArrival') || 'Customer arrived'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            {t('searchLeadByNameOrPhone') || 'Search by name or phone to find a lead.'}
          </p>
        )}
      </div>
    </PageWrapper>
  );
};
