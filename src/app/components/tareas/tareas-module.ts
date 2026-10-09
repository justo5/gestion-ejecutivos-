import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Tareas } from './tareas';
import { TaskColumn } from './task-column/task-column';
import { TaskFormModal } from './task-form-modal/task-form-modal';
import { TaskListModal } from './task-list-modal/task-list-modal';
import { TaskCalendarModal } from './task-calendar-modal/task-calendar-modal';

// Tablero de tareas, cargado recién al entrar a /tareas: el drag & drop del
// CDK no entra en el bundle inicial (que tiene un presupuesto de 1 MB).
@NgModule({
  declarations: [Tareas, TaskColumn, TaskFormModal, TaskListModal, TaskCalendarModal],
  imports: [CommonModule, FormsModule, DragDropModule, RouterModule.forChild([{ path: '', component: Tareas }])],
})
export class TareasModule {}
