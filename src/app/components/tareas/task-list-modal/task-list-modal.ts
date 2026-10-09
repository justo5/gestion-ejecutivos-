import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GENERAL_ID, Task } from '../../../models/task.model';
import { TaskStore } from '../../../services/tasks';
import { formatLong } from '../../../utils/task-dates';

export type TaskListKind = 'done' | 'discarded' | 'upcoming';

const TEXTS: Record<TaskListKind, { heading: string; hint: string; empty: string }> = {
  done: {
    heading: 'Hechas',
    hint: 'Podés devolverlas a pendientes o eliminarlas.',
    empty: 'Todavía no hay tareas hechas.',
  },
  discarded: {
    heading: 'Descartadas',
    hint: 'Podés devolverlas a pendientes o eliminarlas.',
    empty: 'No hay tareas descartadas.',
  },
  upcoming: {
    heading: 'Próximas',
    hint: 'Tareas con fecha que todavía no llegaron: aparecen en el tablero el día de su fecha.',
    empty: 'No hay tareas próximas.',
  },
};

// Lista de las tareas que no se ven como tarjetas en el tablero: las de Hecho
// y Descartar (zonas para soltar) y las Próximas.
@Component({
  selector: 'app-task-list-modal',
  standalone: false,
  templateUrl: './task-list-modal.html',
  styleUrl: './task-list-modal.scss',
})
export class TaskListModal {
  @Input({ required: true }) kind!: TaskListKind;
  @Output() remove = new EventEmitter<Task>();
  @Output() edit = new EventEmitter<Task>();
  @Output() closed = new EventEmitter<void>();

  constructor(readonly store: TaskStore) {}

  get texts() {
    return TEXTS[this.kind];
  }

  get tasks(): Task[] {
    return this.kind === 'upcoming' ? this.store.upcoming() : this.store.board()[this.kind];
  }

  // En General, que junta todas las carpetas, se indica de qué cliente es cada tarea.
  folderOf(task: Task): string | null {
    if (!this.store.showsAll() || task.folderId === GENERAL_ID) return null;
    return this.store.nameOf(task.folderId);
  }

  long(date: string): string {
    return formatLong(date);
  }

  restore(task: Task): void {
    this.store.sendTo(task.id, task.priority);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
