

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, PageWrapper, TargetIcon, UsersIcon, DealIcon, CheckIcon, SectionLoadingState, ClockIcon, TableHorizontalScroll } from '../components/index';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { getStageDisplayLabel } from '../utils/taskStageMapper';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import { useLeads, useDeals, useTasks, useUsers, useClientTasks, useStages, useClientCalls, useClientVisits, useAIInsightsDashboard, useAIManagementReport, useGenerateAIManagementReport, useApproveAIInsight, useDismissAIInsight, dashboardHeavyListQueryOptions } from '../hooks/useQueries';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { ManagementReportCard } from '../components/dashboard/ManagementReportCard';
import { normalizeRole, getRoleTranslation, isAssignedClinicalAppRole } from '../utils/roles';
import { MissionBar, MissionItem } from '../components/dashboard/MissionBar';
import { SmartInsights } from '../components/dashboard/SmartInsights';
import { HotLeadsCard, HotLeadItem } from '../components/dashboard/HotLeadsCard';
import { StatCard } from '../components/dashboard/StatCard';
import { ConversionFunnel } from '../components/dashboard/ConversionFunnel';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TeamGoals } from '../components/dashboard/TeamGoals';
import { getRechartsTooltipStyles } from '../components/dashboard/rechartsTooltipStyles';
import { DashboardWidgetMenu } from '../components/dashboard/DashboardWidgetMenu';

const formatLastSeenRelative = (
    lastSeenAt: string | null | undefined,
    t: (key: any) => string,
): string => {
    if (!lastSeenAt) return t('lastSeenUnknown') || 'unknown';
    const parsed = new Date(lastSeenAt);
    if (Number.isNaN(parsed.getTime())) return t('lastSeenUnknown') || 'unknown';

    const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
    if (seconds < 60) return t('justNow') || 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t('minutesAgo') || 'min ago'}`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t('hoursAgo') || 'h ago'}`;
    return `${Math.floor(seconds / 86400)} ${t('daysAgo') || 'd ago'}`;
};

export const DashboardPage = () => {
    const {
        t,
        currentUser,
        language,
        setSelectedLead,
        setCurrentPage,
        theme,
        setAlertMessage,
        setAlertVariant,
        setIsAlertModalOpen,
    } = useAppContext();
    const isAdmin = normalizeRole(currentUser?.role) === 'Owner';
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string>('');
    const [chartDaysRange, setChartDaysRange] = useState<7 | 14 | 30>(7);
    const [leadSourceFilter, setLeadSourceFilter] = useState<'all' | 'meta_lead_form' | 'whatsapp' | 'manual'>('all');
    const [teamDailyTarget] = useState(5);

    // Fetch all data using React Query (larger page_size via api.ts + fewer refetch bursts)
    const { data: leadsResponse, isLoading: isLeadsLoading } = useLeads(
        undefined,
        undefined,
        dashboardHeavyListQueryOptions,
    );
    const leads = leadsResponse?.results || [];

    const { data: dealsResponse, isLoading: isDealsLoading } = useDeals(dashboardHeavyListQueryOptions);
    const deals = dealsResponse?.results || [];

    const { data: tasksResponse, isLoading: isTasksLoading } = useTasks(undefined, dashboardHeavyListQueryOptions);
    const todos = tasksResponse?.results || [];

    const { data: usersResponse, isLoading: isUsersLoading, isFetching: isUsersFetching, refetch: refetchUsers } =
        useUsers(dashboardHeavyListQueryOptions);
    const users = usersResponse?.results || [];
    
    const { data: clientTasksResponse, isLoading: isClientTasksLoading } = useClientTasks(dashboardHeavyListQueryOptions);
    const clientTasks = clientTasksResponse?.results || [];
    const { data: clientCallsResponse, isLoading: isClientCallsLoading } = useClientCalls(dashboardHeavyListQueryOptions);
    const clientCalls = clientCallsResponse?.results || [];
    const { data: clientVisitsResponse, isLoading: isClientVisitsLoading } = useClientVisits(dashboardHeavyListQueryOptions);
    const clientVisits = clientVisitsResponse?.results || [];

    const { data: stagesResponse, isLoading: isStagesLoading } = useStages(dashboardHeavyListQueryOptions);
    const stages = Array.isArray(stagesResponse) 
        ? stagesResponse 
        : (stagesResponse?.results || []);

    const { data: aiInsightsData } = useAIInsightsDashboard(language);
    const showManagementReport = isAdmin && !!aiInsightsData?.ai_enabled;
    const { data: managementReport, isLoading: managementReportLoading } = useAIManagementReport(showManagementReport);
    const generateManagementReport = useGenerateAIManagementReport();
    const approveAI = useApproveAIInsight(language);
    const dismissAI = useDismissAIInsight();
    const [aiActionId, setAiActionId] = useState<number | null>(null);
    const [aiActionType, setAiActionType] = useState<'approve' | 'dismiss' | null>(null);

    const isDashboardLoading =
        isLeadsLoading ||
        isDealsLoading ||
        isTasksLoading ||
        isUsersLoading ||
        isClientTasksLoading ||
        isStagesLoading ||
        isClientCallsLoading ||
        isClientVisitsLoading;

    // Check for payment success message on mount
    useEffect(() => {
        const paymentSuccessData = localStorage.getItem('paymentSuccessMessage');
        if (paymentSuccessData) {
            try {
                const data = JSON.parse(paymentSuccessData);
                // Only show if message is recent (within last 10 seconds)
                const timeElapsed = Date.now() - data.timestamp;
                if (timeElapsed < 10000) {
                    setPaymentSuccessMessage(data.message);
                    setShowPaymentSuccess(true);
                    // Remove from localStorage after remaining time (don't remove immediately)
                    const remainingTime = 10000 - timeElapsed;
                    setTimeout(() => {
                        localStorage.removeItem('paymentSuccessMessage');
                        setShowPaymentSuccess(false);
                    }, remainingTime);
                } else {
                    localStorage.removeItem('paymentSuccessMessage');
                }
            } catch (e) {
                localStorage.removeItem('paymentSuccessMessage');
            }
        }
    }, []);

    // Calculate statistics
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Today's new leads (created today)
        const todayNewLeads = leads.filter(lead => {
            const createdAt = (lead as any).created_at || lead.createdAt;
            if (!createdAt) return false;
            const leadDate = new Date(createdAt);
            leadDate.setHours(0, 0, 0, 0);
            return leadDate.getTime() === today.getTime();
        }).length;
        
        // Today's touched leads (created today AND status is not Untouched)
        const todayTouchedLeads = leads.filter(lead => {
            const createdAt = (lead as any).created_at || lead.createdAt;
            if (!createdAt) return false;
            const leadDate = new Date(createdAt);
            leadDate.setHours(0, 0, 0, 0);
            const statusName = (lead as any).status_name || lead.status || '';
            return leadDate.getTime() === today.getTime() && statusName !== 'Untouched';
        }).length;
        
        // Today's untouched leads (created today AND status is Untouched)
        const todayUntouchedLeads = leads.filter(lead => {
            const createdAt = (lead as any).created_at || lead.createdAt;
            if (!createdAt) return false;
            const leadDate = new Date(createdAt);
            leadDate.setHours(0, 0, 0, 0);
            const statusName = (lead as any).status_name || lead.status || '';
            return leadDate.getTime() === today.getTime() && statusName === 'Untouched';
        }).length;
        
        // Delayed leads (created more than 3 days ago, untouched, and not assigned)
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const delayedLeads = leads.filter(lead => {
            const createdAt = (lead as any).created_at || lead.createdAt;
            if (!createdAt) return false;
            const leadDate = new Date(createdAt);
            leadDate.setHours(0, 0, 0, 0);
            const hasRecentActivity = clientTasks.some((ct: any) => {
                const ctCreatedAt = ct.created_at || ct.createdAt;
                if (!ctCreatedAt) return false;
                const activityDate = new Date(ctCreatedAt);
                activityDate.setHours(0, 0, 0, 0);
                const clientId = ct.client || ct.clientId;
                return clientId === lead.id && activityDate >= leadDate;
            });
            const assignedToId = (lead as any).assigned_to || lead.assignedTo;
            return leadDate < threeDaysAgo && !hasRecentActivity && (!assignedToId || assignedToId === 0);
        }).length;
        
        // Total leads
        const totalLeads = leads.length;
        
        // Total deals
        const totalDeals = deals.length;
        
        // Active todos
        const activeTodos = todos.length;
        
        // Completed deals (Won)
        const completedDeals = deals.filter(deal => deal.status === 'Won').length;
        
        // Pipeline value (sum of deal.value for open deals, i.e. status !== 'Won')
        const openDeals = deals.filter(deal => (deal as any).status !== 'Won');
        const pipelineValueSum = openDeals.reduce((sum, d) => sum + (Number((d as any).value) || 0), 0);
        const formatPipelineValue = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);
        
        // Win rate (Won / total * 100)
        const winRate = totalDeals > 0 ? Math.round((completedDeals / totalDeals) * 100) : 0;
        
        // Leads to contact today (leads with reminder_date = today and assigned_to is set)
        const leadsToContactToday = leads.filter(lead => {
            const assignedToId = (lead as any).assigned_to || lead.assignedTo;
            if (!assignedToId) return false;
            
            // Check if there's a ClientTask with reminder_date = today for this lead
            return clientTasks.some((ct: any) => {
                const clientId = ct.client || ct.clientId;
                if (clientId !== lead.id) return false;
                
                const reminderDate = ct.reminder_date;
                if (!reminderDate) return false;
                
                const reminder = new Date(reminderDate);
                reminder.setHours(0, 0, 0, 0);
                return reminder.getTime() === today.getTime();
            });
        });
        
        return [
            { 
                title: t('leadsToContactToday'), 
                value: leadsToContactToday.length, 
                icon: <TargetIcon className="w-6 h-6"/>, 
                gradient: 'from-orange-500 to-red-500',
                bgColor: 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30',
                iconBg: 'bg-orange-100 dark:bg-orange-900/40',
                textColor: 'text-orange-600 dark:text-orange-400'
            },
            { 
                title: t('todayNewLeads'), 
                value: todayNewLeads, 
                icon: <TargetIcon className="w-6 h-6"/>, 
                gradient: 'from-red-500 to-pink-500',
                bgColor: 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30',
                iconBg: 'bg-red-100 dark:bg-red-900/40',
                textColor: 'text-red-600 dark:text-red-400'
            },
            { 
                title: t('todayTouchedLeads'), 
                value: todayTouchedLeads, 
                icon: <UsersIcon className="w-6 h-6"/>, 
                gradient: 'from-green-500 to-emerald-500',
                bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
                iconBg: 'bg-green-100 dark:bg-green-900/40',
                textColor: 'text-green-600 dark:text-green-400'
            },
            { 
                title: t('todayUntouchedLeads'), 
                value: todayUntouchedLeads, 
                icon: <UsersIcon className="w-6 h-6"/>, 
                gradient: 'from-amber-500 to-orange-500',
                bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
                iconBg: 'bg-amber-100 dark:bg-amber-900/40',
                textColor: 'text-amber-600 dark:text-amber-400'
            },
            { 
                title: t('delayedLeads'), 
                value: delayedLeads, 
                icon: <UsersIcon className="w-6 h-6"/>, 
                gradient: 'from-purple-500 to-indigo-500',
                bgColor: 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30',
                iconBg: 'bg-purple-100 dark:bg-purple-900/40',
                textColor: 'text-purple-600 dark:text-purple-400'
            },
            { 
                title: t('totalLeads'), 
                value: totalLeads, 
                icon: <UsersIcon className="w-6 h-6"/>, 
                gradient: 'from-blue-500 to-cyan-500',
                bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
                iconBg: 'bg-blue-100 dark:bg-blue-900/40',
                textColor: 'text-blue-600 dark:text-blue-400'
            },
            { 
                title: t('totalDeals'), 
                value: totalDeals, 
                icon: <DealIcon className="w-6 h-6"/>, 
                gradient: 'from-yellow-500 to-amber-500',
                bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
                iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
                textColor: 'text-yellow-600 dark:text-yellow-400'
            },
            { 
                title: t('activeTodos'), 
                value: activeTodos, 
                icon: <CheckIcon className="w-6 h-6"/>, 
                gradient: 'from-sky-500 to-blue-500',
                bgColor: 'bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30',
                iconBg: 'bg-sky-100 dark:bg-sky-900/40',
                textColor: 'text-sky-600 dark:text-sky-400'
            },
            { 
                title: t('completedDeals'), 
                value: completedDeals, 
                icon: <DealIcon className="w-6 h-6"/>, 
                gradient: 'from-emerald-500 to-teal-500',
                bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
                iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
                textColor: 'text-emerald-600 dark:text-emerald-400'
            },
            { 
                title: t('pipelineValue'), 
                value: formatPipelineValue(pipelineValueSum), 
                icon: <DealIcon className="w-6 h-6"/>, 
                gradient: 'from-indigo-500 to-violet-500',
                bgColor: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30',
                iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
                textColor: 'text-indigo-600 dark:text-indigo-400'
            },
            { 
                title: t('winRate'), 
                value: `${winRate}%`, 
                icon: <CheckIcon className="w-6 h-6"/>, 
                gradient: 'from-teal-500 to-cyan-500',
                bgColor: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30',
                iconBg: 'bg-teal-100 dark:bg-teal-900/40',
                textColor: 'text-teal-600 dark:text-teal-400'
            },
        ];
    }, [leads, clientTasks, deals, todos, t]);
    
    // Stages report data - get from ClientTasks
    const stagesReportData = useMemo(() => {
        const stageCounts: { [key: string]: number } = {};
        
        // Count stages from ClientTasks
        clientTasks.forEach((ct: any) => {
            const stageName = ct.stage_name || ct.stage || 'Untouched';
            stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;
        });
        
        // If no ClientTasks, count by status
        if (Object.keys(stageCounts).length === 0) {
            leads.forEach(lead => {
                const statusName = (lead as any).status_name || lead.status || 'Untouched';
                stageCounts[statusName] = (stageCounts[statusName] || 0) + 1;
            });
        }
        
        const fallbackColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
        
        // Use colors from stages settings if available
        return Object.entries(stageCounts).map(([name, value], index) => {
            // Find stage config to get color
            const stageConfig = stages.find(s => 
                s.name.toLowerCase().replace(/\s+/g, '_') === name.toLowerCase().replace(/\s+/g, '_') ||
                s.name === name
            );
            
            return {
                name: getStageDisplayLabel(name.toLowerCase().replace(/\s+/g, '_') as any, t) || name,
                value,
                fill: stageConfig?.color || fallbackColors[index % fallbackColors.length],
            };
        });
    }, [leads, clientTasks, stages, t]);
    
    // Week leads chart data (last 7, 14, or 30 days)
    const weekLeadsData = useMemo(() => {
        const data: { name: string; "Leads Count": number }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = chartDaysRange;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
            const dateStr = date.toLocaleDateString(locale, withLatinDigits({ month: 'short', day: 'numeric' }));
            
            const leadsCount = leads.filter(lead => {
                const createdAt = (lead as any).created_at || lead.createdAt;
                if (!createdAt) return false;
                const leadDate = new Date(createdAt);
                leadDate.setHours(0, 0, 0, 0);
                return leadDate.getTime() === date.getTime();
            }).length;
            
            data.push({ name: dateStr, "Leads Count": leadsCount });
        }
        
        return data;
    }, [leads, language, chartDaysRange]);
    
    // Top users (users with most activities) - only from the same company
    const topUsers = useMemo(() => {
        const currentCompanyId = currentUser?.company?.id || currentUser?.company_id || (currentUser?.company as any)?.id;
        if (!currentCompanyId) return [];
        
        const userActivityCounts: { [userId: number]: number } = {};
        // Count activities from ClientTasks
        clientTasks.forEach((ct: any) => {
            const createdById = ct.created_by || ct.createdBy;
            if (createdById) {
                userActivityCounts[createdById] = (userActivityCounts[createdById] || 0) + 1;
            }
        });
        
        // Filter users by company and map activity counts
        const filteredUsers = users
            .filter(user => {
                const userCompanyId = user.company?.id || user.company_id || (user.company as any)?.id;
                return userCompanyId === currentCompanyId;
            })
            .map(user => ({
                ...user,
                activityCount: userActivityCounts[user.id] || 0,
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 3);
        
        // If no users with activities, show all users from company (with 0 activities)
        if (filteredUsers.length === 0) {
            return users
                .filter(user => {
                    const userCompanyId = user.company?.id || user.company_id || (user.company as any)?.id;
                    return userCompanyId === currentCompanyId;
                })
                .slice(0, 3)
                .map(user => ({
                    ...user,
                    activityCount: 0,
                }));
        }
        
        return filteredUsers;
    }, [users, clientTasks, currentUser]);

    const employeePresenceList = useMemo(() => {
        const currentCompanyId = currentUser?.company?.id || currentUser?.company_id || (currentUser?.company as any)?.id;
        if (!currentCompanyId) return [];

        return users
            .filter((user: any) => {
                const userCompanyId = user.company?.id || user.company_id || (user.company as any)?.id;
                const role = normalizeRole(user.role);
                return userCompanyId === currentCompanyId && role !== 'Owner' && role !== 'Supervisor';
            })
            .sort((a: any, b: any) => {
                const aOnline = Boolean(a.is_online);
                const bOnline = Boolean(b.is_online);
                if (aOnline !== bOnline) return aOnline ? -1 : 1;
                const aSeen = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
                const bSeen = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
                return bSeen - aSeen;
            })
            .slice(0, 8);
    }, [users, currentUser]);

    const onlineEmployeesCount = useMemo(
        () => employeePresenceList.filter((u: any) => Boolean(u.is_online)).length,
        [employeePresenceList],
    );
    
    // Latest feedbacks from API-computed latest client activity
    const latestFeedbacks = useMemo(() => {
        return [...leads]
            .filter((lead: any) => lead.last_feedback || lead.lastFeedback)
            .sort((a: any, b: any) => {
                const dateA = new Date(a.last_feedback_at || a.lastFeedbackAt || a.created_at || a.createdAt || 0).getTime();
                const dateB = new Date(b.last_feedback_at || b.lastFeedbackAt || b.created_at || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .slice(0, 5)
            .map((lead: any) => {
                const createdAt = lead.last_feedback_at || lead.lastFeedbackAt || lead.created_at || lead.createdAt || '';
                const assignedToId = lead.assigned_to || lead.assignedTo;
                const user = users.find(u => u.id === assignedToId);

                return {
                    id: lead.id,
                    date: createdAt
                        ? new Date(createdAt).toLocaleDateString(
                              language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
                              withLatinDigits({ year: 'numeric', month: 'short', day: 'numeric' }),
                          )
                        : '',
                    user: user?.name || lead.assigned_to_username || t('unknown'),
                    lead: lead.name || '',
                    stage: lead.last_stage || lead.lastStage || '',
                    notes: lead.last_feedback || lead.lastFeedback || '',
                    leadObj: lead ?? null,
                };
            });
    }, [leads, users, t, language]);
    
    // Leads to contact today - detailed list
    const leadsToContactTodayList = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter leads to contact today
        const leadsToContactToday = leads.filter(lead => {
            const assignedToId = (lead as any).assigned_to || lead.assignedTo;
            if (!assignedToId) return false;
            
            // Check if there's a ClientTask with reminder_date = today for this lead
            return clientTasks.some((ct: any) => {
                const clientId = ct.client || ct.clientId;
                if (clientId !== lead.id) return false;
                
                const reminderDate = ct.reminder_date;
                if (!reminderDate) return false;
                
                const reminder = new Date(reminderDate);
                reminder.setHours(0, 0, 0, 0);
                return reminder.getTime() === today.getTime();
            });
        });
        
        return leadsToContactToday.map(lead => {
            // Find the ClientTask with reminder_date = today
            const task = clientTasks.find((ct: any) => {
                const clientId = ct.client || ct.clientId;
                if (clientId !== lead.id) return false;
                
                const reminderDate = ct.reminder_date;
                if (!reminderDate) return false;
                
                const reminder = new Date(reminderDate);
                reminder.setHours(0, 0, 0, 0);
                return reminder.getTime() === today.getTime();
            });
            
            const assignedToId = (lead as any).assigned_to || lead.assignedTo;
            const assignedUser = users.find(u => u.id === assignedToId);
            
            return {
                lead,
                task,
                assignedUser: assignedUser?.name || t('unknown'),
                reminderDate: task?.reminder_date || null,
                notes: task?.notes || '',
                stage: task?.stage_name || task?.stage || '',
            };
        }).sort((a, b) => {
            // Sort by reminder time if available, otherwise by lead name
            if (a.reminderDate && b.reminderDate) {
                return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime();
            }
            return (a.lead.name || '').localeCompare(b.lead.name || '');
        });
    }, [leads, clientTasks, users, t]);

    const companyUserMap = useMemo(() => {
        const map = new Map<number, any>();
        users.forEach((u: any) => map.set(u.id, u));
        return map;
    }, [users]);

    const missionItems = useMemo<MissionItem[]>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueFollowUps = clientTasks.filter((ct: any) => {
            if (!ct.reminder_date) return false;
            const d = new Date(ct.reminder_date);
            d.setHours(0, 0, 0, 0);
            return d < today;
        }).length;
        const unassignedLeads = leads.filter((lead: any) => !(lead.assigned_to || lead.assignedTo)).length;
        const todayLeads = stats.find((s) => s.title === t('todayNewLeads'))?.value ?? 0;

        const items: MissionItem[] = [
            { id: 'contactToday', label: t('leadsToContactToday'), value: leadsToContactTodayList.length, tone: 'orange' },
            {
                id: 'overdue',
                label: t('overdueFollowUps'),
                value: overdueFollowUps,
                tone: 'red',
                onClick: () => {
                    window.history.pushState({}, '', '/todos');
                    setCurrentPage('Todos');
                },
            },
            {
                id: 'today',
                label: t('todayNewLeads'),
                value: Number(todayLeads),
                tone: 'blue',
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
        ];
        if (isAdmin) {
            items.push({
                id: 'unassigned',
                label: t('unassignedLeads'),
                value: unassignedLeads,
                tone: 'purple',
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            });
        }
        return items;
    }, [clientTasks, isAdmin, leads, leadsToContactTodayList.length, setCurrentPage, stats, t]);

    const funnelData = useMemo(() => {
        const touched = leads.filter((lead: any) => ((lead.status_name || lead.status || '') as string).toLowerCase() !== 'untouched').length;
        const meeting = clientTasks.filter((ct: any) => {
            const stage = String(ct.stage_name || ct.stage || '').toLowerCase();
            return stage.includes('meeting');
        }).length;
        const won = deals.filter((d: any) => String(d.stage || d.status).toLowerCase() === 'won' || String(d.status) === 'Won').length;
        return [
            { name: t('totalLeads'), value: leads.length },
            { name: t('funnelTouched'), value: touched },
            { name: t('funnelMeeting'), value: meeting },
            { name: t('funnelWon'), value: won },
        ];
    }, [clientTasks, deals, leads, t]);

    const mapAIInsight = (item: (typeof aiInsightsData)['pending'][0]) => {
        const lead = leads.find((l: any) => l.id === item.client_id);
        return {
            ...item,
            onView: lead
                ? () => {
                      setSelectedLead(lead);
                      window.history.pushState({}, '', `/view-lead/${lead.id}`);
                      setCurrentPage('ViewLead');
                  }
                : () => {
                      window.history.pushState({}, '', `/view-lead/${item.client_id}`);
                      setCurrentPage('ViewLead');
                  },
        };
    };

    const aiPendingItems = useMemo(
        () => (aiInsightsData?.pending || []).map(mapAIInsight),
        [aiInsightsData?.pending, leads, setCurrentPage, setSelectedLead],
    );
    const aiPriorityItems = useMemo(
        () => (aiInsightsData?.priority || []).map(mapAIInsight),
        [aiInsightsData?.priority, leads, setCurrentPage, setSelectedLead],
    );

    const hotLeads = useMemo<HotLeadItem[]>(() => {
        const now = Date.now();
        const byLeadActivity = new Map<number, number>();
        const pushActivity = (leadId: number, dateLike: any) => {
            const ts = new Date(dateLike || 0).getTime();
            if (!leadId || Number.isNaN(ts)) return;
            byLeadActivity.set(leadId, Math.max(byLeadActivity.get(leadId) || 0, ts));
        };
        clientTasks.forEach((ct: any) => pushActivity(ct.client || ct.clientId, ct.created_at || ct.createdAt || ct.reminder_date));
        clientCalls.forEach((c: any) => pushActivity(c.client || c.clientId, c.created_at || c.createdAt || c.call_datetime));
        clientVisits.forEach((v: any) => pushActivity(v.client || v.clientId, v.created_at || v.createdAt || v.visit_datetime));

        const visibleLeads = leads.filter((lead: any) => {
            if (isAssignedClinicalAppRole(currentUser?.role)) {
                return (lead.assigned_to || lead.assignedTo) === currentUser?.id;
            }
            return true;
        });

        return visibleLeads
            .map((lead: any) => {
                let score = 0;
                const leadType = String(lead.type || '').toLowerCase();
                if (leadType === 'hot') score += 40;
                else if (leadType === 'fresh') score += 8;
                const priority = String(lead.priority || '').toLowerCase();
                if (priority === 'high') score += 30;
                else if (priority === 'medium') score += 15;
                const stage = String(lead.last_stage || lead.lastStage || lead.status_name || lead.status || '').toLowerCase();
                if (['following', 'meeting', 'done_meeting', 'follow_after_meeting'].includes(stage)) score += 25;
                if (['not_interested', 'out_of_service', 'cancellation'].includes(stage)) score -= 20;
                const lastActivity = byLeadActivity.get(lead.id) || 0;
                if (lastActivity && now - lastActivity <= 3 * 24 * 60 * 60 * 1000) score += 15;
                if (!lastActivity || now - lastActivity > 7 * 24 * 60 * 60 * 1000) score -= 15;
                if (stage === 'untouched') score -= 10;
                const reminderToday = clientTasks.some((ct: any) => {
                    if ((ct.client || ct.clientId) !== lead.id || !ct.reminder_date) return false;
                    const d = new Date(ct.reminder_date);
                    const td = new Date();
                    return d.toDateString() === td.toDateString();
                });
                if (reminderToday) score += 10;

                const assignedToId = lead.assigned_to || lead.assignedTo;
                const assignedUser = companyUserMap.get(assignedToId);
                const stageName = lead.last_stage || lead.lastStage || lead.status_name || lead.status || t('noStage');
                const stageConfig = stages.find((s: any) => s.name?.toLowerCase().replace(/\s+/g, '_') === String(stageName).toLowerCase().replace(/\s+/g, '_'));
                let bucket: HotLeadItem['bucket'] = score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold';
                if (leadType === 'hot' && bucket !== 'hot') bucket = 'hot';
                return {
                    id: lead.id,
                    name: lead.name || `${t('lead')} #${lead.id}`,
                    assignedUser: assignedUser?.name || assignedUser?.username || t('unknown'),
                    stage: getStageDisplayLabel(String(stageName), t),
                    score,
                    bucket,
                    notes: lead.last_feedback || lead.lastFeedback || lead.notes || '',
                    stageColor: stageConfig?.color,
                    onView: () => {
                        setSelectedLead(lead);
                        window.history.pushState({}, '', `/view-lead/${lead.id}`);
                        setCurrentPage('ViewLead');
                    },
                };
            })
            .filter((lead) => lead.bucket !== 'cold')
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
    }, [clientCalls, clientTasks, clientVisits, companyUserMap, currentUser?.id, currentUser?.role, leads, setCurrentPage, setSelectedLead, stages, t]);

    const smartInsights = useMemo(() => {
        const insights: string[] = [];
        if (hotLeads.length > 0) {
            insights.push(`${hotLeads.length} ${t('hotLeads')} ${t('tipNeedsAttention')}`);
        }
        const overdue = missionItems.find((m) => m.id === 'overdue')?.value || 0;
        if (overdue > 0) {
            insights.push(`${overdue} ${t('overdueFollowUps')} - ${t('tipPaceUp')}`);
        }
        const unassigned = missionItems.find((m) => m.id === 'unassigned')?.value || 0;
        if (unassigned > 0) {
            insights.push(`${t('tipUnassignedReminder')}: ${unassigned}`);
        }
        return insights.slice(0, 2);
    }, [hotLeads.length, missionItems, t]);

    const trendSeries = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mkSeries = (getter: (d: Date) => number) =>
            Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (6 - i));
                return getter(date);
            });

        const leadsSeries = mkSeries((date) =>
            leads.filter((lead: any) => {
                const createdAt = new Date((lead as any).created_at || lead.createdAt || 0);
                createdAt.setHours(0, 0, 0, 0);
                return createdAt.getTime() === date.getTime();
            }).length,
        );
        const contactSeries = mkSeries((date) =>
            clientTasks.filter((ct: any) => {
                const r = ct.reminder_date ? new Date(ct.reminder_date) : null;
                if (!r) return false;
                r.setHours(0, 0, 0, 0);
                return r.getTime() === date.getTime();
            }).length,
        );
        return { leadsSeries, contactSeries };
    }, [clientTasks, leads]);

    const activityFeedItems = useMemo(() => {
        const events: Array<{ id: string; title: string; subtitle: string; time: string; createdAt: number }> = [];
        clientTasks.forEach((ct: any) => {
            const user = companyUserMap.get(ct.created_by || ct.createdBy);
            const lead = leads.find((l: any) => l.id === (ct.client || ct.clientId));
            const date = new Date(ct.created_at || ct.createdAt || 0).getTime();
            events.push({
                id: `task-${ct.id}`,
                title: `${user?.name || t('unknown')} · ${t('activities')}`,
                subtitle: `${lead?.name || t('lead')} · ${getStageDisplayLabel(ct.stage || ct.stage_name || 'following', t)}`,
                time: formatLastSeenRelative(new Date(date).toISOString(), t),
                createdAt: date,
            });
        });
        clientCalls.forEach((c: any) => {
            const user = companyUserMap.get(c.created_by || c.createdBy);
            const lead = leads.find((l: any) => l.id === (c.client || c.clientId));
            const date = new Date(c.created_at || c.createdAt || c.call_datetime || 0).getTime();
            events.push({
                id: `call-${c.id}`,
                title: `${user?.name || t('unknown')} · ${t('call') || 'Call'}`,
                subtitle: lead?.name || t('lead'),
                time: formatLastSeenRelative(new Date(date).toISOString(), t),
                createdAt: date,
            });
        });
        clientVisits.forEach((v: any) => {
            const user = companyUserMap.get(v.created_by || v.createdBy);
            const lead = leads.find((l: any) => l.id === (v.client || v.clientId));
            const date = new Date(v.created_at || v.createdAt || v.visit_datetime || 0).getTime();
            events.push({
                id: `visit-${v.id}`,
                title: `${user?.name || t('unknown')} · ${t('visit') || 'Visit'}`,
                subtitle: lead?.name || t('lead'),
                time: formatLastSeenRelative(new Date(date).toISOString(), t),
                createdAt: date,
            });
        });

        return events.sort((a, b) => b.createdAt - a.createdAt).slice(0, 15).map(({ id, title, subtitle, time }) => ({ id, title, subtitle, time }));
    }, [clientCalls, clientVisits, clientTasks, companyUserMap, leads, t]);

    const teamGoalsRows = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return users
            .filter((u: any) => {
                const ur = normalizeRole(u.role);
                return ur === 'Employee' || ur === 'Doctor' || ur === 'DataEntry';
            })
            .map((u: any) => {
                const progress = clientTasks.filter((ct: any) => {
                    const by = ct.created_by || ct.createdBy;
                    const created = new Date(ct.created_at || ct.createdAt || 0);
                    created.setHours(0, 0, 0, 0);
                    return by === u.id && created.getTime() === today.getTime();
                }).length;
                return { id: u.id, name: u.name || u.username || u.email, progress, target: teamDailyTarget };
            })
            .sort((a, b) => b.progress - a.progress);
    }, [clientTasks, teamDailyTarget, users]);

    const filteredWeekLeadsData = useMemo(() => {
        if (leadSourceFilter === 'all') return weekLeadsData;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const data: { name: string; 'Leads Count': number }[] = [];
        for (let i = chartDaysRange - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const locale = language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US';
            const dateStr = date.toLocaleDateString(locale, withLatinDigits({ month: 'short', day: 'numeric' }));
            const count = leads.filter((lead: any) => {
                const createdAt = new Date((lead as any).created_at || lead.createdAt || 0);
                createdAt.setHours(0, 0, 0, 0);
                return createdAt.getTime() === date.getTime() && String(lead.source || 'manual') === leadSourceFilter;
            }).length;
            data.push({ name: dateStr, 'Leads Count': count });
        }
        return data;
    }, [chartDaysRange, language, leadSourceFilter, leads, weekLeadsData]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const isMorning = hour >= 5 && hour < 12;
        return isMorning ? t('goodMorning') : t('goodAfternoon');
    }, [t]);
    const todayDateStr = useMemo(
        () =>
            new Date().toLocaleDateString(
                language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
                withLatinDigits({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            ),
        [language],
    );

    const isDark = theme === 'dark';
    const {
        contentStyle: tooltipContentStyle,
        labelStyle: tooltipLabelStyle,
        itemStyle: tooltipItemStyle,
    } = getRechartsTooltipStyles(isDark);

    const showTeamGoalsSidebar = isAdmin || normalizeRole(currentUser?.role) === 'Supervisor';

    const dashboardMenuAriaLabel = t('actions');

    const missionBarMenuItems = useMemo(
        () => [
            {
                label: t('viewAllLeads'),
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
            {
                label: t('todos'),
                onClick: () => {
                    window.history.pushState({}, '', '/todos');
                    setCurrentPage('Todos');
                },
            },
            {
                label: t('deals'),
                onClick: () => {
                    window.history.pushState({}, '', '/deals');
                    setCurrentPage('Deals');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const hotLeadsMenuItems = useMemo(
        () => [
            {
                label: t('viewAllLeads'),
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
            {
                label: t('addLead'),
                onClick: () => {
                    window.history.pushState({}, '', '/create-lead');
                    setCurrentPage('CreateLead');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const weekLeadsChartMenuItems = useMemo(
        () => [
            {
                label: t('viewAllLeads'),
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
            {
                label: t('addLead'),
                onClick: () => {
                    window.history.pushState({}, '', '/create-lead');
                    setCurrentPage('CreateLead');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const stagesReportMenuItems = useMemo(
        () => [
            {
                label: t('viewAllLeads'),
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
            {
                label: t('reports'),
                onClick: () => {
                    window.history.pushState({}, '', '/reports');
                    setCurrentPage('Reports');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const conversionFunnelMenuItems = useMemo(
        () => [
            {
                label: t('deals'),
                onClick: () => {
                    window.history.pushState({}, '', '/deals');
                    setCurrentPage('Deals');
                },
            },
            {
                label: t('viewAllLeads'),
                onClick: () => {
                    window.history.pushState({}, '', '/leads');
                    setCurrentPage('All Leads');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const activityFeedMenuItems = useMemo(
        () => [
            {
                label: t('activities'),
                onClick: () => {
                    window.history.pushState({}, '', '/activities');
                    setCurrentPage('Activities');
                },
            },
        ],
        [setCurrentPage, t],
    );

    const teamGoalsMenuItems = useMemo(
        () => [
            {
                label: t('employeesReport'),
                onClick: () => {
                    window.history.pushState({}, '', '/employees-report');
                    setCurrentPage('Employees Report');
                },
            },
        ],
        [setCurrentPage, t],
    );

    return (
        <PageWrapper title={t('dashboard')}>
            <div className="mx-auto max-w-[1600px] w-full">
            {/* Welcome & Quick Actions */}
            {!isDashboardLoading && (
                <div className={`mb-6 rounded-2xl bg-gradient-to-br from-white via-primary-50/40 to-blue-50/70 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/35 shadow-xl shadow-gray-200/80 dark:shadow-none dark:ring-1 dark:ring-gray-700/60 p-5 sm:p-7 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">
                                LOOP CRM
                            </p>
                            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">{currentUser?.name || t('user')}</span>
                            </h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{todayDateStr}</p>
                        </div>
                        <div className="flex flex-wrap gap-2.5 justify-start lg:justify-end">
                            <button
                                onClick={() => { window.history.pushState({}, '', '/leads'); setCurrentPage('All Leads'); }}
                                className="px-5 py-2.5 rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold shadow-sm hover:bg-white hover:shadow-md transition-all"
                            >
                                {t('viewAllLeads')}
                            </button>
                            <button
                                onClick={() => { window.history.pushState({}, '', '/deals'); setCurrentPage('Deals'); }}
                                className="px-5 py-2.5 rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold shadow-sm hover:bg-white hover:shadow-md transition-all"
                            >
                                {t('deals')}
                            </button>
                            <button
                                onClick={() => { window.history.pushState({}, '', '/todos'); setCurrentPage('Todos'); }}
                                className="px-5 py-2.5 rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white/90 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-semibold shadow-sm hover:bg-white hover:shadow-md transition-all"
                            >
                                {t('todos')}
                            </button>
                            <button
                                onClick={() => { window.history.pushState({}, '', '/create-lead'); setCurrentPage('CreateLead'); }}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 text-white text-sm font-bold shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 transition-all"
                            >
                                {t('addLead')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Loading state */}
            {isDashboardLoading && (
                <SectionLoadingState className="py-16 mb-6" label={t('loadingDashboard') || 'Loading dashboard'} />
            )}
            {/* Payment Success Notification */}
            {showPaymentSuccess && (
                <div className={`mb-6 p-5 sm:p-6 rounded-2xl border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-500/50 shadow-xl shadow-green-500/15 animate-slide-down ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                                    {t('paymentSuccess') || 'Payment Successful!'}
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                    {paymentSuccessMessage || (t('paymentSuccessMessage') || 'Your payment has been processed successfully. Your subscription is now active.')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPaymentSuccess(false)}
                            className="flex-shrink-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            {!isDashboardLoading && (
                <div className="space-y-6 mb-6">
                    <MissionBar
                        title={t('missionBar')}
                        items={missionItems}
                        menuItems={missionBarMenuItems}
                        menuAriaLabel={dashboardMenuAriaLabel}
                    />
                    <SmartInsights title={t('smartInsights')} insights={smartInsights} />
                    {aiInsightsData?.ai_enabled ? (
                        <AIInsightsCard
                            title={t('aiInsights')}
                            poweredByLabel={t('aiInsightsPoweredBy')}
                            pendingTitle={t('aiPendingApproval')}
                            priorityTitle={t('aiPriorityLeads')}
                            scoreLabel={t('aiScore')}
                            emptyLabel={t('aiNoInsights')}
                            viewLeadLabel={t('viewLead')}
                            approveLabel={t('aiApproveReminder')}
                            dismissLabel={t('aiDismiss')}
                            suggestedDateLabel={t('aiSuggestedDate')}
                            pending={aiPendingItems}
                            priority={aiPriorityItems}
                            onApprove={(id) => {
                                setAiActionId(id);
                                setAiActionType('approve');
                                approveAI.mutate(id, {
                                    onError: () => {
                                        setAlertMessage(t('failedToApproveAIInsight'));
                                        setAlertVariant('error');
                                        setIsAlertModalOpen(true);
                                    },
                                    onSettled: () => {
                                        setAiActionId(null);
                                        setAiActionType(null);
                                    },
                                });
                            }}
                            onDismiss={(id) => {
                                setAiActionId(id);
                                setAiActionType('dismiss');
                                dismissAI.mutate(id, {
                                    onError: () => {
                                        setAlertMessage(t('failedToDismissAIInsight'));
                                        setAlertVariant('error');
                                        setIsAlertModalOpen(true);
                                    },
                                    onSettled: () => {
                                        setAiActionId(null);
                                        setAiActionType(null);
                                    },
                                });
                            }}
                            approvingId={aiActionType === 'approve' ? aiActionId : null}
                            dismissingId={aiActionType === 'dismiss' ? aiActionId : null}
                        />
                    ) : null}
                    {showManagementReport ? (
                        <ManagementReportCard
                            title={t('managementReport')}
                            poweredByLabel={t('aiInsightsPoweredBy')}
                            employeeSectionTitle={t('managementReportEmployeePerformance')}
                            hotLeadsSectionTitle={t('managementReportHotLeads')}
                            activityLabel={t('managementReportEmployee')}
                            tasksLabel={t('managementReportTasks')}
                            callsLabel={t('managementReportCalls')}
                            visitsLabel={t('managementReportVisits')}
                            assignedLeadsLabel={t('managementReportAssignedLeads')}
                            emptyEmployeesLabel={t('managementReportNoEmployees')}
                            emptyHotLeadsLabel={t('managementReportNoHotLeads')}
                            refreshLabel={t('managementReportRefresh')}
                            viewLeadLabel={t('viewLead')}
                            report={managementReport}
                            loading={managementReportLoading}
                            generating={generateManagementReport.isPending}
                            language={language}
                            onRefresh={() => generateManagementReport.mutate()}
                            onViewLead={(clientId) => {
                                const lead = leads.find((l: any) => l.id === clientId);
                                if (lead) {
                                    setSelectedLead(lead);
                                }
                                window.history.pushState({}, '', `/view-lead/${clientId}`);
                                setCurrentPage('ViewLead');
                            }}
                        />
                    ) : null}
                    <HotLeadsCard
                        title={t('hotLeads')}
                        scoreLabel={t('score')}
                        emptyLabel={t('noDataAvailable')}
                        viewLeadLabel={t('viewLead')}
                        leads={hotLeads}
                        menuItems={hotLeadsMenuItems}
                        menuAriaLabel={dashboardMenuAriaLabel}
                    />

                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{t('dashboardSectionToday')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <StatCard
                                title={t('leadsToContactToday')}
                                value={leadsToContactTodayList.length}
                                icon={<TargetIcon className="w-6 h-6" />}
                                accent="orange"
                                deltaLabel={t('vsYesterday')}
                                trendData={trendSeries.contactSeries}
                            />
                            <StatCard
                                title={t('todayNewLeads')}
                                value={stats[1]?.value || 0}
                                icon={<UsersIcon className="w-6 h-6" />}
                                accent="blue"
                                deltaLabel={t('vsYesterday')}
                                trendData={trendSeries.leadsSeries}
                            />
                            <StatCard
                                title={t('todayTouchedLeads')}
                                value={stats[2]?.value || 0}
                                icon={<CheckIcon className="w-6 h-6" />}
                                accent="emerald"
                                deltaLabel={t('vsYesterday')}
                                trendData={trendSeries.leadsSeries}
                            />
                            <StatCard
                                title={t('delayedLeads')}
                                value={stats[4]?.value || 0}
                                icon={<ClockIcon className="w-6 h-6" />}
                                accent="rose"
                                deltaLabel={t('vsYesterday')}
                                deltaPositive={false}
                                trendData={trendSeries.contactSeries}
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Charts Section */}
            {!isDashboardLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 rounded-2xl border-0 shadow-xl shadow-gray-200/70 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-5 sm:p-6 hover:shadow-2xl transition-shadow duration-300">
                     <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-700/80">
                         <div className="min-w-0">
                             <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{t('weekLeadsReport')}</h2>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('last7DaysPerformance')}</p>
                         </div>
                         <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                           <div className="flex flex-wrap gap-2">
                             <div className="flex rounded-xl border border-gray-200/80 dark:border-gray-600 p-1 bg-gray-100/80 dark:bg-gray-800/80">
                             {([7, 14, 30] as const).map((days) => (
                                 <button
                                     key={days}
                                     onClick={() => setChartDaysRange(days)}
                                     className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                                         chartDaysRange === days
                                             ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md'
                                             : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                     }`}
                                 >
                                     {days === 7 ? t('last7Days') : days === 14 ? t('last14Days') : t('last30Days')}
                                 </button>
                             ))}
                             </div>
                             <div className="flex rounded-xl border border-gray-200/80 dark:border-gray-600 p-1 bg-gray-100/80 dark:bg-gray-800/80">
                             {([
                                 { key: 'all', label: t('all') },
                                 { key: 'meta_lead_form', label: 'Meta' },
                                 { key: 'whatsapp', label: 'WhatsApp' },
                                 { key: 'manual', label: t('manual') || 'Manual' },
                             ] as const).map((source) => (
                                 <button
                                     key={source.key}
                                     onClick={() => setLeadSourceFilter(source.key)}
                                     className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                         leadSourceFilter === source.key
                                             ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md'
                                             : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                     }`}
                                 >
                                     {source.label}
                                 </button>
                             ))}
                             </div>
                           </div>
                           <DashboardWidgetMenu items={weekLeadsChartMenuItems} ariaLabel={dashboardMenuAriaLabel} />
                         </div>
                     </div>
                     <div className="overflow-x-auto -mx-1 px-1">
                         <div className="min-w-[300px]">
                             <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={filteredWeekLeadsData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} isAnimationActive>
                                     <defs>
                                         <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                                             <stop offset="55%" stopColor="#6366f1" stopOpacity={0.12}/>
                                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                         </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4b5563' : '#e5e7eb'} strokeOpacity={0.3} />
                                     <XAxis 
                                         dataKey="name" 
                                         stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                         tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                         axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#e5e7eb' }}
                                     />
                                     <YAxis 
                                         stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                                         tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                         axisLine={{ stroke: theme === 'dark' ? '#4b5563' : '#e5e7eb' }}
                                     />
                                     <Tooltip
                                         contentStyle={tooltipContentStyle}
                                         labelStyle={tooltipLabelStyle}
                                         itemStyle={tooltipItemStyle}
                                     />
                                     <Area 
                                         type="monotone" 
                                         name={t('leadsCount')}
                                         dataKey="Leads Count" 
                                         stroke="#6366f1" 
                                         strokeWidth={3}
                                         fill="url(#colorLeads)"
                                         activeDot={{ r: 6, fill: '#6366f1' }}
                                     />
                                 </AreaChart>
                             </ResponsiveContainer>
                         </div>
                     </div>
                </Card>
                <Card className="rounded-2xl border-0 shadow-xl shadow-gray-200/70 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-5 sm:p-6 hover:shadow-2xl transition-shadow duration-300">
                    <div className="flex items-start justify-between gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700/80">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('stagesReport')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('distributionByStage')}</p>
                        </div>
                        <DashboardWidgetMenu items={stagesReportMenuItems} ariaLabel={dashboardMenuAriaLabel} />
                    </div>
                    {stagesReportData.length > 0 ? (
                        <div className="space-y-4">
                          <div className="h-[240px] min-h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie 
                                  data={stagesReportData} 
                                  dataKey="value" 
                                  nameKey="name" 
                                  cx="50%" 
                                  cy="50%" 
                                  outerRadius={80}
                                  innerRadius={40}
                                  paddingAngle={2}
                                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  labelLine={false}
                                >
                                  {stagesReportData.map((entry, index) => (
                                      <Cell 
                                          key={`cell-${index}`} 
                                          fill={entry.fill}
                                          stroke="#fff"
                                          strokeWidth={2}
                                      />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={tooltipContentStyle}
                                  labelStyle={tooltipLabelStyle}
                                  itemStyle={tooltipItemStyle}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Legend */}
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 max-h-32 overflow-y-auto px-1">
                            {stagesReportData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0" 
                                            style={{ backgroundColor: entry.fill }}
                                        ></div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                                            {entry.name}
                                        </span>
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-400 font-semibold ml-2 flex-shrink-0">
                                        {entry.value}
                                    </span>
                                </div>
                            ))}
                          </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[320px] text-gray-600 dark:text-gray-400">
                            <div className="text-center">
                                <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                                <p className="text-xs mt-1 text-gray-400">{t('noStageDataAvailable')}</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
            )}
            {!isDashboardLoading && (
                <div className="mb-6">
                    <ConversionFunnel
                        title={t('conversionFunnel')}
                        items={funnelData}
                        menuItems={conversionFunnelMenuItems}
                        menuAriaLabel={dashboardMenuAriaLabel}
                    />
                </div>
            )}
            {/* Leads to Contact Today Section */}
            {!isDashboardLoading && leadsToContactTodayList.length > 0 && (
                <Card className="mb-6 rounded-2xl border-0 shadow-xl shadow-orange-500/15 dark:shadow-none dark:ring-1 dark:ring-orange-900/40 bg-gradient-to-br from-orange-50/90 to-rose-50/80 dark:from-orange-950/30 dark:to-red-950/25">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-200 dark:border-orange-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <TargetIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                {t('leadsToContactToday')}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('leadsToContactTodayDescription')}</p>
                        </div>
                        <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{leadsToContactTodayList.length}</span>
                        </div>
                    </div>
                    <TableHorizontalScroll scrollClassName="-mx-2 px-2">
                        <div className="min-w-full block">
                            <div className="overflow-hidden rounded-lg">
                                <table className="w-full text-sm text-left rtl:text-right min-w-[600px]">
                                    <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/50 dark:to-red-900/50 border-b-2 border-orange-200 dark:border-orange-700">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('lead')}</th>
                                            <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('assignedTo')}</th>
                                            <th scope="col" className="px-4 py-3.5 hidden sm:table-cell font-bold text-center whitespace-nowrap">{t('stage')}</th>
                                            <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('reminderTime')}</th>
                                            <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('notes')}</th>
                                            <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-orange-100 dark:divide-orange-900/30">
                                        {leadsToContactTodayList.map((item) => {
                                            const lead = item.lead;
                                            const reminderTime = item.reminderDate 
                                                ? new Date(item.reminderDate).toLocaleTimeString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ 
                                                    hour: '2-digit', 
                                                    minute: '2-digit',
                                                    hour12: language === 'ar' ? false : true
                                                }))
                                                : '';
                                            
                                            return (
                                                <tr 
                                                    key={lead.id} 
                                                    className="bg-white dark:bg-dark-card hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors duration-150"
                                                >
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                            {lead.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                            {item.assignedUser}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell text-center">
                                                        {item.stage ? (() => {
                                                            const stageConfig = stages.find(s => 
                                                                s.name.toLowerCase().replace(/\s+/g, '_') === item.stage.toLowerCase().replace(/\s+/g, '_') ||
                                                                s.name === item.stage
                                                            );
                                                            const stageColor = stageConfig?.color || '#3b82f6';
                                                            
                                                            return (
                                                                <span 
                                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                                                                    style={{ 
                                                                        backgroundColor: stageColor,
                                                                        backgroundImage: `linear-gradient(to right, ${stageColor}, ${stageColor}dd)`
                                                                    }}
                                                                >
                                                                    {getStageDisplayLabel(item.stage, t)}
                                                                </span>
                                                            );
                                                        })() : (
                                                            <span className="text-xs text-gray-400 italic">{t('noStage')}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                                            {reminderTime || t('noTimeSet')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <p className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                                            {item.notes || <span className="text-gray-400 italic">{t('noNotes')}</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedLead(lead);
                                                                window.history.pushState({}, '', `/view-lead/${lead.id}`);
                                                                setCurrentPage('ViewLead');
                                                            }}
                                                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors"
                                                        >
                                                            {t('viewLead')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TableHorizontalScroll>
                </Card>
            )}
            {!isDashboardLoading && leadsToContactTodayList.length === 0 && (
                <Card className="mb-6 rounded-2xl border-0 shadow-xl shadow-gray-200/60 dark:shadow-none dark:ring-1 dark:ring-gray-700/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                                <TargetIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('leadsToContactToday')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('noLeadsToContactToday')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { window.history.pushState({}, '', '/leads'); setCurrentPage('All Leads'); }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                            {t('viewAllLeads')}
                        </button>
                    </div>
                </Card>
            )}
            
            {/* Bottom Section */}
            {!isDashboardLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <ActivityFeed
                    title={t('activityFeed')}
                    items={activityFeedItems}
                    emptyLabel={t('noDataAvailable')}
                    className={showTeamGoalsSidebar ? 'lg:col-span-2' : 'lg:col-span-3'}
                    menuItems={activityFeedMenuItems}
                    menuAriaLabel={dashboardMenuAriaLabel}
                />
                {showTeamGoalsSidebar && (
                    <TeamGoals
                        title={t('teamGoals')}
                        targetLabel={t('dailyTarget')}
                        rows={teamGoalsRows}
                        emptyLabel={t('noDataAvailable')}
                        menuItems={teamGoalsMenuItems}
                        menuAriaLabel={dashboardMenuAriaLabel}
                    />
                )}
            </div>
            )}
            {!isDashboardLoading && (
            <div className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{t('dashboardSectionPipeline')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <StatCard title={t('pipelineValue')} value={stats[9]?.value || 0} icon={<DealIcon className="w-6 h-6" />} accent="indigo" deltaLabel={t('vsLastWeek')} trendData={trendSeries.leadsSeries} />
                    <StatCard title={t('winRate')} value={stats[10]?.value || 0} icon={<CheckIcon className="w-6 h-6" />} accent="teal" deltaLabel={t('vsLastWeek')} trendData={trendSeries.contactSeries} />
                    <StatCard title={t('averageDealSize')} value={deals.length ? Math.round(deals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0) / deals.length) : 0} icon={<DealIcon className="w-6 h-6" />} accent="amber" deltaLabel={t('vsLastWeek')} trendData={trendSeries.contactSeries} />
                    <StatCard title={t('totalDeals')} value={stats[6]?.value || 0} icon={<DealIcon className="w-6 h-6" />} accent="violet" deltaLabel={t('vsLastWeek')} trendData={trendSeries.leadsSeries} />
                </div>
            </div>
            )}
            {!isDashboardLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 rounded-2xl border-0 shadow-xl shadow-gray-200/70 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 hover:shadow-2xl transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('topUsers')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('mostActivePerformers')}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {topUsers.length > 0 ? (
                            topUsers.map((user, index) => (
                                <div 
                                    key={user.id} 
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                                        index === 0 
                                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-2 border-yellow-200 dark:border-yellow-800 shadow-sm' 
                                            : 'bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={user.avatar} 
                                            alt={user.name} 
                                            className={`rounded-full flex-shrink-0 ${
                                                index === 0 ? 'w-14 h-14 ring-4 ring-yellow-200 dark:ring-yellow-800' : 'w-12 h-12 ring-2 ring-gray-200 dark:ring-gray-700'
                                            }`} 
                                        />
                                        {index === 0 && (
                                            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                                1
                                            </span>
                                        )}
                                        {index === 1 && (
                                            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                                2
                                            </span>
                                        )}
                                        {index === 2 && (
                                            <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-600 to-amber-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                                3
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                            {getRoleTranslation(user.role, t, currentUser?.company?.specialization)}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                                            <p className={`text-xs font-semibold ${index === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {user.activityCount} {t('activities')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                                <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                                <p className="text-xs mt-1 text-gray-400">{t('noUserActivityData')}</p>
                            </div>
                        )}
                    </div>
                </Card>
                {isAdmin && (
                    <Card className="lg:col-span-1 rounded-2xl border-0 shadow-xl shadow-gray-200/70 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 hover:shadow-2xl transition-shadow duration-300">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('employees')} {t('online') || 'Online'}</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {onlineEmployeesCount}/{employeePresenceList.length} {t('online') || 'Online'}
                                </p>
                            </div>
                            <button
                                onClick={() => refetchUsers()}
                                disabled={isUsersFetching}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:hover:bg-gray-700"
                            >
                                {t('refresh') || 'Refresh'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {employeePresenceList.length > 0 ? (
                                employeePresenceList.map((user: any) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {user.name || user.username || user.email}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {getRoleTranslation(user.role, t, currentUser?.company?.specialization)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${user.is_online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                            <span className="text-xs text-gray-600 dark:text-gray-300">
                                                {user.is_online
                                                    ? (t('online') || 'Online')
                                                    : `${t('lastSeen') || 'Last seen'} ${formatLastSeenRelative(user.last_seen_at, t)}`}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-600 dark:text-gray-400">
                                    <p className="text-sm font-medium">{t('noEmployeesFound') || 'No employees found'}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
                <Card className="lg:col-span-2 rounded-2xl border-0 shadow-xl shadow-gray-200/70 dark:shadow-none dark:ring-1 dark:ring-gray-700/50 hover:shadow-2xl transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('latestFeedbacks')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('recentActivityUpdates')}</p>
                        </div>
                    </div>
                    <TableHorizontalScroll scrollClassName="-mx-2 px-2">
                        <div className="min-w-full block">
                            <div className="overflow-hidden rounded-lg">
                                {latestFeedbacks.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right min-w-[600px]">
                                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('date')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('user')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('lead')}</th>
                                                <th scope="col" className="px-4 py-3.5 hidden sm:table-cell font-bold text-center whitespace-nowrap">{t('stage')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('lastFeedback')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold text-center whitespace-nowrap">{t('action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {latestFeedbacks.map((feedback) => (
                                                    <tr 
                                                        key={feedback.id} 
                                                        className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                                    >
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {feedback.date}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                                {feedback.user}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {feedback.lead}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell text-center">
                                                            {(() => {
                                                                const stageName = feedback.stage;
                                                                const stageConfig = stages.find(s => 
                                                                    s.name.toLowerCase().replace(/\s+/g, '_') === stageName.toLowerCase().replace(/\s+/g, '_') ||
                                                                    s.name === stageName
                                                                );
                                                                const stageColor = stageConfig?.color || '#3b82f6';
                                                                
                                                                return (
                                                                    <span 
                                                                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                                                                        style={{ 
                                                                            backgroundColor: stageColor,
                                                                            backgroundImage: `linear-gradient(to right, ${stageColor}, ${stageColor}dd)`
                                                                        }}
                                                                    >
                                                                        {getStageDisplayLabel(stageName, t)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            <p className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                                                {feedback.notes || <span className="text-gray-400 italic">{t('noNotes')}</span>}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                                            {feedback.leadObj ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedLead(feedback.leadObj);
                                                                        window.history.pushState({}, '', `/view-lead/${(feedback.leadObj as any).id}`);
                                                                        setCurrentPage('ViewLead');
                                                                    }}
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                                                                >
                                                                    {t('viewLead')}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                                        <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                            <UsersIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-medium">{t('noDataAvailable')}</p>
                                        <p className="text-xs mt-1 text-gray-400">{t('noRecentFeedbackAvailable')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TableHorizontalScroll>
                </Card>
            </div>
            )}
            </div>
        </PageWrapper>
    );
};