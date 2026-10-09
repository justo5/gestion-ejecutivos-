import { Component, ElementRef, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { COLUMN_META, GENERAL_ID, Priority, Task, TaskColumn as Column } from '../../../models/task.model';
import { TaskStore } from '../../../services/tasks';
import { folderColor } from '../../../utils/folder-color';
import { DueInfo, dueInfo } from '../../../utils/task-dates';

interface MenuState {
  task: Task;
  // Posición fija en pantalla: la lista tiene scroll y recortaría un menú absoluto.
  top: number;
  left: number;
  mode: 'main' | 'folders';
}

const MENU_WIDTH = 220;

// Una columna pendiente del tablero (Rojo, Amarillo o Verde).
@Component({
  selector: 'app-task-column',
  standalone: false,
  templateUrl: './task-column.html',
  styleUrl: './task-column.scss',
  host: { '[class]': '"col col-" + column' },
})
export class TaskColumn {
  @Input({ required: true }) column!: Priority;
  @Output() edit = new EventEmitter<Task>();
  @Output() remove = new EventEmitter<Task>();
  // Abre el formulario completo (notas y fecha) con lo que ya se escribió.
  @Output() addDetailed = new EventEmitter<{ column: Priority; title: string }>();

  readonly GENERAL_ID = GENERAL_ID;
  readonly menu = signal<MenuState | null>(null);
  readonly folderFilter = signal('');

  readonly menuFolders = computed(() => {
    const menu = this.menu();
    if (!menu) return [];
    const term = this.folderFilter().trim().toLowerCase();
    return [{ id: GENERAL_ID, name: 'General' }, ...this.store.folders()].filter(
      (f) => f.id !== menu.task.folderId && (!term || f.name.toLowerCase().includes(term)),
    );
  });

  constructor(
    readonly store: TaskStore,
    private host: ElementRef<HTMLElement>,
  ) {}

  get meta() {
    return COLUMN_META[this.column];
  }

  get tasks(): Task[] {
    return this.store.board()[this.column];
  }

  // En General (que muestra todo) se indica de qué cliente es cada tarea, con su color.
  client(task: Task): { name: string; color: string } | null {
    if (!this.store.showsAll() || task.folderId === GENERAL_ID) return null;
    return { name: this.store.nameOf(task.folderId), color: folderColor(task.folderId) };
  }

  due(task: Task): DueInfo | null {
    return task.dueDate ? dueInfo(task.dueDate, this.store.today()) : null;
  }

  drop(event: CdkDragDrop<Priority, Column, Task>): void {
    this.store.moveTask(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }

  quickAdd(input: HTMLInputElement): void {
    const title = input.value.trim();
    if (!title) return;
    this.store.addTask(this.column, title);
    input.value = '';
  }

  addWithDetails(input: HTMLInputElement): void {
    this.addDetailed.emit({ column: this.column, title: input.value.trim() });
    input.value = '';
  }

  openMenu(task: Task, button: HTMLElement): void {
    if (this.menu()?.task.id === task.id) {
      this.menu.set(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    this.folderFilter.set('');
    this.menu.set({
      task,
      top: Math.min(rect.bottom + 4, window.innerHeight - 260),
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      mode: 'main',
    });
  }

  showFolders(): void {
    this.menu.update((m) => (m ? { ...m, mode: 'folders' } : m));
  }

  run(action: 'edit' | 'done' | 'discarded' | 'remove'): void {
    const task = this.menu()?.task;
    this.menu.set(null);
    if (!task) return;
    if (action === 'edit') this.edit.emit(task);
    else if (action === 'remove') this.remove.emit(task);
    else this.store.sendTo(task.id, action);
  }

  moveToFolder(folderId: string): void {
    const task = this.menu()?.task;
    this.menu.set(null);
    if (task) this.store.moveToFolder(task.id, folderId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menu() && !this.host.nativeElement.contains(event.target as Node)) this.menu.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menu.set(null);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    this.menu.set(null);
  }
}
