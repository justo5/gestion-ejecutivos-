import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { PRIORITIES, Priority, Task } from '../../../models/task.model';
import { TaskStore } from '../../../services/tasks';
import { addDays, addMonthsToMonth, formatLong, formatMonth, weekdayIndex } from '../../../utils/task-dates';

const WEEKDAYS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  count: number;
  // La prioridad más urgente de las pendientes de ese día (color de la pelotita).
  priority: Priority | null;
  label: string;
}

function mostUrgent(tasks: Task[]): Priority | null {
  return PRIORITIES.find((p) => tasks.some((t) => t.column === p)) ?? null;
}

// Calendario del mes: marca los días con tareas pendientes de la carpeta
// elegida y, al tocar uno, para el tablero en ese día.
@Component({
  selector: 'app-task-calendar-modal',
  standalone: false,
  templateUrl: './task-calendar-modal.html',
  styleUrl: './task-calendar-modal.scss',
})
export class TaskCalendarModal {
  @Output() closed = new EventEmitter<void>();

  readonly store = inject(TaskStore);
  readonly WEEKDAYS = WEEKDAYS;
  // Mes que se está viendo ('YYYY-MM'); arranca en el del día en el que está parado el tablero.
  readonly month = signal(this.store.today().slice(0, 7));

  // Semanas completas (de lunes a domingo) que cubren el mes.
  readonly days = computed<CalendarDay[]>(() => {
    const month = this.month();
    const first = `${month}-01`;
    const last = addDays(`${addMonthsToMonth(month, 1)}-01`, -1);
    const start = addDays(first, -weekdayIndex(first));
    const end = addDays(last, 6 - weekdayIndex(last));
    const pending = this.store.pendingByDate();

    const days: CalendarDay[] = [];
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const tasks = pending.get(date) ?? [];
      days.push({
        date,
        day: Number(date.slice(8)),
        inMonth: date.startsWith(month),
        count: tasks.length,
        priority: mostUrgent(tasks),
        label: `${formatLong(date)}${tasks.length ? ` · ${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}` : ''}`,
      });
    }
    return days;
  });

  get monthLabel(): string {
    return formatMonth(this.month());
  }

  shiftMonth(months: number): void {
    this.month.update((m) => addMonthsToMonth(m, months));
  }

  pick(date: string): void {
    this.store.setViewDate(date);
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
