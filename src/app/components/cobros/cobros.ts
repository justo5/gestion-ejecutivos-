import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Executive, ExecutivesService } from '../../services/executives';
import { ConfigService, PlanConfig } from '../../services/config';
import { CobrosService, CollectedBy } from '../../services/cobros';
import { AuthService } from '../../services/auth';

export interface CobroRow {
  clientId: string;
  executiveName: string;
  clientName: string;
  plan: string | null;
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
    private cobrosService: CobrosService,
    private authService: AuthService
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
          plan: client.plan ?? null,
          collectedBy: client.cobro?.collectedBy ?? null,
          paid: client.cobro?.paid ?? false,
        });
      });
    });
    return rows;
  }

  private buildTotals(rows: CobroRow[], plans: PlanConfig[]): CobrosTotals {
    let ejecutivos = 0;
    let agencia = 0;
    let pendiente = 0;

    rows.forEach(row => {
      const monto = this.montoFor(row, plans);
      if (row.paid) {
        if (row.collectedBy === 'ejecutivo') ejecutivos += monto;
        else if (row.collectedBy === 'agencia') agencia += monto;
      } else if (monto > 0) {
        pendiente += monto;
      }
    });

    return { ejecutivos, agencia, pendiente, total: ejecutivos + agencia };
  }

  montoFor(row: CobroRow, plans: PlanConfig[]): number {
    const plan = (row.plan ?? '').trim().toLowerCase();
    if (!plan) return 0;
    return plans.find(p => p.name.trim().toLowerCase() === plan)?.price ?? 0;
  }

  onPaidChange(row: CobroRow, paid: boolean): void {
    const collectedBy: CollectedBy | null = paid
      ? this.authService.isAdmin()
        ? 'agencia'
        : 'ejecutivo'
      : null;

    // Guardamos el estado previo y actualizamos la fila de forma optimista para
    // que el tilde no desaparezca mientras se confirma con el backend.
    const prevPaid = row.paid;
    const prevCollectedBy = row.collectedBy;
    row.paid = paid;
    row.collectedBy = collectedBy;

    this.cobrosService.updateRecord(row.clientId, { paid, collectedBy }).subscribe({
      next: () => this.executivesService.refresh(),
      error: () => {
        // Si falla, revertimos al estado anterior.
        row.paid = prevPaid;
        row.collectedBy = prevCollectedBy;
      },
    });
  }
}
