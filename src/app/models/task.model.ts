// Tipos del tablero de tareas (página Tareas) y de las tareas automáticas.
// Espejan lo que devuelve el backend en /api/tasks y /api/plan-tasks.

export type Priority = 'red' | 'yellow' | 'green';
export type ClosedColumn = 'done' | 'discarded';
export type TaskColumn = Priority | ClosedColumn;
export type Repeat = 'monthly' | 'weekly' | 'daily';

export interface Task {
  id: string;
  // GENERAL_ID o el id de un cliente.
  folderId: string;
  column: TaskColumn;
  // Orden dentro de la columna (menor = más arriba).
  position: number;
  title: string;
  notes: string;
  // Último color que tuvo la tarea; se conserva al pasarla a Hecho/Descartar.
  priority: Priority;
  // 'YYYY-MM-DD'. Con fecha, la tarea aparece en el tablero recién ese día.
  dueDate: string | null;
  // Distinto de null si la generó una tarea automática.
  recurrenceKey: string | null;
  // ISO.
  createdAt: string;
}

// Cliente visible para el usuario, como carpeta del tablero.
export interface TaskFolder {
  id: string;
  name: string;
  executiveName: string;
  planId: number | null;
  planName: string | null;
  // Inicio del ciclo de cobro (y de las automáticas); null si el cliente no
  // está activo o no tiene día de inicio.
  cycleStart: string | null;
}

// Tarea automática. executiveId null = de la agencia (la configura el admin);
// si no, es propia de ese ejecutivo y aplica solo a su cartera.
export interface PlanTask {
  id: string;
  executiveId: string | null;
  // No es de ningún cliente: va a la General de quien la configuró.
  general: boolean;
  // null = todos los planes (se ignora si `general`).
  planId: number | null;
  // `{mes}` se reemplaza por el nombre del mes en que arranca el ciclo.
  title: string;
  repeat: Repeat;
  // Mensual: día del ciclo (1 = el día que arranca; LAST_DAY = el
  // vencimiento). Semanal: día de la semana (1 = lunes). Diaria: no se usa.
  day: number;
}

export interface TaskBoardState {
  today: string;
  folders: TaskFolder[];
  tasks: Task[];
  planTasks: PlanTask[];
}

export type Board = Record<TaskColumn, Task[]>;

export const GENERAL_ID = 'general';

export const PRIORITIES: Priority[] = ['red', 'yellow', 'green'];

export const COLUMN_META: Record<TaskColumn, { label: string; icon: string }> = {
  red: { label: 'Rojo', icon: '!' },
  yellow: { label: 'Amarillo', icon: '◷' },
  green: { label: 'Verde', icon: '↓' },
  done: { label: 'Hecho', icon: '✓' },
  discarded: { label: 'Descartar', icon: '✕' },
};

export const MONTH_PLACEHOLDER = '{mes}';

export const LAST_DAY = 31;

export const REPEATS: Record<Repeat, string> = {
  monthly: 'Cada mes',
  weekly: 'Cada semana',
  daily: 'Todos los días',
};

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function emptyBoard(): Board {
  return { red: [], yellow: [], green: [], done: [], discarded: [] };
}

export function isPriority(column: TaskColumn): column is Priority {
  return (PRIORITIES as TaskColumn[]).includes(column);
}

// Si la tarea va en el tablero parado en `day`: en hoy, las de hoy, las
// vencidas y las sin fecha; en otro día, solo las de ese día.
export function isOnBoard(task: Task, day: string, isToday: boolean): boolean {
  if (!isToday) return task.dueDate === day;
  return !task.dueDate || task.dueDate <= day;
}

// Día del ciclo ("Día 15", "Vencimiento") o de la semana ("Lunes").
export function planTaskDay(repeat: Repeat, day: number): string {
  if (repeat === 'weekly') return WEEKDAYS[day - 1] ?? '';
  return day >= LAST_DAY ? 'Vencimiento' : `Día ${day}`;
}

// Cuándo se genera: "Día 15", "Todos los lunes", "Todos los días".
export function planTaskWhen(task: Pick<PlanTask, 'repeat' | 'day'>): string {
  if (task.repeat === 'daily') return 'Todos los días';
  if (task.repeat === 'weekly') {
    const day = WEEKDAYS[task.day - 1]?.toLowerCase() ?? '';
    return `Todos los ${day.endsWith('s') ? day : `${day}s`}`;
  }
  return planTaskDay('monthly', task.day);
}

// Automáticas que le tocan a un cliente con ese plan (las de la agencia y las
// de su ejecutivo, que son las únicas que recibe cada usuario).
export function planTasksFor(planId: number | null, planTasks: PlanTask[]): PlanTask[] {
  if (planId === null) return [];
  return planTasks.filter((t) => !t.general && (t.planId === null || t.planId === planId));
}
