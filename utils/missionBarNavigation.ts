const MISSION_BAR_TODOS_PRESET_KEY = 'missionBarTodosPreset';

export type MissionBarTodosPreset = 'today' | 'overdue';

export function readMissionBarTodosPreset(): MissionBarTodosPreset | null {
  const value = localStorage.getItem(MISSION_BAR_TODOS_PRESET_KEY);
  if (value === 'today' || value === 'overdue') return value;
  return null;
}

export function clearMissionBarTodosPreset(): void {
  localStorage.removeItem(MISSION_BAR_TODOS_PRESET_KEY);
}

/** Apply todos list filters before navigating from mission bar chips. */
export function presetTodosFromMissionBar(preset: MissionBarTodosPreset): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'today') {
    localStorage.setItem('todosSelectedDate', today.toISOString());
    localStorage.setItem('todosActiveTab', 'active');
    localStorage.removeItem(MISSION_BAR_TODOS_PRESET_KEY);
    return;
  }

  localStorage.setItem('todosSelectedDate', 'all');
  localStorage.setItem('todosActiveTab', 'active');
  localStorage.setItem(MISSION_BAR_TODOS_PRESET_KEY, 'overdue');
}

export function isCalendarDayOverdue(reminderDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reminder = new Date(reminderDate);
  reminder.setHours(0, 0, 0, 0);
  return reminder.getTime() < today.getTime();
}

/** Patient follow-up actions (ClientTask) whose reminder is before today — matches mission bar. */
export function isOverdueFollowUpTask(todo: {
  type?: string;
  reminderDate?: string | null;
  reminder_date?: string | null;
}): boolean {
  if (todo.type !== 'client_task') return false;
  const reminderDate = todo.reminderDate ?? todo.reminder_date;
  if (!reminderDate) return false;
  return isCalendarDayOverdue(reminderDate);
}

export function applyMissionBarTodosPreset(preset: MissionBarTodosPreset): void {
  presetTodosFromMissionBar(preset);
}

export function todayDateInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
