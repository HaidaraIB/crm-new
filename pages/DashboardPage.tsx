

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, PageWrapper, TargetIcon, UsersIcon, Loader, DealIcon, CheckIcon } from '../components/index';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { getStageDisplayLabel } from '../utils/taskStageMapper';
import { useLeads, useDeals, useActivities, useTasks, useUsers, useClientTasks, useStages } from '../hooks/useQueries';

export const DashboardPage = () => {
    const { t, currentUser, language } = useAppContext();
    const isAdmin = currentUser?.role === 'Owner';
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string>('');

    // Fetch all data using React Query
    const { data: leadsResponse } = useLeads();
    const leads = leadsResponse?.results || [];

    const { data: dealsResponse } = useDeals();
    const deals = dealsResponse?.results || [];

    const { data: activitiesResponse } = useActivities();
    const activities = activitiesResponse?.results || [];

    const { data: tasksResponse } = useTasks();
    const todos = tasksResponse?.results || [];

    const { data: usersResponse } = useUsers();
    const users = usersResponse?.results || [];
    
    const { data: clientTasksResponse } = useClientTasks();
    const clientTasks = clientTasksResponse?.results || [];

    const { data: stagesResponse } = useStages();
    const stages = Array.isArray(stagesResponse) 
        ? stagesResponse 
        : (stagesResponse?.results || []);

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
        
        return [
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
                name: getStageDisplayLabel(name.toLowerCase().replace(/\s+/g, '_') as any) || name,
                value,
                fill: stageConfig?.color || fallbackColors[index % fallbackColors.length],
            };
        });
    }, [leads, clientTasks, stages]);
    
    // Week leads chart data (last 7 days)
    const weekLeadsData = useMemo(() => {
        const data: { name: string; "Leads Count": number }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const locale = language === 'ar' ? 'ar-SA' : 'en-US';
            const dateStr = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
            
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
    }, [leads, language]);
    
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
    
    // Latest feedbacks (latest ClientTasks)
    const latestFeedbacks = useMemo(() => {
        return clientTasks
            .sort((a: any, b: any) => {
                const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
                const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .slice(0, 5)
            .map((ct: any) => {
                const createdAt = ct.created_at || ct.createdAt || '';
                const createdById = ct.created_by || ct.createdBy;
                const user = users.find(u => u.id === createdById);
                const clientId = ct.client || ct.clientId;
                const lead = leads.find((l: any) => l.id === clientId);
                
                return {
                    id: ct.id,
                    date: createdAt ? new Date(createdAt).toLocaleDateString() : '',
                    user: user?.name || ct.created_by_username || t('unknown'),
                    lead: ct.client_name || lead?.name || '',
                    stage: ct.stage_name || ct.stage || '',
                    notes: ct.notes || '',
                };
            });
    }, [clientTasks, users, leads, t]);


    return (
        <PageWrapper title={t('dashboard')}>
            {/* Payment Success Notification */}
            {showPaymentSuccess && (
                <div className={`mb-6 p-4 rounded-lg border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-500/50 shadow-lg animate-slide-down ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
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
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                {stats.map(stat => (
                    <div key={stat.title} className="group">
                        <Card className={`h-full ${stat.bgColor} border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-gray-300 dark:hover:border-gray-600 relative overflow-hidden`}>
                            {/* Decorative gradient overlay */}
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:opacity-10 transition-opacity`}></div>
                            
                            <div className="relative flex items-center gap-4">
                                <div className={`p-3 ${stat.iconBg} rounded-xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                    <div className={stat.textColor}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium truncate mb-1.5">{stat.title}</p>
                                    <p className={`text-3xl sm:text-4xl font-bold ${stat.textColor} leading-tight`}>{stat.value}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                         <div>
                             <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('weekLeadsReport')}</h2>
                             <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('last7DaysPerformance')}</p>
                         </div>
                     </div>
                     <div className="overflow-x-auto -mx-2 px-2">
                         <div className="min-w-[300px]">
                             <ResponsiveContainer width="100%" height={320}>
                                 <AreaChart data={weekLeadsData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                     <defs>
                                         <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                         </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                                     <XAxis 
                                         dataKey="name" 
                                         stroke="#6b7280" 
                                         tick={{ fill: '#6b7280', fontSize: 12 }}
                                         axisLine={{ stroke: '#e5e7eb' }}
                                     />
                                     <YAxis 
                                         stroke="#6b7280" 
                                         tick={{ fill: '#6b7280', fontSize: 12 }}
                                         axisLine={{ stroke: '#e5e7eb' }}
                                     />
                                     <Tooltip
                                         contentStyle={{
                                             backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                             border: 'none',
                                             borderRadius: '8px',
                                             padding: '12px',
                                             boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                         }}
                                         labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                         itemStyle={{ color: '#fff' }}
                                     />
                                     <Area 
                                         type="monotone" 
                                         dataKey="Leads Count" 
                                         stroke="#3b82f6" 
                                         strokeWidth={3}
                                         fill="url(#colorLeads)"
                                         activeDot={{ r: 6, fill: '#3b82f6' }}
                                     />
                                 </AreaChart>
                             </ResponsiveContainer>
                         </div>
                     </div>
                </Card>
                <Card className="border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('stagesReport')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('distributionByStage')}</p>
                        </div>
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
                                  contentStyle={{
                                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                  }}
                                  labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                  itemStyle={{ color: '#fff' }}
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
            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
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
                                            {user.role === 'Owner' ? t('owner') : t('employee')}
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
                <Card className="lg:col-span-2 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('latestFeedbacks')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('recentActivityUpdates')}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto -mx-2 px-2">
                        <div className="min-w-full inline-block align-middle">
                            <div className="overflow-hidden rounded-lg">
                                {latestFeedbacks.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right min-w-[600px]">
                                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th scope="col" className="px-4 py-3.5 font-bold">{t('date')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold">{t('user')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold">{t('lead')}</th>
                                                <th scope="col" className="px-4 py-3.5 hidden sm:table-cell font-bold">{t('stage')}</th>
                                                <th scope="col" className="px-4 py-3.5 font-bold">{t('lastFeedback')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {latestFeedbacks.map((feedback, index) => {
                                                const lead = leads.find(l => l.name === feedback.lead);
                                                return (
                                                    <tr 
                                                        key={feedback.id} 
                                                        className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                                                    >
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {feedback.date}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                                {feedback.user}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                                {feedback.lead}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
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
                                                                        {getStageDisplayLabel(stageName)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                                                {feedback.notes || <span className="text-gray-400 italic">{t('noNotes')}</span>}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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
                    </div>
                </Card>
            </div>
        </PageWrapper>
    );
};