import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EjecutivosPage } from './components/ejecutivos-page/ejecutivos-page';
import { CobrosHoyPage } from './components/cobros-hoy-page/cobros-hoy-page';
import { Cobros } from './components/cobros/cobros';
import { Balances } from './components/balances/balances';
import { Clientes } from './components/clientes/clientes';
import { ConfigPage } from './components/config-page/config-page';
import { Perfil } from './components/perfil/perfil';
import { Login } from './components/login/login';
import { authGuard, adminGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'ejecutivos', pathMatch: 'full' },
  { path: 'ejecutivos', component: EjecutivosPage, canActivate: [authGuard] },
  { path: 'cobros-hoy', component: CobrosHoyPage, canActivate: [authGuard] },
  { path: 'cobros', component: Cobros, canActivate: [authGuard] },
  { path: 'balances', component: Balances, canActivate: [authGuard] },
  { path: 'clientes', component: Clientes, canActivate: [authGuard] },
  { path: 'config', component: ConfigPage, canActivate: [adminGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
