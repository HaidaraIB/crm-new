import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  StarIcon,
  UserMinusIcon,
  UsersIcon,
} from '../icons';
import { useUsers } from '../../hooks/useQueries';
import { useAppContext } from '../../context/AppContext';
import { normalizeRole, usersForOperationalEmployeeLists } from '../../utils/roles';
import type { WhatsAppChatFilters } from '../../types';
import { translations } from '../../constants';
import {
  WHATSAPP_STATUS_RAIL_KEYS,
  chatStatusLabelKey,
} from '../../utils/whatsappConversationStatus';
import { getUserDisplayName } from '../../types';
import {
  RAIL_COLLAPSED_ASIDE,
  RAIL_COLLAPSE_BTN,
  RAIL_EXPAND_BTN,
  RAIL_EXPANDED_ASIDE,
  RailCountBadge,
  RailFilterSection,
  RailStatusIcon,
  chipNavClass,
  iconNavClass,
  statusNavClass,
} from '../chat/chatFilterRailChrome';

type Props = {
  filters: WhatsAppChatFilters;
  onChange: (next: WhatsAppChatFilters) => void;
  statusCounts: Record<string, number>;
  assignmentCounts: Record<string, number>;
  t: (key: keyof typeof translations.en) => string;
  /** Compact horizontal chips (below lg). */
  variant?: 'rail' | 'chips';
};

const RAIL_COLLAPSED_STORAGE_KEY = 'crm.whatsappChatFilterRailCollapsed';

function AssignmentIcon({
  keyName,
  className = 'h-4 w-4 shrink-0 opacity-70',
}: {
  keyName: 'all' | 'mine' | 'unassigned';
  className?: string;
}) {
  if (keyName === 'unassigned') return <UserMinusIcon className={className} />;
  if (keyName === 'mine') return <UsersIcon className={className} />;
  return <UsersIcon className={className} />;
}

export const ChatFilterRail: React.FC<Props> = ({
  filters,
  onChange,
  statusCounts,
  assignmentCounts,
  t,
  variant = 'rail',
}) => {
  const { currentUser, hasSupervisorPermission } = useAppContext();
  const role = normalizeRole(currentUser?.role);
  /** Employee/Doctor only ever see their own leads — assignment filters are meaningless. */
  const isAssignmentScopedStaff = role === 'Employee' || role === 'Doctor';
  const canFilterByAgent =
    role === 'Owner' ||
    role === 'Reception' ||
    role === 'DataEntry' ||
    (role === 'Supervisor' && hasSupervisorPermission('can_manage_leads'));
  const showAssignmentFilters = !isAssignmentScopedStaff;
  const [agentOpen, setAgentOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const { data: usersResponse } = useUsers(undefined, {
    enabled: canFilterByAgent && !collapsed,
  });
  const agents = useMemo(() => {
    const base = usersResponse?.results ?? usersResponse ?? [];
    return usersForOperationalEmployeeLists(
      Array.isArray(base) ? base : [],
      currentUser ?? null
    );
  }, [usersResponse, currentUser]);

  const setStatus = (status: string) =>
    onChange({ ...filters, status, starred: false });
  const setAssignment = (assignment: string) =>
    onChange({ ...filters, assignment, agent: '', starred: false });
  const setStarred = () =>
    onChange({
      ...filters,
      starred: true,
      status: 'all',
      assignment: 'all',
      agent: '',
    });
  const setAgent = (agentId: string) =>
    onChange({
      ...filters,
      agent: agentId,
      assignment: 'all',
      starred: false,
    });

  if (variant === 'chips') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={setStarred}
          className={chipNavClass(filters.starred)}
        >
          <StarIcon className="h-3.5 w-3.5" />
          {t('chatFilterStarred')}
          <span className="tabular-nums opacity-70">{assignmentCounts.starred ?? 0}</span>
        </button>
        {WHATSAPP_STATUS_RAIL_KEYS.map((key) => {
          const active = !filters.starred && filters.status === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={chipNavClass(active)}
            >
              {t(chatStatusLabelKey(key) as keyof typeof translations.en)}
              <span className="tabular-nums opacity-70">{statusCounts[key] ?? 0}</span>
            </button>
          );
        })}
        {showAssignmentFilters ? (
          <>
            {(['all', 'mine', 'unassigned'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAssignment(a)}
                className={chipNavClass(
                  !filters.starred && !filters.agent && filters.assignment === a
                )}
              >
                {t(
                  (a === 'all'
                    ? 'chatFilterAll'
                    : a === 'mine'
                      ? 'chatFilterAssignedToMe'
                      : 'chatFilterUnassigned') as keyof typeof translations.en
                )}
                <span className="tabular-nums opacity-70">
                  {assignmentCounts[a] ?? 0}
                </span>
              </button>
            ))}
            {canFilterByAgent ? (
              <select
                value={filters.agent}
                onChange={(e) => setAgent(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900"
                aria-label={t('chatFilterAssignedAgent')}
              >
                <option value="">{t('chatFilterAssignedAgent')}</option>
                {agents.map((u: any) => (
                  <option key={u.id} value={String(u.id)}>
                    {getUserDisplayName(u)}
                  </option>
                ))}
              </select>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (collapsed) {
    return (
      <aside className={RAIL_COLLAPSED_ASIDE}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={RAIL_EXPAND_BTN}
          aria-label={t('chatFilterRailExpand')}
          title={t('chatFilterRailExpand')}
        >
          <ArrowLeftIcon className="h-4 w-4 rotate-180" />
        </button>
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
        <button
          type="button"
          onClick={setStarred}
          className={iconNavClass(filters.starred)}
          aria-current={filters.starred ? 'true' : undefined}
          aria-label={t('chatFilterStarred')}
          title={t('chatFilterStarred')}
        >
          <StarIcon className="h-4 w-4" />
          <RailCountBadge count={assignmentCounts.starred ?? 0} />
        </button>
        {showAssignmentFilters
          ? (['all', 'mine', 'unassigned'] as const).map((a) => {
              const active =
                !filters.starred && !filters.agent && filters.assignment === a;
              const label = t(
                (a === 'all'
                  ? 'chatFilterAll'
                  : a === 'mine'
                    ? 'chatFilterAssignedToMe'
                    : 'chatFilterUnassigned') as keyof typeof translations.en
              );
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAssignment(a)}
                  className={iconNavClass(active)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={label}
                  title={label}
                >
                  <AssignmentIcon keyName={a} />
                  <RailCountBadge count={assignmentCounts[a] ?? 0} />
                </button>
              );
            })
          : null}
        {canFilterByAgent ? (
          <button
            type="button"
            onClick={() => {
              setCollapsed(false);
              setAgentOpen(true);
            }}
            className={iconNavClass(Boolean(filters.agent))}
            aria-label={t('chatFilterAssignedAgent')}
            title={t('chatFilterAssignedAgent')}
          >
            <UsersIcon className="h-4 w-4 opacity-70" />
          </button>
        ) : null}
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
        {WHATSAPP_STATUS_RAIL_KEYS.map((key) => {
          const active = !filters.starred && filters.status === key;
          const label = t(chatStatusLabelKey(key) as keyof typeof translations.en);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={iconNavClass(active)}
              aria-current={active ? 'true' : undefined}
              aria-label={label}
              title={label}
            >
              <RailStatusIcon status={key} />
              <RailCountBadge count={statusCounts[key] ?? 0} />
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className={RAIL_EXPANDED_ASIDE}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('filters')}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className={RAIL_COLLAPSE_BTN}
          aria-label={t('chatFilterRailCollapse')}
          title={t('chatFilterRailCollapse')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>

      <RailFilterSection label={t('chatFilterStarred')}>
        <button
          type="button"
          onClick={setStarred}
          className={statusNavClass(filters.starred)}
          aria-current={filters.starred ? 'true' : undefined}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <StarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('chatFilterStarred')}</span>
          </span>
          <span className="tabular-nums text-xs text-gray-400">{assignmentCounts.starred ?? 0}</span>
        </button>
      </RailFilterSection>

      {showAssignmentFilters ? (
        <RailFilterSection label={t('chatFilterAssignment')}>
          {(
            [
              { key: 'all', label: 'chatFilterAll', countKey: 'all' },
              { key: 'mine', label: 'chatFilterAssignedToMe', countKey: 'mine' },
              { key: 'unassigned', label: 'chatFilterUnassigned', countKey: 'unassigned' },
            ] as const
          ).map((item) => {
            const active =
              !filters.starred && !filters.agent && filters.assignment === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setAssignment(item.key)}
                className={statusNavClass(active)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <AssignmentIcon keyName={item.key} />
                  <span className="truncate">
                    {t(item.label as keyof typeof translations.en)}
                  </span>
                </span>
                <span className="tabular-nums text-xs text-gray-400">
                  {assignmentCounts[item.countKey] ?? 0}
                </span>
              </button>
            );
          })}
          {canFilterByAgent ? (
            <div>
              <button
                type="button"
                onClick={() => setAgentOpen((o) => !o)}
                className={statusNavClass(Boolean(filters.agent))}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <UsersIcon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{t('chatFilterAssignedAgent')}</span>
                </span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 shrink-0 transition ${agentOpen || filters.agent ? 'rotate-180' : ''}`}
                />
              </button>
              {(agentOpen || filters.agent) && (
                <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto ps-2">
                  {agents.map((u: any) => {
                    const active = filters.agent === String(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setAgent(String(u.id))}
                        className={statusNavClass(active)}
                      >
                        <span className="truncate text-start">{getUserDisplayName(u)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </RailFilterSection>
      ) : null}

      <RailFilterSection label={t('chatFilterStatus')}>
        {WHATSAPP_STATUS_RAIL_KEYS.map((key) => {
          const active = !filters.starred && filters.status === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={statusNavClass(active)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <RailStatusIcon status={key} />
                <span className="truncate">
                  {t(chatStatusLabelKey(key) as keyof typeof translations.en)}
                </span>
              </span>
              <span className="tabular-nums text-xs text-gray-400">
                {statusCounts[key] ?? 0}
              </span>
            </button>
          );
        })}
      </RailFilterSection>
    </aside>
  );
};
