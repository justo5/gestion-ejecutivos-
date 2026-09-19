import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BarItem, BarsDimension } from '../../../models/dashboard.model';

// Panel de barras horizontales. Con `dim` es clickeable y avisa cuál
// dimensión abrir; sin `dim` (dentro de un modal de detalle) es solo lectura.
@Component({
  selector: 'app-dashboard-bars-panel',
  standalone: false,
  templateUrl: './bars-panel.html',
  styleUrl: './bars-panel.scss',
})
export class DashboardBarsPanel {
  @Input() title = '';
  @Input() bars: BarItem[] = [];
  @Input() dim: BarsDimension | null = null;
  @Output() panelOpen = new EventEmitter<BarsDimension>();

  onOpen(): void {
    if (this.dim) this.panelOpen.emit(this.dim);
  }
}
