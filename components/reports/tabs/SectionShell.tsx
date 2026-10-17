import React from 'react';
import { useReportSection } from '../../../hooks/useQueries';
import type { ReportQuery, ReportSection, ReportSectionMap } from '../../../services/reportsTypes';
import type { DrillTarget } from '../LeadDrilldownDrawer';
import { DataQualityBanner, ReportError, ReportSkeleton } from '../ReportKit';

export type TabProps = {
  query: ReportQuery;
  onDrill: (target: DrillTarget) => void;
};

/** Loads one report section and handles the loading / error / stale-while-refreshing states once. */
export const SectionShell = <S extends ReportSection>({
  section,
  query,
  children,
}: {
  section: S;
  query: ReportQuery;
  children: (data: ReportSectionMap[S], isRefreshing: boolean) => React.ReactNode;
}) => {
  const { data, isLoading, isFetching, isError, refetch } = useReportSection(section, query);
  if (isLoading) return <ReportSkeleton />;
  if (isError && !data) return <ReportError onRetry={() => refetch()} />;
  if (!data) return null;
  return (
    <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-70' : ''}`} aria-busy={isFetching}>
      <DataQualityBanner meta={data.meta} />
      {children(data as ReportSectionMap[S], isFetching)}
    </div>
  );
};

export const thCls = 'px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-start whitespace-nowrap';
export const tdCls = 'px-3 py-3 text-sm text-gray-900 dark:text-gray-100 text-start align-middle';
export const rowCls = 'border-b border-gray-100 dark:border-gray-800/70 hover:bg-gray-50/70 dark:hover:bg-gray-800/40';

/** Plain scrollable table used by every tab, so spacing and RTL behaviour stay identical. */
export const DataTable = ({
  head,
  children,
  minWidth = 640,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  minWidth?: number;
}) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700/80">
    <table className="w-full" style={{ minWidth }}>
      <thead className="bg-gray-50/80 dark:bg-gray-800/60">
        <tr>
          {head.map((h, i) => (
            <th key={i} scope="col" className={thCls}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** A number that opens the lead list behind it when clickable. */
export const DrillNumber = ({ value, onClick }: { value: number; onClick?: () => void }) =>
  onClick && value > 0 ? (
    <button type="button" onClick={onClick} className="font-semibold tabular-nums text-primary-700 hover:underline dark:text-primary-300">
      {value.toLocaleString('en-US')}
    </button>
  ) : (
    <span className="tabular-nums">{value.toLocaleString('en-US')}</span>
  );
