import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared-module';
import { DashboardPage } from './dashboard';
import { DashboardKpiGrid } from './kpi-grid/kpi-grid';
import { DashboardTrendGrid } from './trend-grid/trend-grid';
import { DashboardTrendPanel } from './trend-panel/trend-panel';
import { DashboardExecutiveGrowthPanel } from './executive-growth-panel/executive-growth-panel';
import { DashboardDistributionGrid } from './distribution-grid/distribution-grid';
import { DashboardBarsPanel } from './bars-panel/bars-panel';
import { DashboardDonutPanel } from './donut-panel/donut-panel';
import { DashboardDetailModal } from './detail-modal/detail-modal';
import { DashboardCardModal } from './card-modal/card-modal';
import { DashboardBarsModal } from './bars-modal/bars-modal';
import { DashboardChartModal } from './chart-modal/chart-modal';
import { DashboardClientRows } from './client-rows/client-rows';
import { DashboardMonthAccordion } from './month-accordion/month-accordion';
import { MultiLineChart } from '../charts/multi-line-chart/multi-line-chart';
import { DonutChart } from '../charts/donut-chart/donut-chart';

// Dashboard, cargado recién al entrar a /dashboard: sus componentes y
// gráficos no entran en el bundle inicial (que tiene un presupuesto de 1 MB).
@NgModule({
  declarations: [
    DashboardPage,
    DashboardKpiGrid,
    DashboardTrendGrid,
    DashboardTrendPanel,
    DashboardExecutiveGrowthPanel,
    DashboardDistributionGrid,
    DashboardBarsPanel,
    DashboardDonutPanel,
    DashboardDetailModal,
    DashboardCardModal,
    DashboardBarsModal,
    DashboardChartModal,
    DashboardClientRows,
    DashboardMonthAccordion,
    MultiLineChart,
    DonutChart,
  ],
  imports: [CommonModule, SharedModule, RouterModule.forChild([{ path: '', component: DashboardPage }])],
})
export class DashboardModule {}
