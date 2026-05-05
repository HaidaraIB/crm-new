import React from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { dashboardSurface } from './dashboardStyles';
import { getRechartsTooltipStyles } from './rechartsTooltipStyles';
import { DashboardMenuItem, DashboardWidgetMenu } from './DashboardWidgetMenu';

export type FunnelItem = {
  name: string;
  value: number;
};

type ConversionFunnelProps = {
  title: string;
  items: FunnelItem[];
  menuItems?: DashboardMenuItem[];
  menuAriaLabel: string;
};

const BAR_FILLS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981'];

export const ConversionFunnel = ({ title, items, menuItems = [], menuAriaLabel }: ConversionFunnelProps) => {
  const { theme } = useAppContext();
  const isDark = theme === 'dark';
  const tt = getRechartsTooltipStyles(isDark);

  return (
    <div className={`${dashboardSurface} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700/80">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h2>
        {menuItems.length > 0 ? <DashboardWidgetMenu items={menuItems} ariaLabel={menuAriaLabel} /> : null}
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ top: 0, right: 28, left: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
              width={104}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={tt.contentStyle}
              labelStyle={tt.labelStyle}
              itemStyle={tt.itemStyle}
            />
            <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={22}>
              {items.map((_, index) => (
                <Cell key={`f-${index}`} fill={BAR_FILLS[index % BAR_FILLS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
