import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

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
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    if (!this.email || !this.password) return;
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        const dest = res.user.role === 'admin' ? '/ejecutivos' : '/clientes';
        this.router.navigate([dest]);
      },
      error: () => {
        this.loading = false;
        this.error = 'Email o contraseña incorrectos.';
      },
    });
  }
}
