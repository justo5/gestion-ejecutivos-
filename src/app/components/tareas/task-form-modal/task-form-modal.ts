import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { addDays, formatLong, localToday } from '../../../utils/task-dates';

export interface TaskFormValue {
  title: string;
  notes: string;
  // '' = sin fecha.
  dueDate: string;
}

// Alta con detalles o edición de una tarea: título, notas y fecha.
@Component({
  selector: 'app-task-form-modal',
  standalone: false,
  templateUrl: './task-form-modal.html',
  styleUrl: './task-form-modal.scss',
})
export class TaskFormModal implements OnInit, AfterViewInit {
  @Input() heading = 'Nueva tarea';
  // Carpeta donde queda la tarea (solo se muestra).
  @Input() folderName = '';
  @Input() initial: TaskFormValue = { title: '', notes: '', dueDate: '' };
  @Output() saved = new EventEmitter<TaskFormValue>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('titleInput') private titleInput?: ElementRef<HTMLInputElement>;

  title = '';
  notes = '';
  dueDate = '';

  ngOnInit(): void {
    ({ title: this.title, notes: this.notes, dueDate: this.dueDate } = this.initial);
  }

  ngAfterViewInit(): void {
    this.titleInput?.nativeElement.focus();
  }

  // Si la fecha es futura, la tarea queda en "Próximas" hasta ese día.
  get appearsOn(): string | null {
    return this.dueDate && this.dueDate > localToday() ? formatLong(this.dueDate) : null;
  }

  get tomorrow(): string {
    return addDays(localToday(), 1);
  }

  setDate(date: string): void {
    this.dueDate = date;
  }

  save(): void {
    const title = this.title.trim();
    if (!title) return;
    this.saved.emit({ title, notes: this.notes.trim(), dueDate: this.dueDate });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
