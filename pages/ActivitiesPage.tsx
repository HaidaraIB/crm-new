
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, FilterButton, RefreshButton, Button, TableHorizontalScroll, hasActiveFilters } from '../components/index';
import { DEFAULT_ACTIVITY_FILTERS } from '../components/drawers/ActivitiesFilterDrawer';
import { getStageDisplayLabel } from '../utils/taskStageMapper';
import { useActivities, useStages, useCallMethods } from '../hooks/useQueries';
import { formatDateToLocal } from '../utils/dateUtils';
import { PAGE_SIZE_OPTIONS, usePersistedPageSize } from '../hooks/usePersistedPageSize';
import type { ActivityFeedFilters } from '../services/api';

const getPaginationItems = (current: number, total: number): Array<number | 'ellipsis'> => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const items: Array<number | 'ellipsis'> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push('ellipsis');
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < total - 1) items.push('ellipsis');
    items.push(total);
    return items;
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
};

const badgeStyle = (color: string) => {
    const rgb = hexToRgb(color);
    if (!rgb) return null;
    return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    };
};

export const ActivitiesPage = () => {
    const {
        t,
        activityFilters,
        setIsActivitiesFilterDrawerOpen,
    } = useAppContext();

    const [activitiesPageNumber, setActivitiesPageNumber] = useState(1);
    const [activitiesPageSize, setActivitiesPageSize] = usePersistedPageSize('activities');

    const apiFilters = useMemo((): ActivityFeedFilters => ({
        user: activityFilters.user,
        stage: activityFilters.stage,
        leadType: activityFilters.leadType,
        timePeriod: activityFilters.timePeriod,
        dateFrom: activityFilters.dateFrom,
        dateTo: activityFilters.dateTo,
        search: activityFilters.search,
    }), [activityFilters]);

    useEffect(() => {
        setActivitiesPageNumber(1);
    }, [apiFilters, activitiesPageSize]);

    const {
        data: activitiesResponse,
        isLoading: activitiesLoading,
        isFetching: activitiesFetching,
        refetch: refetchActivities,
    } = useActivities(activitiesPageNumber, undefined, activitiesPageSize, apiFilters);

    const activities = activitiesResponse?.results || [];
    const totalActivitiesCount = activitiesResponse?.count || 0;
    const hasNextPage = Boolean(activitiesResponse?.next);
    const hasPreviousPage = Boolean(activitiesResponse?.previous);
    const totalPages = Math.max(1, Math.ceil(totalActivitiesCount / activitiesPageSize));
    const paginationItems = getPaginationItems(activitiesPageNumber, totalPages);

    const { data: stagesData } = useStages();
    const stages = Array.isArray(stagesData)
        ? stagesData
        : (stagesData?.results || []);

    const { data: callMethodsData } = useCallMethods();
    const callMethods = Array.isArray(callMethodsData)
        ? callMethodsData
        : (callMethodsData?.results || []);

    return (
        <PageWrapper
            title={t('activities')}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <RefreshButton
                        onClick={() => {
                            void refetchActivities();
                        }}
                        loading={activitiesFetching && !activitiesLoading}
                    />
                    <FilterButton
                        onClick={() => setIsActivitiesFilterDrawerOpen(true)}
                        hasActiveFilters={hasActiveFilters(activityFilters, DEFAULT_ACTIVITY_FILTERS)}
                    />
                </div>
            }
        >
            <Card>
                <TableHorizontalScroll>
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('type') || 'Type'}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('user')}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('lead')}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('stage')}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('callMethod') || 'Call Method'}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('date')}</th>
                                <th scope="col" className="px-6 py-3 text-center whitespace-nowrap">{t('notes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.length > 0 ? (
                                activities.map((activity) => {
                                    const activityType = activity.type || 'client_task';
                                    const typeLabel = activityType === 'client_task'
                                        ? (t('action') || 'Action')
                                        : (t('call') || 'Call');

                                    const stageConfig = activityType === 'client_task'
                                        ? stages.find((s: { name: string }) => s.name === activity.stage)
                                        : null;
                                    const stageColor = stageConfig?.color || '#808080';
                                    const stageRgb = hexToRgb(stageColor);

                                    const callMethodName = activity.call_method || '';
                                    const callMethodConfig = activityType === 'client_call'
                                        ? callMethods.find((c: { name: string }) => c.name === callMethodName)
                                        : null;
                                    const callMethodColor = callMethodConfig?.color || '#808080';
                                    const callMethodRgb = hexToRgb(callMethodColor);

                                    return (
                                        <tr key={activity.id} className="bg-white dark:bg-dark-card border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    activityType === 'client_task' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                }`}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap text-center">{activity.user}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">{activity.lead}</td>
                                            <td className="px-6 py-4 text-center">
                                                {activityType === 'client_call' ? (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!stageRgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                        style={badgeStyle(stageColor) ?? undefined}
                                                    >
                                                        {getStageDisplayLabel(activity.stage)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {activityType === 'client_call' ? (
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!callMethodRgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                        style={badgeStyle(callMethodColor) ?? undefined}
                                                    >
                                                        {callMethodName || '-'}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {activity.created_at ? formatDateToLocal(activity.created_at) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">{activity.notes}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-10">
                                        {activitiesLoading ? t('loading') : t('noActivitiesFound')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableHorizontalScroll>
                <div className="mt-4 px-2 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {t('page')} {activitiesPageNumber} {t('of')} {totalPages}
                    </p>
                    <div className="flex items-center gap-2" dir="ltr">
                        <select
                            value={activitiesPageSize}
                            onChange={(e) => setActivitiesPageSize(Number(e.target.value))}
                            className="px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>
                                    {`${size} ${t('perPage')}`}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="secondary"
                            onClick={() => setActivitiesPageNumber(1)}
                            disabled={activitiesPageNumber === 1 || activitiesLoading}
                        >
                            &laquo;
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setActivitiesPageNumber((prev) => Math.max(1, prev - 1))}
                            disabled={!hasPreviousPage || activitiesLoading}
                        >
                            {t('previous')}
                        </Button>
                        {paginationItems.map((item, idx) =>
                            item === 'ellipsis' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                            ) : (
                                <Button
                                    key={item}
                                    variant={item === activitiesPageNumber ? 'primary' : 'secondary'}
                                    onClick={() => setActivitiesPageNumber(item)}
                                    disabled={activitiesLoading}
                                >
                                    {item}
                                </Button>
                            )
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => setActivitiesPageNumber((prev) => prev + 1)}
                            disabled={!hasNextPage || activitiesLoading}
                        >
                            {t('next')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setActivitiesPageNumber(totalPages)}
                            disabled={activitiesPageNumber === totalPages || activitiesLoading}
                        >
                            &raquo;
                        </Button>
                    </div>
                </div>
            </Card>
        </PageWrapper>
    );
};
