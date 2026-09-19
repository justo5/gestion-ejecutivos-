import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChartKind, DashboardViewModel, MonthDetail } from '../../../models/dashboard.model';

// Modal de detalle de un gráfico de tendencia: el gráfico en grande y, mes a
// mes, los clientes que explican el valor.
@Component({
  selector: 'app-dashboard-chart-modal',
  standalone: false,
  templateUrl: './chart-modal.html',
  styleUrl: './chart-modal.scss',
})
export class DashboardChartModal {
  @Input({ required: true }) chart!: ChartKind;
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() dismiss = new EventEmitter<void>();

  private static readonly CHART_TITLES: Record<ChartKind, string> = {
    revenue: 'Cartera cobrada · últimos 12 meses',
    newClients: 'Clientes nuevos · últimos 12 meses',
    churn: 'Bajas de clientes · últimos 12 meses',
  };

  get title(): string {
    return DashboardChartModal.CHART_TITLES[this.chart];
  }

  get series(): number[] {
    switch (this.chart) {
      case 'revenue': return this.vm.revenueSeries;
      case 'newClients': return this.vm.newClientsSeries;
      case 'churn': return this.vm.churnSeries;
    }
  }

  get color(): string {
    switch (this.chart) {
      case 'revenue': return '#afd42a';
      case 'newClients': return '#1e9adb';
      case 'churn': return '#e66767';
    }
  }

  get monthDetails(): MonthDetail[] {
    switch (this.chart) {
      case 'revenue': return this.vm.revenueMonthDetails;
      case 'newClients': return this.vm.newClientsMonthDetails;
      case 'churn': return this.vm.churnMonthDetails;
    }
  }
}
