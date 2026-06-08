import { useMemo } from 'react';

type ClientTaskLike = {
  client?: number;
  clientId?: number;
  reminder_date?: string | null;
  created_at?: string;
  createdAt?: string;
};

type LeadLike = {
  id: number;
  assigned_to?: number | null;
  assignedTo?: number | null;
  created_at?: string;
  createdAt?: string;
};

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameCalendarDay(iso: string, today: Date): boolean {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function isBeforeToday(iso: string, today: Date): boolean {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export function buildTasksByClient(clientTasks: ClientTaskLike[]): Map<number, ClientTaskLike[]> {
  const map = new Map<number, ClientTaskLike[]>();
  for (const ct of clientTasks) {
    const id = ct.client ?? ct.clientId;
    if (!id) continue;
    const list = map.get(id);
    if (list) list.push(ct);
    else map.set(id, [ct]);
  }
  return map;
}

export function useDashboardDerivedMetrics(leads: LeadLike[], clientTasks: ClientTaskLike[]) {
  return useMemo(() => {
    const today = startOfToday();

    const todayNewLeads = leads.filter((lead) => {
      const createdAt = lead.created_at || lead.createdAt;
      return createdAt ? isSameCalendarDay(createdAt, today) : false;
    }).length;

    const unassignedLeads = leads.filter(
      (lead) => !(lead.assigned_to || lead.assignedTo),
    ).length;

    const overdueFollowUps = clientTasks.filter((ct) => {
      if (!ct.reminder_date) return false;
      return isBeforeToday(ct.reminder_date, today);
    }).length;

    const tasksByClient = buildTasksByClient(clientTasks);

    const leadsToContactToday = leads.filter((lead) => {
      const assignedToId = lead.assigned_to || lead.assignedTo;
      if (!assignedToId) return false;
      const tasks = tasksByClient.get(lead.id) ?? [];
      return tasks.some(
        (ct) => ct.reminder_date && isSameCalendarDay(ct.reminder_date, today),
      );
    });

    return {
      today,
      todayNewLeads,
      unassignedLeads,
      overdueFollowUps,
      leadsToContactToday,
      leadsToContactTodayCount: leadsToContactToday.length,
      tasksByClient,
    };
  }, [leads, clientTasks]);
}
