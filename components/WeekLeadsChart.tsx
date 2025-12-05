
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Sep 20', "Leads Count": 10 },
  { name: 'Sep 21', "Leads Count": 15 },
  { name: 'Sep 22', "Leads Count": 8 },
  { name: 'Sep 23', "Leads Count": 20 },
  { name: 'Sep 24', "Leads Count": 12 },
  { name: 'Sep 25', "Leads Count": 25 },
  { name: 'Sep 26', "Leads Count": 18 },
];

export const WeekLeadsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
                contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    borderColor: 'rgba(51, 65, 85, 0.8)',
                    color: '#fff',
                }}
            />
            <Legend />
            <Line type="monotone" dataKey="Leads Count" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
        </LineChart>
    </ResponsiveContainer>
);
