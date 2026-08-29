import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type UserRole = 'admin' | 'ejecutivo';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  executiveId: string | null;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MetaAdsStatus {
  connected: boolean;
  expiresAt: string | null;
}

const TOKEN_KEY = 'auth-token-v1';
const USER_KEY = 'auth-user-v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ accessToken, user }) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSubject.next(user);
      })
    );
  }

  loginWithFacebook(facebookAccessToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/facebook', { accessToken: facebookAccessToken }).pipe(
      tap(({ accessToken, user }) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSubject.next(user);
      })
    );
  }

  // Conecta (o renueva) el acceso a Meta Ads del usuario logueado. No tiene
  // que ver con cómo inició sesión en VBcobros: sirve igual si entró con
  // email/password.
  connectMetaAds(facebookAccessToken: string): Observable<MetaAdsStatus> {
    return this.http.post<MetaAdsStatus>('/api/auth/meta-ads/connect', { accessToken: facebookAccessToken });
  }

  getMetaAdsStatus(): Observable<MetaAdsStatus> {
    return this.http.get<MetaAdsStatus>('/api/auth/meta-ads/status');
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }
}
