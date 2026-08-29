import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FacebookAuthService } from '../../services/facebook-auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  error = '';
  loading = false;
  facebookLoading = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private facebookAuth: FacebookAuthService,
    private router: Router,
  ) {}

  submit(): void {
    if (!this.email || !this.password) return;
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.goToDestination(res.user.role);
      },
      error: () => {
        this.loading = false;
        this.error = 'Email o contraseña incorrectos.';
      },
    });
  }

  async loginWithFacebook(): Promise<void> {
    this.error = '';
    this.facebookLoading = true;
    try {
      const facebookAccessToken = await this.facebookAuth.login();
      this.auth.loginWithFacebook(facebookAccessToken).subscribe({
        next: (res) => {
          this.facebookLoading = false;
          this.goToDestination(res.user.role);
        },
        error: () => {
          this.facebookLoading = false;
          this.error = 'No se pudo iniciar sesión con Meta.';
        },
      });
    } catch {
      this.facebookLoading = false;
    }
  }

  private goToDestination(role: 'admin' | 'ejecutivo'): void {
    const dest = role === 'admin' ? '/ejecutivos' : '/clientes';
    this.router.navigate([dest]);
  }
}
