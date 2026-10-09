import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  COLUMN_META,
  ClosedColumn,
  GENERAL_ID,
  MONTH_PLACEHOLDER,
  Priority,
  Task,
  TaskColumn,
  TaskFolder,
  planTaskWhen,
  planTasksFor,
} from '../../models/task.model';
import { AuthService } from '../../services/auth';
import { TaskStore } from '../../services/tasks';
import { folderColor, folderInitial } from '../../utils/folder-color';
import { addDays, formatNumeric, formatShort } from '../../utils/task-dates';
import { TaskFormValue } from './task-form-modal/task-form-modal';
import { TaskListKind } from './task-list-modal/task-list-modal';

// Formulario abierto: alta en una columna o edición de una tarea.
interface FormDialog {
  heading: string;
  folderName: string;
  initial: TaskFormValue;
  column?: Priority;
  taskId?: string;
}

// A partir de cuántos clientes se muestra el buscador del panel izquierdo.
const SEARCH_FROM = 8;

const CLOSED_HINTS: Record<ClosedColumn, string> = {
  done: 'Soltá una tarea para completarla',
  discarded: 'Soltá una tarea para descartarla',
};

// Tablero de tareas: carpetas (General + un cliente por carpeta) a la
// izquierda, columnas Rojo / Amarillo / Verde y zonas Hecho / Descartar.
@Component({
  selector: 'app-tareas',
  standalone: false,
  templateUrl: './tareas.html',
  styleUrl: './tareas.scss',
})
export class Tareas implements OnInit {
  readonly GENERAL_ID = GENERAL_ID;
  readonly COLUMN_META = COLUMN_META;
  readonly CLOSED_HINTS = CLOSED_HINTS;
  readonly priorities: Priority[] = ['red', 'yellow', 'green'];
  readonly closedColumns: ClosedColumn[] = ['done', 'discarded'];
  readonly folderColor = folderColor;
  readonly folderInitial = folderInitial;
  readonly formatShort = formatShort;

  readonly search = signal('');
  readonly filteredFolders = computed(() => {
    const term = this.search().trim().toLowerCase();
    const folders = this.store.folders();
    if (!term) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(term) || f.executiveName.toLowerCase().includes(term));
  });

  // Automáticas que le tocan al cliente elegido.
  readonly selectedPlanTasks = computed(() => {
    const folder = this.store.selectedFolder();
    if (!folder?.cycleStart) return [];
    return planTasksFor(folder.planId, this.store.planTasks()).map(
      (t) => `${planTaskWhen(t)}: ${t.title.replaceAll(MONTH_PLACEHOLDER, '…')}`,
    );
  });

  form: FormDialog | null = null;
  confirmTask: Task | null = null;
  list: TaskListKind | null = null;
  calendarOpen = false;
  // En pantallas chicas el panel izquierdo se abre y cierra.
  sidebarOpen = false;

  constructor(
    readonly store: TaskStore,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Desde la ficha del cliente se llega con ?carpeta=<id>.
    const folder = this.route.snapshot.queryParamMap.get('carpeta');
    if (folder) this.store.select(folder);
    this.store.ensureLoaded();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  // Dónde se configuran las automáticas: la agencia en Configuración (admin),
  // las propias en Perfil (ejecutivo).
  get automaticLink(): string {
    return this.isAdmin ? '/config' : '/perfil';
  }

  get showSearch(): boolean {
    return this.store.folders().length > SEARCH_FROM;
  }

  hasAutomatic(folder: TaskFolder): boolean {
    return !!folder.cycleStart && planTasksFor(folder.planId, this.store.planTasks()).length > 0;
  }

  cycleLabel(folder: TaskFolder): string {
    if (!folder.cycleStart) return 'Sin ciclo de cobro: falta el día de inicio o el cliente no está activo.';
    return `Se renueva el día ${Number(folder.cycleStart.slice(8))} de cada mes (desde el ${formatNumeric(folder.cycleStart)}).`;
  }

  select(id: string): void {
    this.store.select(id);
    this.sidebarOpen = false;
  }

  shiftDay(days: number): void {
    this.store.setViewDate(addDays(this.store.today(), days));
  }

  count(column: ClosedColumn): number {
    return this.store.board()[column].length;
  }

  dropOnClosed(event: CdkDragDrop<ClosedColumn, TaskColumn, Task>, column: ClosedColumn): void {
    this.store.moveTask(event.previousContainer.data, column, event.previousIndex, 0);
  }

  // --- Formulario ---

  openNew(event: { column: Priority; title: string }): void {
    this.form = {
      heading: 'Nueva tarea',
      folderName: this.store.selectedName(),
      initial: { title: event.title, notes: '', dueDate: this.store.viewingToday() ? '' : this.store.today() },
      column: event.column,
    };
  }

  openEdit(task: Task): void {
    this.form = {
      heading: 'Editar tarea',
      folderName: this.store.nameOf(task.folderId),
      initial: { title: task.title, notes: task.notes, dueDate: task.dueDate ?? '' },
      taskId: task.id,
    };
  }

  saveForm(value: TaskFormValue): void {
    const form = this.form;
    this.form = null;
    if (!form) return;
    if (form.taskId) {
      this.store.updateTask(form.taskId, { title: value.title, notes: value.notes, dueDate: value.dueDate || null });
    } else if (form.column) {
      // Sin fecha en el formulario: si el tablero está en otro día, toma ese día.
      this.store.addTask(form.column, value.title, value.notes, value.dueDate || undefined);
    }
  }

  // --- Eliminar ---

  confirmDelete(): void {
    if (this.confirmTask) this.store.deleteTask(this.confirmTask.id);
    this.confirmTask = null;
  }

  onConfirmBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.confirmTask = null;
  }
}
