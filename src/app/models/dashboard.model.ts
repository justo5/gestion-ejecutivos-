import { ChartGoal, LineSeries } from '../components/charts/multi-line-chart/multi-line-chart';
import { ClientStatus } from './client-view.model';

export interface BarItem {
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
export type DashboardCard = 'total' | 'mrr' | 'pending' | 'collected' | 'lifetime' | 'churnPct';

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
  | 'lifetimeExecutive'
  | 'churnExecutive';

// Un mes de uno de los gráficos de tendencia, con el detalle de clientes que
// lo explican (quién pagó ese mes / quién arrancó ese mes).
export interface MonthDetail {
  valueLabel: string;
  clients: ClientDetailRow[];
}

// Gráficos de tendencia que se pueden abrir.
export type ChartKind = 'revenue' | 'newClients' | 'churn';

export interface DashboardViewModel {
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
  // Porcentaje de bajas grupal (KPI): clientes dados de baja / total de
  // clientes que pasaron alguna vez (activos + dados de baja), en el scope
  // visible (toda la empresa para admin, cartera propia para un ejecutivo no
  // admin, igual que el resto de las analíticas del dashboard salvo
  // generalGrowth).
  churnPct: number;
  churnedClients: number;
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
  // Porcentaje de bajas individual: mismo cálculo que churnPct pero por
  // ejecutivo (dados de baja / (activos + dados de baja) de ese ejecutivo).
  // No se pliega en "Otros", mismo criterio que executiveBars.
  churnExecutiveBars: BarItem[];
  // Tiempo de vida promedio general (todos los clientes con contactDay
  // cargado, activos y dados de baja), en días, para la tarjeta KPI.
  lifetimeAvgDays: number;
  // Crecimiento acumulado de clientes por ejecutivo, últimos 12 meses (una
  // línea por ejecutivo, misma escala de meses que revenueSeries). Para un
  // ejecutivo no admin, esto solo trae su propia línea (ver
  // ExecutivesService#findAllForUser en el backend).
  executiveGrowth: LineSeries[];
  // Crecimiento acumulado de TODA la empresa, últimos 12 meses, sin filtrar
  // por rol (ver ExecutivesService#generalGrowth$): el único gráfico que le
  // muestra a un ejecutivo no admin cómo va el equipo en conjunto.
  generalGrowth: number[];
  // Objetivo marcado en cada gráfico de crecimiento, ya formateado (ver
  // ChartGoal) y calculado una sola vez acá. Importante: nunca se computan
  // en el template con una llamada a método/getter, porque eso devuelve un
  // objeto nuevo en cada ciclo de detección de cambios y con `goal` como
  // @Input de un componente hijo eso dispara NG0103 (loop infinito). Acá se
  // recalculan solo cuando cambian executives/plans/generalGrowth/goal$.
  executiveGoal: ChartGoal | null;
  // El mismo objetivo (que se carga como "clientes por ejecutivo") pero
  // escalado por la cantidad de ejecutivos, para que sea comparable contra
  // el total sumado del gráfico general.
  generalGoal: ChartGoal | null;
  // Detalle por cliente para cada tarjeta KPI (ver ClientDetailRow).
  activeClientRows: ClientDetailRow[];
  inactiveClientRows: ClientDetailRow[];
  payingClientRows: ClientDetailRow[];
  pendingClientRows: ClientDetailRow[];
  paidThisMonthRows: ClientDetailRow[];
  unpaidThisMonthRows: ClientDetailRow[];
  lifetimeClientRows: ClientDetailRow[];
  // Detalle de la tarjeta KPI de porcentaje de bajas: clientes dados de baja,
  // del más reciente al más antiguo.
  churnClientRows: ClientDetailRow[];
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
  // Detalle del panel de porcentaje de bajas por ejecutivo: por cada
  // ejecutivo, los clientes que dio de baja (no todos sus clientes, a
  // diferencia del resto de los *Groups).
  churnExecutiveGroups: GroupDetail[];
  // Detalle mes a mes de los gráficos de tendencia.
  revenueMonthDetails: MonthDetail[];
  newClientsMonthDetails: MonthDetail[];
  churnMonthDetails: MonthDetail[];
  // Porcentaje de bajas de cada mes (bajas del mes / clientes que había al
  // arrancar ese mes), para el desglose mensual de la tarjeta KPI.
  churnPctMonthDetails: MonthDetail[];
}
