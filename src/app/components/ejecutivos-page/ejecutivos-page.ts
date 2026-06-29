import { Component } from '@angular/core';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-ejecutivos-page',
  standalone: false,
  templateUrl: './ejecutivos-page.html',
  styleUrl: './ejecutivos-page.scss',
})
export class EjecutivosPage {
  constructor(private auth: AuthService) {}

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }
}
