import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { ExecutiveCard } from './components/executive-card/executive-card';
import { ExecutivesList } from './components/executives-list/executives-list';
import { ClientModal } from './components/client-modal/client-modal';
import { DailyCollections } from './components/daily-collections/daily-collections';
import { HeaderMenu } from './components/header-menu/header-menu';
import { EjecutivosPage } from './components/ejecutivos-page/ejecutivos-page';
import { Cobros } from './components/cobros/cobros';
import { Clientes } from './components/clientes/clientes';
import { DashboardPage } from './components/dashboard/dashboard';
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

@NgModule({
  declarations: [
    App,
    ExecutiveCard,
    ExecutivesList,
    ClientModal,
    DailyCollections,
    HeaderMenu,
    EjecutivosPage,
    Cobros,
    Clientes,
    DashboardPage,
    ConfigPage,
    Perfil,
    Login,
    StatusDot,
    NotifBadge,
    AreaChart,
    MultiLineChart,
    DonutChart,
    ClientCard,
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
