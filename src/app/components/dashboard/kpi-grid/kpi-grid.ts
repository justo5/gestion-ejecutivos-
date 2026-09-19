import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardCard, DashboardViewModel } from '../../../models/dashboard.model';
import { money } from '../../../utils/money';

// Fila de tarjetas KPI. Tocar una avisa cuál abrir en el modal de detalle.
@Component({
  selector: 'app-dashboard-kpi-grid',
  standalone: false,
  templateUrl: './kpi-grid.html',
  styleUrl: './kpi-grid.scss',
})
export class DashboardKpiGrid {
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() cardOpen = new EventEmitter<DashboardCard>();

  readonly money = money;
}
