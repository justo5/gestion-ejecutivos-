import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface PlanConfig {
  id: number;
  name: string;
  price: number;
}

export interface RubroConfig {
  id: number;
  name: string;
}

// Objetivo general del equipo, marcado a futuro en el gráfico de crecimiento
// de clientes del dashboard. targetMonth en formato 'YYYY-MM'.
export interface DashboardGoal {
  targetClients: number;
  targetMonth: string;
}

// Date -> 'YYYY-MM'. Usado tanto para armar las opciones de mes del editor
// de objetivo (perfil) como para agrupar series mes a mes (dashboard).
export function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// 'YYYY-MM' -> "mar 2027". A diferencia de los meses de los gráficos de
// tendencia (solo el mes, sin año, porque siempre son los últimos 12 meses)
// el objetivo puede caer en cualquier año futuro, así que hace falta
// desambiguar.
export function formatGoalMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private plansSubject = new BehaviorSubject<PlanConfig[]>([]);
  plans$ = this.plansSubject.asObservable();

  private rubrosSubject = new BehaviorSubject<RubroConfig[]>([]);
  rubros$ = this.rubrosSubject.asObservable();

  // null = todavía no se marcó ningún objetivo.
  private goalSubject = new BehaviorSubject<DashboardGoal | null>(null);
  goal$ = this.goalSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Las columnas `numeric` de Postgres viajan como string en el JSON. Si dejamos
  // pasar el string, cualquier suma de montos concatena en vez de sumar y el
  // pipe `number` explota, cortando el render a mitad de camino.
  private normalizePlan(plan: PlanConfig): PlanConfig {
    return { ...plan, price: Number(plan.price) || 0 };
  }

  refresh(): void {
    this.http
      .get<PlanConfig[]>('/api/plans')
      .subscribe(plans => this.plansSubject.next(plans.map(p => this.normalizePlan(p))));
    this.refreshRubros();
    this.refreshGoal();
  }

  refreshRubros(): void {
    this.http.get<RubroConfig[]>('/api/rubros').subscribe(rubros => this.rubrosSubject.next(rubros));
  }

  refreshGoal(): void {
    this.http.get<DashboardGoal | null>('/api/goals').subscribe(goal => this.goalSubject.next(goal));
  }

  getPlans(): PlanConfig[] {
    return this.plansSubject.value;
  }

  getRubros(): RubroConfig[] {
    return this.rubrosSubject.value;
  }

  createPlan(name: string, price: number) {
    return this.http
      .post<PlanConfig>('/api/plans', { name, price })
      .pipe(tap(plan => this.plansSubject.next([...this.plansSubject.value, this.normalizePlan(plan)])));
  }

  updatePlan(id: number, name: string, price: number) {
    return this.http
      .put<PlanConfig>(`/api/plans/${id}`, { name, price })
      .pipe(
        tap(updated =>
          this.plansSubject.next(
            this.plansSubject.value.map(p => (p.id === id ? this.normalizePlan(updated) : p)),
          ),
        ),
      );
  }

  deletePlan(id: number) {
    return this.http
      .delete(`/api/plans/${id}`)
      .pipe(
        tap(() =>
          this.plansSubject.next(this.plansSubject.value.filter(p => p.id !== id)),
        ),
      );
  }

  savePlans(plans: PlanConfig[]) {
    const requests = plans.map(p =>
      this.http.put(`/api/plans/${p.id}`, { name: p.name, price: p.price })
    );
    return forkJoin(requests).pipe(
      tap(() => this.plansSubject.next(plans.map(p => this.normalizePlan(p)))),
    );
  }

  // Reemplaza toda la lista de rubros por los nombres provistos.
  saveRubros(names: string[]) {
    return this.http
      .put<RubroConfig[]>('/api/rubros', { names })
      .pipe(tap(rubros => this.rubrosSubject.next(rubros)));
  }

  // Define o reemplaza el objetivo general del equipo.
  saveGoal(targetClients: number, targetMonth: string) {
    return this.http
      .put<DashboardGoal>('/api/goals', { targetClients, targetMonth })
      .pipe(tap(goal => this.goalSubject.next(goal)));
  }

  // Quita el objetivo marcado (el gráfico deja de mostrarlo).
  clearGoal() {
    return this.http.delete('/api/goals').pipe(tap(() => this.goalSubject.next(null)));
  }
}
