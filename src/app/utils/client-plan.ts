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
export function resolvePlanPrice(planText: string | null, plans: PlanConfig[]): number {
  if (!planText) return 0;
  const normalized = normalizePlanText(planText);
  const match = plans
    .filter(p => normalized.startsWith(normalizePlanText(p.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  return Number(match?.price ?? 0) || 0;
}

export function planPriceForMonth(client: ClientPlanLike, yearMonth: string, plans: PlanConfig[]): number {
  return resolvePlanPrice(planForMonth(client, yearMonth), plans);
}
