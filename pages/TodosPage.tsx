
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, ClockIcon, UsersIcon, PhoneIcon, ListIcon, CheckIcon, Loader, PlusIcon, EditIcon, TrashIcon, EditTodoModal } from '../components/index';
import { Todo, TaskStage } from '../types';
import { getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { isSameDay } from '../utils/dateUtils';
import { useTasks, useUpdateTask, useDeleteTask, useStages, useDeals } from '../hooks/useQueries';

type FilterType = 'all' | TaskStage;

// Map stage categories to icons
const getStageIcon = (stage: TaskStage) => {
    const category = getStageCategory(stage);
    if (category === 'Meeting') return UsersIcon;
    if (category === 'Call') return PhoneIcon;
    if (category === 'WhatsApp') return PhoneIcon;
    return ClockIcon; // Default for hold and others
};

export const TodosPage = () => {
    const { t, setIsAddTodoModalOpen, language, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
    
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

    // Normalize API fields - use all fields from API directly
    // Based on TaskSerializer, we get: deal_client_name, deal_employee_username, stage_name
    // Note: deal_stage might not be included in TaskSerializer - it's optional
    const allTasks = useMemo(() => {
        // Debug: log raw data only in development
        if (process.env.NODE_ENV === 'development' && allTasksRaw.length > 0) {
        }
        
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
                // Store normalized fields for easy access
                dealId: dealId,
                reminderDate: task.reminder_date || task.reminderDate || null,
                createdAt: task.created_at || task.createdAt || null,
                updatedAt: task.updated_at || task.updatedAt || null,
                // Use API field names directly from serializer (snake_case from TaskSerializer)
                dealClientName: dealClientName,
                dealStage: dealStage,
                dealEmployeeUsername: dealEmployeeUsername,
                stageName: stageName,
                // Keep original task for debugging
                _original: task,
            };
        });
    }, [allTasksRaw, allDeals]);

    // Separate active and completed todos - check if reminder_date has passed
    // Note: API doesn't have a "completed" field, so we use reminder_date logic
    const todos = useMemo(() => {
        return allTasks.filter(task => {
            // Task is active if reminder_date is in the future or null
            const reminderDate = (task as any).reminder_date || (task as any).reminderDate;
            if (!reminderDate) return true; // No reminder date = active
            try {
                const reminder = new Date(reminderDate);
                const now = new Date();
                // Consider task active if reminder is today or in the future
                return reminder >= now;
            } catch {
                return true; // If date parsing fails, show as active
            }
        });
    }, [allTasks]);
    
    const completedTodos = useMemo(() => {
        return allTasks.filter(task => {
            // Task is completed if reminder_date has passed (in the past)
            const reminderDate = (task as any).reminder_date || (task as any).reminderDate;
            if (!reminderDate) return false; // No reminder date = not completed
            try {
                const reminder = new Date(reminderDate);
                const now = new Date();
                // Consider task completed if reminder is in the past
                return reminder < now;
            } catch {
                return false; // If date parsing fails, don't show as completed
            }
        });
    }, [allTasks]);

    // Fetch stages (not statuses - stages are used for tasks)
    const { data: stagesData, isLoading: stagesLoading } = useStages();
    // Handle both array response and object with results property
    const stages = Array.isArray(stagesData) 
        ? stagesData 
        : (stagesData?.results || []);

    // Update task mutation (for completing todos)
    const updateTaskMutation = useUpdateTask();
    // Delete task mutation
    const deleteTaskMutation = useDeleteTask();

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

    const handleCompleteTodo = async (id: number) => {
        try {
            // Find the task to get all required fields
            const task = allTasks.find(t => t.id === id);
            if (!task) {
                alert(t('taskNotFound') || 'Task not found');
                return;
            }
            
            // Get deal ID - required by API
            const dealId = (task as any).dealId || (task as any).deal_id || (typeof (task as any).deal === 'number' ? (task as any).deal : ((task as any).deal?.id)) || null;
            if (!dealId) {
                alert(t('dealRequiredForTask') || 'Deal information is required to complete this task');
                return;
            }
            
            // Get stage ID if available
            const stageId = (task as any).stage || (task as any).stage_id || (typeof (task as any).stage === 'object' ? (task as any).stage?.id : null) || null;
            
            // Get current reminder_date
            const currentReminderDate = (task as any).reminder_date || (task as any).reminderDate || null;
            
            // To mark as completed, set reminder_date to 1 hour ago (in the past)
            // This will make it appear in the completed tab
            // Using 1 hour ago ensures it's definitely in the past
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);
            
            // Send all required fields in snake_case format for API (PUT requires all fields)
            const updateData: any = {
                deal: dealId,
                stage: stageId, // Can be null
                notes: (task as any).notes || '',
                reminder_date: oneHourAgo.toISOString(), // Set to 1 hour ago to mark as completed
            };
            
            
            await updateTaskMutation.mutateAsync({ 
                id, 
                data: updateData
            });
        } catch (error: any) {
            console.error('Error completing todo:', error);
            const errorMessage = error?.message || error?.fields || t('failedToCompleteTodo') || 'Failed to complete todo. Please try again.';
            alert(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        }
    };

    const handleEditTodo = (id: number) => {
        setEditingTodoId(id);
    };

    const handleDeleteTodo = (id: number) => {
        const todo = allTasks.find(t => t.id === id);
        const todoName = todo ? ((todo as any).dealClientName || `Todo #${id}`) : `Todo #${id}`;
        
        setConfirmDeleteConfig({
            title: t('deleteTodo') || 'Delete Todo',
            message: t('confirmDeleteTodo') || 'Are you sure you want to delete this todo for',
            itemName: todoName,
            onConfirm: async () => {
                try {
                    await deleteTaskMutation.mutateAsync(id);
                } catch (error: any) {
                    console.error('Error deleting todo:', error);
                    throw error; // Let ConfirmDeleteModal handle the error display
                }
            },
        });
        setIsConfirmDeleteModalOpen(true);
    };

    const currentTodos = activeTab === 'active' ? todos : completedTodos;
    
    // Get all available stages from settings for filters (not just stages used in todos)
    const availableStages = useMemo(() => {
        // Return all stages from settings, not just those used in current todos
        // This allows filtering by any stage even if there are no todos with that stage yet
        // Only show warning if not loading and stages are empty
        if (!stagesLoading && (!stages || stages.length === 0)) {
            // Silently return empty array - stages might not be configured yet
            return [];
        }
        if (stages && stages.length > 0) {
        }
        return stages || [];
    }, [stages, stagesLoading]);
    
    const filteredTodos = useMemo(() => {
        return currentTodos.filter(todo => {
            // Handle reminder_date from API - use the normalized field
            const reminderDate = (todo as any).reminderDate || (todo as any).reminder_date || (todo as any).reminderDate || '';
            
            // If no date selected (null), show all todos
            if (!selectedDate) {
                const stageName = (todo as any).stageName || (todo as any).stage_name || '';
                const isStageMatch = activeFilter === 'all' || stageName === activeFilter;
                return isStageMatch;
            }
            
            // If no reminderDate, don't show it when a date is selected (only show todos with dates)
            if (!reminderDate) {
                return false;
            }
            
            // Compare dates
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
    }, [currentTodos, selectedDate, activeFilter]);
    
    const todosByDay = useMemo(() => {
        const counts = new Map<string, number>();
        currentTodos.forEach(todo => {
            // Handle reminder_date from API
            const reminderDate = (todo as any).reminder_date || (todo as any).reminderDate || '';
            if (!reminderDate) return;
            
            try {
                const dateStr = new Date(reminderDate).toDateString();
            counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
            } catch (error) {
                console.error('Error parsing reminder date:', error, reminderDate);
            }
        });
        return counts;
    }, [currentTodos]);


    return (
        <PageWrapper 
            title={t('todos')}
            actions={
                <Button onClick={() => setIsAddTodoModalOpen(true)}>
                    <PlusIcon className="w-4 h-4"/> {t('addTodo')}
                </Button>
            }
        >
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Week Overview */}
                <aside className="w-full lg:w-1/4 xl:w-1/5">
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
                                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${!selectedDate ? 'bg-white text-gray-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>{currentTodos.length}</span>
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
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })}</span>
                                            <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}</span>
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
                <main className="flex-1">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                                activeTab === 'active'
                                    ? 'border-primary text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                            {t('active')} ({todos.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                                activeTab === 'completed'
                                    ? 'border-primary text-gray-900 dark:text-gray-100'
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                            {t('completed')} ({completedTodos.length})
                        </button>
                    </div>

                    {/* Filters - only show for active todos */}
                    {activeTab === 'active' && !stagesLoading && (
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

                    {tasksLoading ? (
                        <Card>
                            <div className="flex items-center justify-center py-10">
                                <Loader variant="primary" className="h-12"/>
                            </div>
                        </Card>
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
                    ) : filteredTodos.length > 0 ? (
                        <Card>
                            <style>{`
                                .todos-table-scroll::-webkit-scrollbar {
                                    height: 8px;
                                }
                                .todos-table-scroll::-webkit-scrollbar-track {
                                    background: #E5E7EB;
                                    border-radius: 4px;
                                }
                                .todos-table-scroll::-webkit-scrollbar-thumb {
                                    background: #9CA3AF;
                                    border-radius: 4px;
                                }
                                .todos-table-scroll::-webkit-scrollbar-thumb:hover {
                                    background: #6B7280;
                                }
                                @media (prefers-color-scheme: dark) {
                                    .todos-table-scroll::-webkit-scrollbar-track {
                                        background: #374151;
                                    }
                                    .todos-table-scroll::-webkit-scrollbar-thumb {
                                        background: #4B5563;
                                    }
                                    .todos-table-scroll::-webkit-scrollbar-thumb:hover {
                                        background: #6B7280;
                                    }
                                }
                            `}</style>
                            <div 
                                className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg todos-table-scroll" 
                                style={{ 
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#9CA3AF #E5E7EB'
                                }}
                            >
                                <div className="min-w-full inline-block align-middle">
                                    <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400" style={{ minWidth: '1000px' }}>
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('stage')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('clientName') || 'Client Name'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('dealStage') || 'Deal Stage'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('employee') || 'Employee'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('reminderDate') || 'Reminder Date'}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('notes')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('createdAt')}</th>
                                                    <th scope="col" className="px-4 py-3.5 font-semibold whitespace-nowrap text-center">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredTodos.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="px-4 py-12 text-center">
                                                            <p className="text-gray-500 dark:text-gray-400">{t('noTasksFound') || 'No tasks found'}</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredTodos.map(todo => {
                                            // Get stage name from API
                                            const stageName = (todo as any).stage_name || (todo as any).stageName || '';
                                            
                                // Find stage from settings to get color
                                            const stageObj = stages.find(s => s.name === stageName);
                                const stageColor = stageObj?.color || '#808080';
                                            
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
                                                        const clientName = (todo as any).dealClientName || (todo as any).deal_client_name || '';
                                                        const dealStageRaw = (todo as any).dealStage ?? (todo as any).deal_stage ?? null; // Can be null
                                                        const dealStage = dealStageRaw ? formatDealStage(dealStageRaw) : '-';
                                                        const employeeUsername = (todo as any).dealEmployeeUsername || (todo as any).deal_employee_username || '';
                                                        // Ensure employeeUsername displays '-' if empty
                                                        const displayEmployeeUsername = employeeUsername || '-';
                                            
                                            // Format reminder_date
                                            const reminderDate = (todo as any).reminder_date || (todo as any).reminderDate || null;
                                            const formattedReminderDate = reminderDate ? (() => {
                                                try {
                                                    const date = new Date(reminderDate);
                                                    if (isNaN(date.getTime())) return String(reminderDate);
                                                    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
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
                                                    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                } catch {
                                                    return String(createdAt);
                                                }
                                                        })() : '-';
                                            
                                            // Get notes
                                                        const notes = (todo as any).notes || '-';
                                            
                                return (
                                                            <tr key={todo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <span 
                                                                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${!rgb ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}`}
                                                            style={rgb ? {
                                                                backgroundColor: bgColor,
                                                                color: textColor,
                                                            } : undefined}
                                                        >
                                                            {getStageDisplayLabel(stageName)}
                                                        </span>
                                                    </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{clientName || '-'}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{dealStage}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{displayEmployeeUsername}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{formattedReminderDate}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate block mx-auto">{notes}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{formattedCreatedAt}</span>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                            {activeTab === 'active' && (
                                                                            <>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleCompleteTodo(todo.id)}
                                                                                    title={t('complete') || 'Complete'}
                                                                                    disabled={updateTaskMutation.isPending}
                                                                                >
                                                                                    <CheckIcon className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleEditTodo(todo.id)}
                                                                                    title={t('edit') || 'Edit'}
                                                                                >
                                                                                    <EditIcon className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                                                    title={t('delete') || 'Delete'}
                                                                                    disabled={deleteTaskMutation.isPending}
                                                                                >
                                                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                                                            </>
                                            )}
                                            {activeTab === 'completed' && (
                                                                            <>
                                                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    className="p-1.5 h-auto !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 rounded-md transition-colors" 
                                                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                                                    title={t('delete') || 'Delete'}
                                                                                    disabled={deleteTaskMutation.isPending}
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
                            </div>
                        </Card>
                        ) : (
                            <Card className="text-center py-10">
                            <p className="text-gray-600 dark:text-gray-400">
                                {selectedDate 
                                    ? `${t('noTasksForDate')} ${selectedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}.`
                                    : (t('noTasksFound') || 'No tasks found.')
                                }
                            </p>
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
