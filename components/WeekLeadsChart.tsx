
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { getRechartsTooltipStyles } from './dashboard/rechartsTooltipStyles';

const data = [
  { name: 'Sep 20', "Leads Count": 10 },
  { name: 'Sep 21', "Leads Count": 15 },
  { name: 'Sep 22', "Leads Count": 8 },
  { name: 'Sep 23', "Leads Count": 20 },
  { name: 'Sep 24', "Leads Count": 12 },
  { name: 'Sep 25', "Leads Count": 25 },
  { name: 'Sep 26', "Leads Count": 18 },
];

export const WeekLeadsChart = () => {
  const { t, theme } = useAppContext();
  const { contentStyle: tooltipContentStyle, labelStyle: tooltipLabelStyle, itemStyle: tooltipItemStyle } =
    getRechartsTooltipStyles(theme === 'dark');

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
        <Legend />
        <Line type="monotone" name={t('leadsCount')} dataKey="Leads Count" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};
