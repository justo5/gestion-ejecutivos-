import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, Executive, ExecutivesService } from '../../services/executives';
import { ConfigService, PlanConfig } from '../../services/config';
import { ClientViewBuilder } from '../../services/client-view-builder';
import { ClientCardView } from '../../models/client-view.model';

// Paleta categórica validada (8 tonos, orden fijo, contraste y separación CVD
// chequeados contra la superficie oscura de la app con el validador de la
// skill de dataviz). El grupo 9° en adelante no inventa un tono más: se
// pliega en "Otros".
const SERIES_COLORS = [
  '#3987e5', // azul
  '#d95926', // naranja
  '#199e70', // aqua
  '#c98500', // amarillo
  '#d55181', // magenta
  '#008300', // verde
  '#9085e9', // violeta
  '#e66767', // rojo
];
const OTHER_COLOR = '#6b6b70';
const MAX_SERIES = 8;

interface Row {
  client: Client;
  view: ClientCardView;
}

interface BarItem {
  label: string;
  value: number;
  secondary: string;
  pct: number;
  color: string;
}

interface DashboardViewModel {
  hasData: boolean;
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  mrr: number;
  pendingTotal: number;
  avgHealth: number;
  monthLabels: string[];
  revenueSeries: number[];
  newClientsSeries: number[];
  statusBars: BarItem[];
  rubroBars: BarItem[];
  planBars: BarItem[];
  executiveBars: BarItem[];
  countryBars: BarItem[];
  sexoBars: BarItem[];
}

function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  vm$!: Observable<DashboardViewModel>;

  constructor(
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private viewBuilder: ClientViewBuilder,
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([this.executivesService.executives$, this.configService.plans$]).pipe(
      map(([executives, plans]) => this.buildViewModel(executives, plans)),
    );
    this.executivesService.refresh();
    this.configService.refresh();
  }

  money(value: number): string {
    return money(value);
  }

  private buildViewModel(executives: Executive[], plans: PlanConfig[]): DashboardViewModel {
    // Ficha "rica" por cliente (estado, salud, serie de pagos, monto del
    // plan): es la misma que arma la vista de Clientes, reusada acá para no
    // duplicar reglas de negocio (vencimientos, salud de pago, resolución de
    // precio del plan).
    const rows: Row[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        // Clientes dados de baja (soft delete) no cuentan para las analíticas.
        if (client.deletedAt) return;
        rows.push({ client, view: this.viewBuilder.build(client, exec.name, exec.squad, plans) });
      });
    });

    if (rows.length === 0) return this.emptyViewModel();

    const activeRows = rows.filter(r => r.client.active);

    const statusCounts = { active: 0, warning: 0, critical: 0 };
    rows.forEach(r => statusCounts[r.view.status]++);
    const statusBars: BarItem[] = [
      this.statusBar('Al día', statusCounts.active, rows.length, 'var(--verde)'),
      this.statusBar('Atención', statusCounts.warning, rows.length, 'var(--naranja)'),
      this.statusBar('Crítico', statusCounts.critical, rows.length, 'var(--rojo)'),
    ];

    // Cartera mensual: solo clientes activos, es la recurrencia esperada.
    const mrr = activeRows.reduce((sum, r) => sum + r.view.monthlyAmount, 0);
    // Pendiente: deuda acumulada real, sea o no el cliente activo hoy.
    const pendingTotal = rows.reduce((sum, r) => sum + r.view.pendingAmount, 0);
    const avgHealth = activeRows.length
      ? Math.round(activeRows.reduce((sum, r) => sum + r.view.health, 0) / activeRows.length)
      : 0;

    const now = new Date();
    const monthLabels: string[] = [];
    const revenueSeries: number[] = [];
    const newClientsSeries: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('es-AR', { month: 'short' }));
      const ym = formatYearMonth(d);
      const idx = 11 - i; // mismo orden que view.paymentSeries (más viejo → más nuevo)
      revenueSeries.push(
        rows.reduce((sum, r) => sum + (r.view.paymentSeries[idx] ? r.view.monthlyAmount : 0), 0),
      );
      newClientsSeries.push(rows.filter(r => (r.client.contactDay ?? '').slice(0, 7) === ym).length);
    }

    return {
      hasData: true,
      totalClients: rows.length,
      activeClients: activeRows.length,
      inactiveClients: rows.length - activeRows.length,
      mrr,
      pendingTotal,
      avgHealth,
      monthLabels,
      revenueSeries,
      newClientsSeries,
      statusBars,
      rubroBars: this.buildBars(rows, r => r.client.rubro, () => 1, count => `${count} cliente${count === 1 ? '' : 's'}`),
      countryBars: this.buildBars(rows, r => r.client.country, () => 1, count => `${count} cliente${count === 1 ? '' : 's'}`),
      sexoBars: this.buildBars(rows, r => r.client.sexo, () => 1, count => `${count} cliente${count === 1 ? '' : 's'}`),
      planBars: this.buildBars(
        rows,
        r => r.client.plan,
        r => r.view.monthlyAmount,
        (value, count) => `${money(value)} · ${count} cliente${count === 1 ? '' : 's'}`,
      ),
      executiveBars: this.buildBars(
        rows,
        r => r.view.executiveName,
        r => r.view.monthlyAmount,
        (value, count) => `${money(value)} · ${count} cliente${count === 1 ? '' : 's'}`,
      ),
    };
  }

  private statusBar(label: string, count: number, total: number, color: string): BarItem {
    return {
      label,
      value: count,
      secondary: `${count} cliente${count === 1 ? '' : 's'}`,
      pct: total ? Math.round((count / total) * 100) : 0,
      color,
    };
  }

  // Agrupa filas por una clave (rubro, país, plan, ejecutivo…), suma un valor
  // por grupo (conteo o $ del plan) y arma las barras ya ordenadas de mayor a
  // menor. Del 9° grupo en adelante se pliega en "Otros" en vez de generar un
  // color más (regla fija de la paleta categórica).
  private buildBars(
    rows: Row[],
    keyFn: (row: Row) => string | null,
    valueFn: (row: Row) => number,
    formatSecondary: (value: number, count: number) => string,
  ): BarItem[] {
    const values = new Map<string, number>();
    const counts = new Map<string, number>();
    rows.forEach(row => {
      const key = (keyFn(row) ?? '').trim() || 'Sin dato';
      values.set(key, (values.get(key) ?? 0) + valueFn(row));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const entries = [...values.entries()].sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, MAX_SERIES - 1);
    const rest = entries.slice(MAX_SERIES - 1);
    if (rest.length === 1) {
      top.push(rest[0]);
    } else if (rest.length > 1) {
      const restValue = rest.reduce((sum, [, v]) => sum + v, 0);
      const restCount = rest.reduce((sum, [key]) => sum + (counts.get(key) ?? 0), 0);
      counts.set('Otros', restCount);
      top.push(['Otros', restValue]);
    }

    const max = Math.max(...top.map(([, v]) => v), 1);
    return top.map(([label, value], i) => ({
      label,
      value,
      secondary: formatSecondary(value, counts.get(label) ?? 0),
      pct: Math.round((value / max) * 100),
      color: label === 'Otros' ? OTHER_COLOR : SERIES_COLORS[i % SERIES_COLORS.length],
    }));
  }

  private emptyViewModel(): DashboardViewModel {
    return {
      hasData: false,
      totalClients: 0,
      activeClients: 0,
      inactiveClients: 0,
      mrr: 0,
      pendingTotal: 0,
      avgHealth: 0,
      monthLabels: [],
      revenueSeries: [],
      newClientsSeries: [],
      statusBars: [],
      rubroBars: [],
      planBars: [],
      executiveBars: [],
      countryBars: [],
      sexoBars: [],
    };
  }
}
