import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Executive, ExecutivesService } from '../../services/executives';
import { ConfigService, PlanConfig } from '../../services/config';

export interface ExecutiveBalance {
  name: string;
  squad: string;
  clientCount: number;
  cobrado: number;
  pendiente: number;
}

export interface BalancesViewModel {
  executives: ExecutiveBalance[];
  totalClientes: number;
  totalCobrado: number;
  totalPendiente: number;
  maxMonto: number;
}

@Component({
  selector: 'app-balances',
  standalone: false,
  templateUrl: './balances.html',
  styleUrl: './balances.scss',
})
export class Balances implements OnInit {
  vm$!: Observable<BalancesViewModel>;

  constructor(private executivesService: ExecutivesService, private configService: ConfigService) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([this.executivesService.executives$, this.configService.plans$]).pipe(
      map(([executives, plans]) => this.buildViewModel(executives, plans))
    );

    this.executivesService.refresh();
    this.configService.refresh();
  }

  private buildViewModel(executives: Executive[], plans: PlanConfig[]): BalancesViewModel {
    const priceOf = (planId: number | null) => plans.find(p => p.id === planId)?.price ?? 0;

    const balances: ExecutiveBalance[] = executives.map(exec => {
      let cobrado = 0;
      let pendiente = 0;

      exec.clients.forEach(client => {
        const monto = priceOf(client.cobro?.planId ?? null);
        if (client.cobro?.paid) cobrado += monto;
        else if (client.cobro?.planId) pendiente += monto;
      });

      return { name: exec.name, squad: exec.squad, clientCount: exec.clients.length, cobrado, pendiente };
    });

    balances.sort((a, b) => b.cobrado - a.cobrado);

    const totalClientes = balances.reduce((sum, b) => sum + b.clientCount, 0);
    const totalCobrado = balances.reduce((sum, b) => sum + b.cobrado, 0);
    const totalPendiente = balances.reduce((sum, b) => sum + b.pendiente, 0);
    const maxMonto = Math.max(1, ...balances.map(b => b.cobrado + b.pendiente));

    return { executives: balances, totalClientes, totalCobrado, totalPendiente, maxMonto };
  }

  barWidth(monto: number, max: number): number {
    return max > 0 ? Math.round((monto / max) * 100) : 0;
  }
}
