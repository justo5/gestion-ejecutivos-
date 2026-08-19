import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth';
import { ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  profile: AuthUser | null;
  myImageUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private executivesService: ExecutivesService,
  ) {
    this.profile = this.auth.getUser();
  }

  ngOnInit(): void {
    // Solo un ejecutivo tiene foto propia para cambiar (el admin gestiona
    // la de todos desde /ejecutivos). GET /executives ya filtra al backend
    // solo el propio registro para un rol ejecutivo.
    if (!this.profile?.executiveId) return;
    const executiveId = this.profile.executiveId;
    this.executivesService.executives$.subscribe(execs => {
      this.myImageUrl = execs.find(e => e.id === executiveId)?.imageUrl ?? null;
    });
    this.executivesService.refresh();
  }

  onImageSelected(event: Event): void {
    if (!this.profile?.executiveId) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const executiveId = this.profile.executiveId;
    const reader = new FileReader();
    reader.onload = () => {
      this.executivesService.updateImage(executiveId, reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
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
