import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BarsDimension, DashboardViewModel, GroupDetail } from '../../../models/dashboard.model';

// Modal de detalle de un panel de barras/donut: un acordeón con todos los
// grupos de la dimensión (sin plegar en "Otros") y los clientes de cada uno.
@Component({
  selector: 'app-dashboard-bars-modal',
  standalone: false,
  templateUrl: './bars-modal.html',
  styleUrl: './bars-modal.scss',
})
export class DashboardBarsModal {
  @Input({ required: true }) dim!: BarsDimension;
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() dismiss = new EventEmitter<void>();

  expandedGroupLabel: string | null = null;

  private static readonly BARS_TITLES: Record<BarsDimension, string> = {
    status: 'Semáforo de campañas',
    rubro: 'Por rubro',
    plan: 'Por plan',
    executive: 'Por ejecutivo',
    country: 'Por país',
    sexo: 'Por sexo',
    lifetimeRubro: 'Tiempo de vida promedio · por rubro',
    lifetimeExecutive: 'Tiempo de vida promedio · por ejecutivo',
    churnExecutive: 'Porcentaje de bajas · por ejecutivo',
  };

  get title(): string {
    return DashboardBarsModal.BARS_TITLES[this.dim];
  }

  get groups(): GroupDetail[] {
    switch (this.dim) {
      case 'status': return this.vm.statusGroups;
      case 'rubro': return this.vm.rubroGroups;
      case 'plan': return this.vm.planGroups;
      case 'executive': return this.vm.executiveGroups;
      case 'country': return this.vm.countryGroups;
      case 'sexo': return this.vm.sexoGroups;
      case 'lifetimeRubro': return this.vm.lifetimeRubroGroups;
      case 'lifetimeExecutive': return this.vm.lifetimeExecutiveGroups;
      case 'churnExecutive': return this.vm.churnExecutiveGroups;
    }
  }

  toggleGroup(label: string): void {
    this.expandedGroupLabel = this.expandedGroupLabel === label ? null : label;
  }
}
