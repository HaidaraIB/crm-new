import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, Input, Loader } from '../components/index';
import { getPbxReportsSummaryAPI, getPbxReportsAgentsAPI, getPbxSettingsAPI } from '../services/api';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}
    </label>
  );
}

export const CallReportsPage = () => {
  const { t, setCurrentPage } = useAppContext();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: pbxSettings, isLoading: pbxSettingsLoading } = useQuery({
    queryKey: ['pbxSettings'],
    queryFn: getPbxSettingsAPI,
  });
  const pbxEnabled = !!pbxSettings?.is_enabled;

  const summaryQuery = useQuery({
    queryKey: ['pbxReportsSummary', from, to],
    queryFn: () => getPbxReportsSummaryAPI({ from: from || undefined, to: to || undefined }),
    enabled: pbxEnabled,
  });

  const agentsQuery = useQuery({
    queryKey: ['pbxReportsAgents', from, to],
    queryFn: () => getPbxReportsAgentsAPI({ from: from || undefined, to: to || undefined }),
    enabled: pbxEnabled,
  });

  const summary = summaryQuery.data;
  const agents = agentsQuery.data?.agents ?? [];

  const statCards = [
    { label: t('totalCalls'), value: summary?.total ?? 0 },
    { label: t('inbound'), value: summary?.inbound ?? 0 },
    { label: t('outbound'), value: summary?.outbound ?? 0 },
    { label: t('answered'), value: summary?.answered ?? 0 },
    { label: t('missed'), value: summary?.missed ?? 0 },
    { label: t('avgDuration'), value: summary?.avg_duration_sec ?? 0 },
  ];

  if (pbxSettingsLoading) {
    return (
      <PageWrapper title={t('callReports')}>
        <div className="flex justify-center py-12"><Loader /></div>
      </PageWrapper>
    );
  }

  if (!pbxEnabled) {
    return (
      <PageWrapper title={t('callReports')}>
        <Card className="p-8 max-w-lg mx-auto text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{t('callReportsPbxDisabled')}</p>
          <Button onClick={() => setCurrentPage('PBX')}>{t('callReportsOpenPbxSettings')}</Button>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('callReports')}>
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <FieldLabel>{t('fromDate')}</FieldLabel>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel>{t('toDate')}</FieldLabel>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => { summaryQuery.refetch(); agentsQuery.refetch(); }}>
          {t('refresh')}
        </Button>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex justify-center py-12"><Loader /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((item) => (
            <Card key={item.label} className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('pbxReportsAgentsTitle')}</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 text-start">
              <th className="p-3 font-medium">{t('extension')}</th>
              <th className="p-3 font-medium">{t('user')}</th>
              <th className="p-3 font-medium">{t('totalCalls')}</th>
              <th className="p-3 font-medium">{t('answered')}</th>
              <th className="p-3 font-medium">{t('missed')}</th>
              <th className="p-3 font-medium">{t('avgDuration')}</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a: any) => (
              <tr key={a.extension} className="border-b dark:border-gray-800">
                <td className="p-3" dir="ltr">{a.extension}</td>
                <td className="p-3">{a.username || '—'}</td>
                <td className="p-3">{a.total}</td>
                <td className="p-3">{a.answered}</td>
                <td className="p-3">{a.missed}</td>
                <td className="p-3">{a.avg_duration_sec}</td>
              </tr>
            ))}
            {!agents.length && !agentsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {t('noDataAvailable')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </PageWrapper>
  );
};
