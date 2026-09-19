import { Component, Input } from '@angular/core';
import { ChartGoal, LineSeries } from '../../charts/multi-line-chart/multi-line-chart';

// Crecimiento acumulado de clientes por ejecutivo: una línea por ejecutivo
// más una leyenda con el valor actual de cada uno.
@Component({
  selector: 'app-dashboard-executive-growth-panel',
  standalone: false,
  templateUrl: './executive-growth-panel.html',
  styleUrl: './executive-growth-panel.scss',
})
export class DashboardExecutiveGrowthPanel {
  @Input() series: LineSeries[] = [];
  @Input() monthLabels: string[] = [];
  @Input() goal: ChartGoal | null = null;
}
