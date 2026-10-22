import React from 'react';

/**
 * Shared table building blocks. Every header and cell is centered so values sit
 * under their column header in both LTR and RTL — see `.cursor/rules/tables.mdc`.
 * Wrap wide tables in `TableHorizontalScroll`.
 */

type CellProps = React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode };
type HeaderCellProps = React.ThHTMLAttributes<HTMLTableHeaderCellElement> & { children?: React.ReactNode };

export const DataTable = ({ className = '', children, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full text-center ${className}`} {...rest}>
    {children}
  </table>
);

export const TableHead = ({ children }: { children: React.ReactNode }) => (
  <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
    <tr>{children}</tr>
  </thead>
);

export const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">{children}</tbody>
);

export const TableRow = ({ className = '', children, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${className}`} {...rest}>
    {children}
  </tr>
);

export const Th = ({ className = '', children, ...rest }: HeaderCellProps) => (
  <th
    scope="col"
    className={`whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export const Td = ({ className = '', children, ...rest }: CellProps) => (
  <td className={`px-4 py-3 text-center align-middle text-sm text-gray-800 dark:text-gray-200 ${className}`} {...rest}>
    {children}
  </td>
);

/** Row-level actions (IconButtons, small Buttons), centered under the Actions header. */
export const TableActions = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <div className={`flex items-center justify-center gap-1 ${className}`}>{children}</div>
);

/** Full-width row for loading / empty / no-results messages. */
export const TableMessageRow = ({ colSpan, children }: { colSpan: number; children: React.ReactNode }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      {children}
    </td>
  </tr>
);
