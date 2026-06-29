import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  profile: AuthUser | null;

  constructor(private auth: AuthService, private router: Router) {
    this.profile = this.auth.getUser();
  }

  getInitials(): string {
    const name = this.profile?.name ?? '';
    return (
      name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  roleLabel(): string {
    return this.profile?.role === 'admin' ? 'Administrador' : 'Ejecutivo';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
