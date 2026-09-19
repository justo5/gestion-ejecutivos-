import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardCard, DashboardViewModel } from '../../../models/dashboard.model';

// Modal de detalle de una tarjeta KPI: según la tarjeta muestra los clientes
// (y, donde aplica, un panel de barras) que explican el número.
@Component({
  selector: 'app-dashboard-card-modal',
  standalone: false,
  templateUrl: './card-modal.html',
  styleUrl: './card-modal.scss',
})
export class DashboardCardModal {
  @Input({ required: true }) card!: DashboardCard;
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() dismiss = new EventEmitter<void>();

  private static readonly CARD_TITLES: Record<DashboardCard, string> = {
    total: 'Clientes totales',
    mrr: 'Cartera mensual',
    pending: 'Pendiente de cobro',
    collected: 'Porcentaje cobrado',
    lifetime: 'Tiempo de vida promedio',
    churnPct: 'Porcentaje de bajas',
  };

  get title(): string {
    return DashboardCardModal.CARD_TITLES[this.card];
  }
}
