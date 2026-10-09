// Fechas del tablero de tareas: viajan como texto 'YYYY-MM-DD'; para
// mostrarlas se interpretan en UTC, así no se corren de día por el huso.

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

// Suma meses a un mes 'YYYY-MM'.
export function addMonthsToMonth(month: string, months: number): string {
  const d = parse(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 7);
}

// "mié 15 oct"
export function formatShort(date: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(parse(date))
    .replace(',', '')
    .replaceAll('.', '');
}

// "miércoles 15 de octubre"
export function formatLong(date: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(parse(date))
    .replace(',', '');
}

// "15/10/2026"
export function formatNumeric(date: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    parse(date),
  );
}

// "octubre de 2026"
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parse(`${month}-01`));
}

// Día de la semana, con el lunes = 0.
export function weekdayIndex(date: string): number {
  return (parse(date).getUTCDay() + 6) % 7;
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later';

export interface DueInfo {
  label: string;
  long: string;
  status: DueStatus;
}

export function dueInfo(dueDate: string, today: string): DueInfo {
  const diff = daysBetween(today, dueDate);
  const label = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer' : formatShort(dueDate);
  return {
    label,
    long: `${diff < 0 ? 'Venció' : 'Vence'} el ${formatLong(dueDate)}`,
    status: diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff <= 3 ? 'soon' : 'later',
  };
}

function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
