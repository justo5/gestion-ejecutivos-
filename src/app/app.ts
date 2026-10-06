import { Component, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HeaderMenuAction } from './components/header-menu/header-menu';
import { AuthService } from './services/auth';
import { LeadsService } from './services/leads';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('gestion-juniors');

  readonly newLeadsCount$: Observable<number>;

  constructor(private auth: AuthService, private router: Router, private leadsService: LeadsService) {
    this.newLeadsCount$ = this.leadsService.newCount$;
    // El contador de solicitudes nuevas del menú se actualiza en cada cambio
    // de página: alcanza para enterarse de lo que entró sin hacer polling.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.auth.isAuthenticated()) this.leadsService.refreshNewCount();
      });
  }

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  private static readonly ROUTES: Record<HeaderMenuAction, string> = {
    dashboard: '/dashboard',
    ejecutivos: '/ejecutivos',
    cobros: '/cobros',
    clientes: '/clientes',
    bajas: '/bajas',
    solicitudes: '/solicitudes',
    configuracion: '/config',
    perfil: '/perfil',
  };

  onMenuSelect(action: HeaderMenuAction): void {
    this.router.navigate([App.ROUTES[action]]);
  }
}
