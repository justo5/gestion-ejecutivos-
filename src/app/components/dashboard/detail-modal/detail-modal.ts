import { Component, EventEmitter, Input, Output } from '@angular/core';

// Cáscara común de los modales de detalle del dashboard (fondo, panel,
// título y botón de cerrar). El contenido se proyecta con <ng-content>.
@Component({
  selector: 'app-dashboard-detail-modal',
  standalone: false,
  templateUrl: './detail-modal.html',
  styleUrl: './detail-modal.scss',
})
export class DashboardDetailModal {
  @Input() title = '';
  // Panel un poco más ancho, para el modal que lleva un gráfico arriba.
  @Input() wide = false;
  @Output() dismiss = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismiss.emit();
  }
}
