import { Injectable } from '@angular/core';
import { Client } from './executives';
import { PlanConfig } from './config';
import { ClientExtrasService } from './client-extras';
import { ClientCardView, ClientNotification, ClientStatus, ClientTimelineEntry, StatTile } from '../models/client-view.model';

// Arma la vista "rica" de un cliente a partir de datos reales (cobro, plan,
// antigüedad) y completa con contenido derivado/mock estable (avatar,
// redacción de notificaciones) lo que no existe en el backend. No usa
// Supabase ni ningún servicio externo: todo se calcula acá mismo, en el
// browser, a partir de lo que ya se cargó del cliente.

const AVATAR_HUES = [8, 24, 42, 160, 190, 210, 260, 300, 330];

// Días antes del vencimiento en que se hace el "corte" de información: se le
// pide al cliente que confirme sus datos para poder facturar/cobrar a tiempo.
const CUTOFF_DAYS_BEFORE = 15;

const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .trim()
    .toLowerCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Arma una fecha real para "el día `day` del mes `month` (0-indexado) del año
// `year`", recortando al último día del mes si `day` no existe ahí (ej. día
// 31 en un mes de 30 → cae el 30). Evita que Date "desborde" al mes siguiente.
function dateForDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

@Injectable({ providedIn: 'root' })
export class ClientViewBuilder {
  constructor(private extras: ClientExtrasService) {}

  build(client: Client, executiveName: string, squad: string, plans: PlanConfig[]): ClientCardView {
    const now = new Date();
    const contactDate = client.contactDay ? new Date(client.contactDay + 'T00:00:00') : null;
    const paidMonths = client.cobro?.paidMonths ?? [];
    const paidSet = new Set(paidMonths);

    const monthlyAmount = this.resolvePlanPrice(client.plan, plans);
    const monthsActive = contactDate ? monthsBetween(contactDate, now) : 0;

    // Meses vencidos (desde el mes siguiente al de inicio hasta el actual) que
    // todavía no figuran como pagados: la "deuda" real del cliente.
    let monthsPending = 0;
    if (contactDate) {
      let cursor = new Date(contactDate.getFullYear(), contactDate.getMonth() + 1, 1);
      const limit = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= limit) {
        if (!paidSet.has(formatYearMonth(cursor))) monthsPending++;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }
    const pendingAmount = monthsPending * monthlyAmount;

    // Serie de los últimos 12 meses: 1 si estaba pagado, 0 si no. Es dato real
    // (viene de client.cobro.paidMonths), no inventado.
    const paymentSeries: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      paymentSeries.push(paidSet.has(formatYearMonth(d)) ? 1 : 0);
    }

    const last6Paid = paymentSeries.slice(-6).reduce((a, b) => a + b, 0);
    const health = client.active ? Math.round((last6Paid / 6) * 100) : 0;

    // Semáforo de rendimiento de campañas: es manual, no se deriva del pago
    // (eso ya se ve aparte en "Salud de pago" / "Pendiente"). Sin selección
    // del ejecutivo arranca en verde ("sin evaluar todavía").
    const status: ClientStatus = this.extras.get(client.id).statusOverride ?? 'active';

    // Estas notificaciones son sobre pagos (ver buildNotifications), así que
    // se priorizan solas, sin mirar el semáforo de campañas: son dos cosas
    // independientes.
    const notifications = this.buildNotifications(client, monthsPending, paidMonths.length);
    const importantNotification =
      notifications.find(n => n.type === 'error') ??
      notifications.find(n => n.type === 'alert') ??
      null;

    const hue = AVATAR_HUES[hashString(client.id) % AVATAR_HUES.length];

    return {
      client,
      executiveName,
      squad,
      avatarInitials: initialsOf(client.name),
      avatarColor: `hsl(${hue} 62% 46%)`,
      status,
      statusLabel: status === 'active' ? 'Verde' : status === 'warning' ? 'Amarillo' : 'Rojo',
      health,
      notifications,
      importantNotification,
      paymentSeries,
      monthsPaid: paidMonths.length,
      monthsPending,
      pendingAmount,
      monthlyAmount,
      stats: this.buildStats(monthlyAmount, paidMonths.length, pendingAmount, monthsActive, health, status),
    };
  }

  // Punto de la línea de tiempo de vencimientos para un cliente puntual.
  // Misma lógica de "mes vencido" que usa Cobros (services/cobros.ts): el
  // cobro de un mes se considera vencido recién al llegar el día de cobro
  // (mismo día del mes que contactDay) del mes siguiente. Si hay meses
  // atrasados, se muestra el más viejo sin pagar (el vencimiento real más
  // urgente); si está al día, se muestra el próximo vencimiento.
  buildTimelineEntry(
    client: Client,
    executiveName: string,
    plans: PlanConfig[],
  ): ClientTimelineEntry | null {
    if (!client.active || !client.contactDay || client.deletedAt) return null;

    const contactDate = new Date(client.contactDay + 'T00:00:00');
    const dayNum = contactDate.getDate();
    if (isNaN(dayNum)) return null;

    const paidMonths = client.cobro?.paidMonths ?? [];
    const paidSet = new Set(paidMonths);
    const amount = this.resolvePlanPrice(client.plan, plans);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Meses desde el siguiente al alta hasta el actual (inclusive) que
    // todavía no figuran pagados.
    const owedMonths: string[] = [];
    let cursor = new Date(contactDate.getFullYear(), contactDate.getMonth() + 1, 1);
    while (cursor <= currentMonthStart) {
      if (!paidSet.has(formatYearMonth(cursor))) owedMonths.push(formatYearMonth(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    let dueDate: Date;
    let monthsOverdue = 0;

    if (owedMonths.length > 0) {
      const [y, m] = owedMonths[0].split('-').map(Number);
      dueDate = dateForDay(y, m - 1, dayNum);
      monthsOverdue = owedMonths.length;
    } else {
      // Al día: el próximo vencimiento cae el día de cobro del mes siguiente.
      const nextMonth = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);
      dueDate = dateForDay(nextMonth.getFullYear(), nextMonth.getMonth(), dayNum);
    }

    // El más viejo adeudado puede ser el mes en curso, cuyo día de cobro
    // todavía no llegó: en ese caso no está vencido, es el próximo.
    const overdue = dueDate < today;

    return {
      clientId: client.id,
      clientName: client.name,
      fanpage: client.fanpage,
      executiveName,
      dueDate,
      amount,
      overdue,
      monthsOverdue,
      kind: 'due',
    };
  }

  // Puntos de línea de tiempo de un cliente: su vencimiento y, si todavía no
  // está vencido, el corte de información CUTOFF_DAYS_BEFORE días antes (no
  // tiene sentido mostrar el corte de un ciclo que ya venció). Se apoya en
  // buildTimelineEntry para no repetir el cálculo de meses adeudados.
  buildTimelineEntries(
    client: Client,
    executiveName: string,
    plans: PlanConfig[],
  ): ClientTimelineEntry[] {
    const due = this.buildTimelineEntry(client, executiveName, plans);
    if (!due) return [];

    const entries: ClientTimelineEntry[] = [due];

    if (!due.overdue) {
      const cutoffDate = new Date(due.dueDate);
      cutoffDate.setDate(cutoffDate.getDate() - CUTOFF_DAYS_BEFORE);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      entries.push({
        ...due,
        kind: 'cutoff',
        dueDate: cutoffDate,
        relatedDueDate: due.dueDate,
        overdue: cutoffDate < today,
        monthsOverdue: 0,
      });
    }

    return entries;
  }

  private resolvePlanPrice(planText: string | null, plans: PlanConfig[]): number {
    if (!planText) return 0;
    const normalized = normalizeText(planText);
    const match = plans
      .filter(p => normalized.startsWith(normalizeText(p.name)))
      .sort((a, b) => b.name.length - a.name.length)[0];
    return Number(match?.price ?? 0) || 0;
  }

  private buildNotifications(
    client: Client,
    monthsPending: number,
    monthsPaid: number,
  ): ClientNotification[] {
    const notifications: ClientNotification[] = [];

    if (!client.active) {
      notifications.push({ type: 'error', text: 'Cliente marcado como inactivo' });
    } else if (monthsPending > 0) {
      notifications.push({
        type: 'alert',
        text: `${monthsPending} mes${monthsPending === 1 ? '' : 'es'} de cobro pendiente${monthsPending === 1 ? '' : 's'}`,
      });
    } else if (monthsPaid > 0) {
      notifications.push({ type: 'success', text: 'Al día con los pagos' });
    }

    if (client.collectedBy) {
      notifications.push({ type: 'info', text: `Cobra: ${client.collectedBy}` });
    }
    if (client.plan) {
      notifications.push({ type: 'info', text: `Plan: ${client.plan}` });
    }
    if (client.contactDay) {
      const d = new Date(client.contactDay + 'T00:00:00');
      notifications.push({
        type: 'info',
        text: `Cliente desde ${d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}`,
      });
    }

    if (notifications.length === 0) {
      notifications.push({ type: 'info', text: 'Sin datos de cobro cargados todavía' });
    }

    return notifications;
  }

  private buildStats(
    monthlyAmount: number,
    monthsPaid: number,
    pendingAmount: number,
    monthsActive: number,
    health: number,
    status: ClientStatus,
  ): StatTile[] {
    return [
      { label: 'Plan mensual', value: monthlyAmount > 0 ? `$${monthlyAmount.toLocaleString('es-AR')}` : '—', icon: '💳' },
      { label: 'Meses pagados', value: String(monthsPaid), icon: '✅' },
      {
        label: 'Pendiente',
        value: pendingAmount > 0 ? `$${pendingAmount.toLocaleString('es-AR')}` : '$0',
        icon: '⏳',
        tone: pendingAmount > 0 ? 'warn' : 'ok',
      },
      { label: 'Antigüedad', value: `${monthsActive} mes${monthsActive === 1 ? '' : 'es'}`, icon: '📅' },
      {
        label: 'Salud de pago',
        value: `${health}%`,
        icon: '❤',
        tone: health >= 70 ? 'ok' : health >= 40 ? 'warn' : 'bad',
      },
      {
        label: 'Semáforo',
        value: status === 'active' ? 'Verde' : status === 'warning' ? 'Amarillo' : 'Rojo',
        icon: '🟢',
        tone: status === 'active' ? 'ok' : status === 'warning' ? 'warn' : 'bad',
      },
    ];
  }
}
