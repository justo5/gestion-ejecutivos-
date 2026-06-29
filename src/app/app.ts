import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderMenuAction } from './components/header-menu/header-menu';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('gestion-juniors');

  constructor(private auth: AuthService, private router: Router) {}

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  private static readonly ROUTES: Record<HeaderMenuAction, string> = {
    ejecutivos: '/ejecutivos',
    'cobros-hoy': '/cobros-hoy',
    cobros: '/cobros',
    balances: '/balances',
    clientes: '/clientes',
    configuracion: '/config',
    perfil: '/perfil',
  };

  onMenuSelect(action: HeaderMenuAction): void {
    this.router.navigate([App.ROUTES[action]]);
  }
}
