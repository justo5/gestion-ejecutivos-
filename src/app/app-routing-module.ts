import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EjecutivosPage } from './components/ejecutivos-page/ejecutivos-page';
import { Cobros } from './components/cobros/cobros';
import { Clientes } from './components/clientes/clientes';
import { Bajas } from './components/bajas/bajas';
import { Solicitudes } from './components/solicitudes/solicitudes';
import { DashboardPage } from './components/dashboard/dashboard';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authGuard, adminGuard, ejecutivosGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'ejecutivos', pathMatch: 'full' },
  { path: 'ejecutivos', component: EjecutivosPage, canActivate: [ejecutivosGuard] },
  { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
  { path: 'cobros', component: Cobros, canActivate: [authGuard] },
  { path: 'clientes', component: Clientes, canActivate: [authGuard] },
  { path: 'bajas', component: Bajas, canActivate: [authGuard] },
  { path: 'solicitudes', component: Solicitudes, canActivate: [authGuard] },
  {
    path: 'tareas',
    loadChildren: () => import('./components/tareas/tareas-module').then((m) => m.TareasModule),
    canActivate: [authGuard],
  },
  { path: 'config', component: ConfigPage, canActivate: [adminGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
];

@NgModule({
  // anchorScrolling: el ⚙ del tablero de tareas lleva a #tareas-automaticas
  // dentro de Configuración o Perfil.
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
