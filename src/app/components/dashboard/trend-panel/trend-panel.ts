import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChartGoal } from '../../charts/multi-line-chart/multi-line-chart';

// Panel con un gráfico de área: título, valor del último mes y rango. Con
// `clickable` avisa al tocarlo para abrir el detalle mes a mes.
@Component({
  selector: 'app-dashboard-trend-panel',
  standalone: false,
  templateUrl: './trend-panel.html',
  styleUrl: './trend-panel.scss',
})
export class DashboardTrendPanel {
  @Input() title = '';
  @Input() data: number[] = [];
  @Input() color = '#4f46e5';
  // Texto ya formateado del valor del último mes ("$1.200 este mes").
  @Input() currentLabel = '';
  @Input() rangeLabel = '';
  // Identificador del gráfico (ver app-area-chart#label): tiene que ser único.
  @Input() label = 'chart';
  @Input() goal: ChartGoal | null = null;
  @Input() clickable = false;
  @Output() panelOpen = new EventEmitter<void>();

  onOpen(): void {
    if (this.clickable) this.panelOpen.emit();
  }
}
