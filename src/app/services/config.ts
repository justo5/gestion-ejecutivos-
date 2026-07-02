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

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private plansSubject = new BehaviorSubject<PlanConfig[]>([]);
  plans$ = this.plansSubject.asObservable();

  private rubrosSubject = new BehaviorSubject<RubroConfig[]>([]);
  rubros$ = this.rubrosSubject.asObservable();

  constructor(private http: HttpClient) {}

  refresh(): void {
    this.http.get<PlanConfig[]>('/api/plans').subscribe(plans => this.plansSubject.next(plans));
    this.refreshRubros();
  }

  refreshRubros(): void {
    this.http.get<RubroConfig[]>('/api/rubros').subscribe(rubros => this.rubrosSubject.next(rubros));
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
      .pipe(tap(plan => this.plansSubject.next([...this.plansSubject.value, plan])));
  }

  updatePlan(id: number, name: string, price: number) {
    return this.http
      .put<PlanConfig>(`/api/plans/${id}`, { name, price })
      .pipe(
        tap(updated =>
          this.plansSubject.next(
            this.plansSubject.value.map(p => (p.id === id ? updated : p)),
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
    return forkJoin(requests).pipe(tap(() => this.plansSubject.next(plans)));
  }

  // Reemplaza toda la lista de rubros por los nombres provistos.
  saveRubros(names: string[]) {
    return this.http
      .put<RubroConfig[]>('/api/rubros', { names })
      .pipe(tap(rubros => this.rubrosSubject.next(rubros)));
  }
}
