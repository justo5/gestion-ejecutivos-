import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { ExecutiveCard } from './components/executive-card/executive-card';
import { ExecutivesList } from './components/executives-list/executives-list';
import { ExecutiveFormModal } from './components/executive-form-modal/executive-form-modal';
import { ClientModal } from './components/client-modal/client-modal';
import { DailyCollections } from './components/daily-collections/daily-collections';
import { HeaderMenu } from './components/header-menu/header-menu';
import { EjecutivosPage } from './components/ejecutivos-page/ejecutivos-page';
import { Cobros } from './components/cobros/cobros';
import { Clientes } from './components/clientes/clientes';
import { Bajas } from './components/bajas/bajas';
import { DashboardPage } from './components/dashboard/dashboard';
import { DashboardKpiGrid } from './components/dashboard/kpi-grid/kpi-grid';
import { DashboardTrendGrid } from './components/dashboard/trend-grid/trend-grid';
import { DashboardTrendPanel } from './components/dashboard/trend-panel/trend-panel';
import { DashboardExecutiveGrowthPanel } from './components/dashboard/executive-growth-panel/executive-growth-panel';
import { DashboardDistributionGrid } from './components/dashboard/distribution-grid/distribution-grid';
import { DashboardBarsPanel } from './components/dashboard/bars-panel/bars-panel';
import { DashboardDonutPanel } from './components/dashboard/donut-panel/donut-panel';
import { DashboardDetailModal } from './components/dashboard/detail-modal/detail-modal';
import { DashboardCardModal } from './components/dashboard/card-modal/card-modal';
import { DashboardBarsModal } from './components/dashboard/bars-modal/bars-modal';
import { DashboardChartModal } from './components/dashboard/chart-modal/chart-modal';
import { DashboardClientRows } from './components/dashboard/client-rows/client-rows';
import { DashboardMonthAccordion } from './components/dashboard/month-accordion/month-accordion';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authInterceptor } from './interceptors/auth-interceptor';
import { StatusDot } from './components/status-dot/status-dot';
import { NotifBadge } from './components/notif-badge/notif-badge';
import { AreaChart } from './components/charts/area-chart/area-chart';
import { MultiLineChart } from './components/charts/multi-line-chart/multi-line-chart';
import { DonutChart } from './components/charts/donut-chart/donut-chart';
import { ClientCard } from './components/client-card/client-card';
import { ClientDisplayNamePipe } from './pipes/client-display-name-pipe';

@NgModule({
  declarations: [
    App,
    ExecutiveCard,
    ExecutivesList,
    ExecutiveFormModal,
    ClientModal,
    DailyCollections,
    HeaderMenu,
    EjecutivosPage,
    Cobros,
    Clientes,
    Bajas,
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
    ConfigPage,
    Perfil,
    Login,
    StatusDot,
    NotifBadge,
    AreaChart,
    MultiLineChart,
    DonutChart,
    ClientCard,
    ClientDisplayNamePipe,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
