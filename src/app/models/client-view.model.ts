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

// Un punto en la línea de tiempo de vencimientos: cuándo le toca pagar (o
// pagó de más) a un cliente puntual. "Vencido" = ya pasó la fecha y sigue sin
// pagar; si no, es el próximo vencimiento (día de cobro del mes en curso o
// el que viene, según corresponda).
//
// "cutoff" es un tipo de punto aparte: el corte de información que se le
// pide al cliente 15 días antes de su vencimiento (no es un cobro en sí,
// `amount`/`monthsOverdue` no aplican). `relatedDueDate` conecta el corte
// con el vencimiento al que corresponde.
export interface ClientTimelineEntry {
  clientId: string;
  clientName: string;
  fanpage: string | null;
  executiveName: string;
  dueDate: Date;
  amount: number;
  overdue: boolean;
  // Cantidad total de meses sin pagar a esta altura (incluye el de dueDate).
  monthsOverdue: number;
  kind: 'due' | 'cutoff';
  // Solo presente cuando kind === 'cutoff': el vencimiento real al que corresponde este corte.
  relatedDueDate?: Date;
}
