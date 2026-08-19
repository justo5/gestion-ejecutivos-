import { Injectable } from '@angular/core';
import { Client } from './executives';
import { PlanConfig } from './config';
import { ClientExtrasService } from './client-extras';
import { ClientCardView, ClientNotification, ClientStatus, StatTile } from '../models/client-view.model';

// Arma la vista "rica" de un cliente a partir de datos reales (cobro, plan,
// antigüedad) y completa con contenido derivado/mock estable (avatar,
// redacción de notificaciones) lo que no existe en el backend. No usa
// Supabase ni ningún servicio externo: todo se calcula acá mismo, en el
// browser, a partir de lo que ya se cargó del cliente.

const AVATAR_HUES = [8, 24, 42, 160, 190, 210, 260, 300, 330];

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

    const baseStatus: ClientStatus = !client.active ? 'critical' : monthsPending > 0 ? 'warning' : 'active';
    const override = this.extras.get(client.id).statusOverride;
    const status = override ?? baseStatus;

    const notifications = this.buildNotifications(client, monthsPending, paidMonths.length, status);
    const importantNotification =
      notifications.find(n => n.type === 'error') ??
      (status !== 'active' ? notifications.find(n => n.type === 'alert') ?? null : null);

    const hue = AVATAR_HUES[hashString(client.id) % AVATAR_HUES.length];

    return {
      client,
      executiveName,
      squad,
      avatarInitials: initialsOf(client.name),
      avatarColor: `hsl(${hue} 62% 46%)`,
      status,
      statusLabel: status === 'active' ? 'Al día' : status === 'warning' ? 'Atención' : 'Crítico',
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
    status: ClientStatus,
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
        label: 'Estado',
        value: status === 'active' ? 'Al día' : status === 'warning' ? 'Atención' : 'Crítico',
        icon: '🟢',
        tone: status === 'active' ? 'ok' : status === 'warning' ? 'warn' : 'bad',
      },
    ];
  }
}
