import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
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
import { CobrosHoyPage } from './components/cobros-hoy-page/cobros-hoy-page';
import { Cobros } from './components/cobros/cobros';
import { Balances } from './components/balances/balances';
import { Clientes } from './components/clientes/clientes';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authInterceptor } from './interceptors/auth-interceptor';

@NgModule({
  declarations: [
    App,
    ExecutiveCard,
    ExecutivesList,
    ClientModal,
    DailyCollections,
    HeaderMenu,
    EjecutivosPage,
    CobrosHoyPage,
    Cobros,
    Balances,
    Clientes,
    ConfigPage,
    Perfil,
    Login,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
