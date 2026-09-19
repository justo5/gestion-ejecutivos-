import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BarItem, BarsDimension } from '../../../models/dashboard.model';

// Igual que app-dashboard-bars-panel (mismo panel clickeable), pero
// part-to-whole como donut en vez de barras: solo para dimensiones ya
// plegadas en "Otros" (<=8 porciones). "Por ejecutivo" no se pliega a
// propósito, así que sigue usando barras.
@Component({
  selector: 'app-dashboard-donut-panel',
  standalone: false,
  templateUrl: './donut-panel.html',
  styleUrl: './donut-panel.scss',
})
export class DashboardDonutPanel {
  @Input() title = '';
  @Input() items: BarItem[] = [];
  @Input({ required: true }) dim!: BarsDimension;
  @Input() format: 'count' | 'money' = 'count';
  @Input() centerLabel = '';
  @Output() panelOpen = new EventEmitter<BarsDimension>();

  onOpen(): void {
    this.panelOpen.emit(this.dim);
  }
}
