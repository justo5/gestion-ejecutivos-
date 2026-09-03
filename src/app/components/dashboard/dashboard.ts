import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, Executive, ExecutivesService } from '../../services/executives';
import { ChartGoal, LineSeries } from '../charts/multi-line-chart/multi-line-chart';
import { ConfigService, DashboardGoal, PlanConfig, formatGoalMonth, formatYearMonth } from '../../services/config';
import { ClientViewBuilder } from '../../services/client-view-builder';
import { ClientCardView, ClientStatus } from '../../models/client-view.model';

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

// Cliente con tiempo de vida ya calculado (contactDay -> hoy, o -> deletedAt
// si se dio de baja). A diferencia de `rows`/`churnRows` por separado, acá se
// mezclan activos y dados de baja a propósito: el tiempo de vida es una
// métrica que tiene sentido para ambos.
interface LifeRow {
  row: Row;
  months: number;
  churned: boolean;
}

interface BarItem {
  label: string;
  value: number;
  secondary: string;
  pct: number;
  color: string;
}

// Fila de detalle para las listas de cliente que se abren al tocar una
// tarjeta KPI del dashboard. `secondary` ya viene formateado (mismo criterio
// que BarItem) porque el texto cambia según la tarjeta que la muestra
// (monto del plan, deuda pendiente, plan, etc.).
export interface ClientDetailRow {
  id: string;
  name: string;
  executiveName: string;
  status: ClientStatus;
  statusLabel: string;
  secondary: string;
}

// Tarjetas KPI que se pueden abrir para ver el detalle.
export type DashboardCard = 'total' | 'mrr' | 'pending' | 'collected';

// Grupo de un gráfico de barras (rubro, plan, ejecutivo…) con el detalle de
// clientes que lo componen, para el acordeón que se abre al tocar el panel.
export interface GroupDetail {
  label: string;
  secondary: string;
  pct: number;
  color: string;
  clients: ClientDetailRow[];
}

// Dimensiones de los paneles de barras que se pueden abrir.
export type BarsDimension =
  | 'status'
  | 'rubro'
  | 'plan'
  | 'executive'
  | 'country'
  | 'sexo'
  | 'lifetimeRubro'
  | 'lifetimeExecutive';

// Un mes de uno de los gráficos de tendencia, con el detalle de clientes que
// lo explican (quién pagó ese mes / quién arrancó ese mes).
export interface MonthDetail {
  valueLabel: string;
  clients: ClientDetailRow[];
}

// Gráficos de tendencia que se pueden abrir.
export type ChartKind = 'revenue' | 'newClients' | 'churn';

interface DashboardViewModel {
  hasData: boolean;
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  mrr: number;
  pendingTotal: number;
  collectedPct: number;
  monthLabels: string[];
  revenueSeries: number[];
  newClientsSeries: number[];
  // Bajas de clientes (soft delete) por mes, mismo eje de meses que arriba.
  churnSeries: number[];
  statusBars: BarItem[];
  rubroBars: BarItem[];
  planBars: BarItem[];
  executiveBars: BarItem[];
  countryBars: BarItem[];
  sexoBars: BarItem[];
  // Tiempo de vida promedio (contactDay -> hoy, o -> deletedAt si se dio de
  // baja) agrupado por rubro y por ejecutivo. Incluye clientes activos y
  // dados de baja, a diferencia del resto de las analíticas del dashboard.
  lifetimeRubroBars: BarItem[];
  lifetimeExecutiveBars: BarItem[];
  // Crecimiento acumulado de clientes por ejecutivo, últimos 12 meses (una
  // línea por ejecutivo, misma escala de meses que revenueSeries). Para un
  // ejecutivo no admin, esto solo trae su propia línea (ver
  // ExecutivesService#findAllForUser en el backend).
  executiveGrowth: LineSeries[];
  // Crecimiento acumulado de TODA la empresa, últimos 12 meses, sin filtrar
  // por rol (ver ExecutivesService#generalGrowth$): el único gráfico que le
  // muestra a un ejecutivo no admin cómo va el equipo en conjunto.
  generalGrowth: number[];
  // Detalle por cliente para cada tarjeta KPI (ver ClientDetailRow).
  activeClientRows: ClientDetailRow[];
  inactiveClientRows: ClientDetailRow[];
  payingClientRows: ClientDetailRow[];
  pendingClientRows: ClientDetailRow[];
  paidThisMonthRows: ClientDetailRow[];
  unpaidThisMonthRows: ClientDetailRow[];
  // Detalle sin plegar (todos los grupos, no solo el top 8) de cada gráfico
  // de barras, con los clientes de cada grupo.
  statusGroups: GroupDetail[];
  rubroGroups: GroupDetail[];
  planGroups: GroupDetail[];
  executiveGroups: GroupDetail[];
  countryGroups: GroupDetail[];
  sexoGroups: GroupDetail[];
  lifetimeRubroGroups: GroupDetail[];
  lifetimeExecutiveGroups: GroupDetail[];
  // Detalle mes a mes de los gráficos de tendencia.
  revenueMonthDetails: MonthDetail[];
  newClientsMonthDetails: MonthDetail[];
  churnMonthDetails: MonthDetail[];
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}

// Meses completos entre dos fechas (mismo criterio que ClientViewBuilder).
function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

// 14 -> "1 año 2 meses", 6 -> "6 meses". Se usa para el tiempo de vida, donde
// un número de meses de dos dígitos se lee peor que la forma en años.
function formatLifetime(months: number): string {
  if (months < 12) return `${months} mes${months === 1 ? '' : 'es'}`;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const yearsLabel = `${years} año${years === 1 ? '' : 's'}`;
  return restMonths ? `${yearsLabel} ${restMonths} mes${restMonths === 1 ? '' : 'es'}` : yearsLabel;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit {
  vm$!: Observable<DashboardViewModel>;

  // Tarjeta KPI actualmente abierta en el modal de detalle (null = cerrado).
  selectedCard: DashboardCard | null = null;

  // Panel de barras actualmente abierto, y el grupo expandido dentro de él.
  selectedBars: BarsDimension | null = null;
  expandedGroupLabel: string | null = null;

  // Gráfico de tendencia actualmente abierto, y el mes expandido dentro de él.
  selectedChart: ChartKind | null = null;
  expandedMonthIndex: number | null = null;

  // Objetivo general del equipo, marcado en los gráficos de crecimiento.
  // Se define/edita desde el perfil del admin (ver Perfil), acá solo se lee
  // para dibujarlo.
  currentGoal: DashboardGoal | null = null;

  private static readonly CARD_TITLES: Record<DashboardCard, string> = {
    total: 'Clientes totales',
    mrr: 'Cartera mensual',
    pending: 'Pendiente de cobro',
    collected: 'Porcentaje cobrado',
  };

  private static readonly BARS_TITLES: Record<BarsDimension, string> = {
    status: 'Semáforo de campañas',
    rubro: 'Por rubro',
    plan: 'Por plan',
    executive: 'Por ejecutivo',
    country: 'Por país',
    sexo: 'Por sexo',
    lifetimeRubro: 'Tiempo de vida promedio · por rubro',
    lifetimeExecutive: 'Tiempo de vida promedio · por ejecutivo',
  };

  private static readonly CHART_TITLES: Record<ChartKind, string> = {
    revenue: 'Cartera cobrada · últimos 12 meses',
    newClients: 'Clientes nuevos · últimos 12 meses',
    churn: 'Bajas de clientes · últimos 12 meses',
  };

  constructor(
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private viewBuilder: ClientViewBuilder,
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([
      this.executivesService.executives$,
      this.configService.plans$,
      this.executivesService.generalGrowth$,
    ]).pipe(
      map(([executives, plans, generalGrowth]) => this.buildViewModel(executives, plans, generalGrowth)),
    );
    this.configService.goal$.subscribe(goal => (this.currentGoal = goal));
    this.executivesService.refresh();
    this.configService.refresh();
  }

  money(value: number): string {
    return money(value);
  }

  // Objetivo ya formateado para pasarle a los gráficos de crecimiento.
  get chartGoal(): ChartGoal | null {
    const goal = this.currentGoal;
    if (!goal) return null;
    return { value: goal.targetClients, monthLabel: formatGoalMonth(goal.targetMonth) };
  }

  openCard(card: DashboardCard): void {
    this.selectedCard = card;
  }

  closeCard(): void {
    this.selectedCard = null;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeCard();
  }

  cardTitle(card: DashboardCard): string {
    return DashboardPage.CARD_TITLES[card];
  }

  openBars(dim: BarsDimension): void {
    this.selectedBars = dim;
    this.expandedGroupLabel = null;
  }

  closeBars(): void {
    this.selectedBars = null;
    this.expandedGroupLabel = null;
  }

  onBarsBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeBars();
  }

  toggleGroup(label: string): void {
    this.expandedGroupLabel = this.expandedGroupLabel === label ? null : label;
  }

  barsTitle(dim: BarsDimension): string {
    return DashboardPage.BARS_TITLES[dim];
  }

  groupsFor(vm: DashboardViewModel, dim: BarsDimension | null): GroupDetail[] {
    switch (dim) {
      case 'status': return vm.statusGroups;
      case 'rubro': return vm.rubroGroups;
      case 'plan': return vm.planGroups;
      case 'executive': return vm.executiveGroups;
      case 'country': return vm.countryGroups;
      case 'sexo': return vm.sexoGroups;
      case 'lifetimeRubro': return vm.lifetimeRubroGroups;
      case 'lifetimeExecutive': return vm.lifetimeExecutiveGroups;
      default: return [];
    }
  }

  openChart(chart: ChartKind): void {
    this.selectedChart = chart;
    this.expandedMonthIndex = null;
  }

  closeChart(): void {
    this.selectedChart = null;
    this.expandedMonthIndex = null;
  }

  onChartBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeChart();
  }

  toggleMonth(index: number): void {
    this.expandedMonthIndex = this.expandedMonthIndex === index ? null : index;
  }

  chartTitle(chart: ChartKind): string {
    return DashboardPage.CHART_TITLES[chart];
  }

  chartSeries(vm: DashboardViewModel, chart: ChartKind | null): number[] {
    switch (chart) {
      case 'revenue': return vm.revenueSeries;
      case 'newClients': return vm.newClientsSeries;
      case 'churn': return vm.churnSeries;
      default: return [];
    }
  }

  chartColor(chart: ChartKind | null): string {
    switch (chart) {
      case 'revenue': return '#afd42a';
      case 'newClients': return '#1e9adb';
      case 'churn': return '#e66767';
      default: return '#1e9adb';
    }
  }

  // Índices de vm.monthLabels/monthDetailsFor en orden inverso (mes actual
  // primero), para el acordeón del modal de detalle. Los arrays de datos en
  // sí quedan intactos (cronológicos) porque el gráfico de arriba los pinta
  // de izquierda a derecha del más viejo al más nuevo.
  reversedMonthIndexes(vm: DashboardViewModel): number[] {
    return vm.monthLabels.map((_, i) => i).reverse();
  }

  monthDetailsFor(vm: DashboardViewModel, chart: ChartKind | null): MonthDetail[] {
    switch (chart) {
      case 'revenue': return vm.revenueMonthDetails;
      case 'newClients': return vm.newClientsMonthDetails;
      case 'churn': return vm.churnMonthDetails;
      default: return [];
    }
  }

  private buildViewModel(executives: Executive[], plans: PlanConfig[], generalGrowth: number[]): DashboardViewModel {
    // Ficha "rica" por cliente (estado, salud, serie de pagos, monto del
    // plan): es la misma que arma la vista de Clientes, reusada acá para no
    // duplicar reglas de negocio (vencimientos, salud de pago, resolución de
    // precio del plan).
    const rows: Row[] = [];
    // Clientes dados de baja (soft delete): no cuentan para las analíticas de
    // arriba, pero su fecha de baja (deletedAt) es justamente lo que alimenta
    // el gráfico de bajas más abajo.
    const churnRows: Row[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        if (client.deletedAt) {
          churnRows.push({ client, view: this.viewBuilder.build(client, exec.name, exec.squad, plans) });
          return;
        }
        rows.push({ client, view: this.viewBuilder.build(client, exec.name, exec.squad, plans) });
      });
    });

    if (rows.length === 0) return this.emptyViewModel(generalGrowth);

    const activeRows = rows.filter(r => r.client.active);

    const statusCounts = { active: 0, warning: 0, critical: 0 };
    rows.forEach(r => statusCounts[r.view.status]++);
    const statusBars: BarItem[] = [
      this.statusBar('Verde', statusCounts.active, rows.length, 'var(--verde)'),
      this.statusBar('Amarillo', statusCounts.warning, rows.length, 'var(--naranja)'),
      this.statusBar('Rojo', statusCounts.critical, rows.length, 'var(--rojo)'),
    ];

    // Cartera mensual: solo clientes activos, es la recurrencia esperada.
    const mrr = activeRows.reduce((sum, r) => sum + r.view.monthlyAmount, 0);
    // Pendiente: deuda acumulada real, sea o no el cliente activo hoy.
    const pendingTotal = rows.reduce((sum, r) => sum + r.view.pendingAmount, 0);
    // % de clientes activos que ya pagaron el mes en curso (último valor de
    // paymentSeries = mes actual, ver ClientViewBuilder). No es un promedio
    // de salud individual: es "de los que tienen que pagar este mes, cuántos
    // ya pagaron".
    const paidThisMonth = activeRows.filter(r => r.view.paymentSeries[r.view.paymentSeries.length - 1] === 1).length;
    const collectedPct = activeRows.length ? Math.round((paidThisMonth / activeRows.length) * 100) : 0;

    const now = new Date();

    // Tiempo de vida: contactDay -> hoy para los activos, contactDay ->
    // deletedAt para los dados de baja. Se descartan los clientes sin
    // contactDay cargado, porque no hay fecha de alta desde la cual contar.
    const lifeRows: LifeRow[] = [...rows, ...churnRows]
      .filter(r => !!r.client.contactDay)
      .map(r => {
        const start = new Date(r.client.contactDay + 'T00:00:00');
        const end = r.client.deletedAt ? new Date(r.client.deletedAt) : now;
        return { row: r, months: monthsBetween(start, end), churned: !!r.client.deletedAt };
      });

    const monthLabels: string[] = [];
    const monthYms: string[] = [];
    const revenueSeries: number[] = [];
    const newClientsSeries: number[] = [];
    const churnSeries: number[] = [];
    const revenueMonthDetails: MonthDetail[] = [];
    const newClientsMonthDetails: MonthDetail[] = [];
    const churnMonthDetails: MonthDetail[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(d.toLocaleDateString('es-AR', { month: 'short' }));
      const ym = formatYearMonth(d);
      monthYms.push(ym);
      const idx = 11 - i; // mismo orden que view.paymentSeries (más viejo → más nuevo)

      const paidRows = rows.filter(r => r.view.paymentSeries[idx] === 1);
      const monthRevenue = paidRows.reduce((sum, r) => sum + r.view.monthlyAmount, 0);
      revenueSeries.push(monthRevenue);
      revenueMonthDetails.push({
        valueLabel: money(monthRevenue),
        clients: paidRows
          .map(r => this.toRow(r, `${money(r.view.monthlyAmount)}/mes`))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });

      const newRows = rows.filter(r => (r.client.contactDay ?? '').slice(0, 7) === ym);
      newClientsSeries.push(newRows.length);
      newClientsMonthDetails.push({
        valueLabel: `${newRows.length} cliente${newRows.length === 1 ? '' : 's'}`,
        clients: newRows
          .map(r => this.toRow(r, r.view.executiveName))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });

      const churnedRows = churnRows.filter(r => formatYearMonth(new Date(r.client.deletedAt!)) === ym);
      churnSeries.push(churnedRows.length);
      churnMonthDetails.push({
        valueLabel: `${churnedRows.length} cliente${churnedRows.length === 1 ? '' : 's'}`,
        clients: churnedRows
          .map(r => this.toRow(r, this.formatChurnDate(r.client.deletedAt!)))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    return {
      hasData: true,
      totalClients: rows.length,
      activeClients: activeRows.length,
      inactiveClients: rows.length - activeRows.length,
      mrr,
      pendingTotal,
      collectedPct,
      monthLabels,
      revenueSeries,
      newClientsSeries,
      churnSeries,
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
      // Por ejecutivo no se pliega en "Otros": queremos ver a todos los
      // ejecutivos listados, no solo el top 8.
      executiveBars: this.buildBars(
        rows,
        r => r.view.executiveName,
        r => r.view.monthlyAmount,
        (value, count) => `${money(value)} · ${count} cliente${count === 1 ? '' : 's'}`,
        false,
      ),
      // Tiempo de vida promedio: mezcla activos y dados de baja (ver
      // LifeRow). Por ejecutivo tampoco se pliega, mismo criterio que
      // executiveBars.
      lifetimeRubroBars: this.buildAvgBars(lifeRows, lr => lr.row.client.rubro),
      lifetimeExecutiveBars: this.buildAvgBars(lifeRows, lr => lr.row.view.executiveName, false),
      executiveGrowth: this.buildExecutiveGrowth(rows, monthYms),
      generalGrowth,

      // Mismos grupos que los *Bars de arriba, pero sin plegar en "Otros" y
      // con el detalle de clientes de cada grupo, para el modal que se abre
      // al tocar el panel.
      statusGroups: this.buildGroupDetail(rows, r => r.view.statusLabel, () => 1,
        count => `${count} cliente${count === 1 ? '' : 's'}`, r => r.view.executiveName),
      rubroGroups: this.buildGroupDetail(rows, r => r.client.rubro, () => 1,
        count => `${count} cliente${count === 1 ? '' : 's'}`, r => r.client.plan || 'Sin plan'),
      countryGroups: this.buildGroupDetail(rows, r => r.client.country, () => 1,
        count => `${count} cliente${count === 1 ? '' : 's'}`, r => r.client.plan || 'Sin plan'),
      sexoGroups: this.buildGroupDetail(rows, r => r.client.sexo, () => 1,
        count => `${count} cliente${count === 1 ? '' : 's'}`, r => r.client.plan || 'Sin plan'),
      planGroups: this.buildGroupDetail(rows, r => r.client.plan, r => r.view.monthlyAmount,
        (value, count) => `${money(value)} · ${count} cliente${count === 1 ? '' : 's'}`,
        r => `${money(r.view.monthlyAmount)}/mes`),
      executiveGroups: this.buildGroupDetail(rows, r => r.view.executiveName, r => r.view.monthlyAmount,
        (value, count) => `${money(value)} · ${count} cliente${count === 1 ? '' : 's'}`,
        r => `${money(r.view.monthlyAmount)}/mes`),
      lifetimeRubroGroups: this.buildAvgGroupDetail(lifeRows, lr => lr.row.client.rubro),
      lifetimeExecutiveGroups: this.buildAvgGroupDetail(lifeRows, lr => lr.row.view.executiveName),

      revenueMonthDetails,
      newClientsMonthDetails,
      churnMonthDetails,

      // Detalle por cliente de cada tarjeta KPI, para el modal que se abre
      // al tocarlas.
      activeClientRows: activeRows
        .map(r => this.toRow(r, r.client.plan || 'Sin plan'))
        .sort((a, b) => a.name.localeCompare(b.name)),
      inactiveClientRows: rows
        .filter(r => !r.client.active)
        .map(r => this.toRow(r, r.client.plan || 'Sin plan'))
        .sort((a, b) => a.name.localeCompare(b.name)),
      payingClientRows: activeRows
        .filter(r => r.view.monthlyAmount > 0)
        .sort((a, b) => b.view.monthlyAmount - a.view.monthlyAmount)
        .map(r => this.toRow(r, `${money(r.view.monthlyAmount)}/mes`)),
      pendingClientRows: rows
        .filter(r => r.view.pendingAmount > 0)
        .sort((a, b) => b.view.pendingAmount - a.view.pendingAmount)
        .map(r =>
          this.toRow(
            r,
            `${money(r.view.pendingAmount)} · ${r.view.monthsPending} mes${r.view.monthsPending === 1 ? '' : 'es'}`,
          ),
        ),
      paidThisMonthRows: activeRows
        .filter(r => r.view.paymentSeries[r.view.paymentSeries.length - 1] === 1)
        .map(r => this.toRow(r, r.view.executiveName))
        .sort((a, b) => a.name.localeCompare(b.name)),
      unpaidThisMonthRows: activeRows
        .filter(r => r.view.paymentSeries[r.view.paymentSeries.length - 1] !== 1)
        .map(r => this.toRow(r, r.view.executiveName))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  // Arma una fila de detalle a partir de una Row, con el texto secundario ya
  // formateado por el caller (monto del plan, deuda pendiente, plan, etc.).
  private toRow(row: Row, secondary: string): ClientDetailRow {
    return {
      id: row.client.id,
      name: row.client.name,
      executiveName: row.view.executiveName,
      status: row.view.status,
      statusLabel: row.view.statusLabel,
      secondary,
    };
  }

  // Fecha de baja formateada para el detalle del gráfico de bajas, ej. "12 mar 2026".
  private formatChurnDate(deletedAt: string): string {
    return new Date(deletedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
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
    foldExtra = true,
  ): BarItem[] {
    const values = new Map<string, number>();
    const counts = new Map<string, number>();
    rows.forEach(row => {
      const key = (keyFn(row) ?? '').trim() || 'Sin dato';
      values.set(key, (values.get(key) ?? 0) + valueFn(row));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const entries = [...values.entries()].sort((a, b) => b[1] - a[1]);
    let top = entries;
    if (foldExtra) {
      top = entries.slice(0, MAX_SERIES - 1);
      const rest = entries.slice(MAX_SERIES - 1);
      if (rest.length === 1) {
        top.push(rest[0]);
      } else if (rest.length > 1) {
        const restValue = rest.reduce((sum, [, v]) => sum + v, 0);
        const restCount = rest.reduce((sum, [key]) => sum + (counts.get(key) ?? 0), 0);
        counts.set('Otros', restCount);
        top.push(['Otros', restValue]);
      }
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

  // Igual que buildBars, pero el valor de cada grupo es un promedio (meses de
  // vida) en vez de una suma: sumar "14 meses" + "8 meses" no dice nada. El
  // grupo plegado en "Otros" también es un promedio, ponderado por cantidad
  // de clientes del resto.
  private buildAvgBars(
    lifeRows: LifeRow[],
    keyFn: (row: LifeRow) => string | null,
    foldExtra = true,
  ): BarItem[] {
    const sums = new Map<string, number>();
    const counts = new Map<string, number>();
    lifeRows.forEach(lr => {
      const key = (keyFn(lr) ?? '').trim() || 'Sin dato';
      sums.set(key, (sums.get(key) ?? 0) + lr.months);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const entries = [...sums.entries()].map(([key, sum]) => ({ key, sum, count: counts.get(key) ?? 1 }));
    entries.sort((a, b) => b.sum / b.count - a.sum / a.count);

    let top = entries;
    if (foldExtra) {
      top = entries.slice(0, MAX_SERIES - 1);
      const rest = entries.slice(MAX_SERIES - 1);
      if (rest.length === 1) {
        top.push(rest[0]);
      } else if (rest.length > 1) {
        const restSum = rest.reduce((s, e) => s + e.sum, 0);
        const restCount = rest.reduce((s, e) => s + e.count, 0);
        top.push({ key: 'Otros', sum: restSum, count: restCount });
      }
    }

    const avgs = top.map(e => Math.round(e.sum / e.count));
    const max = Math.max(...avgs, 1);
    return top.map((e, i) => {
      const avg = Math.round(e.sum / e.count);
      return {
        label: e.key,
        value: avg,
        secondary: `${formatLifetime(avg)} prom. · ${e.count} cliente${e.count === 1 ? '' : 's'}`,
        pct: Math.round((avg / max) * 100),
        color: e.key === 'Otros' ? OTHER_COLOR : SERIES_COLORS[i % SERIES_COLORS.length],
      };
    });
  }

  // Crecimiento acumulado de clientes por ejecutivo: para cada mes de
  // monthYms (más viejo → más nuevo), cuántos clientes tenía ya sumados el
  // ejecutivo (contactDay antes de la ventana cuenta como "ya estaba", igual
  // que un contactDay vacío/desconocido). A diferencia de buildBars no se
  // pliega ningún ejecutivo en "Otros": queremos ver a todos a detalle, y el
  // hover del gráfico ya despeja cuál línea es cuál aunque los colores se
  // repitan del 9° ejecutivo en adelante.
  private buildExecutiveGrowth(rows: Row[], monthYms: string[]): LineSeries[] {
    if (monthYms.length === 0) return [];
    const windowStartYm = monthYms[0];

    const byExec = new Map<string, Row[]>();
    rows.forEach(row => {
      const key = (row.view.executiveName ?? '').trim() || 'Sin dato';
      if (!byExec.has(key)) byExec.set(key, []);
      byExec.get(key)!.push(row);
    });

    const ranked = [...byExec.entries()].sort((a, b) => b[1].length - a[1].length);

    const cumulativeSeries = (execRows: Row[]): number[] => {
      const baseline = execRows.filter(r => {
        const ym = (r.client.contactDay ?? '').slice(0, 7);
        return !ym || ym < windowStartYm;
      }).length;
      let running = baseline;
      return monthYms.map(ym => {
        running += execRows.filter(r => (r.client.contactDay ?? '').slice(0, 7) === ym).length;
        return running;
      });
    };

    return ranked.map(([label, execRows], i) => ({
      label,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      data: cumulativeSeries(execRows),
    }));
  }

  // Misma agrupación que buildBars, pero sin plegar el 9° grupo en adelante
  // en "Otros" y devolviendo, por grupo, la lista de clientes que lo
  // componen (para el acordeón del modal de detalle de cada panel).
  private buildGroupDetail(
    rows: Row[],
    keyFn: (row: Row) => string | null,
    valueFn: (row: Row) => number,
    formatSecondary: (value: number, count: number) => string,
    rowSecondary: (row: Row) => string,
  ): GroupDetail[] {
    const groups = new Map<string, Row[]>();
    rows.forEach(row => {
      const key = (keyFn(row) ?? '').trim() || 'Sin dato';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });

    const entries = [...groups.entries()]
      .map(([label, groupRows]) => ({ label, groupRows, value: groupRows.reduce((sum, r) => sum + valueFn(r), 0) }))
      .sort((a, b) => b.value - a.value);

    const max = Math.max(...entries.map(e => e.value), 1);
    return entries.map((e, i) => ({
      label: e.label,
      secondary: formatSecondary(e.value, e.groupRows.length),
      pct: Math.round((e.value / max) * 100),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      clients: e.groupRows
        .map(r => this.toRow(r, rowSecondary(r)))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }

  // Igual que buildGroupDetail, pero para el tiempo de vida: el detalle de
  // cada cliente muestra sus meses de vida (y si ya se dio de baja) en vez de
  // un monto o una cantidad.
  private buildAvgGroupDetail(lifeRows: LifeRow[], keyFn: (row: LifeRow) => string | null): GroupDetail[] {
    const groups = new Map<string, LifeRow[]>();
    lifeRows.forEach(lr => {
      const key = (keyFn(lr) ?? '').trim() || 'Sin dato';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(lr);
    });

    const entries = [...groups.entries()]
      .map(([label, groupLifeRows]) => ({
        label,
        groupLifeRows,
        avg: Math.round(groupLifeRows.reduce((sum, lr) => sum + lr.months, 0) / groupLifeRows.length),
      }))
      .sort((a, b) => b.avg - a.avg);

    const max = Math.max(...entries.map(e => e.avg), 1);
    return entries.map((e, i) => ({
      label: e.label,
      secondary: `${formatLifetime(e.avg)} prom. · ${e.groupLifeRows.length} cliente${e.groupLifeRows.length === 1 ? '' : 's'}`,
      pct: Math.round((e.avg / max) * 100),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      clients: e.groupLifeRows
        .map(lr => this.toRow(lr.row, `${formatLifetime(lr.months)}${lr.churned ? ' · dado de baja' : ''}`))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }

  private emptyViewModel(generalGrowth: number[] = []): DashboardViewModel {
    return {
      hasData: false,
      totalClients: 0,
      activeClients: 0,
      inactiveClients: 0,
      mrr: 0,
      pendingTotal: 0,
      collectedPct: 0,
      monthLabels: [],
      revenueSeries: [],
      newClientsSeries: [],
      churnSeries: [],
      statusBars: [],
      rubroBars: [],
      planBars: [],
      executiveBars: [],
      countryBars: [],
      sexoBars: [],
      lifetimeRubroBars: [],
      lifetimeExecutiveBars: [],
      executiveGrowth: [],
      generalGrowth,
      activeClientRows: [],
      inactiveClientRows: [],
      payingClientRows: [],
      pendingClientRows: [],
      paidThisMonthRows: [],
      unpaidThisMonthRows: [],
      statusGroups: [],
      rubroGroups: [],
      planGroups: [],
      executiveGroups: [],
      countryGroups: [],
      sexoGroups: [],
      lifetimeRubroGroups: [],
      lifetimeExecutiveGroups: [],
      revenueMonthDetails: [],
      newClientsMonthDetails: [],
      churnMonthDetails: [],
    };
  }
}
