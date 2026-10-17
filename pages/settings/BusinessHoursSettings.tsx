import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '../../components/index';
import { useAppContext } from '../../context/AppContext';
import { updateCompanyAssignmentSettingsAPI } from '../../services/api';
import type { BusinessHours } from '../../services/reportsTypes';
import { queryKeys, useCurrentUser } from '../../hooks/useQueries';
import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import { WEEKDAY_KEYS } from '../../utils/reportLabels';

type Day = { open: boolean; from: string; to: string };

const DEFAULT_DAY: Day = { open: false, from: '09:00', to: '17:00' };
const emptyWeek = (): Day[] => Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }));

function weekFromApi(hours: BusinessHours | undefined): Day[] {
  const week = emptyWeek();
  for (let i = 0; i < 7; i += 1) {
    const entry = hours?.[String(i)];
    if (entry?.open && entry?.close) week[i] = { open: true, from: entry.open, to: entry.close };
  }
  return week;
}

function weekToApi(week: Day[]): BusinessHours {
  const out: BusinessHours = {};
  week.forEach((d, i) => {
    out[String(i)] = d.open ? { open: d.from, close: d.to } : null;
  });
  return out;
}

const timeCls =
  'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-800 disabled:opacity-40';

/**
 * Company opening hours + the first-response target the Reports hub measures against.
 * An employee's own shift always wins; these hours only apply to employees without one.
 */
export const BusinessHoursSettings = () => {
  const { t, currentUser, setIsSuccessModalOpen, setSuccessMessage } = useAppContext();
  const { data: currentUserData } = useCurrentUser();
  const queryClient = useQueryClient();
  const company = (currentUserData || currentUser)?.company;

  const [week, setWeek] = useState<Day[]>(emptyWeek());
  const [sla, setSla] = useState(15);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setWeek(weekFromApi(company.business_hours));
    setSla(company.response_sla_minutes ?? 15);
  }, [company]);

  const translate = (key: string) => {
    const value = t(key as never);
    return value && value !== key ? value : undefined;
  };

  const update = (i: number, patch: Partial<Day>) =>
    setWeek((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const save = async () => {
    if (!company?.id) return;
    const next: Record<string, string> = {
      ...catalogFieldErrors('company_business_hours.update', { response_sla_minutes: sla, responseSlaMinutes: sla }, translate),
    };
    week.forEach((d, i) => {
      if (d.open && d.from === d.to) next[`day${i}`] = t('businessHoursInvalidWindow');
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await updateCompanyAssignmentSettingsAPI(company.id, {
        response_sla_minutes: sla,
        business_hours: weekToApi(week),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      await queryClient.refetchQueries({ queryKey: queryKeys.currentUser });
      setSuccessMessage(t('settingsSaved') || 'Settings saved successfully!');
      setIsSuccessModalOpen(true);
    } catch (error: any) {
      const server = serverFieldErrors(error, 'company_business_hours.update', translate);
      setErrors(Object.keys(server).length ? server : { general: error?.message || t('errorSavingSettings') });
    } finally {
      setSaving(false);
    }
  };

  if (!company) return null;

  return (
    <Card>
      <h2 className="mb-4 border-b pb-2 text-xl font-semibold dark:border-gray-700">{t('businessHoursTitle')}</h2>
      <div className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('businessHoursHint')}</p>

        <ul className="space-y-2">
          {week.map((d, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3">
              <label className="flex w-40 cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={d.open}
                  onChange={(e) => update(i, { open: e.target.checked })}
                />
                {t(WEEKDAY_KEYS[i])}
              </label>
              {d.open ? (
                <>
                  <input
                    type="time"
                    className={timeCls}
                    value={d.from}
                    aria-label={`${t(WEEKDAY_KEYS[i])} ${t('businessHoursOpens')}`}
                    onChange={(e) => update(i, { from: e.target.value })}
                  />
                  <span className="text-gray-400" aria-hidden>
                    –
                  </span>
                  <input
                    type="time"
                    className={timeCls}
                    value={d.to}
                    aria-label={`${t(WEEKDAY_KEYS[i])} ${t('businessHoursCloses')}`}
                    onChange={(e) => update(i, { to: e.target.value })}
                  />
                </>
              ) : (
                <span className="text-sm text-gray-400">{t('businessHoursClosed')}</span>
              )}
              {errors[`day${i}`] ? (
                <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors[`day${i}`]}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="max-w-xs">
          <label htmlFor="response-sla-minutes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('responseSlaMinutes')}
          </label>
          <input
            id="response-sla-minutes"
            type="number"
            min={1}
            max={10080}
            className={`${timeCls} w-full`}
            value={Number.isFinite(sla) ? sla : ''}
            onChange={(e) => setSla(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-gray-500">{t('responseSlaMinutesDesc')}</p>
          {errors.responseSlaMinutes || errors.response_sla_minutes ? (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              {errors.responseSlaMinutes || errors.response_sla_minutes}
            </p>
          ) : null}
        </div>

        {errors.general ? (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {errors.general}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={save} loading={saving} loadingText={t('saving')}>
            {t('saveSettings')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
