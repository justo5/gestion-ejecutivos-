import { PlanConfig } from '../services/config';

// Plan de un cliente en un mes puntual. El plan puede cambiar con el tiempo y
// eso no debe pisar los meses anteriores (cobrados o no), así que el backend
// guarda en planHistory desde qué mes (yearMonth "2026-10") rige cada plan.
export interface ClientPlanLike {
  plan: string | null;
  planHistory?: Record<string, string | null> | null;
}

const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');

function normalizePlanText(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS_RE, '').trim().toLowerCase();
}

// Plan vigente en `yearMonth`: el de la clave más grande <= yearMonth. Si el
// mes es anterior a todas las claves se usa la más vieja, y sin historial
// (el plan nunca cambió) vale `client.plan` para todos los meses.
export function planForMonth(client: ClientPlanLike, yearMonth: string): string | null {
  const keys = Object.keys(client.planHistory ?? {}).sort();
  if (keys.length === 0) return client.plan;
  const key = keys.filter(k => k <= yearMonth).pop() ?? keys[0];
  return client.planHistory![key] ?? null;
}

// El texto del cliente suele ser "<nombre del plan configurado> + sufijos"
// (precio, moneda, iva, etc.), así que matcheamos por prefijo en vez de
// igualdad exacta. Se prioriza el nombre más largo que matchee para no
// confundir "Plan ejecución" con "Plan ejecución + Bot". Number() explícito:
// si el precio llega como string (columna `numeric`), las sumas concatenan.
export function resolvePlan(planText: string | null, plans: PlanConfig[]): PlanConfig | null {
  if (!planText) return null;
  const normalized = normalizePlanText(planText);
  return (
    plans
      .filter(p => normalized.startsWith(normalizePlanText(p.name)))
      .sort((a, b) => b.name.length - a.name.length)[0] ?? null
  );
}

export function resolvePlanPrice(planText: string | null, plans: PlanConfig[]): number {
  return Number(resolvePlan(planText, plans)?.price ?? 0) || 0;
}

export function planPriceForMonth(client: ClientPlanLike, yearMonth: string, plans: PlanConfig[]): number {
  return resolvePlanPrice(planForMonth(client, yearMonth), plans);
}

// Primer mes (yearMonth) que se le cobra a un cliente dado de alta en
// `contactDay` ("2026-08-15"). Por defecto cobramos a mes vencido: el mes
// siguiente al alta. Si el plan con el que arrancó se cobra por anticipado,
// ya se cobra el mismo mes del alta. Se mira el plan del mes del alta (y no
// el actual) para que un cambio de plan posterior no agregue ni saque meses.
export function firstDueMonth(client: ClientPlanLike, contactDay: string, plans: PlanConfig[]): string {
  const [y, m] = contactDay.split('-').map(Number);
  const startMonth = `${y}-${String(m).padStart(2, '0')}`;
  if (resolvePlan(planForMonth(client, startMonth), plans)?.prepaid) return startMonth;
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
