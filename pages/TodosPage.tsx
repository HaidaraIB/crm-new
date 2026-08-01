
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, ClockIcon, UsersIcon, PhoneIcon, ListIcon, CheckIcon, PlusIcon, EditIcon, TrashIcon, EyeIcon, EditTodoModal, TableHorizontalScroll, ViewModeToggle, useEntityViewMode, PageLoadingState } from '../components/index';
import { TodosKanbanView } from '../components/todos/TodosKanbanView';
import type { TodoKanbanItem } from '../components/todos/TodoKanbanCard';
import { TaskStage, Stage, Lead, Deal } from '../types';

type CallMethodItem = { id: number; name: string; color?: string };
import { getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { isSameDay, ARABIC_DATE_LOCALE, withLatinDigits } from '../utils/dateUtils';
import {
    readMissionBarTodosPreset,
    clearMissionBarTodosPreset,
    isOverdueFollowUpTask,
    type MissionBarTodosPreset,
} from '../utils/missionBarNavigation';
import { getCompanyViewLeadRoute } from '../utils/routing';
import { getLocalizedApiErrorMessage } from '../utils/apiErrorMessage';
import {
    useTasks,
    useCompleteTask,
    useDeleteTask,
    useStages,
    useDeals,
    useClientTasks,
    useClientCalls,
    useDeleteClientTask,
    useDeleteClientCall,
    useCompleteClientTaskReminder,
    useCompleteClientCallFollowUp,
    useCallMethods,
} from '../hooks/useQueries';
import { PAGE_TAB_ACTIVE, PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
const PAGE_SIZE_OPTIONS = [20, 50, 100];

type FilterType = 'all' | string;
type TaskTypeFilter = 'all' | 'deal_task' | 'client_task' | 'client_call';

const isTodoCompleted = (todo: any): boolean => {
    const taskType = todo?.type || 'deal_task';
    if (taskType === 'deal_task') {
        return !!(todo.completed_at || todo.completedAt);
    }
    if (taskType === 'client_task') {
        return !!(todo.reminder_completed_at || todo.reminderCompletedAt || todo.isCompleted);
    }
    if (taskType === 'client_call') {
        return !!(todo.follow_up_completed_at || todo.followUpCompletedAt || todo.isCompleted);
    }
    return false;
};

const isReminderOverdue = (reminderDate: string | null | undefined): boolean => {
    if (!reminderDate) return false;
    try {
        return new Date(reminderDate).getTime() < Date.now();
    } catch {
        return false;
    }
};

// Map stage categories to icons
const getStageIcon = (stage: TaskStage) => {
    const category = getStageCategory(stage);
    if (category === 'Meeting') return UsersIcon;
    if (category === 'Call') return PhoneIcon;
    if (category === 'WhatsApp') return PhoneIcon;
    return ClockIcon; // Default for hold and others
};

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

export const TodosPage = () => {
    const {
        t,
        setIsAddTodoModalOpen,
        language,
        setConfirmDeleteConfig,
        setIsConfirmDeleteModalOpen,
        todosPagePreset,
        setTodosPagePreset,
        setSelectedLead,
        setCurrentPage,
        setViewingDeal,
        setIsViewDealModalOpen,
        currentUser,
        setAlertMessage,
        setAlertVariant,
        setIsAlertModalOpen,
    } = useAppContext();
    
    // Load selected date from localStorage or default to today
    // Use 'all' string to represent null (All option)
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        const saved = localStorage.getItem('todosSelectedDate');
        if (saved === 'all' || saved === null || saved === '') {
            return null; // All option
        }
        try {
            const date = new Date(saved);
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return new Date(); // Start with today as fallback
    });
    
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [calendarOverdueOnly, setCalendarOverdueOnly] = useState(
        () => readMissionBarTodosPreset() === 'overdue',
    );
    
    // Load active tab from localStorage or default to 'active'
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>(() => {
        const saved = localStorage.getItem('todosActiveTab');
        if (saved === 'active' || saved === 'completed') {
            return saved;
        }
        return 'active'; // Default to active
    });
    
    const [weekDays, setWeekDays] = useState<Date[]>([]);
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
    const [todosPageNumber, setTodosPageNumber] = useState(1);
    const [todosPageSize, setTodosPageSize] = useState(20);
    const [viewMode, setViewMode] = useEntityViewMode('todos');
    const isBoardView = viewMode === 'board';

    const applyMissionPreset = (preset: MissionBarTodosPreset) => {
        if (preset === 'overdue') {
            setCalendarOverdueOnly(true);
            setSelectedDate(null);
            setActiveTab('active');
            return;
        }
        setCalendarOverdueOnly(false);
        clearMissionBarTodosPreset();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
        setActiveTab('active');
    };

    const exitOverdueFollowUpsView = () => {
        setCalendarOverdueOnly(false);
        clearMissionBarTodosPreset();
    };
    
    useEffect(() => {
        if (todosPagePreset) {
            applyMissionPreset(todosPagePreset);
            setTodosPagePreset(null);
            return;
        }
        if (readMissionBarTodosPreset() === 'overdue') {
            applyMissionPreset('overdue');
        }
    }, [todosPagePreset, setTodosPagePreset]);

    // Save selected date to localStorage when it changes
    // Save 'all' string when selectedDate is null (All option)
    useEffect(() => {
        if (selectedDate) {
            localStorage.setItem('todosSelectedDate', selectedDate.toISOString());
        } else {
            localStorage.setItem('todosSelectedDate', 'all'); // Save 'all' to preserve All selection
        }
    }, [selectedDate]);
    
    // Save active tab to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('todosActiveTab', activeTab);
    }, [activeTab]);

    // Fetch tasks using React Query
    const { data: tasksResponse, isLoading: tasksLoading, error: tasksError } = useTasks();
    const allTasksRaw = tasksResponse?.results || [];
    
    // Fetch deals to get deal stage information (since deal_stage might not be in TaskSerializer)
    const { data: dealsResponse } = useDeals();
    const allDeals = dealsResponse?.results || [];
    
    // Fetch client tasks and client calls
    const { data: clientTasksResponse } = useClientTasks();
    const allClientTasks = clientTasksResponse?.results || [];
    
    const { data: clientCallsResponse } = useClientCalls();
    const allClientCalls = clientCallsResponse?.results || [];

    // Format deal stage with translation
    const formatDealStage = (stage: string | null | undefined): string => {
        if (!stage) return '';
        const stageLower = stage.toLowerCase().trim();
        const stageMap: { [key: string]: string } = {
            'won': t('won') || 'Won',
            'lost': t('lost') || 'Lost',
            'on_hold': t('onHold') || 'On Hold',
            'in_progress': t('inProgress') || 'In Progress',
            'cancelled': t('cancelled') || 'Cancelled',
            'reservation': t('reservation') || 'Reservation',
            'contracted': t('contracted') || 'Contracted',
            'closed': t('closed') || 'Closed',
        };
        return stageMap[stageLower] || stage;
    };

    // Transform ClientTasks and ClientCalls to unified task format
    const transformedClientTasks = useMemo(() => {
        return allClientTasks.map((ct: any) => {
            const clientId = ct.client || ct.clientId;
            const clientName = ct.client_name || '';
            const stageName = ct.stage_name || ct.stage || '';
            const notes = ct.notes || '';
            const reminderDate = ct.reminder_date || null;
            const createdBy = ct.created_by || null;
            const createdByUsername = ct.created_by_username || '';
            const createdAt = ct.created_at || ct.createdAt || null;
            const reminderCompletedAt = ct.reminder_completed_at || ct.reminderCompletedAt || null;
            
            return {
                id: `client-task-${ct.id}`, // Prefix to avoid conflicts
                type: 'client_task',
                clientId: clientId,
                clientName: clientName,
                stageId:
                    typeof ct.stage === 'number'
                        ? ct.stage
                        : ct.stage && typeof ct.stage === 'object'
                          ? ct.stage.id
                          : null,
                stageName: stageName,
                notes: notes,
                reminderDate: reminderDate,
                createdAt: createdAt,
                createdBy: createdBy,
                createdByUsername: createdByUsername,
                dealId: null,
                dealStage: null,
                dealEmployeeUsername: null,
                reminder_completed_at: reminderCompletedAt,
                reminderCompletedAt,
                isCompleted: !!reminderCompletedAt,
            };
        });
    }, [allClientTasks]);
    
    const transformedClientCalls = useMemo(() => {
        return allClientCalls.map((cc: any) => {
            const clientId = cc.client || cc.clientId;
            const clientName = cc.client_name || '';
            const callMethodName = cc.call_method_name || cc.call_method || '';
            const notes = cc.notes || '';
            const followUpDate = cc.follow_up_date || null;
            const createdBy = cc.created_by || null;
            const createdByUsername = cc.created_by_username || '';
            const createdAt = cc.created_at || cc.createdAt || null;
            const followUpCompletedAt = cc.follow_up_completed_at || cc.followUpCompletedAt || null;
            
            return {
                id: `client-call-${cc.id}`, // Prefix to avoid conflicts
                type: 'client_call',
                clientId: clientId,
                clientName: clientName,
                callMethodName: callMethodName, // Call method for client calls (not stage)
                stageName: null, // Client calls don't have stages
                notes: notes,
                reminderDate: followUpDate, // Use follow_up_date as reminder_date
                createdAt: createdAt,
                createdBy: createdBy,
                createdByUsername: createdByUsername,
                dealId: null,
                dealStage: null,
                dealEmployeeUsername: null,
                follow_up_completed_at: followUpCompletedAt,
                followUpCompletedAt,
                isCompleted: !!followUpCompletedAt,
            };
        });
    }, [allClientCalls]);
    
    // Normalize API fields - use all fields from API directly
    // Based on TaskSerializer, we get: deal_client_name, deal_employee_username, stage_name
    // Note: deal_stage might not be included in TaskSerializer - it's optional
    const allTasks = useMemo(() => {
        return allTasksRaw.map((task: any) => {
            // Get deal ID - handle both deal object and deal_id
            const dealId = task.deal_id || (typeof task.deal === 'number' ? task.deal : (task.deal?.id)) || null;
            
            // From TaskSerializer, these fields come directly from the serializer:
            // - deal_client_name (from deal.client.name)
            // - deal_employee_username (from deal.employee.username)
            // - stage_name (from stage.name)
            // Note: deal_stage might not be included in TaskSerializer, so we fetch it from deals
            
            // Get all fields directly from serializer fields (snake_case) - these are the actual field names from API
            // Handle null/undefined values properly - use nullish coalescing
            const dealClientName = task.deal_client_name ?? '';
            const dealEmployeeUsername = task.deal_employee_username ?? '';
            const stageName = task.stage_name ?? '';
            const completedAt = task.completed_at || task.completedAt || null;
            
            // Get deal_stage from deals if not in TaskSerializer
            // Try to get from API response first, then from deals lookup
            let dealStage = task.deal_stage ?? null;
            if (!dealStage && dealId) {
                // Look up deal by ID to get stage
                const deal = allDeals.find((d: any) => d.id === dealId);
                if (deal) {
                    // Deal stage can be in different formats: deal.stage, deal.stage_name, or just stage
                    dealStage = deal.stage || (deal as any).stage_name || null;
                }
            }
            
            return {
                ...task,
                type: 'deal_task',
                // Store normalized fields for easy access
                dealId: dealId,
                reminderDate: task.reminder_date || task.reminderDate || null,
                createdAt: task.created_at || task.createdAt || null,
                updatedAt: task.updated_at || task.updatedAt || null,
                completed_at: completedAt,
                completedAt,
                // Use API field names directly from serializer (snake_case from TaskSerializer)
                dealClientName: dealClientName,
                clientName: dealClientName,
                dealStage: dealStage,
                dealEmployeeUsername: dealEmployeeUsername,
                stageId:
                    typeof task.stage === 'number'
                        ? task.stage
                        : task.stage && typeof task.stage === 'object'
                          ? task.stage.id
                          : null,
                stageName: stageName,
                // Keep original task for debugging
                _original: task,
            };
        });
    }, [allTasksRaw, allDeals]);

    // Combine all task types: deal tasks, client tasks, and client calls
    const allCombinedTasks = useMemo(() => {
        return [
            ...allTasks,
            ...transformedClientTasks,
            ...transformedClientCalls,
        ];
    }, [allTasks, transformedClientTasks, transformedClientCalls]);

    const overdueFollowUpTasks = useMemo(
        () => allCombinedTasks.filter((task) => !isTodoCompleted(task) && isOverdueFollowUpTask(task)),
        [allCombinedTasks],
    );

    // Active = not explicitly completed; overdue stays Active until marked done
    const todos = useMemo(() => {
        return allCombinedTasks.filter((task) => !isTodoCompleted(task));
    }, [allCombinedTasks]);
    
    const completedTodos = useMemo(() => {
        return allCombinedTasks.filter((task) => isTodoCompleted(task));
    }, [allCombinedTasks]);

    // Fetch stages (not statuses - stages are used for tasks)
    const { data: stagesData, isLoading: stagesLoading } = useStages();
    // Handle both array response and object with results property
    const stages: Stage[] = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);
    
    // Fetch call methods (for client calls)
    const { data: callMethodsData } = useCallMethods();
    const callMethods: CallMethodItem[] = Array.isArray(callMethodsData) 
        ? callMethodsData 
        : (callMethodsData?.results || []);

    // Update task mutation (for completing todos)
    const completeTaskMutation = useCompleteTask();
    const completeClientTaskMutation = useCompleteClientTaskReminder();
    const completeClientCallMutation = useCompleteClientCallFollowUp();
    // Delete task mutation
    const deleteTaskMutation = useDeleteTask();
    // Delete client task mutation
    const deleteClientTaskMutation = useDeleteClientTask();
    // Delete client call mutation
    const deleteClientCallMutation = useDeleteClientCall();

    useEffect(() => {
        const getWeekDays = (startDate: Date): Date[] => {
            const days: Date[] = [];
            const date = new Date(startDate);
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(date.setDate(diff));
            for (let i = 0; i < 7; i++) {
                const day = new Date(monday);
                day.setDate(monday.getDate() + i);
                days.push(day);
            }
            return days;
        };
        setWeekDays(getWeekDays(new Date()));
    }, []);

    const showError = (message: string) => {
        setAlertMessage(message);
        setAlertVariant('error');
        setIsAlertModalOpen(true);
    };

    const handleCompleteTodo = async (id: number | string) => {
        try {
            const task = allCombinedTasks.find(t => t.id === id);
            if (!task) {
                showError(t('taskNotFound') || 'Task not found');
                return;
            }
            
            const taskType = (task as any)?.type;
            const numericId = typeof id === 'string' ? parseInt(id.replace(/^(client-task-|client-call-)/, '')) : id;
            
            if (taskType === 'client_task') {
                await completeClientTaskMutation.mutateAsync(numericId);
                return;
            }
            if (taskType === 'client_call') {
                await completeClientCallMutation.mutateAsync(numericId);
                return;
            }
            
            await completeTaskMutation.mutateAsync(numericId);
        } catch (error: any) {
            console.error('Error completing todo:', error);
            showError(getLocalizedApiErrorMessage(error, t, 'failedToCompleteTodo'));
        }
    };

    const handleEditTodo = (id: number | string) => {
        const task = allCombinedTasks.find(t => t.id === id);
        const taskType = (task as any)?.type;
        if (taskType === 'client_task' || taskType === 'client_call') {
            handleOpenRelated(id);
            return;
        }
        const numericId = typeof id === 'string' ? parseInt(id.replace(/^(client-task-|client-call-)/, '')) : id;
        setEditingTodoId(numericId);
    };

    const handleOpenRelated = (id: number | string) => {
        const todo = allCombinedTasks.find(t => t.id === id);
        if (!todo) return;
        const taskType = (todo as any)?.type || 'deal_task';

        if (taskType === 'deal_task') {
            const dealId = (todo as any).dealId || (todo as any).deal_id || (typeof (todo as any).deal === 'number' ? (todo as any).deal : (todo as any).deal?.id);
            if (!dealId) {
                showError(t('dealRequiredForTask') || 'Deal information is required');
                return;
            }
            const deal = allDeals.find((d: any) => d.id === dealId);
            if (deal) {
                setViewingDeal(deal as Deal);
                setIsViewDealModalOpen(true);
            } else {
                setViewingDeal({ id: dealId } as Deal);
                setIsViewDealModalOpen(true);
            }
            return;
        }

        const clientId = (todo as any).clientId;
        if (!clientId) {
            showError(t('taskNotFound') || 'Task not found');
            return;
        }
        setSelectedLead({ id: Number(clientId) } as Lead);
        const route = currentUser?.company
            ? getCompanyViewLeadRoute(currentUser.company.name, currentUser.company.domain, Number(clientId))
            : `/view-lead/${clientId}`;
        window.history.pushState({}, '', route);
        setCurrentPage('ViewLead');
    };

    const handleDeleteTodo = (id: number | string) => {
        const todo = allCombinedTasks.find(t => t.id === id);
        const todoName = todo ? ((todo as any).clientName || (todo as any).dealClientName || `Todo #${id}`) : `Todo #${id}`;
        
        // Check if it's a client task or client call
        const taskType = (todo as any)?.type;
        const isClientTask = taskType === 'client_task';
        const isClientCall = taskType === 'client_call';
        
        setConfirmDeleteConfig({
            title: t('deleteTodo') || 'Delete Todo',
            message: t('confirmDeleteTodo') || 'Are you sure you want to delete this todo for',
            itemName: todoName,
            onConfirm: async () => {
                try {
                    // Extract numeric ID from prefixed ID
                    const numericId = typeof id === 'string' ? parseInt(id.replace(/^(client-task-|client-call-)/, '')) : id;
                    
                    if (isClientTask) {
                        // Delete client task
                        await deleteClientTaskMutation.mutateAsync(numericId);
                    } else if (isClientCall) {
                        // Delete client call
                        await deleteClientCallMutation.mutateAsync(numericId);
                    } else {
                        // Delete deal task
                        await deleteTaskMutation.mutateAsync(numericId);
                    }
                } catch (error: any) {
                    console.error('Error deleting todo:', error);
                    throw error; // Let ConfirmDeleteModal handle the error display
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    const isCompleting =
        completeTaskMutation.isPending ||
        completeClientTaskMutation.isPending ||
        completeClientCallMutation.isPending;

    const currentTodos = activeTab === 'active' ? todos : completedTodos;
    
    // Get all available stages from settings for filters (not just stages used in todos)
    const availableStages = useMemo(() => {
        // Return all stages from settings, not just those used in current todos
        if (!stagesLoading && (!stages || stages.length === 0)) {
            return [];
        }
        return stages || [];
    }, [stages, stagesLoading]);

    const applyDateAndStageFilters = useMemo(() => {
        return (sourceTodos: typeof allCombinedTasks) =>
            sourceTodos.filter((todo) => {
                const reminderDate = (todo as any).reminderDate || (todo as any).reminder_date || '';
                const taskType = ((todo as any).type || 'deal_task') as TaskTypeFilter;

                if (typeFilter !== 'all' && taskType !== typeFilter) return false;

                const q = searchQuery.trim().toLowerCase();
                if (q) {
                    const haystack = [
                        (todo as any).clientName,
                        (todo as any).dealClientName,
                        (todo as any).deal_client_name,
                        (todo as any).notes,
                        (todo as any).stageName,
                        (todo as any).stage_name,
                        (todo as any).callMethodName,
                        (todo as any).dealEmployeeUsername,
                        (todo as any).deal_employee_username,
                        (todo as any).createdByUsername,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(q)) return false;
                }

                if (calendarOverdueOnly) {
                    if (!isOverdueFollowUpTask(todo)) return false;
                }

                if (!selectedDate) {
                    const stageName = (todo as any).stageName || (todo as any).stage_name || '';
                    return activeFilter === 'all' || stageName === activeFilter;
                }

                if (!reminderDate) return false;

                let isDateMatch = false;
                try {
                    isDateMatch = isSameDay(reminderDate, selectedDate);
                } catch (error) {
                    console.error('Error comparing dates:', error, reminderDate, selectedDate);
                    isDateMatch = false;
                }

                const stageName = (todo as any).stageName || (todo as any).stage_name || '';
                const isStageMatch = activeFilter === 'all' || stageName === activeFilter;
                return isDateMatch && isStageMatch;
            });
    }, [activeFilter, calendarOverdueOnly, selectedDate, searchQuery, typeFilter]);

    const dateFilteredActiveCount = useMemo(() => {
        if (calendarOverdueOnly) {
            return applyDateAndStageFilters(overdueFollowUpTasks).length;
        }
        return applyDateAndStageFilters(todos).length;
    }, [applyDateAndStageFilters, calendarOverdueOnly, overdueFollowUpTasks, todos]);

    const dateFilteredCompletedCount = useMemo(() => {
        if (calendarOverdueOnly) {
            return 0;
        }
        return applyDateAndStageFilters(completedTodos).length;
    }, [applyDateAndStageFilters, calendarOverdueOnly, completedTodos]);

    const allDatesActiveCount = useMemo(() => {
        if (calendarOverdueOnly) {
            return overdueFollowUpTasks.filter((todo) => {
                const stageName = (todo as any).stageName || (todo as any).stage_name || '';
                return activeFilter === 'all' || stageName === activeFilter;
            }).length;
        }
        return todos.filter((todo) => {
            const stageName = (todo as any).stageName || (todo as any).stage_name || '';
            return activeFilter === 'all' || stageName === activeFilter;
        }).length;
    }, [activeFilter, calendarOverdueOnly, overdueFollowUpTasks, todos]);

    const allDatesCompletedCount = useMemo(() => {
        if (calendarOverdueOnly) {
            return 0;
        }
        return completedTodos.filter((todo) => {
            const stageName = (todo as any).stageName || (todo as any).stage_name || '';
            return activeFilter === 'all' || stageName === activeFilter;
        }).length;
    }, [activeFilter, calendarOverdueOnly, completedTodos]);
    
    const filteredTodos = useMemo(() => {
        const sourceTodos = calendarOverdueOnly ? overdueFollowUpTasks : currentTodos;
        return applyDateAndStageFilters(sourceTodos);
    }, [applyDateAndStageFilters, calendarOverdueOnly, currentTodos, overdueFollowUpTasks]);

    /** Board: active items only — stage chips become columns. Calls have no stage. */
    const boardTodos = useMemo((): TodoKanbanItem[] => {
        const sourceTodos = calendarOverdueOnly ? overdueFollowUpTasks : todos;
        return sourceTodos
            .filter((todo) => {
                const taskType = (todo as any).type || 'deal_task';
                if (taskType === 'client_call') return false;
                if (typeFilter !== 'all' && taskType !== typeFilter) return false;

                const q = searchQuery.trim().toLowerCase();
                if (q) {
                    const haystack = [
                        (todo as any).clientName,
                        (todo as any).dealClientName,
                        (todo as any).notes,
                        (todo as any).stageName,
                        (todo as any).dealEmployeeUsername,
                        (todo as any).createdByUsername,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    if (!haystack.includes(q)) return false;
                }

                const reminderDate = (todo as any).reminderDate || (todo as any).reminder_date || '';
                if (calendarOverdueOnly) {
                    return isOverdueFollowUpTask(todo);
                }
                if (!selectedDate) return true;
                if (!reminderDate) return false;
                try {
                    return isSameDay(reminderDate, selectedDate);
                } catch {
                    return false;
                }
            })
            .map((todo) => {
                const taskType = ((todo as any).type || 'deal_task') as 'deal_task' | 'client_task';
                const stageName = String((todo as any).stageName || (todo as any).stage_name || '');
                let stageId = (todo as any).stageId as number | null;
                if (stageId == null && stageName) {
                    stageId = stages.find((s) => s.name === stageName)?.id ?? null;
                }
                if (stageId == null) return null;

                const rawId = todo.id;
                const entityId =
                    typeof rawId === 'string'
                        ? parseInt(String(rawId).replace(/^(client-task-|client-call-)/, ''), 10)
                        : Number(rawId);

                return {
                    boardId: String(todo.id),
                    entityType: taskType === 'client_task' ? 'client_task' : 'deal_task',
                    entityId,
                    stageId,
                    stageName,
                    clientName:
                        (todo as any).clientName ||
                        (todo as any).dealClientName ||
                        (todo as any).deal_client_name ||
                        '',
                    notes: (todo as any).notes || '',
                    reminderDate: (todo as any).reminderDate || (todo as any).reminder_date || null,
                    dealStage: (todo as any).dealStage ?? (todo as any).deal_stage ?? null,
                    employeeUsername:
                        (todo as any).dealEmployeeUsername ||
                        (todo as any).deal_employee_username ||
                        (todo as any).createdByUsername ||
                        null,
                } as TodoKanbanItem;
            })
            .filter((item): item is TodoKanbanItem => item != null);
    }, [
        calendarOverdueOnly,
        overdueFollowUpTasks,
        todos,
        selectedDate,
        stages,
        searchQuery,
        typeFilter,
    ]);

    const totalTodoPages = Math.max(1, Math.ceil(filteredTodos.length / todosPageSize));
    const paginationItems = getPaginationItems(todosPageNumber, totalTodoPages);
    const paginatedTodos = useMemo(() => {
        const start = (todosPageNumber - 1) * todosPageSize;
        return filteredTodos.slice(start, start + todosPageSize);
    }, [filteredTodos, todosPageNumber, todosPageSize]);

    useEffect(() => {
        setTodosPageNumber(1);
    }, [activeTab, selectedDate, activeFilter, searchQuery, typeFilter]);
    useEffect(() => {
        setTodosPageNumber(1);
    }, [todosPageSize]);
    
    const todosByDay = useMemo(() => {
        const counts = new Map<string, number>();
        const source = calendarOverdueOnly ? overdueFollowUpTasks : currentTodos;
        source.forEach(todo => {
            const reminderDate = (todo as any).reminderDate || (todo as any).reminder_date || '';
            if (!reminderDate) return;
            
            try {
                const dateStr = new Date(reminderDate).toDateString();
            counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
            } catch (error) {
                console.error('Error parsing reminder date:', error, reminderDate);
            }
        });
        return counts;
    }, [calendarOverdueOnly, currentTodos, overdueFollowUpTasks]);


    return (
        <PageWrapper 
            title={t('todos')}
            actions={
                <Button onClick={() => setIsAddTodoModalOpen(true)}>
                    <PlusIcon className="w-4 h-4"/> {t('addTodo')}
                </Button>
            }
        >
            <div className="flex flex-col lg:flex-row gap-6 min-w-0">
                {/* Week Overview */}
                <aside className="w-full lg:w-1/4 xl:w-1/5 flex-shrink-0">
                    <Card>
                        <h3 className="font-semibold mb-4">{t('thisWeek')}</h3>
                        <div className="space-y-2">
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className={`w-full flex justify-between items-center p-2 rounded-md text-left transition-colors ${!selectedDate ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <div className="flex flex-col">
                                    <span className={`font-semibold text-sm ${!selectedDate ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{t('all') || 'All'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${!selectedDate ? 'bg-white text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>{activeTab === 'active' ? allDatesActiveCount : allDatesCompletedCount}</span>
                                </div>
                            </button>
                            {weekDays.map((day, index) => {
                                const dayStr = day.toDateString();
                                const taskCount = todosByDay.get(dayStr) || 0;
                                const isToday = isSameDay(day, new Date());
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                                return (
                                    <button 
                                        key={index}
                                        onClick={() => setSelectedDate(day)}
                                        className={`w-full flex justify-between items-center p-2 rounded-md text-left transition-colors ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ weekday: 'short' }))}</span>
                                            <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({ day: 'numeric', month: 'short' }))}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isToday && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">{t('today')}</span>}
                                            {taskCount > 0 && <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${isSelected ? 'bg-white text-primary dark:bg-white dark:text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>{taskCount}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </aside>
                
                {/* Main Todos Area */}
                <main className="flex-1 min-w-0 overflow-hidden">
                    {calendarOverdueOnly && (
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30">
                            <p className="text-sm text-rose-900 dark:text-rose-100">
                                {t('overdueFollowUpsBanner')}
                            </p>
                            <Button variant="ghost" onClick={exitOverdueFollowUpsView}>
                                {t('showAllTodos')}
                            </Button>
                        </div>
                    )}
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                        {calendarOverdueOnly ? (
                            <button
                                type="button"
                                className={`px-4 py-2 text-sm ${PAGE_TAB_ACTIVE}`}
                            >
                                {t('overdueFollowUpsView')} ({dateFilteredActiveCount})
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`px-4 py-2 text-sm transition-colors ${
                                        activeTab === 'active' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
                                    }`}
                                >
                                    {t('active')} ({dateFilteredActiveCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab('completed')}
                                    className={`px-4 py-2 text-sm transition-colors ${
                                        activeTab === 'completed' ? PAGE_TAB_ACTIVE : PAGE_TAB_INACTIVE
                                    }`}
                                >
                                    {t('completed')} ({dateFilteredCompletedCount})
                                </button>
                            </>
                        )}
                    </div>

                    {/* Search + type filters */}
                    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchTodos') || 'Search by client, notes, stage…'}
                            className="w-full sm:max-w-xs px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                            {(
                                [
                                    ['all', t('all') || 'All'],
                                    ['deal_task', t('dealTask') || 'Deal Task'],
                                    ['client_task', t('leadAction') || t('action') || 'Lead Action'],
                                    ['client_call', t('callFollowUp') || t('call') || 'Call Follow-up'],
                                ] as Array<[TaskTypeFilter, string]>
                            ).map(([value, label]) => (
                                <Button
                                    key={value}
                                    variant={typeFilter === value ? 'primary' : 'ghost'}
                                    onClick={() => setTypeFilter(value)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Stage filters for active and completed todos (table only — board columns are stages) */}
                    {!isBoardView && !stagesLoading && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <Button variant={activeFilter === 'all' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('all')}><ListIcon className="w-4 h-4" /> {t('all')}</Button>
                            {availableStages.length > 0 ? (
                                availableStages.map(stage => {
                                const Icon = getStageIcon(stage.name as TaskStage);
                                return (
                                    <Button 
                                        key={stage.id} 
                                        variant={activeFilter === stage.name ? 'primary' : 'ghost'} 
                                        onClick={() => setActiveFilter(stage.name as FilterType)}
                                    >
                                        <Icon className="w-4 h-4" /> {stage.name}
                                    </Button>
                                );
                                })
                            ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('noStagesAvailable') || 'No stages available'}</span>
                            )}
                        </div>
                    )}

                    <div className="mb-4 flex justify-end">
                        <ViewModeToggle value={viewMode} onChange={setViewMode} />
                    </div>

                    {tasksLoading ? (
                        <PageLoadingState label={t('loadingTodos') || t('loading') || 'Loading todos'} />
                    ) : tasksError ? (
                        <Card>
                            <div className="text-center py-10">
                                <p className="text-red-600 dark:text-red-400 mb-4">
                                    {t('errorLoadingTodos') || 'Error loading todos. Please try again.'}
                                </p>
                                <Button onClick={() => window.location.reload()}>
                                    {t('reload') || 'Reload'}
                                </Button>
                            </div>
                        </Card>
                    ) : isBoardView ? (
                        <TodosKanbanView
                            items={boardTodos}
                            stages={availableStages}
                            canDrag
                            isLoading={stagesLoading}
                            formatDealStage={formatDealStage}
                            onOpenItem={(item) => {
                                if (item.entityType === 'deal_task') {
                                    handleEditTodo(item.entityId);
                                } else {
                                    handleOpenRelated(`client-task-${item.entityId}`);
                                }
                            }}
                            enabled={isBoardView}
                        />
                    ) : filteredTodos.length > 0 ? (
                        <Card className="p-0 overflow-hidden">
                            <TableHorizontalScroll scrollClassName="-mx-4 sm:mx-0">
                                <div className="min-w-full block">
                                    <div className="overflow-hidden">
                                        <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400 min-w-[1000px]">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('type') || 'Type'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('stage')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center hidden md:table-cell">{t('callMethod') || 'Call Method'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('clientName') || 'Client Name'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center hidden lg:table-cell">{t('dealStage') || 'Deal Stage'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('employee') || 'Employee'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('reminderDate') || 'Reminder Date'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('notes')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center hidden sm:table-cell">{t('createdAt')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                                {paginatedTodos.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10} className="px-4 py-12 text-center">
                                                            <p className="text-gray-500 dark:text-gray-400">{t('noTasksFound') || 'No tasks found'}</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedTodos.map(todo => {
                                            // Get task type
                                            const taskType = (todo as any).type || 'deal_task';
                                            const typeLabel = taskType === 'client_task' 
                                                ? (t('action') || 'Action')
                                                : taskType === 'client_call'
                                                ? (t('call') || 'Call')
                                                : (t('dealTask') || 'Deal Task');
                                            
                                            // Get stage name for client tasks and deal tasks, or call method name for client calls
                                            let displayName = '';
                                            let stageObj = null;
                                            let callMethodObj = null;
                                            let stageColor = '#808080';
                                            
                                            if (taskType === 'client_call') {
                                                // For client calls, use call method (not stage)
                                                const callMethodName = (todo as any).callMethodName || (todo as any).call_method_name || '';
                                                displayName = callMethodName;
                                                callMethodObj = callMethods.find(c => c.name === callMethodName);
                                                stageColor = callMethodObj?.color || '#808080';
                                            } else {
                                                // For client tasks and deal tasks, use stage
                                                const stageName = (todo as any).stage_name || (todo as any).stageName || '';
                                                displayName = stageName;
                                                stageObj = stages.find(s => s.name === stageName);
                                                stageColor = stageObj?.color || '#808080';
                                            }
                                            
                                            // Convert hex to RGB for background opacity
                                            const hexToRgb = (hex: string) => {
                                                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                return result ? {
                                                    r: parseInt(result[1], 16),
                                                    g: parseInt(result[2], 16),
                                                    b: parseInt(result[3], 16)
                                                } : null;
                                            };
                                            
                                            const rgb = hexToRgb(stageColor);
                                            const bgColor = rgb 
                                                ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
                                                : 'bg-gray-100 dark:bg-gray-700';
                                            const textColor = rgb
                                                ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                                                : 'text-gray-800 dark:text-gray-200';
                                            
                                            // Get all fields directly from API - use actual values, no hyphens
                                            // These come from TaskSerializer: deal_client_name, deal_stage, deal_employee_username
                                            // Use the normalized fields we stored in allTasks
                                            const clientName = (todo as any).clientName || (todo as any).dealClientName || (todo as any).deal_client_name || '';
                                            const dealStageRaw = (todo as any).dealStage ?? (todo as any).deal_stage ?? null; // Can be null
                                            const dealStage = dealStageRaw ? formatDealStage(dealStageRaw) : '-';
                                            const employeeUsername = (todo as any).dealEmployeeUsername || (todo as any).deal_employee_username || (todo as any).createdByUsername || '';
                                            // Ensure employeeUsername displays '-' if empty
                                            const displayEmployeeUsername = employeeUsername || '-';
                                            
                                            // Format reminder_date
                                            const reminderDate = (todo as any).reminderDate || (todo as any).reminder_date || null;
                                            const overdue = activeTab === 'active' && isReminderOverdue(reminderDate);
                                            const formattedReminderDate = reminderDate ? (() => {
                                                try {
                                                    const date = new Date(reminderDate);
                                                    if (isNaN(date.getTime())) return String(reminderDate);
                                                    return date.toLocaleDateString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }));
                                                } catch {
                                                    return String(reminderDate);
                                                }
                                                        })() : '-';
                                            
                                            // Format created_at
                                            const createdAt = (todo as any).created_at || (todo as any).createdAt || null;
                                            const formattedCreatedAt = createdAt ? (() => {
                                                try {
                                                    const date = new Date(createdAt);
                                                    if (isNaN(date.getTime())) return String(createdAt);
                                                    return date.toLocaleDateString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits({
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }));
                                                } catch {
                                                    return String(createdAt);
                                                }
                                                        })() : '-';
                                            
                                            // Get notes
                                                        const notes = (todo as any).notes || '-';
                                            
                                return (
                                                            <tr key={todo.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 ${overdue ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                        taskType === 'client_task' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                        taskType === 'client_call' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                                    }`}>
                                                                        {typeLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        {taskType === 'client_call' ? (
                                                            // Client calls don't have stages
                                                            <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                        ) : (
                                                            <span 
                                                                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                                style={rgb ? {
                                                                    backgroundColor: bgColor,
                                                                    color: textColor,
                                                                } : undefined}
                                                            >
                                                                {getStageDisplayLabel(displayName)}
                                                            </span>
                                                        )}
                                                    </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center hidden md:table-cell">
                                                        {taskType === 'client_call' ? (
                                                            // Show call method for client calls
                                                            (() => {
                                                                const callMethodName = (todo as any).callMethodName || (todo as any).call_method_name || '';
                                                                const callMethodObj = callMethods.find(c => c.name === callMethodName);
                                                                const callMethodColor = callMethodObj?.color || '#808080';
                                                                
                                                                const hexToRgbLocal = (hex: string) => {
                                                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                                    return result ? {
                                                                        r: parseInt(result[1], 16),
                                                                        g: parseInt(result[2], 16),
                                                                        b: parseInt(result[3], 16)
                                                                    } : null;
                                                                };
                                                                
                                                                const cmRgb = hexToRgbLocal(callMethodColor);
                                                                const cmBg = cmRgb 
                                                                    ? `rgba(${cmRgb.r}, ${cmRgb.g}, ${cmRgb.b}, 0.1)`
                                                                    : 'bg-gray-100 dark:bg-gray-700';
                                                                const cmText = cmRgb
                                                                    ? `rgb(${cmRgb.r}, ${cmRgb.g}, ${cmRgb.b})`
                                                                    : 'text-gray-800 dark:text-gray-200';
                                                                
                                                                return (
                                                                    <span 
                                                                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${!cmRgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                                        style={cmRgb ? {
                                                                            backgroundColor: cmBg,
                                                                            color: cmText,
                                                                        } : undefined}
                                                                    >
                                                                        {callMethodName || '-'}
                                                                    </span>
                                                                );
                                                            })()
                                                        ) : (
                                                            // Other task types don't have call methods
                                                            <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                                                        )}
                                                    </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline hover:text-primary-800 dark:hover:text-primary-200"
                                                                        onClick={() => handleOpenRelated(todo.id)}
                                                                    >
                                                                        {clientName || '-'}
                                                                    </button>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center hidden lg:table-cell">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{dealStage}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{displayEmployeeUsername}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className={`text-sm tabular-nums ${overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                        {formattedReminderDate}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate block mx-auto">{notes}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{formattedCreatedAt}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="p-1.5 h-auto !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 rounded-md transition-colors"
                                                                                    onClick={() => handleOpenRelated(todo.id)}
                                                                                    title={t('open') || 'Open'}
                                                                                >
                                                                                    <EyeIcon className="w-4 h-4" />
                                                                                </Button>
                                                                                {taskType === 'deal_task' && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        className="p-1.5 h-auto !text-amber-600 dark:!text-amber-400 hover:!bg-amber-50 dark:hover:!bg-amber-900/20 rounded-md transition-colors"
                                                                                        onClick={() => handleEditTodo(todo.id)}
                                                                                        title={t('edit') || 'Edit'}
                                                                                    >
                                                                                        <EditIcon className="w-4 h-4" />
                                                                                    </Button>
                                                                                )}
                                            {activeTab === 'active' && (
                                                                            <>
                                                                                {(taskType === 'deal_task' || !!reminderDate) && (
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleCompleteTodo(todo.id)}
                                                                                    title={t('complete') || 'Complete'}
                                                                                    disabled={isCompleting}
                                                                                >
                                                                                    <CheckIcon className="w-4 h-4" />
                                                                                </Button>
                                                                                )}
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                                                    title={t('delete') || 'Delete'}
                                                                                    disabled={deleteTaskMutation.isPending || deleteClientTaskMutation.isPending || deleteClientCallMutation.isPending}
                                                                                >
                                                                                    <TrashIcon className="w-4 h-4" />
                                                                                </Button>
                                                                            </>
                                            )}
                                            {activeTab === 'completed' && (
                                                                            <>
                                                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full" title={t('completed') || 'Completed'}>
                                                                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                                                    title={t('delete') || 'Delete'}
                                                                                    disabled={deleteTaskMutation.isPending || deleteClientTaskMutation.isPending || deleteClientCallMutation.isPending}
                                                                                >
                                                                                    <TrashIcon className="w-4 h-4" />
                                                                                </Button>
                                                                            </>
                                            )}
                                    </div>
                                                    </td>
                                                </tr>
                                            );
                                                    })
                                                )}
                                    </tbody>
                                        </table>
                                    </div>
                                </div>
                            </TableHorizontalScroll>
                            <div className="mt-4 px-3 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                    {t('page')} {todosPageNumber} {t('of')} {totalTodoPages}
                                </p>
                                <div className="flex items-center gap-2" dir="ltr">
                                    <select
                                        value={todosPageSize}
                                        onChange={(e) => setTodosPageSize(Number(e.target.value))}
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
                                        onClick={() => setTodosPageNumber(1)}
                                        disabled={todosPageNumber === 1}
                                    >
                                        &laquo;
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setTodosPageNumber((prev) => Math.max(1, prev - 1))}
                                        disabled={todosPageNumber === 1}
                                    >
                                        {t('previous')}
                                    </Button>
                                    {paginationItems.map((item, idx) =>
                                        item === 'ellipsis' ? (
                                            <span key={`todos-ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
                                        ) : (
                                            <Button
                                                key={item}
                                                variant={item === todosPageNumber ? 'primary' : 'secondary'}
                                                onClick={() => setTodosPageNumber(item)}
                                            >
                                                {item}
                                            </Button>
                                        )
                                    )}
                                    <Button
                                        variant="secondary"
                                        onClick={() => setTodosPageNumber((prev) => Math.min(totalTodoPages, prev + 1))}
                                        disabled={todosPageNumber === totalTodoPages}
                                    >
                                        {t('next')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setTodosPageNumber(totalTodoPages)}
                                        disabled={todosPageNumber === totalTodoPages}
                                    >
                                        &raquo;
                                    </Button>
                                </div>
                            </div>
                        </Card>
                        ) : (
                            <Card className="text-center py-10 px-4">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {selectedDate 
                                    ? `${t('noTasksForDate')} ${selectedDate.toLocaleDateString(language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US', withLatinDigits())}.`
                                    : (t('noTasksFound') || 'No tasks found.')
                                }
                            </p>
                            {activeTab === 'active' && (
                                <Button onClick={() => setIsAddTodoModalOpen(true)}>
                                    <PlusIcon className="w-4 h-4" /> {t('addTodo')}
                                </Button>
                            )}
                            </Card>
                        )}
                </main>
            </div>
            <EditTodoModal 
                todoId={editingTodoId} 
                onClose={() => setEditingTodoId(null)} 
            />
        </PageWrapper>
    );
};
