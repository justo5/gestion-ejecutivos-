import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { SharedModule } from './shared-module';
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
import { Solicitudes } from './components/solicitudes/solicitudes';
import { ConvertLeadModal } from './components/convert-lead-modal/convert-lead-modal';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authInterceptor } from './interceptors/auth-interceptor';
import { NotifBadge } from './components/notif-badge/notif-badge';
import { ClientCard } from './components/client-card/client-card';
import { ClientDisplayNamePipe } from './pipes/client-display-name-pipe';
import { PlanTasksEditor } from './components/plan-tasks-editor/plan-tasks-editor';

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
    Solicitudes,
    ConvertLeadModal,
    ConfigPage,
    Perfil,
    Login,
    NotifBadge,
    ClientCard,
    ClientDisplayNamePipe,
    PlanTasksEditor,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, SharedModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
