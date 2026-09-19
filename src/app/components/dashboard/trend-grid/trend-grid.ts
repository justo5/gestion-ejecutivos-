import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChartKind, DashboardViewModel } from '../../../models/dashboard.model';
import { money } from '../../../utils/money';

// Los tres gráficos de tendencia de los últimos 12 meses (cartera cobrada,
// clientes nuevos y bajas). Tocar uno avisa cuál abrir en el modal.
@Component({
  selector: 'app-dashboard-trend-grid',
  standalone: false,
  templateUrl: './trend-grid.html',
  styleUrl: './trend-grid.scss',
})
export class DashboardTrendGrid {
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() chartOpen = new EventEmitter<ChartKind>();

  readonly money = money;
}
