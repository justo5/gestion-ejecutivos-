import { Injectable } from '@angular/core';
import { AuthService, AuthUser } from './auth';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  constructor(private auth: AuthService) {}

  getProfile(): AuthUser | null {
    return this.auth.getUser();
  }
}
