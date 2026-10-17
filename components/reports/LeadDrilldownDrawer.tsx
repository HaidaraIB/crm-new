import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useLeadJourney, useReportLeadList } from '../../hooks/useQueries';
import type { ReportLeadListQuery, ReportLeadRow } from '../../services/reportsTypes';
import { formatDuration } from '../../utils/reportFormat';
import { responseKindLabel, sourceLabel } from '../../utils/reportLabels';
import { seedLabel } from '../../utils/seedLabels';
import { ArrowLeftIcon, XIcon } from '../icons';
import { PhoneText } from '../PhoneText';
import { EmptyState, ReportSkeleton, ResponseTimeCell } from './ReportKit';

export type DrillTarget = { title: string; query: ReportLeadListQuery };

const formatWhen = (iso: string | null | undefined, locale: string) =>
  iso
    ? new Date(iso).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

/** One lead's full status path and assignment history, fetched on demand. */
const JourneyPanel = ({ clientId, locale }: { clientId: number; locale: string }) => {
  const { t, language } = useAppContext();
  const { data, isLoading } = useLeadJourney(clientId);
  if (isLoading || !data) return <div className="p-3 text-xs text-gray-400">{t('loading')}…</div>;
  return (
    <div className="grid gap-4 p-3 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('reportStatusPath')}</p>
        <ol className="space-y-2 border-s-2 border-primary-200 ps-3 dark:border-primary-900">
          {data.status_path.map((s, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{seedLabel(s.status, language)}</span>
              <span className="ms-2 text-xs text-gray-500">
                {formatWhen(s.entered_at, locale)} · {formatDuration(s.seconds_in_status, t)}
                {s.changed_by ? ` · ${s.changed_by}` : ''}
                {s.is_backfilled ? ` · ${t('reportReconstructed')}` : ''}
              </span>
              {s.reason ? <p className="text-xs italic text-gray-500">“{s.reason}”</p> : null}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('reportHandledBy')}</p>
        <ul className="space-y-2">
          {data.assignments.map((a, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{a.user}</span>
              <span className="ms-2 text-xs text-gray-500">
                {formatWhen(a.assigned_at, locale)} → {a.ended_at ? formatWhen(a.ended_at, locale) : t('reportNow')}
              </span>
              <div className="text-xs text-gray-500">
                {a.first_response_at
                  ? `${t('reportFirstResponse')}: ${responseKindLabel(a.first_response_kind, t)} · ${formatDuration(
                      a.business_response_seconds ?? a.response_seconds,
                      t,
                    )}`
                  : t('reportNoResponseYet')}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const LeadDrilldownDrawer = ({ target, onClose }: { target: DrillTarget | null; onClose: () => void }) => {
  const { t, language, openLeadDetails } = useAppContext();
  const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openJourney, setOpenJourney] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setDebounced('');
    setOpenJourney(null);
  }, [target]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const { data, isLoading, isFetching } = useReportLeadList(
    target ? { ...target.query, search: debounced || undefined, page, page_size: 25 } : null,
  );
  if (!target) return null;

  const pages = data ? Math.max(1, Math.ceil(data.count / data.page_size)) : 1;
  const open = (row: ReportLeadRow) => {
    onClose();
    openLeadDetails({ id: row.id } as any);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" aria-hidden onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={target.title}
        className="fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-4xl flex-col border-s bg-card shadow-2xl dark:border-gray-800 dark:bg-dark-card"
      >
        <header className="flex h-16 items-center justify-between gap-3 border-b p-4 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{target.title}</h2>
            <p className="text-xs text-gray-500">
              {data ? `${data.count.toLocaleString('en-US')} ${t('reportLeadsCount')}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <div className="border-b p-3 dark:border-gray-800">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reportSearchLeads')}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isFetching ? 'opacity-70' : ''}`}>
          {isLoading ? (
            <div className="p-4"><ReportSkeleton /></div>
          ) : !data?.results.length ? (
            <div className="p-6"><EmptyState message={t('reportNoLeads')} /></div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.results.map((row) => (
                <li key={row.id}>
                  <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <button type="button" onClick={() => open(row)} className="block max-w-full truncate text-start font-semibold text-primary-700 hover:underline dark:text-primary-300">
                        {row.name || `#${row.id}`}
                      </button>
                      <div className="text-xs text-gray-500">
                        {row.phone_number ? <PhoneText>{row.phone_number}</PhoneText> : null}
                        {row.phone_number ? ' · ' : ''}
                        {sourceLabel(row.source, t)} · {formatWhen(row.created_at, locale)}
                      </div>
                    </div>
                    <div className="min-w-0 text-sm">
                      <div className="truncate font-medium">{seedLabel(row.status, language) || '—'}</div>
                      <div className="truncate text-xs text-gray-500">{row.assigned_to || t('reportUnassigned')}</div>
                    </div>
                    <div className="text-sm">
                      <ResponseTimeCell business={row.business_response_seconds} wall={row.response_seconds} />
                      {row.first_response_kind ? (
                        <div className="text-[11px] text-gray-500">{responseKindLabel(row.first_response_kind, t)}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenJourney(openJourney === row.id ? null : row.id)}
                      aria-expanded={openJourney === row.id}
                      className="h-9 rounded-lg border border-gray-300 px-3 text-xs font-semibold hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      {t('reportJourney')}
                    </button>
                  </div>
                  {row.status_path.length > 1 ? (
                    <p className="px-4 pb-3 text-xs text-gray-500" dir="auto">
                      {row.status_path.map((s) => seedLabel(s, language)).join(' → ')}
                    </p>
                  ) : null}
                  {openJourney === row.id ? (
                    <div className="border-t bg-gray-50/60 dark:border-gray-800 dark:bg-gray-950/30">
                      <JourneyPanel clientId={row.id} locale={locale} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="flex items-center justify-between border-t p-3 dark:border-gray-800">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-40 dark:border-gray-600"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('previous')}
          </button>
          <span className="text-sm tabular-nums text-gray-500">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-40 dark:border-gray-600"
          >
            {t('next')}
            <ArrowLeftIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
          </button>
        </footer>
      </aside>
    </>
  );
};
