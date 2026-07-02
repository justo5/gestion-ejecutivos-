import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EjecutivosPage } from './components/ejecutivos-page/ejecutivos-page';
import { Cobros } from './components/cobros/cobros';
import { Clientes } from './components/clientes/clientes';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authGuard, adminGuard, ejecutivosGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'ejecutivos', pathMatch: 'full' },
  { path: 'ejecutivos', component: EjecutivosPage, canActivate: [ejecutivosGuard] },
  { path: 'cobros', component: Cobros, canActivate: [authGuard] },
  { path: 'clientes', component: Clientes, canActivate: [authGuard] },
  { path: 'config', component: ConfigPage, canActivate: [adminGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
