import React from 'react';
import { dashboardSurface } from '../dashboard/dashboardStyles';
import { reportTableChrome, reportTheadRow, reportTableRowInteractive, reportTbodyCell } from './reportStyles';

type ReportTableCardProps = {
  title: string;
  children?: React.ReactNode;
  /** When empty, show this message instead of table body */
  empty?: boolean;
  emptyMessage: string;
  minWidth?: number;
};

export const ReportTableCard = ({ title, children, empty, emptyMessage, minWidth = 800 }: ReportTableCardProps) => (
  <div className={`${dashboardSurface} p-5 sm:p-6`}>
    <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-700/80 flex flex-wrap items-end justify-between gap-3">
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h3>
    </div>
    {empty ? (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-950/30 py-14 px-6 text-center">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{emptyMessage}</p>
      </div>
    ) : (
      <div className={`${reportTableChrome} py-2 px-1`}>
        <div style={{ minWidth }}>
          <table className="w-full text-sm text-center rtl:text-right text-gray-600 dark:text-gray-400">{children}</table>
        </div>
      </div>
    )}
  </div>
);

/** Table shell pieces for use inside ReportTableCard children */
export const ReportTableDefaults = {
  theadRow: reportTheadRow,
  tbodyRow: reportTableRowInteractive,
  tbodyCell: reportTbodyCell,
};
