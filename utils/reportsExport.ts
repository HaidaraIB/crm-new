import ExcelJS from 'exceljs';
import type { ReportSection, ReportSectionMap } from '../services/reportsTypes';
import { downloadCsv } from './reportExport';
import { BUCKET_LABEL_KEYS, responseKindLabel, sourceLabel } from './reportLabels';
import { seedLabel } from './seedLabels';

type Translate = (key: string) => string;
export type SheetData = { name: string; headers: string[]; rows: Array<Array<string | number>> };

const n = (v: number | null | undefined): string | number => (v == null ? '' : v);

/** Every sheet a section contributes. Durations are exported as plain seconds so they stay sortable. */
export function buildSheets<S extends ReportSection>(
  section: S,
  data: ReportSectionMap[S],
  t: Translate,
  language: string,
): SheetData[] {
  const sec = t('reportUnitSecond');
  const label = (s: string) => seedLabel(s, language);
  const d = data as any;

  switch (section) {
    case 'overview': {
      const c = d.current;
      const p = d.previous;
      const rows: Array<[string, number | null | undefined, number | null | undefined]> = [
        [t('reportNewLeads'), c.new_leads, p?.new_leads],
        [t('reportAssignments'), c.assignments, p?.assignments],
        [t('reportLeadsWorked'), c.leads_worked, p?.leads_worked],
        [`${t('reportMedianResponse')} (${t('reportBusinessTime')}, ${sec})`, c.response_time.business.median, p?.response_time.business.median],
        [`${t('reportMedianResponse')} (${t('reportWallTime')}, ${sec})`, c.response_time.wall.median, p?.response_time.wall.median],
        [`${t('reportWithinSla')} %`, c.within_sla_pct, p?.within_sla_pct],
        [t('reportStatusChanges'), c.status_changes, p?.status_changes],
        [t('reportCalls'), c.calls, p?.calls],
        [t('reportDealsWon'), c.deals_won, p?.deals_won],
        [t('reportRevenue'), c.revenue, p?.revenue],
        [`${t('reportConversionRate')} %`, c.conversion_rate, p?.conversion_rate],
      ];
      return [
        {
          name: t('reportTabOverview'),
          headers: [t('reportMetric'), t('reportCurrentPeriod'), ...(p ? [t('reportPreviousPeriod')] : [])],
          rows: rows.map(([k, cur, prev]) => [k, n(cur), ...(p ? [n(prev)] : [])]),
        },
      ];
    }
    case 'leads':
      return [
        {
          name: t('reportTabLeads'),
          headers: [t('reportMetric'), t('reportLeadsCountShort')],
          rows: [
            [t('reportNewLeads'), d.funnel.created],
            [t('reportAssigned'), d.funnel.assigned],
            [t('reportTouched'), d.funnel.touched],
            [t('reportUnassigned'), d.unassigned],
            ...d.by_source.map((r: any) => [`${t('reportSource')}: ${sourceLabel(String(r.key), t)}`, r.count]),
            ...d.by_campaign.map((r: any) => [`${t('reportCampaign')}: ${r.label}`, r.count]),
            ...d.by_assignee.map((r: any) => [`${t('employee')}: ${r.label}`, r.count]),
          ],
        },
        {
          name: t('reportStatusAsOfEnd').slice(0, 31),
          headers: [t('status'), t('reportLeadsCountShort')],
          rows: d.status_as_of_end.map((r: any) => [label(r.status), r.count]),
        },
      ];
    case 'status-journey':
      return [
        {
          name: t('reportTransitionMatrix').slice(0, 31),
          headers: [t('reportFromStatus'), t('reportToStatus'), t('reportLeadsCountShort')],
          rows: d.matrix.map((r: any) => [label(r.from), label(r.to), r.count]),
        },
        {
          name: t('reportTimeInStatus').slice(0, 31),
          headers: [t('status'), `${t('reportAverage')} (${sec})`, `${t('reportMedian')} (${sec})`, `P90 (${sec})`, t('reportSamples')],
          rows: d.time_in_status.map((r: any) => [label(r.status), n(r.avg), n(r.median), n(r.p90), r.count]),
        },
        {
          name: t('reportCommonPaths').slice(0, 31),
          headers: [t('reportCommonPaths'), t('reportLeadsCountShort')],
          rows: d.common_paths.map((r: any) => [r.path.split(' → ').map(label).join(' → '), r.leads]),
        },
      ];
    case 'response-time':
      return [
        {
          name: t('reportByEmployee').slice(0, 31),
          headers: [
            t('employee'),
            t('reportAssignments'),
            t('reportResponded'),
            t('reportWaitingNow'),
            t('reportMissed'),
            `${t('reportMedian')} ${t('reportBusinessTime')} (${sec})`,
            `${t('reportMedian')} ${t('reportWallTime')} (${sec})`,
            `P90 ${t('reportBusinessTime')} (${sec})`,
            `P90 ${t('reportWallTime')} (${sec})`,
            `${t('reportWithinSla')} %`,
          ],
          rows: d.employees.map((e: any) => [
            e.name,
            e.assignments,
            e.responded,
            e.pending,
            e.missed,
            n(e.business.median),
            n(e.wall.median),
            n(e.business.p90),
            n(e.wall.p90),
            n(e.within_sla_pct),
          ]),
        },
        {
          name: t('reportResponseDistribution').slice(0, 31),
          headers: [t('reportBucket'), t('reportBusinessTime'), t('reportWallTime')],
          rows: d.distribution.business.map((b: any, i: number) => [
            t(BUCKET_LABEL_KEYS[b.bucket as keyof typeof BUCKET_LABEL_KEYS]),
            b.count,
            d.distribution.wall[i].count,
          ]),
        },
        {
          name: t('reportHowTheyResponded').slice(0, 31),
          headers: [t('reportHowTheyResponded'), t('reportLeadsCountShort')],
          rows: d.by_kind.map((k: any) => [responseKindLabel(k.kind, t), k.count]),
        },
      ];
    case 'employees':
      return [
        {
          name: t('reportEmployeeScorecard').slice(0, 31),
          headers: [
            t('employee'),
            t('reportLeadsAssigned'),
            t('reportTouched'),
            `${t('reportTouchRate')} %`,
            `${t('reportMedianResponse')} (${sec})`,
            t('reportCalls'),
            t('reportAnswered'),
            t('reportMissed'),
            t('reportTasks'),
            t('reportVisits'),
            'WhatsApp',
            'SMS',
            t('reportStatusChanges'),
            t('reportDealsCreated'),
            t('reportDealsWon'),
            t('reportRevenue'),
            `${t('reportWorkedHours')} (${sec})`,
          ],
          rows: d.rows.map((r: any) => [
            r.name,
            r.leads_assigned,
            r.leads_touched,
            n(r.touch_rate),
            n(r.response_business.median),
            r.calls.total,
            r.calls.answered,
            r.calls.missed,
            r.tasks,
            r.visits,
            r.whatsapp_sent,
            r.sms_sent,
            r.status_changes,
            r.deals_created,
            r.deals_won,
            r.revenue,
            r.worked_seconds,
          ]),
        },
      ];
    case 'sources': {
      const header = [
        t('reportConvertedLeads'),
        `${t('reportConversionRate')} %`,
        t('reportDealsWon'),
        t('reportRevenue'),
        `${t('reportAvgResponse')} (${sec})`,
      ];
      const row = (name: string, r: any) => [
        name,
        r.leads,
        r.converted_leads,
        r.conversion_rate,
        r.deals_won,
        r.revenue,
        n(r.avg_business_response_seconds),
      ];
      return [
        {
          name: t('reportSource').slice(0, 31),
          headers: [t('reportSource'), t('reportLeadsCountShort'), ...header],
          rows: d.by_source.map((r: any) => row(sourceLabel(String(r.key), t), r)),
        },
        {
          name: t('reportCampaign').slice(0, 31),
          headers: [t('reportCampaign'), t('reportLeadsCountShort'), ...header, t('budget'), t('costPerLead')],
          rows: d.by_campaign.map((r: any) => [...row(r.label, r), n(r.budget), n(r.cost_per_lead)]),
        },
      ];
    }
    case 'calls':
      return [
        {
          name: t('callReportsByUserTitle').slice(0, 31),
          headers: [t('employee'), t('reportCalls'), t('reportAnswered'), t('reportMissed'), t('reportUnclassified')],
          rows: d.by_user.map((u: any) => [u.name, u.total, u.answered, u.missed, u.unknown]),
        },
        {
          name: t('callReportsByMethodTitle').slice(0, 31),
          headers: [t('callMethod'), t('reportCalls'), t('reportAnswered'), t('reportMissed')],
          rows: d.by_method.map((m: any) => [m.name, m.total, m.answered, m.missed]),
        },
      ];
    case 'deals':
      return [
        {
          name: t('reportTabDeals'),
          headers: [t('reportMetric'), t('reportCurrentPeriod')],
          rows: [
            [t('reportDealsCreated'), d.summary.created],
            [t('reportDealsWon'), d.summary.won],
            [t('reportDealsLost'), d.summary.lost],
            [`${t('reportWinRate')} %`, n(d.summary.win_rate)],
            [t('reportRevenue'), d.summary.revenue],
            [t('reportAvgCycle'), n(d.summary.avg_cycle_days)],
          ],
        },
        {
          name: t('reportWonByEmployee').slice(0, 31),
          headers: [t('employee'), t('reportDealsWon'), t('reportRevenue')],
          rows: d.by_employee.map((e: any) => [e.name, e.won, e.revenue]),
        },
        {
          name: t('reportLostReasons').slice(0, 31),
          headers: [t('reportLostReasons'), t('reportLeadsCountShort')],
          rows: d.lost_reasons.map((r: any) => [r.reason, r.count]),
        },
      ];
    default:
      return [];
  }
}

const safeSheetName = (name: string, used: Set<string>): string => {
  const base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 28)} ${i++}`;
  used.add(candidate.toLowerCase());
  return candidate;
};

export function downloadSheetsCsv(filename: string, sheets: SheetData[]): void {
  // CSV has one table per file: the first sheet is the tab's primary table.
  const first = sheets[0];
  if (first) downloadCsv(filename, first.headers, first.rows);
}

export async function downloadWorkbook(filename: string, sheets: SheetData[], rtl: boolean): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const used = new Set<string>();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(safeSheetName(sheet.name, used), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
    ws.addRow(sheet.headers).font = { bold: true };
    sheet.rows.forEach((r) => ws.addRow(r));
    sheet.headers.forEach((h, i) => {
      const longest = Math.max(String(h).length, ...sheet.rows.map((r) => String(r[i] ?? '').length));
      ws.getColumn(i + 1).width = Math.min(48, Math.max(12, longest + 2));
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
