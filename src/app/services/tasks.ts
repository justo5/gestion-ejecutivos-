import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { AuthService } from './auth';
import {
  Board,
  GENERAL_ID,
  PRIORITIES,
  PlanTask,
  Task,
  TaskBoardState,
  TaskColumn,
  TaskFolder,
  emptyBoard,
  isOnBoard,
  isPriority,
} from '../models/task.model';
import { localToday } from '../utils/task-dates';
import { httpErrorMessage } from '../utils/http-error';

export type TaskPatch = Partial<Pick<Task, 'title' | 'notes' | 'dueDate'>>;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'offline';

// Carpeta elegida en el tablero; se recuerda por navegador.
const SELECTED_KEY = 'tareas-carpeta-v1';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin storage disponible: solo se pierde la carpeta recordada.
  }
}

function byPosition(a: Task, b: Task): number {
  return a.position - b.position || b.createdAt.localeCompare(a.createdAt);
}

// Estado del tablero de tareas (página Tareas y pestaña To Do de la ficha del
// cliente). Los cambios se aplican primero en pantalla y después se mandan al
// backend; si alguno falla, se avisa y se recarga lo que hay en el servidor.
@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly folderList = signal<TaskFolder[]>([]);
  private readonly tasks = signal<Task[]>([]);
  private readonly selected = signal(readStorage(SELECTED_KEY) ?? GENERAL_ID);
  // Se incrementa en cada cambio local: una recarga que empezó antes se descarta.
  private version = 0;
  private started = false;

  readonly status = signal<LoadStatus>('idle');
  // Error de la última operación que no se pudo guardar.
  readonly error = signal<string | null>(null);
  // El día de hoy de verdad, según el backend (zona horaria de la agencia).
  readonly realToday = signal(localToday());
  // Día elegido a mano para ver el tablero; null = hoy. No se guarda.
  private readonly viewDate = signal<string | null>(null);
  // Día en el que está parado el tablero: decide qué tareas se ven y cuáles son próximas.
  readonly today = computed(() => this.viewDate() ?? this.realToday());
  readonly viewingToday = computed(() => this.today() === this.realToday());
  // Automáticas que recibe el usuario (las de la agencia y, si es ejecutivo, las suyas).
  readonly planTasks = signal<PlanTask[]>([]);

  readonly folders = this.folderList.asReadonly();
  readonly selectedId = computed(() => {
    const id = this.selected();
    return this.folderList().some((f) => f.id === id) ? id : GENERAL_ID;
  });
  readonly selectedFolder = computed(() => this.folderList().find((f) => f.id === this.selectedId()) ?? null);
  readonly selectedName = computed(() => this.nameOf(this.selectedId()));
  // "General" muestra las tareas de todas las carpetas.
  readonly showsAll = computed(() => this.selectedId() === GENERAL_ID);

  private readonly visibleTasks = computed(() => {
    const day = this.today();
    const isToday = this.viewingToday();
    return this.tasks().filter((t) => isOnBoard(t, day, isToday));
  });

  readonly board = computed(() => {
    const board = emptyBoard();
    for (const task of this.visibleTasks()) {
      if (this.isShown(task)) board[task.column].push(task);
    }
    for (const list of Object.values(board)) list.sort(byPosition);
    return board;
  });

  // Tareas de la carpeta actual con fecha posterior al día en el que está parado el tablero.
  readonly upcoming = computed(() => {
    const day = this.today();
    return this.tasks()
      .filter((t) => this.isShown(t) && !!t.dueDate && t.dueDate > day)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  });

  // Tareas pendientes con fecha de la carpeta actual, por día (para el calendario).
  readonly pendingByDate = computed(() => {
    const days = new Map<string, Task[]>();
    for (const task of this.tasks()) {
      if (!task.dueDate || !isPriority(task.column) || !this.isShown(task)) continue;
      days.set(task.dueDate, [...(days.get(task.dueDate) ?? []), task]);
    }
    return days;
  });

  // Pendientes (rojo + amarillo + verde) por carpeta en el día que se está
  // viendo; en General, el total.
  readonly pendingCounts = computed(() => this.countPending(this.visibleTasks()));

  // Lo mismo pero siempre para hoy: los avisos fuera del tablero (tarjetas y
  // ficha del cliente) no dependen del día elegido en el tablero.
  readonly pendingTodayCounts = computed(() => {
    const today = this.realToday();
    return this.countPending(this.tasks().filter((t) => isOnBoard(t, today, true)));
  });

  constructor(
    private http: HttpClient,
    auth: AuthService,
  ) {
    // Otro usuario, otro tablero: no mostrar ni un instante lo del anterior.
    auth.user$
      .pipe(
        map((user) => user?.id ?? null),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.version++;
        this.folderList.set([]);
        this.tasks.set([]);
        this.planTasks.set([]);
        this.status.set('idle');
        if (this.started && auth.isAuthenticated()) void this.load();
      });
  }

  // La primera página que lo usa lo arranca; desde ahí se mantiene al día solo.
  ensureLoaded(): void {
    if (!this.started) {
      this.started = true;
      // Al volver a la pestaña (y cada tanto) se recarga, así aparecen las
      // automáticas nuevas y lo que cargaron otros.
      window.addEventListener('focus', () => void this.load());
      setInterval(() => void this.load(), 5 * 60_000);
    }
    void this.load();
  }

  async load(): Promise<void> {
    if (this.status() === 'idle') this.status.set('loading');
    const version = this.version;
    try {
      const state = await firstValueFrom(this.http.get<TaskBoardState>('/api/tasks/state'));
      if (version !== this.version) return;
      this.realToday.set(state.today);
      this.folderList.set(state.folders);
      this.tasks.set(state.tasks);
      this.planTasks.set(state.planTasks);
      this.status.set('ready');
    } catch (err) {
      console.error(err);
      if (version === this.version) this.status.set('offline');
    }
  }

  nameOf(id: string): string {
    if (id === GENERAL_ID) return 'General';
    return this.folderList().find((f) => f.id === id)?.name ?? '';
  }

  select(id: string): void {
    this.selected.set(id);
    writeStorage(SELECTED_KEY, id);
  }

  // Para el tablero en otro día (null o el día de hoy = volver a hoy).
  setViewDate(date: string | null): void {
    this.viewDate.set(date && date !== this.realToday() ? date : null);
  }

  // Pendientes de hoy de un cliente, la más urgente primero (ficha del cliente).
  pendingOf(folderId: string): Task[] {
    const today = this.realToday();
    return this.tasks()
      .filter((t) => t.folderId === folderId && isPriority(t.column) && isOnBoard(t, today, true))
      .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || byPosition(a, b));
  }

  // --- Tareas automáticas ---

  // Las automáticas que ve el usuario (para el editor, sin cargar el tablero).
  fetchPlanTasks(): Observable<PlanTask[]> {
    return this.http.get<PlanTask[]>('/api/plan-tasks');
  }

  // Admin: reemplaza las de la agencia. Ejecutivo: las suyas. El backend
  // recalcula las futuras, así que después se recarga el tablero.
  savePlanTasks(planTasks: PlanTask[]): Observable<PlanTask[]> {
    const body = planTasks.map(({ id, general, planId, title, repeat, day }) => ({ id, general, planId, title, repeat, day }));
    return this.http.put<PlanTask[]>('/api/plan-tasks', { tasks: body }).pipe(
      tap((saved) => {
        this.planTasks.set(saved);
        if (this.started) void this.load();
      }),
    );
  }

  // --- Tareas ---

  // Crea una tarea arriba de todo en la columna, en la carpeta indicada (por
  // defecto, la elegida). Si `dueDate` no viene y el tablero está parado en
  // otro día, toma la de ese día (si no, desaparecería del tablero); null =
  // sin fecha a propósito.
  addTask(
    column: TaskColumn,
    title: string,
    notes = '',
    dueDate?: string | null,
    folderId = this.selectedId(),
  ): void {
    if (dueDate === undefined) dueDate = this.viewingToday() ? null : this.today();
    const task: Task = {
      id: crypto.randomUUID(),
      folderId,
      column,
      position: this.topPosition(column),
      title: title.trim(),
      notes: notes.trim(),
      priority: isPriority(column) ? column : 'yellow',
      dueDate,
      recurrenceKey: null,
      createdAt: new Date().toISOString(),
    };
    this.tasks.update((tasks) => [...tasks, task]);
    const { id, title: t, notes: n } = task;
    this.save(this.http.post<Task>('/api/tasks', { id, folderId, column, title: t, notes: n, dueDate }));
  }

  updateTask(id: string, patch: TaskPatch): void {
    this.patchTask(id, patch);
    this.save(this.http.patch<Task>(`/api/tasks/${id}`, patch));
  }

  deleteTask(id: string): void {
    this.tasks.update((tasks) => tasks.filter((t) => t.id !== id));
    this.save(this.http.delete<void>(`/api/tasks/${id}`));
  }

  // Mueve una tarea entre columnas (o dentro de la misma) del tablero que se está viendo.
  moveTask(from: TaskColumn, to: TaskColumn, fromIndex: number, toIndex: number): void {
    if (from === to && fromIndex === toIndex) return;
    const board: Board = this.board();
    // Lo mismo que moveItemInArray/transferArrayItem del CDK, sin importarlo
    // acá: este servicio va en el bundle inicial y el drag & drop no.
    const source = [...board[from]];
    const target = from === to ? source : [...board[to]];
    const [item] = source.splice(fromIndex, 1);
    if (!item) return;
    target.splice(Math.min(toIndex, target.length), 0, item);

    const moved = target[toIndex];
    if (!moved) return;
    const order = target.map((t) => t.id);
    const positions = new Map(order.map((id, index) => [id, index]));
    this.tasks.update((tasks) =>
      tasks.map((t) => {
        const position = positions.get(t.id);
        if (t.id === moved.id) {
          return { ...t, column: to, priority: isPriority(to) ? to : t.priority, position: position! };
        }
        return position === undefined ? t : { ...t, position };
      }),
    );
    this.save(this.http.post<Task>(`/api/tasks/${moved.id}/move`, { folderId: moved.folderId, column: to, order }));
  }

  // Manda una tarea al principio de otra columna, sin depender de que esté a
  // la vista en el tablero (la usa también la ficha del cliente).
  sendTo(id: string, to: TaskColumn): void {
    const task = this.tasks().find((t) => t.id === id);
    if (!task || task.column === to) return;
    this.patchTask(id, {
      column: to,
      priority: isPriority(to) ? to : task.priority,
      position: this.topPosition(to),
    });
    this.save(this.http.post<Task>(`/api/tasks/${id}/move`, { folderId: task.folderId, column: to }));
  }

  // Pasa una tarea a otra carpeta, manteniendo su columna.
  moveToFolder(id: string, folderId: string): void {
    const task = this.tasks().find((t) => t.id === id);
    if (!task || task.folderId === folderId) return;
    this.patchTask(id, { folderId, position: this.topPosition(task.column) });
    this.save(this.http.post<Task>(`/api/tasks/${id}/move`, { folderId, column: task.column }));
  }

  dismissError(): void {
    this.error.set(null);
  }

  private isShown(task: Task): boolean {
    return this.showsAll() || task.folderId === this.selectedId();
  }

  private countPending(tasks: Task[]): Record<string, number> {
    const counts: Record<string, number> = { [GENERAL_ID]: 0 };
    for (const task of tasks) {
      if (!isPriority(task.column)) continue;
      counts[GENERAL_ID]++;
      if (task.folderId !== GENERAL_ID) counts[task.folderId] = (counts[task.folderId] ?? 0) + 1;
    }
    return counts;
  }

  private patchTask(id: string, patch: Partial<Task>): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // Arriba de todo en la columna, contando todas las carpetas (así también
  // queda arriba en General).
  private topPosition(column: TaskColumn): number {
    const positions = this.tasks()
      .filter((t) => t.column === column)
      .map((t) => t.position);
    return positions.length ? Math.min(...positions) - 1 : 0;
  }

  private save<T>(request: Observable<T>): void {
    this.version++;
    this.error.set(null);
    request.subscribe({
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(
          `${httpErrorMessage(err, 'No se pudo guardar el último cambio.')} Se recargaron los datos del servidor.`,
        );
        void this.load();
      },
    });
  }
}
