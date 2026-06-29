import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Executive, ExecutivesService } from '../../services/executives';
import { ConfigService, PlanConfig } from '../../services/config';
import { CobrosService, CollectedBy } from '../../services/cobros';

export interface CobroRow {
  clientId: string;
  executiveName: string;
  clientName: string;
  planId: number | null;
  collectedBy: CollectedBy | null;
  paid: boolean;
}

export interface CobrosTotals {
  ejecutivos: number;
  agencia: number;
  pendiente: number;
  total: number;
}

export interface CobrosViewModel {
  rows: CobroRow[];
  plans: PlanConfig[];
  totals: CobrosTotals;
}

@Component({
  selector: 'app-cobros',
  standalone: false,
  templateUrl: './cobros.html',
  styleUrl: './cobros.scss',
})
export class Cobros implements OnInit {
  vm$!: Observable<CobrosViewModel>;

  constructor(
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private cobrosService: CobrosService
  ) {}

  ngOnInit(): void {
    const rows$ = this.executivesService.executives$.pipe(map(executives => this.buildRows(executives)));

    this.vm$ = combineLatest([rows$, this.configService.plans$]).pipe(
      map(([rows, plans]) => ({ rows, plans, totals: this.buildTotals(rows, plans) }))
    );

    this.executivesService.refresh();
    this.configService.refresh();
  }

  private buildRows(executives: Executive[]): CobroRow[] {
    const rows: CobroRow[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        rows.push({
          clientId: client.id,
          executiveName: exec.name,
          clientName: client.name,
          planId: client.cobro?.planId ?? null,
          collectedBy: client.cobro?.collectedBy ?? null,
          paid: client.cobro?.paid ?? false,
        });
      });
    });
    return rows;
  }

  private buildTotals(rows: CobroRow[], plans: PlanConfig[]): CobrosTotals {
    const priceOf = (planId: number | null) => plans.find(p => p.id === planId)?.price ?? 0;
    let ejecutivos = 0;
    let agencia = 0;
    let pendiente = 0;

    rows.forEach(row => {
      const monto = priceOf(row.planId);
      if (row.paid) {
        if (row.collectedBy === 'ejecutivo') ejecutivos += monto;
        else if (row.collectedBy === 'agencia') agencia += monto;
      } else if (row.planId) {
        pendiente += monto;
      }
    });

    return { ejecutivos, agencia, pendiente, total: ejecutivos + agencia };
  }

  montoFor(row: CobroRow, plans: PlanConfig[]): number {
    return plans.find(p => p.id === row.planId)?.price ?? 0;
  }

  onPlanChange(row: CobroRow, value: string): void {
    this.cobrosService
      .updateRecord(row.clientId, { planId: value ? Number(value) : null })
      .subscribe(() => this.executivesService.refresh());
  }

  onCollectedByChange(row: CobroRow, value: string): void {
    this.cobrosService
      .updateRecord(row.clientId, { collectedBy: value ? (value as CollectedBy) : null })
      .subscribe(() => this.executivesService.refresh());
  }

  onPaidChange(row: CobroRow, paid: boolean): void {
    this.cobrosService.updateRecord(row.clientId, { paid }).subscribe(() => this.executivesService.refresh());
  }
}
