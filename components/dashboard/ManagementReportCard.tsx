import React from 'react';
import { dashboardSurface } from './dashboardStyles';
import { Button, Loader, TableHorizontalScroll } from '../index';
import type { AIManagementReportResponse } from '../../services/api';

type ManagementReportCardProps = {
  title: string;
  poweredByLabel: string;
  employeeSectionTitle: string;
  hotLeadsSectionTitle: string;
  activityLabel: string;
  tasksLabel: string;
  callsLabel: string;
  visitsLabel: string;
  assignedLeadsLabel: string;
  emptyEmployeesLabel: string;
  emptyHotLeadsLabel: string;
  refreshLabel: string;
  viewLeadLabel: string;
  report: AIManagementReportResponse | null | undefined;
  loading: boolean;
  generating: boolean;
  onRefresh: () => void;
  onViewLead: (clientId: number) => void;
  language: string;
};

function pickReportText(
  report: AIManagementReportResponse,
  enKey: 'employee_performance_en' | 'hot_leads_summary_en',
  arKey: 'employee_performance_ar' | 'hot_leads_summary_ar',
  language: string,
): string {
  const en = (report[enKey] || '').trim();
  const ar = (report[arKey] || '').trim();
  if (language === 'ar') return ar || en;
  return en || ar;
}

function pickLeadSummary(lead: AIManagementReportResponse['hot_leads'][0], language: string): string {
  const en = (lead.summary_en || '').trim();
  const ar = (lead.summary_ar || '').trim();
  if (language === 'ar') return ar || en;
  return en || ar;
}

export const ManagementReportCard = ({
  title,
  poweredByLabel,
  employeeSectionTitle,
  hotLeadsSectionTitle,
  activityLabel,
  tasksLabel,
  callsLabel,
  visitsLabel,
  assignedLeadsLabel,
  emptyEmployeesLabel,
  emptyHotLeadsLabel,
  refreshLabel,
  viewLeadLabel,
  report,
  loading,
  generating,
  onRefresh,
  onViewLead,
  language,
}: ManagementReportCardProps) => {
  const uiLanguage = language === 'ar' ? 'ar' : 'en';
  const employees = report?.employees ?? [];
  const hotLeads = report?.hot_leads ?? [];
  const employeeNarrative = report?.has_ai_summary
    ? pickReportText(report, 'employee_performance_en', 'employee_performance_ar', uiLanguage)
    : '';
  const hotNarrative = report?.has_ai_summary
    ? pickReportText(report, 'hot_leads_summary_en', 'hot_leads_summary_ar', uiLanguage)
    : '';

  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{title}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
              {poweredByLabel}
            </span>
          </div>
        </div>
        <Button variant="secondary" onClick={onRefresh} disabled={generating} loading={generating}>
          {refreshLabel}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader size="md" tone="muted" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {employeeSectionTitle}
            </h3>
            {employeeNarrative ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{employeeNarrative}</p>
            ) : null}
            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">{emptyEmployeesLabel}</p>
            ) : (
              <TableHorizontalScroll scrollClassName="rounded-xl border border-gray-100 dark:border-gray-700/90">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold">{activityLabel}</th>
                      <th className="px-3 py-2 text-center font-semibold">{tasksLabel}</th>
                      <th className="px-3 py-2 text-center font-semibold">{callsLabel}</th>
                      <th className="px-3 py-2 text-center font-semibold">{visitsLabel}</th>
                      <th className="px-3 py-2 text-center font-semibold">{assignedLeadsLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((row) => (
                      <tr
                        key={row.user_id}
                        className="border-t border-gray-100 dark:border-gray-800/80"
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {row.name}
                          <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-500">
                            {row.activity_total} {activityLabel.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.tasks_today}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.calls_today}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.visits_today}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{row.assigned_leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableHorizontalScroll>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {hotLeadsSectionTitle}
            </h3>
            {hotNarrative ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{hotNarrative}</p>
            ) : null}
            {hotLeads.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">{emptyHotLeadsLabel}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {hotLeads.map((lead) => {
                  const summary = pickLeadSummary(lead, uiLanguage);
                  return (
                    <div
                      key={lead.client_id}
                      className="rounded-2xl border border-gray-100 dark:border-gray-700/90 bg-gray-50/50 dark:bg-gray-950/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">{lead.name}</p>
                        {lead.ai_score != null ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                            {lead.ai_score}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {[lead.type, lead.priority, lead.assigned_to_name].filter(Boolean).join(' · ')}
                      </p>
                      {summary ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{summary}</p>
                      ) : null}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3 w-full"
                        onClick={() => onViewLead(lead.client_id)}
                      >
                        {viewLeadLabel}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
