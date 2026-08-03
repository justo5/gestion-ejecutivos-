import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExecutivesService } from '../../services/executives';
import { ConfigService } from '../../services/config';
import { CobrosService, CollectedBy } from '../../services/cobros';
import { AuthService } from '../../services/auth';

export interface HistorialEntry {
  clientId: string;
  executiveName: string;
  clientName: string;
  fanpage: string | null;
  plan: string | null;
  dayNum: number;
  collectedBy: CollectedBy | null;
  paid: boolean;
  paidMonths: string[];
  monto: number;
  gastos: number;
  gastosByMonth: Record<string, number>;
}

export interface HistorialGroup {
  dayNum: number;
  entries: HistorialEntry[];
}

export interface CobrosTotals {
  ejecutivos: number;
  agencia: number;
  pendiente: number;
  total: number;
  deudaLabel: string;
  deudaMonto: number;
}

export interface CobrosHistorialViewModel {
  groups: HistorialGroup[];
  upcomingGroups: HistorialGroup[];
  totals: CobrosTotals;
  monthLabel: string;
  canGoNext: boolean;
  isCurrentMonth: boolean;
  isAdmin: boolean;
  executiveOptions: { id: string; name: string }[];
  selectedExecutiveId: string;
  clientSearchTerm: string;
}

// Cada cuánto se vuelve a pedir la data al servidor mientras la pantalla está
// visible. Los cobros los marcan varias personas a la vez, así que sin esto la
// tabla queda congelada con lo que había al entrar.
const AUTO_REFRESH_MS = 30_000;

@Component({
  selector: 'app-cobros',
  standalone: false,
  templateUrl: './cobros.html',
  styleUrl: './cobros.scss',
})
export class Cobros implements OnInit, OnDestroy {
  private selectedDate$ = new BehaviorSubject<Date>(new Date());
  private selectedExecutiveId$ = new BehaviorSubject<string>('');
  private clientSearch$ = new BehaviorSubject<string>('');
  vm$!: Observable<CobrosHistorialViewModel>;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private pendingSaves = 0;
  private readonly onVisibilityChange = () => {
    // Al volver a la pestaña puede haber pasado mucho desde el último tick,
    // así que refrescamos ya y arrancamos de nuevo el intervalo.
    if (document.visibilityState === 'visible') {
      this.refreshData();
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  };

  constructor(
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    private cobrosService: CobrosService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.vm$ = combineLatest([
      this.executivesService.executives$,
      this.configService.plans$,
      this.selectedDate$,
      this.selectedExecutiveId$,
      this.clientSearch$,
    ]).pipe(
      map(([executives, plans, selectedDate, selectedExecutiveId, clientSearchTerm]) => {
        const isAdmin = this.authService.isAdmin();
        const now = new Date();
        const isCurrentMonth =
          selectedDate.getMonth() === now.getMonth() &&
          selectedDate.getFullYear() === now.getFullYear();

        const monthLabel = selectedDate.toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        });

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const canGoNext = selectedMonthStart < currentMonthStart;

        const executiveOptions = executives.map(e => ({ id: e.id, name: e.name }));
        const selectedYearMonth = this.formatYearMonth(selectedDate);
        const entriesMap = new Map<number, HistorialEntry[]>();
        const searchLower = clientSearchTerm.toLowerCase().trim();

        const filteredExecutives = isAdmin && selectedExecutiveId
          ? executives.filter(e => e.id === selectedExecutiveId)
          : executives;

        for (const exec of filteredExecutives) {
          for (const client of exec.clients) {
            if (client.contactDay === null) continue;
            if (searchLower && !client.name.toLowerCase().includes(searchLower)) continue;

            const contactDate = new Date(client.contactDay + 'T00:00:00');
            const dayNum = contactDate.getDate();
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

            // Cobramos a mes vencido: si el cliente se activó (contactDay) en el
            // mes seleccionado o después, todavía no corresponde cobrarle ese mes.
            const selYear = selectedDate.getFullYear();
            const selMonth = selectedDate.getMonth();
            if (
              contactDate.getFullYear() > selYear ||
              (contactDate.getFullYear() === selYear && contactDate.getMonth() >= selMonth)
            ) continue;

            const planText = this.normalizePlanText(client.plan ?? '');
            // El texto del cliente suele ser "<nombre del plan configurado> + sufijos"
            // (precio, moneda, iva, etc.), así que matcheamos por prefijo en vez de
            // igualdad exacta. Se prioriza el nombre más largo que matchee para no
            // confundir "Plan ejecución" con "Plan ejecución + Bot".
            const planConfig = plans
              .filter(p => planText.startsWith(this.normalizePlanText(p.name)))
              .sort((a, b) => b.name.length - a.name.length)[0];
            // Number() explícito: si el precio llega como string (columna
            // `numeric`), los acumuladores de buildTotals concatenan en vez de
            // sumar y el pipe `number` corta el render con un error.
            const monto = Number(planConfig?.price ?? 0) || 0;

            const rawCobro = client.cobro;
            const gastosByMonth = rawCobro?.gastosByMonth ?? {};

            const entry: HistorialEntry = {
              clientId: client.id,
              executiveName: exec.name,
              clientName: client.name,
              fanpage: client.fanpage,
              plan: client.plan,
              dayNum,
              collectedBy: this.normalizeCollectedBy(client.collectedBy),
              paid: (rawCobro?.paidMonths ?? []).includes(selectedYearMonth),
              paidMonths: rawCobro?.paidMonths ?? [],
              monto,
              gastos: Number(gastosByMonth[selectedYearMonth] ?? 0) || 0,
              gastosByMonth,
            };

            if (!entriesMap.has(dayNum)) entriesMap.set(dayNum, []);
            entriesMap.get(dayNum)!.push(entry);
          }
        }

        const todayDay = now.getDate();
        const allGroups: HistorialGroup[] = Array.from(entriesMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([dayNum, entries]) => ({ dayNum, entries }));

        const groups = isCurrentMonth
          ? allGroups.filter(g => g.dayNum <= todayDay)
          : allGroups;

        const upcomingGroups = isCurrentMonth
          ? allGroups.filter(g => g.dayNum > todayDay)
          : [];

        const totals = this.buildTotals(groups);

        return { groups, upcomingGroups, totals, monthLabel, canGoNext, isCurrentMonth, isAdmin, executiveOptions, selectedExecutiveId, clientSearchTerm };
      })
    );

    this.refreshData();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onVisibilityChange);
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('focus', this.onVisibilityChange);
  }

  private refreshData(): void {
    // Si hay un check recién tildado esperando respuesta, el GET todavía
    // devolvería el estado viejo y le pisaría el cambio al usuario.
    if (this.pendingSaves > 0) return;
    this.executivesService.refresh();
    this.configService.refresh();
  }

  // Refresco disparado por el usuario (navegar de mes, filtrar, exportar).
  // Además reinicia el intervalo para no encadenar dos fetch seguidos si el
  // tick automático estaba por caer.
  private refreshNow(): void {
    this.refreshData();
    this.startAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => this.refreshData(), AUTO_REFRESH_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private buildTotals(groups: HistorialGroup[]): CobrosTotals {
    let ejecutivos = 0;
    let agencia = 0;
    let pendiente = 0;
    let total = 0;

    for (const group of groups) {
      for (const entry of group.entries) {
        if (entry.paid) {
          // Sumamos siempre al total, incluso si "Quién cobra" quedó sin
          // especificar: de lo contrario ese cobro desaparece de la tarjeta
          // "Total cobrado" aunque el cliente sí esté marcado como pagado.
          total += entry.monto - entry.gastos;
          // El gasto se reparte 50/50 entre ejecutivo y agencia sin importar
          // quién cobró el pago: ambos afrontan la mitad del gasto.
          ejecutivos += (entry.collectedBy === 'ejecutivo' ? entry.monto : 0) - entry.gastos / 2;
          agencia += (entry.collectedBy === 'agencia' ? entry.monto : 0) - entry.gastos / 2;
        } else if (entry.monto > 0) {
          pendiente += entry.monto;
        }
      }
    }

    // Distribución 50/50: quien cobró de más le debe la mitad de la diferencia
    // al otro (misma cuenta que el resumen del CSV).
    const netoDiff = (ejecutivos - agencia) / 2;
    let deudaLabel: string;
    let deudaMonto: number;
    if (netoDiff > 0) {
      deudaLabel = 'Ejecutivo le debe a Agencia';
      deudaMonto = netoDiff;
    } else if (netoDiff < 0) {
      deudaLabel = 'Agencia le debe a Ejecutivo';
      deudaMonto = Math.abs(netoDiff);
    } else {
      deudaLabel = 'Sin diferencia';
      deudaMonto = 0;
    }

    return { ejecutivos, agencia, pendiente, total, deudaLabel, deudaMonto };
  }

  onExecutiveFilter(executiveId: string): void {
    this.selectedExecutiveId$.next(executiveId);
    this.refreshNow();
  }

  onClientSearch(term: string): void {
    this.clientSearch$.next(term);
  }

  prevMonth(): void {
    const d = this.selectedDate$.value;
    this.selectedDate$.next(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.refreshNow();
  }

  nextMonth(): void {
    const d = this.selectedDate$.value;
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const now = new Date();
    if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      this.selectedDate$.next(next);
    }
    this.refreshNow();
  }

  downloadCsv(vm: CobrosHistorialViewModel): void {
    const allEntries: Array<{ dayNum: number; entry: HistorialEntry }> = [];
    for (const group of [...vm.groups, ...vm.upcomingGroups]) {
      for (const entry of group.entries) {
        allEntries.push({ dayNum: group.dayNum, entry });
      }
    }

    let totalEjecutivos = 0;
    let totalAgencia = 0;
    let totalGastos = 0;
    let totalCobradoBruto = 0;
    for (const { entry } of allEntries) {
      if (entry.paid) {
        totalGastos += entry.gastos;
        totalCobradoBruto += entry.monto;
        // El gasto se reparte 50/50 entre ejecutivo y agencia sin importar
        // quién cobró el pago (igual que en la tarjeta de totales).
        totalEjecutivos += (entry.collectedBy === 'ejecutivo' ? entry.monto : 0) - entry.gastos / 2;
        totalAgencia += (entry.collectedBy === 'agencia' ? entry.monto : 0) - entry.gastos / 2;
      }
    }

    const headers = ['Día', 'Cliente', 'Fanpage', 'Ejecutivo', 'Plan', 'Monto', 'Gastos', 'Cobrado por', 'Estado', 'A favor de'];
    const rows = allEntries.map(({ dayNum, entry }) => {
      let aFavorDe = '';
      if (entry.paid) {
        if (entry.collectedBy === 'ejecutivo') aFavorDe = 'Ejecutivo';
        else if (entry.collectedBy === 'agencia') aFavorDe = 'Agencia';
      }
      return [
        dayNum,
        entry.clientName,
        entry.fanpage ?? '',
        entry.executiveName,
        entry.plan ?? '',
        entry.monto,
        entry.gastos,
        entry.collectedBy ?? '',
        entry.paid ? 'Pagado' : 'Pendiente',
        aFavorDe,
      ];
    });

    const totalCobrado = totalCobradoBruto - totalGastos;
    const correspondeACadaUno = totalCobrado / 2;
    const netoDiff = (totalEjecutivos - totalAgencia) / 2;
    let deudaLabel: string;
    let deudaMonto: number;
    if (netoDiff > 0) {
      deudaLabel = 'Ejecutivo le debe a Agencia';
      deudaMonto = netoDiff;
    } else if (netoDiff < 0) {
      deudaLabel = 'Agencia le debe a Ejecutivo';
      deudaMonto = Math.abs(netoDiff);
    } else {
      deudaLabel = 'Sin diferencia (están empatados)';
      deudaMonto = 0;
    }

    const COL_COUNT = headers.length;
    const empty = (n: number) => Array(n).fill('');
    const summaryRows = [
      empty(COL_COUNT),
      ['RESUMEN (neto de gastos, distribución 50% / 50%)', ...empty(COL_COUNT - 1)],
      ['Total gastos', ...empty(COL_COUNT - 3), totalGastos, '', ''],
      ['Total cobrado (neto)', ...empty(COL_COUNT - 3), totalCobrado, '', ''],
      ['Corresponde a cada uno (50%)', ...empty(COL_COUNT - 3), correspondeACadaUno, '', ''],
      ['Cobrado por ejecutivos (neto)', ...empty(COL_COUNT - 3), totalEjecutivos, '', ''],
      ['Cobrado por agencia (neto)', ...empty(COL_COUNT - 3), totalAgencia, '', ''],
      [deudaLabel, ...empty(COL_COUNT - 3), deudaMonto, '', ''],
    ];

    const csv = [headers, ...rows, ...summaryRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobros-${vm.monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // El CSV sale con lo que ya estaba en pantalla; el refresh es para que la
    // tabla quede al día después de exportar.
    this.refreshNow();
  }

  canTogglePaid(entry: HistorialEntry): boolean {
    if (!entry.paid) return true;
    const isAdmin = this.authService.isAdmin();
    if (entry.collectedBy === 'ejecutivo' && isAdmin) return false;
    if (entry.collectedBy === 'agencia' && !isAdmin) return false;
    return true;
  }

  private formatYearMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private normalizePlanText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }

  private normalizeCollectedBy(value: string | null | undefined): CollectedBy | null {
    const v = (value ?? '').trim().toLowerCase();
    if (v.includes('agencia')) return 'agencia';
    if (v.includes('ejecutivo')) return 'ejecutivo';
    return null;
  }

  onPaidChange(entry: HistorialEntry, paid: boolean): void {
    if (!this.canTogglePaid(entry)) return;

    const currentMonth = this.formatYearMonth(this.selectedDate$.value);
    const newPaidMonths = paid
      ? [...new Set([...entry.paidMonths, currentMonth])]
      : entry.paidMonths.filter(m => m !== currentMonth);

    // Escribimos el cambio en el store en vez de mutar la fila: los totales se
    // calculan dentro del map() del vm, así que sólo se actualizan si el stream
    // vuelve a emitir.
    const prevPaidMonths = this.executivesService.setClientPaidMonths(
      entry.clientId,
      newPaidMonths,
    );

    this.pendingSaves++;
    this.cobrosService.updateRecord(entry.clientId, { paidMonths: newPaidMonths }).subscribe({
      next: () => {
        this.pendingSaves--;
        this.refreshData();
      },
      error: () => {
        this.pendingSaves--;
        this.executivesService.setClientPaidMonths(entry.clientId, prevPaidMonths);
      },
    });
  }

  onGastosChange(entry: HistorialEntry, rawValue: string): void {
    const gastos = Math.max(0, Number(rawValue) || 0);
    if (gastos === entry.gastos) return;

    const currentMonth = this.formatYearMonth(this.selectedDate$.value);
    const newGastosByMonth = { ...entry.gastosByMonth, [currentMonth]: gastos };

    const prevGastosByMonth = this.executivesService.setClientGastosByMonth(
      entry.clientId,
      newGastosByMonth,
    );

    this.pendingSaves++;
    this.cobrosService.updateRecord(entry.clientId, { gastosByMonth: newGastosByMonth }).subscribe({
      next: () => {
        this.pendingSaves--;
        this.refreshData();
      },
      error: () => {
        this.pendingSaves--;
        this.executivesService.setClientGastosByMonth(entry.clientId, prevGastosByMonth);
      },
    });
  }
}
