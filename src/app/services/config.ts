import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface PlanConfig {
  id: number;
  name: string;
  price: number;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private plansSubject = new BehaviorSubject<PlanConfig[]>([]);
  plans$ = this.plansSubject.asObservable();

  constructor(private http: HttpClient) {}

  refresh(): void {
    this.http.get<PlanConfig[]>('/api/plans').subscribe(plans => this.plansSubject.next(plans));
  }

  getPlans(): PlanConfig[] {
    return this.plansSubject.value;
  }

  savePlans(plans: PlanConfig[]) {
    const requests = plans.map(p =>
      this.http.put(`/api/plans/${p.id}`, { name: p.name, price: p.price })
    );
    return forkJoin(requests).pipe(tap(() => this.plansSubject.next(plans)));
  }
}
