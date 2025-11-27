
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { PageWrapper, Card, Button, ClockIcon, UsersIcon, PhoneIcon, ListIcon, CheckIcon, Loader, PlusIcon } from '../components/index';
import { Todo, TaskStage } from '../types';
import { getStageDisplayLabel, getStageCategory } from '../utils/taskStageMapper';
import { isSameDay } from '../utils/dateUtils';

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
    const { t, todos, completedTodos, completeTodo, setIsAddTodoModalOpen, language, stages } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [weekDays, setWeekDays] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);

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
            await completeTodo(id);
        } catch (error) {
            console.error('Error completing todo:', error);
            alert(t('failedToCompleteTodo'));
        }
    };

    const currentTodos = activeTab === 'active' ? todos : completedTodos;
    
    // Get unique stages from todos for filters
    const availableStages = useMemo(() => {
        const stageSet = new Set<string>();
        currentTodos.forEach(todo => {
            if (todo.stage) {
                stageSet.add(todo.stage);
            }
        });
        // Get stage objects from settings that match the todos' stages
        return stages.filter(s => stageSet.has(s.name));
    }, [currentTodos, stages]);
    
    const filteredTodos = useMemo(() => {
        return currentTodos.filter(todo => {
            const isDateMatch = isSameDay(todo.dueDate, selectedDate);
            const isStageMatch = activeFilter === 'all' || todo.stage === activeFilter;
            return isDateMatch && isStageMatch;
        });
    }, [currentTodos, selectedDate, activeFilter]);
    
    const todosByDay = useMemo(() => {
        const counts = new Map<string, number>();
        currentTodos.forEach(todo => {
            const dateStr = new Date(todo.dueDate).toDateString();
            counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
        });
        return counts;
    }, [currentTodos]);

    if (loading) {
        return (
            <PageWrapper title={t('todos')}>
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
                    <Loader variant="primary" className="h-12"/>
                </div>
            </PageWrapper>
        );
    }

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
                            {weekDays.map((day, index) => {
                                const dayStr = day.toDateString();
                                const taskCount = todosByDay.get(dayStr) || 0;
                                const isToday = isSameDay(day, new Date());
                                const isSelected = isSameDay(day, selectedDate);

                                return (
                                    <button 
                                        key={index}
                                        onClick={() => setSelectedDate(day)}
                                        className={`w-full flex justify-between items-center p-2 rounded-md text-left transition-colors ${isSelected ? 'bg-primary text-gray-900 dark:text-gray-100-foreground' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' })}</span>
                                            <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{day.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isToday && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">{t('today')}</span>}
                                            {taskCount > 0 && <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${isSelected ? 'bg-white text-gray-900 dark:text-gray-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>{taskCount}</span>}
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
                    {activeTab === 'active' && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <Button variant={activeFilter === 'all' ? 'primary' : 'ghost'} onClick={() => setActiveFilter('all')}><ListIcon className="w-4 h-4" /> {t('all')}</Button>
                            {availableStages.map(stage => {
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
                            })}
                        </div>
                    )}

                    <div className="space-y-4">
                        {filteredTodos.length > 0 ? (
                            filteredTodos.map(todo => {
                                const Icon = getStageIcon(todo.stage);
                                // Find stage from settings to get color
                                const stageObj = stages.find(s => s.name === todo.stage);
                                const stageColor = stageObj?.color || '#808080';
                                return (
                                    // FIX: Wrapped Card in a div with a key to resolve TypeScript error about key prop not being in CardProps.
                                    <div key={todo.id}>
                                        <Card className="flex items-center gap-4 p-4">
                                            <div className="p-2 rounded-full" style={{ backgroundColor: `${stageColor}20` }}>
                                                <Icon className="w-5 h-5" style={{ color: stageColor }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{todo.stage}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{todo.leadName} - {todo.leadPhone}</p>
                                                <p className="text-xs text-gray-500">{new Date(todo.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                            </div>
                                            {activeTab === 'active' && (
                                                <Button variant="ghost" className="p-2 h-auto !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20" onClick={() => handleCompleteTodo(todo.id)}>
                                                    <CheckIcon className="w-6 h-6" />
                                                </Button>
                                            )}
                                            {activeTab === 'completed' && (
                                                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                    <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                            <Card className="text-center py-10">
                                <p className="text-gray-600 dark:text-gray-400">{t('noTasksForDate')} {selectedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}.</p>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        </PageWrapper>
    );
};
