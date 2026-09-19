import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BarsDimension, DashboardViewModel } from '../../../models/dashboard.model';

// Grilla de distribuciones (semáforo, rubro, plan, ejecutivo, país, sexo,
// tiempo de vida y bajas). Tocar un panel avisa cuál dimensión abrir.
@Component({
  selector: 'app-dashboard-distribution-grid',
  standalone: false,
  templateUrl: './distribution-grid.html',
  styleUrl: './distribution-grid.scss',
})
export class DashboardDistributionGrid {
  @Input({ required: true }) vm!: DashboardViewModel;
  @Output() barsOpen = new EventEmitter<BarsDimension>();
}
