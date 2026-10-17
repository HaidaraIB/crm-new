import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { getRechartsTooltipStyles } from '../dashboard/rechartsTooltipStyles';
import { formatDuration } from '../../utils/reportFormat';
import { WEEKDAY_KEYS } from '../../utils/reportLabels';
import type { ReportGranularity } from '../../services/reportsTypes';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];
export const reportColor = (i: number) => PALETTE[i % PALETTE.length];

function useChartTheme() {
  const { theme, language } = useAppContext();
  const isDark = theme === 'dark';
  return {
    isDark,
    tooltip: getRechartsTooltipStyles(isDark),
    axis: isDark ? '#9ca3af' : '#6b7280',
    grid: isDark ? '#374151' : '#e5e7eb',
    locale: language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US',
    rtl: language === 'ar',
  };
}

function bucketLabel(bucket: string, granularity: ReportGranularity, locale: string): string {
  const d = new Date(bucket);
  if (Number.isNaN(d.getTime())) return bucket;
  if (granularity === 'hour') return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (granularity === 'month') return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export type TrendSeries = { key: string; label: string; color?: string };

export const TrendChart = ({
  data,
  series,
  granularity,
  height = 260,
  bars = false,
}: {
  data: Array<Record<string, number | string>>;
  series: TrendSeries[];
  granularity: ReportGranularity;
  height?: number;
  bars?: boolean;
}) => {
  const theme = useChartTheme();
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
      <XAxis
        dataKey="bucket"
        tickFormatter={(v) => bucketLabel(String(v), granularity, theme.locale)}
        stroke={theme.axis}
        fontSize={11}
        minTickGap={24}
        reversed={theme.rtl}
      />
      <YAxis stroke={theme.axis} fontSize={11} allowDecimals={false} width={36} orientation={theme.rtl ? 'right' : 'left'} />
      <Tooltip
        {...theme.tooltip}
        labelFormatter={(v) => bucketLabel(String(v), granularity, theme.locale)}
        formatter={(value: number, name: string) => [Number(value).toLocaleString('en-US'), name]}
      />
    </>
  );
  return (
    <div style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {bars ? (
          <BarChart {...common}>
            {axes}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? reportColor(i)} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <AreaChart {...common}>
            {axes}
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? reportColor(i)}
                fill={s.color ?? reportColor(i)}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export type BarRow = { key: string | number; label: string; value: number; hint?: string; color?: string; onClick?: () => void };

/** Horizontal bars as plain markup: RTL-correct, keyboard-reachable when clickable, no chart lib needed. */
export const BarList = ({ rows, format }: { rows: BarRow[]; format?: (value: number) => string }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.value / max) * 100));
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-gray-800 dark:text-gray-100">{r.label}</span>
              <span className="shrink-0 tabular-nums text-gray-600 dark:text-gray-300">
                {format ? format(r.value) : r.value.toLocaleString('en-US')}
                {r.hint ? <span className="ms-2 text-xs text-gray-400">{r.hint}</span> : null}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: r.color ?? reportColor(i) }}
              />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.onClick ? (
              <button type="button" onClick={r.onClick} className="block w-full rounded-lg p-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800/60">
                {inner}
              </button>
            ) : (
              <div className="p-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** Weekday x hour grid; shade = assignment volume, tooltip = average business response. */
export const ResponseHeatmap = ({
  data,
}: {
  data: Array<Array<{ count: number; avg_business: number | null }>>;
}) => {
  const { t } = useAppContext();
  const max = Math.max(1, ...data.flat().map((c) => c.count));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]" dir="ltr">
        <div className="grid" style={{ gridTemplateColumns: '3.5rem repeat(24, minmax(0, 1fr))' }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="pb-1 text-center text-[10px] text-gray-400 tabular-nums">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
          {data.map((day, d) => (
            <React.Fragment key={d}>
              <div className="pe-2 text-end text-xs leading-6 text-gray-500 dark:text-gray-400">{t(WEEKDAY_KEYS[d])}</div>
              {day.map((cell, h) => {
                const intensity = cell.count / max;
                return (
                  <div
                    key={h}
                    className="m-px h-6 rounded-sm"
                    style={{
                      backgroundColor: cell.count ? `rgba(99, 102, 241, ${0.12 + intensity * 0.88})` : undefined,
                    }}
                    title={`${t(WEEKDAY_KEYS[d])} ${String(h).padStart(2, '0')}:00 · ${cell.count} ${t('reportAssignments')}${
                      cell.avg_business != null ? ` · ${formatDuration(cell.avg_business, t)}` : ''
                    }`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

type SankeyNode = { name: string };
type SankeyLink = { source: number; target: number; value: number };

/**
 * A flow diagram cannot draw a cycle (A -> B and later B -> A), and real status histories have them.
 * Nodes are ordered by net outflow (sources first) and links that point backwards are left out of the
 * picture; their count is returned so the caller can say so. The tables still count every move.
 */
export function acyclicLinks(nodeCount: number, links: SankeyLink[]): { links: SankeyLink[]; dropped: number } {
  const net = new Array(nodeCount).fill(0);
  links.forEach((l) => {
    net[l.source] += l.value;
    net[l.target] -= l.value;
  });
  const order = [...net.keys()].sort((x, y) => net[y] - net[x] || x - y);
  const rank = new Map(order.map((n, i) => [n, i]));
  const kept = links.filter((l) => (rank.get(l.source) as number) < (rank.get(l.target) as number));
  const dropped = links.filter((l) => !kept.includes(l)).reduce((sum, l) => sum + l.value, 0);
  return { links: kept, dropped };
}

const SankeyNodeShape = ({ x, y, width, height, payload, isDark }: any) => (
  <g>
    <rect x={x} y={y} width={width} height={height} fill="#6366f1" rx={2} />
    <text
      x={x + width + 6}
      y={y + height / 2}
      dy="0.35em"
      fontSize={12}
      fontWeight={600}
      fill={isDark ? '#f3f4f6' : '#111827'}
      stroke={isDark ? '#111827' : '#ffffff'}
      strokeWidth={3}
      paintOrder="stroke"
    >
      {payload?.name}
    </text>
  </g>
);

export const SankeyDiagram = ({
  nodes,
  links,
  localize,
}: {
  nodes: SankeyNode[];
  links: SankeyLink[];
  localize: (name: string) => string;
}) => {
  const theme = useChartTheme();
  const { links: drawn, dropped } = React.useMemo(() => acyclicLinks(nodes.length, links), [nodes.length, links]);
  const { t } = useAppContext();
  if (!drawn.length) return null;
  // Keep only nodes that still have a link, and re-index the links to match.
  const used = [...new Set(drawn.flatMap((l) => [l.source, l.target]))].sort((x, y) => x - y);
  const remap = new Map(used.map((old, i) => [old, i]));
  const shown = used.map((old) => ({ name: localize(nodes[old].name) }));
  const data = {
    nodes: shown,
    links: drawn.map((l) => ({ source: remap.get(l.source) as number, target: remap.get(l.target) as number, value: l.value })),
  };
  return (
    <div>
      <div style={{ height: 360 }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            nodePadding={28}
            nodeWidth={12}
            margin={{ top: 8, right: 150, bottom: 8, left: 8 }}
            link={{ stroke: '#818cf8', strokeOpacity: 0.35 }}
            node={<SankeyNodeShape isDark={theme.isDark} />}
          >
            <Tooltip {...theme.tooltip} />
          </Sankey>
        </ResponsiveContainer>
      </div>
      {dropped > 0 ? (
        <p className="mt-2 text-xs text-gray-500">{t('reportSankeyBackMoves').replace('{count}', String(dropped))}</p>
      ) : null}
    </div>
  );
};
