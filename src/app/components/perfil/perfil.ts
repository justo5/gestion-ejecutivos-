import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth';
import { ExecutivesService } from '../../services/executives';
import { ConfigService, DashboardGoal, formatGoalMonth, formatYearMonth } from '../../services/config';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  profile: AuthUser | null;
  myImageUrl: string | null = null;

  // Objetivo general del equipo, marcado en los gráficos de crecimiento de
  // clientes del dashboard (general y por ejecutivo). Solo lo puede definir
  // un admin; el resto del equipo lo ve reflejado en los gráficos, no acá.
  currentGoal: DashboardGoal | null = null;
  editingGoal = false;
  goalClientsInput: number | null = null;
  goalMonthInput = '';
  goalSaving = false;
  goalError = '';
  // Opciones del desplegable de mes objetivo. Se calculan una sola vez al
  // abrir el editor (ver openGoalEditor), NUNCA como getter leído desde el
  // template: un getter usado en un *ngFor arma un array nuevo en cada
  // ciclo de detección de cambios y, bajo el CD zoneless de Angular, eso
  // dispara NG0103 (loop infinito de refresco).
  goalMonthOptions: { value: string; label: string }[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private cdr: ChangeDetectorRef,
  ) {
    this.profile = this.auth.getUser();
  }

  ngOnInit(): void {
    // Solo un ejecutivo tiene foto propia para cambiar (el admin gestiona
    // la de todos desde /ejecutivos). GET /executives ya filtra al backend
    // solo el propio registro para un rol ejecutivo.
    if (this.profile?.executiveId) {
      const executiveId = this.profile.executiveId;
      this.executivesService.executives$.subscribe(execs => {
        this.myImageUrl = execs.find(e => e.id === executiveId)?.imageUrl ?? null;
        // La app corre con detección de cambios zoneless (ver app-module.ts):
        // un callback de subscribe() que llega fuera del ciclo que originó el
        // click no repinta la vista solo, hace falta pedirlo a mano (mismo
        // criterio que ConfigPage con plans$).
        this.cdr.detectChanges();
      });
      this.executivesService.refresh();
    }

    if (this.isAdmin) {
      this.configService.goal$.subscribe(goal => {
        this.currentGoal = goal;
        this.cdr.detectChanges();
      });
      this.configService.refreshGoal();
    }
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  // Objetivo ya formateado para mostrar en el resumen (fuera del editor).
  get goalMonthLabel(): string | null {
    return this.currentGoal ? formatGoalMonth(this.currentGoal.targetMonth) : null;
  }

  // Arma las opciones del desplegable de mes objetivo: los próximos 5 años,
  // mes a mes. Si el objetivo guardado cae fuera de ese rango, se agrega
  // igual al principio para no perderlo de la lista.
  private buildGoalMonthOptions(): { value: string; label: string }[] {
    const now = new Date();
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i <= 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = formatYearMonth(d);
      options.push({ value, label: formatGoalMonth(value) });
    }
    const current = this.currentGoal?.targetMonth;
    if (current && !options.some(o => o.value === current)) {
      options.unshift({ value: current, label: formatGoalMonth(current) });
    }
    return options;
  }

  openGoalEditor(): void {
    this.goalClientsInput = this.currentGoal?.targetClients ?? null;
    this.goalMonthInput = this.currentGoal?.targetMonth ?? '';
    this.goalMonthOptions = this.buildGoalMonthOptions();
    this.goalError = '';
    this.editingGoal = true;
  }

  cancelGoalEditor(): void {
    this.editingGoal = false;
    this.goalError = '';
  }

  saveGoal(): void {
    const targetClients = this.goalClientsInput;
    const targetMonth = this.goalMonthInput;
    if (!targetClients || targetClients <= 0) {
      this.goalError = 'Ingresá una cantidad de clientes mayor a cero.';
      return;
    }
    if (!targetMonth) {
      this.goalError = 'Elegí un mes objetivo.';
      return;
    }
    this.goalSaving = true;
    this.goalError = '';
    this.configService.saveGoal(targetClients, targetMonth).subscribe({
      next: () => {
        this.goalSaving = false;
        this.editingGoal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.goalSaving = false;
        this.goalError = 'No se pudo guardar el objetivo.';
        this.cdr.detectChanges();
      },
    });
  }

  removeGoal(): void {
    this.goalSaving = true;
    this.configService.clearGoal().subscribe({
      next: () => {
        this.goalSaving = false;
        this.editingGoal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.goalSaving = false;
        this.goalError = 'No se pudo quitar el objetivo.';
        this.cdr.detectChanges();
      },
    });
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
