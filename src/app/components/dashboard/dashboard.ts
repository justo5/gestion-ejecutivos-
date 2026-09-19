import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExecutivesService } from '../../services/executives';
import { ConfigService } from '../../services/config';
import { DashboardViewBuilder } from '../../services/dashboard-view-builder';
import { BarsDimension, ChartKind, DashboardCard, DashboardViewModel } from '../../models/dashboard.model';

// Página del dashboard: arma el view-model y lo reparte a los componentes de
// esta carpeta. Lo único que guarda es qué detalle está abierto (tarjeta KPI,
// panel de barras o gráfico de tendencia); cada modal maneja su propio estado.
@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  vm$!: Observable<DashboardViewModel>;

  selectedCard: DashboardCard | null = null;
  selectedBars: BarsDimension | null = null;
  selectedChart: ChartKind | null = null;

  constructor(
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private viewBuilder: DashboardViewBuilder,
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([
      this.executivesService.executives$,
      this.configService.plans$,
      this.executivesService.generalGrowth$,
      this.configService.goal$,
    ]).pipe(
      map(([executives, plans, generalGrowth, goal]) =>
        this.viewBuilder.buildViewModel(executives, plans, generalGrowth, goal),
      ),
    );
    this.executivesService.refresh();
    this.configService.refresh();
  }
}
