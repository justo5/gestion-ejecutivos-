import { Client } from '../services/executives';

// Tipos de la capa "visual" de clientes: todo lo que no viene del backend real
// (avatar, estado semafórico, notificaciones, historial de pagos como serie)
// se deriva acá a partir de datos reales del cliente (cobro, plan, etc.) o,
// cuando no hay dato real posible, se completa con contenido mock estable
// (mismo cliente → mismo resultado) para no depender de Supabase ni de un
// backend adicional.

export type ClientStatus = 'active' | 'warning' | 'critical';
export type NotifType = 'success' | 'info' | 'alert' | 'error';

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ClientNotification {
  type: NotifType;
  text: string;
}

export interface StatTile {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone?: 'ok' | 'warn' | 'bad';
}

export interface ClientCardView {
  client: Client;
  executiveName: string;
  squad: string;
  avatarInitials: string;
  avatarColor: string;
  status: ClientStatus;
  statusLabel: string;
  health: number;
  notifications: ClientNotification[];
  importantNotification: ClientNotification | null;
  paymentSeries: number[];
  stats: StatTile[];
  monthsPaid: number;
  monthsPending: number;
  pendingAmount: number;
  monthlyAmount: number;
}
